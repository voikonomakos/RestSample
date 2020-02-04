'use strict';
const { MongoClient, ObjectID } = require('mongodb');
var _ = require('lodash');
const Respond = require('../common/respond.js');
const Utils = require('../common/utils');
const { iSpot } = require('../data/iSpot');
const BaseController = require('./baseController');
const { UserBasicInfo } = require('../data/userData');
const MessagingService = require('../services/messagingService');
const DbService = require('../services/dbService');
const AdminService = require('../services/adminService');
const Errors = require('../common/errors.js');

class AdminController {


    getSpots(req, res) {
        const { limit, next } = Utils.extract(req.query, Utils.SpotsQueryDefaultLimit, null);

        BaseController.prototype.executeRequest(res, () => AdminService.getSpots(limit, next));
    }

    getCuratedFeed(req, res) {
        let { userId, skip, take } = req.query;

        take = take ? parseInt(take) : Utils.SpotsQueryDefaultLimit;
        skip = skip ? parseInt(skip) : 0;

        BaseController.prototype.executeRequest(
            res,
            () => AdminService.getCuratedFeed(userId, skip, take));
    }

    getCount(req, res) {
        const name = req.query.name;
        BaseController.prototype.executeRequest(
            res,
            () => DbService.count(name, {}));
    }

    checkUser(req, res) {
        const { username, email } = req.query;

        if (!username && !email) {
            Respond.badRequest(res, Errors.MissingParameters);
        }

        BaseController.prototype.executeRequest(
            res,
            () => AdminService.checkUser(username, email));
    }

    importCategories(req, res) {
        const category = req.body;
        BaseController.prototype.executeRequest(res,
            () => DbService.insertOne(Utils.Collections.Categories, category));
    }

    create(req, res) {
        let skip = req.query.skip;

        skip = skip ? parseInt(skip) : 0;

        const asyncFn = async function (db) {
            const usersColl = await db.collection(Utils.Collections.Users);
            const spotsColl = await db.collection(Utils.Collections.Spots);
            const curatedFeedColl = await db.collection(Utils.Collections.CuratedFeed);

            const users = await usersColl.find({}, { _id: 1 }).sort({ username: 1 }).skip(skip).limit(100).toArray();
            let spots = await spotsColl.find({}).sort({ timestamp: 1 }).skip(1000).limit(1000).toArray();

            for (var i = 0; i < users.length; i++) {
                spots = _.sampleSize(spots, 100);
                await curatedFeedColl.updateOne(
                    { userId: users[i]._id.toString() },
                    {
                        $inc: { spotsCount: spots.length },
                        $set: { spots: spots }
                    },
                    { upsert: true }
                );
            }
        };

        BaseController.prototype.executeRequest(res, () => DbService.execute(asyncFn));

    }

