var _ = require('lodash');
const Utils = require('../common/utils');
const DbService = require('./dbService');
var _ = require('lodash');
const { ObjectID } = require('mongodb');
const { Spot, SpotComment } = require('../data/spotsData');
const { UserBasicInfo } = require('../data/userData');
const MessagingService = require('./messagingService');

class SpotsService {
    //TODO: return private ones?

    static async find(spotId) {
        const fields = { boards: 0, boardId: 0, boardTitle: 0, 'firebaseId': 0, verifiedBy: 0, comments: 0, isPublic: 0 };

        const spot = await DbService.findById(Utils.Collections.Spots, spotId, fields);

        return { data: Utils.spotMapping()(spot) };
    }

    static async search(userId, keyword, limit, skip) {
        /*   filter = {
                          '$or': [
                              { 'description': { '$regex': keyword, $options: 'i' } },
                              { 'user.username': { '$regex': keyword, $options: 'i' } },
                              { 'user.name': { '$regex': keyword, $options: 'i' } },
                              { 'location.name': { '$regex': keyword, $options: 'i' } }
                          ]
                      };*/
        let filter = {}
        if (keyword) {
            filter = { $text: { $search: keyword } };
        }

        const fields = { boards: 0, boardId: 0, boardTitle: 0, 'firebaseId': 0, comments: 0, isPublic: 0 };

        const sortBy = { saves: -1 };

        let spots = await DbService.find(Utils.Collections.Spots, filter, fields, sortBy, limit, skip);

        spots = _.map(spots, spot => {
            spot.isSavedByViewer = Utils.exists(spot.savedBy, p => p.id == userId);
            spot.isVerifiedByViewer = Utils.exists(spot.verifiedBy, p => p.id == userId);

            return Utils.spotMapping()(spot);
        });

        return Utils.pagingResult(spots, limit, () => limit + skip);
    }

    static async getSpotByUserId(userId, limit, skip) {

        //const skip = next * limit;
        let filter = { 'user.id': userId };

        const sortBy = { verifiedCount: -1 };
        const spots = await DbService.find(Utils.Collections.Spots, filter, Utils.SpotProjection, sortBy, limit, skip);

        return _.map(spots, spot => {
            return Utils.spotMapping()(spot);
        });
    }
    static async getBoardSpots(boardId, userId, limit, next, collectionName, listView) {
        let params = [];
        if (next) {
            const quarter = Utils.getYearQuarter(next);
            params.push({ $match: { boardId: boardId, quarter: quarter, userId: userId } });
        } else {
            params.push({ $match: { boardId: boardId, userId: userId } });
            params.push({ $sort: { quarter: -1 } });
            params.push({ limit: 1 });
        }

        let projectionFields;
        if (listView) {
            projectionFields = { quarter: 1, 'spots._id': 1, 'spots.media': 1, 'spots.user': 1, 'spots.description': 1, 'spots.location': 1, 'spots.savedBy': 1, 'spots.verifiedBy': 1 };
        } else {
            projectionFields = Utils.SpotsListprojection;
        }

        let spotsProjectionFields = projectionFields;
        if (next) {
            spotsProjectionFields['spots'] = {
                $filter: {
                    input: '$items',
                    as: 'item',
                    cond: { $lt: ['$$item.timestamp', next] }
                }
            };
        }

        params.push({ $project: spotsProjectionFields });
        params.push({ $unwind: '$spots' });
        params.push({ $sort: { 'spots.timestamp': -1 } })
        params.push({ limit: limit });

        const spots = await DbService.aggregate(collectionName, params);

        if (spots.length < limit && (next || spots.length > 0)) {

            const quarterValue = next ? Utils.getYearQuarter(next) : spots[0].quarter;
            const match = { boardId: boardId, userId: userId, $lt: { quarter: quarterValue } };
            let nextSpots = await SpotsService.getPreviousDocumentSpots(match, projectionFields, 'quarter', limit - spots.length, collectionName);
            spots.append(nextSpots);
        }

        return Utils.pagingResult(spots, limit, () => null);
    }

    static async getSpotsForMe(userId, limit, skip) {
        const fields = { 'spots.boards': 0, 'spots.boardId': 0, 'spots.boardTitle': 0, 'spots.firebaseId': 0, 'spots.comments': 0, 'spots.isPublic': 0 };

        const feed = await DbService.findOne(
            Utils.Collections.CuratedFeed,
            { userId: userId },
            fields
        );

        let result = { data: [], next: null };
        if (feed) {
            let spots = _.orderBy(feed.spots, ['timestamp'], ['asc']);
            spots = Utils.slice(spots, limit, skip);

            return _.map(spots, spot => {
                spot.isSavedByViewer = Utils.exists(spot.savedBy, p => p.id == userId);
                spot.isVerifiedByViewer = Utils.exists(spot.verifiedBy, p => p.id == userId);

                data = Utils.spotMapping()(spot);
                result = Utils.pagingResult(data, limit, () => skip + limit)
            });
        }

        return result;
    }

    static async getMyPeopleSpots(userId, limit, next, ts) {

        let params = [];
        if (next) {
            const month = Utils.getYearMonth(next);
            params.push({ $match: { month: month, userId: userId } });
        } else {
            params.push({ $match: { userId: userId } });
            params.push({ $sort: { month: -1 } })
            params.push({ $limit: 1 });
        }


        let spotsProjectionFields = Utils.SpotsListProjection;
        /*if (next) {
            params.push({
                $project: {
                    'spots': {
                        $filter: {
                            input: '$items',
                            as: 'item',
                            cond: { $lt: ['$$item.timestamp', next] }
                        }
                    }
                }
            });
        }*/


        params.push({ $unwind: '$spots' });
        params.push({ $project: spotsProjectionFields });
        params.push({ $sort: { 'spots.timestamp': -1 } });
        if (next) {
            params.push({ $match: { 'spots.timestamp': { $lt: next } } });
        }

        params.push({ $limit: limit });

        let spots = await DbService.aggregate(Utils.Collections.Feed, params);

        if (spots.length < limit && (next || spots.length > 0)) {

            const monthValue = next ? Utils.getYearMonth(next) : spots[0].month;
            const match = { userId: userId, month: { $lt: monthValue } };
            let previousSpots = await SpotsService.getPreviousDocumentSpots(match, spotsProjectionFields, 'month', limit - spots.length, Utils.Collections.Feed);
            spots = spots.concat(previousSpots);
        }

        spots = _.map(spots, x => Utils.spotMapping()(x.spots));
        return Utils.pagingResult(spots, limit, () => spots[spots.length - 1].timestamp);
    }


    static async getAllSpots(take, skip) {
        const sortBy = { timestamp: -1 };

        let spots = await DbService.find(Utils.Collections.Spots, {}, {}, sortBy, take, (skip * take));
        const data = _.map(spots, Utils.spotMapping());

        return Utils.pagingResult(data, take, () => take + skip);
    }

    static async getSpots(userId, match, projectionFields, limit, skip, collectionName, ts) {

        let params = [];
        params.push(match);

        params.push({ $unwind: '$spots' });

        if (ts) {
            params.push({ $match: { 'spots.timestamp': { $gt: ts } } });
        } else if (1 == 0) {//TODO: change
            params.push({ $match: { 'spots.timestamp': { $lt: next } } });
        }

        let sortBy = ts ? { $sort: { 'spots.timestamp': 1 } } : { $sort: { 'spots.timestamp': -1 } };

        params.push(sortBy);
        if (!ts) {
            params.push({ $skip: skip });
            params.push({ $limit: limit });
        }

        params.push({ $project: projectionFields });

        const spots = await DbService.execute(coll => coll.aggregate(params).toArray(), collectionName)

        return _.map(spots, spot => {
            spot.isSavedByViewer = Utils.exists(spot.savedBy, p => p.id == userId);
            spot.isVerifiedByViewer = Utils.exists(spot.verifiedBy, p => p.id == userId);

            return Utils.spotMapping()(spot);
        });
    }

    static async getFeeds(userId, take, skip, type) {
        const sortBy = { timestamp: -1 };

        if (type == "1") {
            let spots = await DbService.find(Utils.Collections.Spots, {}, {}, sortBy, take, (skip * take));
            return _.map(spots, Utils.spotMapping());
        }
        else {
            let filter = {};
            let user = await DbService.findOne(Utils.Collections.Users, { _id: ObjectID(userId) }, {});
            if (user.myPeople.length > 0) {
                var myPeopleFilter = [];
                for (var i in user.myPeople) {
                    let tmpObjFilter = { "user.id": user.myPeople[i].id };
                    myPeopleFilter.push(tmpObjFilter);
                }
                filter = { '$or': myPeopleFilter };
            }

            let spots = await DbService.find(Utils.Collections.Spots, filter, {}, sortBy, take, (skip * take));
            return _.map(spots, Utils.spotMapping());
        }
    }