    importSpots(req, res) {

        const spot = req.body;
        const model = new iSpot();

        const { boardId, boardTitle, boards } = model.getBoards(spot.location);
        const asyncFn = async function (db) {
            const usersColl = await db.collection(Utils.Collections.Users);
            const spotsColl = await db.collection(Utils.Collections.Spots);
            const uploadedBoardsColl = await db.collection(Utils.Collections.UploadedBoards);
            const feedColl = await db.collection(Utils.Collections.Feed);

            const me = await usersColl.findOne(
                { firebaseId: spot.user.id },
                {
                    projection: {
                        username: 1,
                        name: 1,
                        profileImage: 1,
                        coverImage: 1,
                        uploadedBoards: 1
                    }
                });

            const userInfo = new UserBasicInfo(me._id.toString(), me.username, me.name, me.profileImage, me.coverImage);
            const userId = userInfo.id;
            spot.user = userInfo;
            spot.boardId = boardId;
            spot.boardTitle = boardTitle;
            spot.boards = boards;
            spot.isPublic = true;

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

            await feedColl.updateOne({ userId: spot.user.id, month: Utils.getYearMonth(spot.timestamp) },
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
                    boards[index].thumbnail = boardMedia
                    newBoards.push(boards[index]);
                } else {
                    await DbService.updateOne(
                        Utils.Collections.Users,
                        { _id: new ObjectID(userId), 'uploadedBoards.id': boards[index].id },
                        { $set: { 'uploadedBoards.$.thumbnail': boardMedia } }
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

        BaseController.prototype.executeRequest(res, () => DbService.execute(asyncFn));
    }

    import(req, res) {
        const spot = req.body;
        const model = new iSpot();

        const { boardId, boardTitle, boards } = model.getBoards(spot.location);
        let result;
        let f = async function (db) {

            const usersColl = await db.collection("users");
            const spotsColl = await db.collection("spots");
            const uploadedBoardsColl = await db.collection('uploadedBoards');

            let spotInsert = false;
            let uploadedBoardsUpdate = false;
            let feedsUpdate = true;
            let userBoardsUpdate = true;

            const user = await usersColl.findOne(
                { firebaseId: spot.user.id },
                {
                    projection: {
                        username: 1,
                        name: 1,
                        profileImage: 1,
                        coverImage: 1,
                        uploadedBoards: 1
                    }
                });

            const userInfo = new UserBasicInfo(user._id.toString(), user.username, user.name, user.profileImage, user.coverImage);

            spot.user = userInfo;
            spot.boardId = boardId;
            spot.boardTitle = boardTitle;
            spot.boards = boards;

            /* const subCategories = [];
             if (spot.category && spot.subCategories) {
                 for (var name in spot.subCategories) {
                     subCategories.push(name);
                 }
             }
 
             spot.subCategories = subCategories;*/
            // insert spot
            result = await spotsColl.insertOne(spot);
            spotInsert = result.insertedId !== null;

            spot.id = result.insertedId.toString();
            delete spot._id;

            delete spot.boardId;
            delete spot.boardTitle;
            delete spot.boards;

            // add to uploaded boards
            result = await uploadedBoardsColl.updateOne(
                { boardId: boardId, userId: userInfo.id, quarter: Utils.getYearQuarter(spot.timestamp) },
                {
                    $push: { spots: spot },
                    $set: { title: boardTitle },
                    $inc: { spotsCount: 1 }
                },
                { upsert: true }
            );

            uploadedBoardsUpdate = result.modifiedCount > 0;


            // Update user with new boards
            let newBoards = [];
            const userUploadedBoards = user.uploadedBoards || [];
            for (let index = 0; index < boards.length; index++) {
                const board = _.find(userUploadedBoards, { id: boards[index].id });

                if (!board) {
                    newBoards.push(boards[index]);
                }
            }

            if (newBoards.length > 0) {

                var newCountriesCount = _.filter(newBoards, { type: Utils.BoardType.COUNTRY }).length;
                var newCitiesCount = _.filter(newBoards, { type: Utils.BoardType.CITY }).length;
                result = await usersColl.updateOne(
                    { _id: new ObjectID(userInfo.id) },
                    {
                        $push: { uploadedBoards: { $each: newBoards } },
                        $inc: { countriesCount: newCountriesCount, citiesCount: newCitiesCount }
                    }
                );

                userBoardsUpdate = result.modifiedCount > 0;
            }

            return {
                spotInsert: spotInsert,
                uploadedBoardsUpdate: uploadedBoardsUpdate,
                feedsUpdate: feedsUpdate,
                userBoardsUpdate: userBoardsUpdate
            };
        };

        BaseController.prototype.executeRequest(res, f);
    }

    saveFeedSpot(req, res) {
        const { fsid, fuid } = req.body;

        const asyncFn = async function (db) {
            const usersColl = await db.collection(Utils.Collections.Users);
            const spotsColl = await db.collection(Utils.Collections.Spots);
            const curatedFeedColl = await db.collection(Utils.Collections.CuratedFeed);

            const user = await usersColl.findOne(
                { firebaseId: fuid },
                { projection: { _id: 1 } }
            );

            const userId = user._id.toString();

            const spot = await spotsColl.findOne(
                { firebaseId: fsid }
            );


            if (spot && user) {
                debug(spot._id);

                const spotId = spot._id.toString();
                spot.id = spotId;
                delete spot._id;

                await curatedFeedColl.updateOne(
                    { userId: userId },
                    {
                        $push: { spots: spot },
                        $inc: { spotsCount: 1 }
                    },
                    { upsert: true }
                );
            } else {
                Utils.debug('Not found');
            }

        }

        BaseController.prototype.executeRequest(res, () => DbService.execute(asyncFn));

    }

    saveSpot(req, res) {
        const { fsid, fuid } = req.body;

        const asyncFn = async function (db) {
            const usersColl = await db.collection(Utils.Collections.Users);
            const spotsColl = await db.collection(Utils.Collections.Spots);
            const savedBoardsColl = await db.collection(Utils.Collections.SavedBoards);
            const uploadedBoardsColl = await db.collection(Utils.Collections.UploadedBoards);
            const feedColl = await db.collection(Utils.Collections.Feed);
            const curatedFeedColl = await db.collection(Utils.Collections.CuratedFeed);

            // Find user
            const user = await usersColl.findOne(
                { firebaseId: fuid },
                { projection: { 'savedBoards.id': 1, username: 1, name: 1, email: 1, profileImage: 1, coverImage: 1 } }
            );

            const userId = user._id.toString();

            const userInfo = new UserBasicInfo(userId, user.username, user.name, user.profileImage, user.coverImage);

            // Update spot
            let result = await spotsColl.findOneAndUpdate(
                { firebaseId: fsid },
                {
                    $addToSet: { savedBy: userInfo }
                },
                { returnOriginal: false }
            );


            if (result && result.value && user) {
                debug(result.value._id);

                let spot = result.value;
                const spotId = spot._id.toString();

                spot.id = spotId;
                delete spot._id;

                // Update user's boards
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
                        newBoards.push(boards[index]);
                    } else {
                        await DbService.updateOne(
                            Utils.Collections.Users,
                            { _id: new ObjectID(userId), 'savedBoards.id': boards[index].id },
                            { $set: { 'savedBoards.$.thumbnail': boardMedia } }
                        );
                    }
                }

                if (newBoards.length > 0) {
                    await usersColl.updateOne(
                        Utils.IdFilter(userId),
                        {
                            $push: { savedBoards: { $each: newBoards } }
                        }
                    );
                }


                // Update user's saved board


                const boardId = spot.boardId;
                const boardTitle = spot.boardTitle;

                delete spot.boards;
                delete spot.boardId;
                delete spot.boardTitle;
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
                    { 'spots.id': spot.id },
                    pushUpdate
                );

            } else {
                Utils.debug('Not found');
            }

        }

        BaseController.prototype.executeRequest(res, () => DbService.execute(asyncFn));
    }