    static async getComments(spotId, limit, next) {

        let query = { spotId: spotId };
        /*if (next) {
            query = { spotId: spotId, timestamp: { $lt: next } };
        } else {
            query = { spotId: spotId };
        }*/

        let comments = await DbService.find(Utils.Collections.Comments, query, {}, { timestamp: 1 });

        commnets = _.map(comments, Utils.mapId());

        return { data: comments };
    }

    static async getVerifiedBy(userId, spotId, limit, next) {

        const asyncFn = async function (db) {
            const usersColl = await db.collection(Utils.Collections.Users);
            const spotsColl = await db.collection(Utils.Collections.Spots);

            const user = await usersColl.findOne(
                { _id: new ObjectID(userId) },
                { _id: 0, myPeople: 1 }
            );

            const spot = await spotsColl.findOne(
                { _id: new ObjectID(spotId) },
                { verifiedBy: 1 }
            );

            let result = _.filter(spot.verifiedBy, verifier => verifier.id !== userId)

            result = _.map(result, verifier => {

                verifier.isFollowedByViewer = Utils.exists(user.myPeople, p => p.id == verifier.id);

                return verifier;
            });

            return result;
        }

        const result = await DbService.execute(asyncFn);

        return { data: result };
    }

    static async getSavedBy(userId, spotId, limit, next) {

        const asyncFn = async function (db) {
            const usersColl = await db.collection(Utils.Collections.Users);
            const spotsColl = await db.collection(Utils.Collections.Spots);

            const user = await usersColl.findOne(
                { _id: new ObjectID(userId) },
                { _id: 0, myPeople: 1 }
            );

            const spot = await spotsColl.findOne(
                { _id: new ObjectID(spotId) },
                { savedBy: 1 }
            );

            let result = _.filter(spot.savedBy, saver => saver.id !== userId);

            result = _.map(result, saver => {

                saver.isFollowedByViewer = Utils.exists(user.myPeople, p => p.id == saver.id);

                return saver;
            });

            return result;
        }

        const result = await DbService.execute(asyncFn);

        return { data: result };
    }

    static async getPreviousDocumentSpots(match, projectionFields, dateFieldName, take, collectionName) {
        const params = [];
        let spots = [];

        while (spots.length < take) {
            params.push({ $match: match });
            params.push({ $sort: { [dateFieldName]: -1 } });
            params.push({ $limit: 1 });
            params.push({ $project: projectionFields });
            params.push({ $unwind: '$spots' });
            params.push({ $sort: { 'spots.timestamp': -1 } })
            params.push({ $limit: take - spots.length });

            let previousSpots = await DbService.execute(coll => coll.aggregate(params).toArray(), collectionName);

            if (previousSpots.length === 0) {
                break;
            }

            spots = spots.concat(previousSpots);
        }

        return spots;
    }

    static async uploadSpot(spot, userId, boardId, boardTitle, boards) {
        //const { boardId, boardTitle, boards } = spot.getBoardsInfo();

        const asyncFn = async function (db) {
            const usersColl = await db.collection(Utils.Collections.Users);
            const spotsColl = await db.collection(Utils.Collections.Spots);
            const uploadedBoardsColl = await db.collection(Utils.Collections.UploadedBoards);
            const feedColl = await db.collection(Utils.Collections.Feed);
            const privateFeedColl = await db.collection(Utils.Collections.PrivateSpots);

            const me = await usersColl.findOne(
                { _id: new ObjectID(userId) },
                {
                    projection: {
                        username: 1,
                        name: 1,
                        profileImage: 1,
                        coverImage: 1,
                        uploadedBoards: 1,
                        'profile.isPublic': 1,
                        'followers.id': 1
                    }
                });

            const userInfo = new UserBasicInfo(me._id.toString(), me.username, me.name, me.profileImage, me.coverImage);

            spot.user = userInfo;
            spot.boardId = boardId;
            spot.boardTitle = boardTitle;
            spot.boards = boards;

            if (me.profile.isPublic) {
                spot.isPublic = me.profile.isPublic;
            }
            else {
                spot.isPublic = false
            }

            // insert spot
            const insertedSpot = await spotsColl.insertOne(spot);

            //update spot object
            spot.id = insertedSpot.insertedId.toString();
            delete spot._id;

            delete spot.boardId;
            delete spot.boardTitle;
            delete spot.boards;

            await uploadedBoardsColl.updateOne(
                { boardId: boardId, userId: userInfo.id, quarter: Utils.getYearQuarter(spot.timestamp) },
                {
                    $push: { spots: spot },
                    $set: { title: boardTitle },
                    $inc: { spotsCount: 1 }
                },
                { upsert: true }
            );

            // Add to followers feed
            const followers = me.followers;
            for (let index = 0; index < followers.length; index++) {
                let filter = { userId: followers[index].id, month: Utils.getYearMonth(spot.timestamp) };
                let update = {
                    $push: { spots: spot },
                    $inc: { spotsCount: 1 }
                };

                let options = { upsert: true };

                await feedColl.updateOne(filter, update, options);

                if (!me.profile.isPublic) {
                    await privateFeedColl.updateOne(filter, update, options);
                }
            }

            await feedColl.updateOne({ userId: userId, month: Utils.getYearMonth(spot.timestamp) },
                {
                    $push: { spots: spot },
                    $inc: { spotsCount: 1 }
                },
                { upsert: true });

            let boardMedia;
            for (var name in spot.media) {
                boardMedia = boardMedia ? boardMedia : spot.media[name];
            }

            // Update user with new boards
            let newBoards = [];
            const userUploadedBoards = me.uploadedBoards || [];
            for (let index = 0; index < boards.length; index++) {
                const board = _.find(userUploadedBoards, { id: boards[index].id });

                if (!board) {
                    boards[index].thumbnail = boardMedia;
                    boards[index].spotsCount = 1;
                    newBoards.push(boards[index]);
                } else {
                    await DbService.updateOne(
                        Utils.Collections.Users,
                        { _id: new ObjectID(userId), 'uploadedBoards.id': boards[index].id },
                        {
                            $set: { 'uploadedBoards.$.thumbnail': boardMedia },
                            $inc: { 'uploadedBoards.$.spotsCount': 1 }
                        }
                    );
                }
            }

            if (newBoards.length > 0) {

                var newCountriesCount = _.filter(newBoards, { type: Utils.BoardType.COUNTRY }).length;
                var newCitiesCount = _.filter(newBoards, { type: Utils.BoardType.CITY }).length;
                await usersColl.updateOne(
                    { _id: new ObjectID(userId) },
                    {
                        $push: { uploadedBoards: { $each: newBoards } },
                        $inc: { countriesCount: newCountriesCount, citiesCount: newCitiesCount, uploadedSpotsCount: 1 }
                    }
                );
            } else {
                await usersColl.updateOne(
                    { _id: new ObjectID(userId) },
                    {
                        $inc: { uploadedSpotsCount: 1 }
                    }
                );
            }

            return {
                id: spot.id
            };
        }
        const result = await DbService.execute(asyncFn);

        return result;
    }