    save(req, res) {
        const { fsid, fuid } = req.body;

        (async function mongo() {
            let client;
            try {
                client = await MongoClient.connect(Utils.MongoDbConnectionString, { useNewUrlParser: true });

                const db = client.db(Utils.MongoDbName);
                const usersColl = await db.collection('users');
                const spotsColl = await db.collection('spots');
                const savedBoardsColl = await db.collection('savedBoards');
                const uploadedBoardsColl = await db.collection('uploadedBoards');
                const peopleFeedsColl = await db.collection('peopleFeeds');
                const personalFeedsColl = await db.collection('personalFeeds');

                let result;

                const user = await usersColl.findOne(
                    { firebaseId: fuid },
                    { projection: { 'savedBoards.id': 1 } })


                const spot = await spotsColl.findOne(
                    { firebaseId: fsid }
                );

                debug(spot ? spot._id : 'not found');
                if (spot && user) {
                    const boards = spot.boards || [];
                    const userSavedBoards = user.savedBoards || [];
                    let newBoards = [];
                    debug(boards);
                    for (var index = 0; index < boards.length; index++) {
                        const board = _.find(userSavedBoards, { id: boards[index].id });

                        if (!board) {
                            newBoards.push(boards[index]);
                        }
                    }
                    debug(newBoards);
                    if (newBoards.length > 0) {
                        result = await usersColl.updateOne(
                            { _id: user._id },
                            {
                                $push: { savedBoards: { $each: newBoards } }
                            }
                        );

                    }

                    /* await peopleFeedsColl.updateMany(
                         { month: Utils.getYearMonth(spot.timestamp), 'spots._id': spot._id },
                         {
                             $inc: { 'spots.$.saves': 1 }
                         }
                     );
 
                     await personalFeedsColl.updateMany(
                         { month: Utils.getYearMonth(spot.timestamp), 'spots._id': spot._id },
                         {
                             $inc: { 'spots.$.saves': 1 }
                         }
                     );*/

                    const boardId = spot.boardId;
                    const boardTitle = spot.boardTitle;

                    /* result = await uploadedBoardsColl.updateOne(
                         { boardId: boardId, userId: spot.user.userId, year: Utils.getYearQuarter(spot.timestamp), 'spots._id': spot._id },
                         {
                             $inc: { 'spots.$.saves': 1 }
                         }
                     );*/


                    delete spot.boards;
                    delete spot.boardId;
                    delete spot.boardTitle;

                    spot.id = spot._id.toString();
                    delete spot._id;

                    result = await savedBoardsColl.updateOne(
                        { boardId: boardId, userId: user._id.toString(), year: Utils.getYearQuarter(spot.timestamp) },
                        {
                            $push: { spots: spot },
                            $set: { title: boardTitle },
                            $inc: { spotsCount: 1 }
                        },
                        { upsert: true }
                    );


                }



                Respond.ok(res);
            } catch (error) {
                debug(error.stack);
                Respond.err(res, error.message);
            }

            client.close();
        })();
    }