    static async save(userId, spotId) {

        const asyncFn = async function (db) {
            const usersColl = await db.collection(Utils.Collections.Users);
            const spotsColl = await db.collection(Utils.Collections.Spots);
            const savedBoardsColl = await db.collection(Utils.Collections.SavedBoards);
            const uploadedBoardsColl = await db.collection(Utils.Collections.UploadedBoards);
            const feedColl = await db.collection(Utils.Collections.Feed);
            const curatedFeedColl = await db.collection(Utils.Collections.CuratedFeed);

            const user = await usersColl.findOne(
                { _id: new ObjectID(userId) },
                { projection: { 'savedBoards.id': 1, username: 1, name: 1, email: 1, profileImage: 1, coverImage: 1 } }
            );

            const userInfo = new UserBasicInfo(userId, user.username, user.name, user.profileImage, user.coverImage);

            // Update spot
            let result = await spotsColl.findOneAndUpdate(
                { _id: new ObjectID(spotId) },
                {
                    $inc: { saves: 1 },
                    $addToSet: {
                        savedBy: userInfo
                    }
                },
                { projection: { _id: 0 }, returnOriginal: false }
            );

            let spot = result.value;
            spot.id = spotId;

            // Update user boards
            let boardMedia;
            for (var name in spot.media) {
                boardMedia = boardMedia ? boardMedia : spot.media[name];
            }

            const boards = spot.boards || [];
            const userSavedBoards = user.savedBoards || [];
            let newBoards = [];

            for (var index = 0; index < boards.length; index++) {
                const board = _.find(userSavedBoards, { id: boards[index].id });

                if (!board) {
                    boards[index].thumbnail = boardMedia;
                    boards[index].spotsCount = 1;
                    newBoards.push(boards[index]);
                } else {
                    await DbService.updateOne(
                        Utils.Collections.Users,
                        { _id: new ObjectID(userId), 'savedBoards.id': boards[index].id },
                        {
                            $set: { 'savedBoards.$.thumbnail': boardMedia },
                            $inc: { 'savedBoards.$.spotsCount': 1 }
                        }
                    );
                }
            }

            if (newBoards.length > 0) {
                await usersColl.updateOne(
                    Utils.IdFilter(userId),
                    {
                        $push: { savedBoards: { $each: newBoards } },
                        $inc: { savedSpotsCount: 1 }
                    }
                );
            } else {
                await usersColl.updateOne(
                    Utils.IdFilter(userId),
                    { $inc: { savedSpotsCount: 1 } }
                );
            }

            const boardId = spot.boardId;
            const boardTitle = spot.boardTitle;

            delete spot.boards;
            delete spot.boardId;
            delete spot.boardTitle;

            // Update user saved board
            await savedBoardsColl.updateOne(
                { boardId: boardId, userId: userId, quarter: Utils.getYearQuarter(spot.timestamp) },
                {
                    $push: { spots: spot },
                    $set: { title: boardTitle },
                    $inc: { spotsCount: 1 }
                },
                { upsert: true }
            );

            const pushUpdate = {
                $addToSet: {
                    'spots.$.savedBy': userInfo
                },
                $inc: { 'spots.$.saves': 1 }
            };

            // Update uploaded boards
            await uploadedBoardsColl.updateOne(
                { boardId: boardId, userId: spot.user.id, quarter: Utils.getYearQuarter(spot.timestamp), 'spots.id': spot.id },
                pushUpdate
            );

            // Update other saved boards
            await savedBoardsColl.updateMany(
                { boardId: boardId, quarter: Utils.getYearQuarter(spot.timestamp), 'spots.id': spot.id },
                pushUpdate
            );

            // Update feed
            await feedColl.updateMany(
                { month: Utils.getYearMonth(spot.timestamp), 'spots.id': spot.id },
                pushUpdate
            );


            // Update curatedFeed
            await curatedFeedColl.updateMany(
                { userId: userId, 'spots.id': spot.id },
                pushUpdate
            );

            await MessagingService.sendMessage(userId, Utils.NotificationType.SAVE, spot, spot.user.id);
        }

        const result = await DbService.execute(asyncFn);

        return result;
    }

    static async unsave(userId, spotId) {

        const asyncFn = async function (db) {
            const spotsColl = await db.collection(Utils.Collections.Spots);
            const savedBoardsColl = await db.collection(Utils.Collections.SavedBoards);
            const uploadedBoardsColl = await db.collection(Utils.Collections.UploadedBoards);
            const feedColl = await db.collection(Utils.Collections.Feed)
            const curatedFeedColl = await db.collection(Utils.Collections.CuratedFeed)

            // Update spot
            let result = await spotsColl.findOneAndUpdate(
                { _id: new ObjectID(spotId) },
                {
                    $inc: { saves: -1 },
                    $pull: { savedBy: { id: userId } }
                },
                { projection: { _id: 0 }, returnOriginal: false }
            );

            let spot = result.value;

            const boardId = spot.boardId;
            const boardTitle = spot.boardTitle;

            // Update saved board
            await savedBoardsColl.updateOne(
                { boardId: boardId, userId: userId, quarter: Utils.getYearQuarter(spot.timestamp) },
                {
                    $pull: { spots: { id: spotId } },
                    $set: { title: boardTitle },
                    $inc: { spotsCount: 1 }
                },
                { upsert: true }
            );


            // Update uploaded boards
            await uploadedBoardsColl.updateOne(
                { boardId: boardId, userId: spot.user.id, quarter: Utils.getYearQuarter(spot.timestamp), 'spots.id': spotId },
                {
                    $pull: {
                        'spots.$.savedBy': { id: userId }
                    },
                    $inc: { 'spots.$.saves': -1 }
                }
            );

            const pullUpdate = {
                $pull: {
                    'spots.$.savedBy': { id: userId }
                },
                $inc: { 'spots.$.saves': -1 }
            };

            // Update other saved boards
            await savedBoardsColl.updateMany(
                { boardId: boardId, quarter: Utils.getYearQuarter(spot.timestamp), 'spots.id': spotId },
                pullUpdate
            );

            // Update feed
            await feedColl.updateMany(
                { quarter: Utils.getYearMonth(spot.timestamp), 'spots.id': spotId },
                pullUpdate
            );

            // Update curatedFeed
            await curatedFeedColl.updateMany(
                { 'spots.id': spot.id },
                pullUpdate
            );


            const boardIds = _.map(spot.boards, x => x.boardId);
            await DbService.updateOne(
                Utils.Collections.Users,
                { _id: new ObjectID(userId), 'savedBoards.id': { $in: boardIds } },
                {
                    $inc: { 'savedBoards.$.spotsCount': -1 }
                }
            );

            await DbService.updateOne(
                Utils.Collections.Users,
                { _id: new ObjectID(userId) },
                {
                    pull: {
                        savedBoards: { $elemMatch: { id: { $in: boardIds }, spotsCount: 0 } }
                    }
                }
            );
        }

        const result = await DbService.execute(asyncFn);

        return result;
    }