    clearUsersBoards(req, res) {
        BaseController.prototype.executeRequest(
            res,
            () => DbService.updateMany(Utils.Collections.Users, {},
                {
                    $set: {
                        savedBoards: [],
                        uploadedBoards: [],
                        citiesCount: 0,
                        countriesCount: 0
                    }
                })
        );
    }

    clearUsersSocial(req, res) {
        BaseController.prototype.executeRequest(
            res,
            () => DbService.updateMany(Utils.Collections.Users, {},
                {
                    $set: {
                        followers: [],
                        myPeople: [],
                        followRequests: [],
                        followersCount: 0,
                        myPeopleCount: 0,
                        followRequestsCount: 0,
                    }
                })
        );
    }

    testNotification(req, res) {
        const { token } = req.body;

        BaseController.prototype.executeRequest(
            res,
            () => MessagingService.sendTestMessage(token));
    }

    registerUser(req, res) {
        const { email, password, username, name } = req.body;
        BaseController.prototype.executeRequest(res, 
            () => AdminService.registerUser(email, password, username, name));

        /*
        if (!username || !uid) {
            Respond.badRequest(res);
        }
        (async function mongo() {
            try {
                let firebaseId = uid;
                /*  if (req.token) {
                      const decodedToken = await admin.auth().verifyIdToken(req.token);
                      firebaseId = decodedToken.uid;
                  } else if (req.query.fid) {
                      firebaseId = req.query.fid;
                  }*/
                /*
                if (firebaseId) {
                    const result = await AdminService.registerUser(firebaseId, username, username);
                    if (result.success) {
                        Respond.ok(res, result);
                    } else {
                        Respond.badRequest(res, result);
                    }
                } else {
                    Respond.badRequest(res, Errors.MissingParameters);
                }
            } catch (error) {
                Respond.badRequest(res, { message: error.message });
            }
        })();
        */
    }

    setCuratedFeed(req, res) {
        const userId = req.query.userId;
        const spotIds = req.body.spots;

        BaseController.prototype.executeRequest(res, () => AdminService.setFeed(userId, spotIds));
    }

    updateCuratedFeed(req, res) {
        const userId = req.query.userId;
        const spotIds = req.body.spots;

        BaseController.prototype.executeRequest(res, () => AdminService.updateFeed(userId, spotIds))
    }

    clearFeed(req, res) {
        const userId = req.query.userId;
        BaseController.prototype.executeRequest(res, () => AdminService.clearFeed(userId));
    }

    deleteUsers(req, res) {

        BaseController.prototype.executeRequest(res, () => DbService.delete("users", { "_id": { $gt: new ObjectID("5bdc287baf6d7e29188ded80") } }));
    }

    updateUserEmail(req, res) {
        const { fid, email } = req.body;
        Utils.log(req.body);
        BaseController.prototype.executeRequest(
            res,
            () => DbService.updateOne("users", { firebaseId: fid }, { $set: { email: email } }));
    }
}

module.exports = new AdminController();