    static async comment(userId, spotId, message) {

        const asyncFn = async function (db) {
            const usersColl = await db.collection(Utils.Collections.Users);
            const spotsColl = await db.collection(Utils.Collections.Spots);
            const commentsColl = await db.collection(Utils.Collections.Comments);

            const fields = { username: 1, name: 1, profileImage: 1, coverImage: 1 };

            const user = await usersColl.findOne(
                { _id: new ObjectID(userId) },
                { projection: fields });

            let comment = new SpotComment(spotId, message, user);

            const result = await commentsColl.insertOne(comment);

            comment.setId(result.insertedId);

            const spot = await spotsColl.findOneAndUpdate(
                { _id: new ObjectID(spotId) },
                {
                    $inc: { commentsCount: 1 },
                    '$push': {
                        comments: {
                            $each: [comment]
                            , $slice: -10
                        }
                    }
                },
            );

            return spot.value;

            /*const quarter = Utils.getYearQuarter(spot.value.timestamp);

             await uploadedBoardsColl.updateMany(
                 {
                     quarter: quarter,
                     'spots.id': spotId
                 },
                 {
                     $inc: { 'spots.$.commentsCount': 1 },
                     '$push': {
                         'spots.$.comments': {
                             "$each": [comment],
                             "$slice": -10
                         }
                     }
                 }
             );
 
             await savedBoardsColl.updateMany(
                 {
                     quarter: quarter,
                     'spots.id': spotId
                 },
                 {
                     $inc: { 'spots.$.commentsCount': 1 },
                     '$push': {
                         'spots.$.comments': {
                             "$each": [comment],
                             "$slice": -10
                         }
                     }
                 }
             );*/
        }

        let spot = await DbService.execute(asyncFn);
        spot.id = spotId;
        delete spot._id;
        delete spot.boards;
        delete spot.boardId;
        delete spot.boardTitle;

        var usernames = message.match(/@\w*/ig);
        if (usernames) {
            for (var i = 0; i < usernames.length; i++) {
                await MessagingService.sendMessage(userId, Utils.NotificationType.COMMENT, spot, null, _.replace(usernames[i], '@', ''));
            }
        }

    }

    static async deleteSpotMedia(userId, spotId, mediaId, mediaType, timestamp) {

        const spotOperation = async (coll) => {
            await coll.updateOne
                (Utils.IdFilter(spotId),
                {
                    $set:
                    {
                        imagesCount: { $inc: mediaType == Utils.MediaType.IMAGE ? -1 : 0 },
                        videosCount: { $inc: mediaType == Utils.MediaType.VIDEO ? -1 : 0 },
                        mediaCount: { $inc: -1 }
                    },
                    $pull: {
                        media: { id: mediaId }
                    }
                })
        };

        const collUpdate = {
            $set: {
                'spots.$.imagesCount': { $inc: mediaType == Utils.MediaType.IMAGE ? -1 : 0 },
                'spots.$.videosCount': { $inc: mediaType == Utils.MediaType.VIDEO ? -1 : 0 },
                'spots.$.mediaCount': { $inc: -1 }
            },
            $pull: { 'spots.$.media': { id: mediaId } }
        };

        await executeUpdate(userId, spotId, timestamp, spotOperation, collUpdate)
    }

    static async updateSpot(userId, spotId, description, media, timestamp) {

        const imagesCount = (_.filter(media, x => x.type === Utils.MediaType.IMAGE)).length;
        const videosCount = (_.filter(media, x => x.type === Utils.MediaType.VIDEO)).length;
        const mediaCount = media.length;

        const spotOperation = async (coll) => await coll.updateOne(
            Utils.IdFilter(spotId),
            {
                $set: {
                    description: description,
                    imagesCount: { $inc: imagesCount },
                    videoCount: { $inc: videosCount },
                    mediaCount: { $inc: mediaCount }
                },
                $push: { media: { $each: media } }
            });

        const collUpdate =
        {
            $set: {
                'spots.$.description': description,
                'spots.$.imagesCount': { $inc: imagesCount },
                'spots.$.videosCount': { $inc: videoCount },
                'spots.$.mediaCount': { $inc: mediaCount }
            },
            $push: { 'spots.$.media': { $each: media } }
        };

        await SpotsService.executeUpdate(userId, spotId, timestamp, spotOperation, collUpdate);
    }

    static async updateSpotDetail(userId, spotId, description, media, timestamp) {
        const asyncFn = async function (db) {

            const spotsColl = await db.collection(Utils.Collections.Spots);
            const uploadedBoardsColl = await db.collection(Utils.Collections.UploadedBoards);
            const savedBoardsColl = await db.collection(Utils.Collections.SavedBoards);
            const feedColl = await db.collection(Utils.Collections.Feed);

            /*for (var name in obj) {
                alert(name);
                var value = obj[name];
                alert(value);
            }*/

            await spotsColl.updateOne(
                { _id: new ObjectID(spotId) },
                {
                    $set: { description: description }
                }
            );

            await uploadedBoardsColl.updateOne(
                { userId: userId, quarter: Utils.getYearQuarter(timestamp), 'spots.id': spotId },
                {
                    $set: { 'spots.$.description': description }
                }
            );

            await savedBoardsColl.updateOne(
                { quarter: Utils.getYearQuarter(timestamp), 'spots.id': spotId },
                {
                    $set: { 'spots.$.description': description }
                }
            );

            await feedColl.updateOne(
                { month: Utils.getYearMonth(timestamp), 'spots.id': spotId },
                {
                    $set: { 'spots.$.description': description }
                }
            );
        };

        const result = await DbService.execute(asyncFn);

        return result;
    }

    static async getNestedBoards(userId, type, parentBoardId) {
        let filter = { _id: new ObjectID(userId) };

        if (type == "uploaded") {
            filter = { $and: [filter, { 'uploadedBoards.parent': parentBoardId }] };
        }
        else if (type == "saved") {
            filter = { $and: [filter, { 'savedBoards.parent': parentBoardId }] };
        }

        const result = await DbService.findOne(Utils.Collections.Users, filter);

        if (!result) {
            return [];
        }

        let boards = [];
        if (type == "uploaded") {
            boards = result.uploadedBoards;
        }
        else if (type == "saved") {
            boards = result.savedBoards;
        }

        let BoardList = [];

        for (var i in boards) {
            if (boards[i].parent == parentBoardId) {
                let boardsObj = {
                    id: boards[i].id,
                    title: boards[i].title,
                    nestingLevel: boards[i].nestingLevel,
                    hasNestedBoards: boards[i].hasNestedBoards,
                    thumbnail: {
                        placeholderColor: null,
                        url: null
                    }
                }
                if (boards[i].media) {
                    boardsObj.thumbnail.placeholderColor = boards[i].media.placeholderColor,
                        boardsObj.thumbnail.url = boards[i].media.url

                }
                BoardList.push(boardsObj);
            }
        }
        return BoardList;
    }

    static async executeUpdate(userId, spotId, timestamp, spotOperation, collUpdate) {

        const asyncFn = async function (db) {
            const spotsColl = await db.collection(Utils.Collections.Spots);
            const uploadedBoardsColl = await db.collection(Utils.Collections.UploadedBoards);
            const savedBoardsColl = await db.collection(Utils.Collections.SavedBoards);
            const feedColl = await db.collection(Utils.Collections.Feed);
            const privateFeedColl = await db.collection(Utils.Collections.PrivateSpots);

            await spotOperation(spotsColl);

            await uploadedBoardsColl.updateOne(
                { userId: userId, quarter: Utils.getYearQuarter(timestamp), 'spots.id': spotId },
                collUpdate
            );

            await savedBoardsColl.updateMany(
                { quarter: Utils.getYearQuarter(timestamp), 'spots.id': spotId },
                collUpdate
            );

            await feedColl.updateMany(
                { month: Utils.getYearMonth(timestamp), 'spots.id': spotId },
                collUpdate
            );

            await privateFeedColl.updateMany(
                { month: Utils.getYearMonth(timestamp), 'spots.id': spotId },
                collUpdate
            );
        }

        await DbService.execute(asyncFn);
    }

    static async verify(userId, spotId) {

        const fn = async function (db) {

            const usersColl = await db.collection(Utils.Collections.Users);
            const spotsColl = await db.collection(Utils.Collections.Spots);

            const user = await usersColl.findOne(
                { _id: new ObjectID(userId) },
                { username: 1, name: 1, email: 1, profileImage: 1, coverImage: 1 }
            );

            await spotsColl.updateOne(
                { _id: new ObjectID(spotId) },
                {
                    $addToSet: {
                        verifiedBy: new UserBasicInfo(userId, user.username, user.name, user.profileImage, user.coverImage)
                    },
                    $inc: { verifiedCount: 1 }
                }
            )

        };

        const result = await DbService.execute(fn);

        return result;
    }

    static async unverify(userId, spotId) {

        const update = {
            $pull: { verifiedBy: { id: userId } },
            $inc: { verifiedCount: -1 }
        };

        const result = await DbService.updateOne(
            Utils.Collections.Spots,
            { _id: new ObjectID(spotId) },
            update
        );

        return result;
    }

    static withIsSavedAndVerified(spots, userId) {
        const result = _.map(spots, spot => {

            spot.isSavedByViewer = Utils.exists(spot.savedBy, p => p.id == userId);
            spot.isVerifiedByViewer = Utils.exists(spot.verifiedBy, p => p.id == userId);

            return spot;
        });

        return result;
    }

    static async updateSpotSubCategory(Id, update) {

        const result = await DbService.findOneAndUpdate(
            Utils.Collections.Spots,
            { _id: new ObjectID(Id) },
            update
        );

        return result;
    }

    static async deleteSpotById(spotId) {
        var result = await DbService.deleteById(Utils.Collections.Spots, spotId);
        return { isSuccessful: result };
    }

    static async updateBoardThumbnail(Placeholder, url, BoardId) {
        let coll = Utils.Collections.Users;
        let update = { $set: { "savedBoards.$.thumbnail.placeholderColor": Placeholder, "savedBoards.$.thumbnail.url": url } };
        let filter = { "savedBoards.id": BoardId };

        let result1 = await DbService.updateMany(coll, filter, update);

        update = { $set: { "uploadedBoards.$.thumbnail.placeholderColor": Placeholder, "uploadedBoards.$.thumbnail.url": url } };
        filter = { "uploadedBoards.id": BoardId };

        let result2 = await DbService.updateMany(coll, filter, update);

        return {
            savedBoard: result1,
            updatedBoard: result2
        }

    }

    static async deleteSpot(userId, spotId) {

        const asyncFn = async function (db) {
            const usersColl = await db.collection(Utils.Collections.Users);
            const spotsColl = await db.collection(Utils.Collections.Spots);
            const savedBoardsColl = await db.collection(Utils.Collections.SavedBoards);
            const uploadedBoardsColl = await db.collection(Utils.Collections.UploadedBoards);
            const feedColl = await db.collection(Utils.Collections.Feed);
            const curatedFeedColl = await db.collection(Utils.Collections.CuratedFeed);

            let spot = await spotsColl.findOne(Utils.IdFilter(spotId), { projection: { 'boards.id': 1, timestamp: 1 } });
            let boardIds = _.map(spots.boards, x => x.id);

            await spotsColl.deleteOne(Utils.IdFilter(spotId));

            const pullUpdate = {
                $pull: {
                    spots: { id: spotId }
                },
                $inc: { spotsCount: -1 }
            };

            // Update uploaded boards
            await uploadedBoardsColl.updateOne(
                { boardId: boardId, userId: userId, quarter: Utils.getYearQuarter(spot.timestamp) },
                pullUpdate
            );

            // Update other saved boards - TODO: should we remove??
            await savedBoardsColl.updateMany(
                { boardId: boardId, quarter: Utils.getYearQuarter(spot.timestamp), 'spots.id': spot.id },
                pullUpdate
            );

            // Update feed
            await feedColl.updateMany(
                { month: Utils.getYearMonth(spot.timestamp), 'spots.id': spot.id },
                pullUpdate
            );

            // Update curatedFeed
            await curatedFeedColl.updateMany(
                { 'spots.id': spot.id },
                pullUpdate
            );

            // Update user's uploaded boards
            await usersColl.updateOne(
                Utils.Collections.Users,
                { _id: new ObjectID(userId), 'uploadedBoards.id': { $in: boardIds } },
                {
                    $inc: { 'uploadedBoards.$[].spotsCount': -1 }
                }
            );

            await usersColl.updateOne(Utils.IdFilter(userId),
                {
                    pull: {
                        uploadedBoards: { $elemMatch: { id: { $in: boardIds }, spotsCount: 0 } }
                    }
                }
            );
        }

        const result = await DbService.execute(asyncFn);

        return result;
    }
}

module.exports = SpotsService;

