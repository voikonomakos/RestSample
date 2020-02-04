var _ = require('lodash');
const Utils = require('../common/utils');
const DbService = require('./dbService');
const { Follower, ToFollow } = require('../data/userData');
var _ = require('lodash');
const { ObjectID } = require('mongodb');
const MessagingService = require('./messagingService');

class UsersService {

    static async getUsers(username, limit, next, fields) {
        limit = limit ? parseInt(limit) : Utils.UsersQueryDefaultLimit;
        next = next ? parseInt(next) : 0;
        const skip = next * limit;

        let filter = {};

        if (username) {
            filter = { username: username };
        }

        let users = await DbService.find(Utils.Collections.Users, filter, fields, { username: -1 }, limit, skip);
        users = _.map(users, Utils.mapId());

        return {
            users: users,
            next: users.length == limit ? next + 1 : null
        }
    }

    static async search(userId, keyword, limit, skip) {
        let filter;// = { $text: { $search: keyword } };
        //coll.createIndex( { name: "text", description: "text" } )
        //const skip = limit * next;

        if (keyword) {
            filter = {
                '$and': [
                    { _id: { $ne: new ObjectID(userId) } },
                    {
                        '$or': [
                            { name: { '$regex': keyword, $options: 'i' } },
                            { username: { '$regex': keyword, $options: 'i' } },
                            { email: { '$regex': keyword, $options: 'i' } },
                            { 'profile.interests': { '$regex': keyword, $options: 'i' } }
                        ]
                    }
                ]

            };
        } else {
            filter = { _id: { $ne: new ObjectID(userId) } };
        }

        const fields = { username: 1, name: 1, email: 1, profileImage: 1, coverImage: 1, uploadedSpotsCount: 1 };
        let sortBy = { uploadedSpotsCount: -1 };

        const fn = async function (coll) {

            const me = await coll.findOne({ _id: new ObjectID(userId) }, { projection: { _id: 0, 'myPeople.id': 1, 'followers.id': 1 } });
            const users = await coll.find(filter, { projection: fields }).sort(sortBy).skip(skip).limit(limit).toArray();

            const result = _.map(users, user => {
                user.isMyFollower = Utils.exists(me.followers, follower => user._id.toString() == follower.id);
                user.isInMyPeople = Utils.exists(me.myPeople, person => user._id.toString() == person.id);
                user.isFollowedByViewer = user.isInMyPeople;
                return Utils.mapId()(user);
            });

            return result;
        }

        const result = await DbService.execute(fn, Utils.Collections.Users);

        return result;
    }

    static async getMyFollowers(userId, limit, skip) {
        return UsersService.getList(userId, 'followers', limit, skip);
    }

    static async getMyPeople(userId, limit, skip) {
        return UsersService.getList(userId, 'myPeople', limit, skip);
    }

    static async getFollowRequests(userId, limit, skip) {
        return UsersService.getList(userId, 'followRequests', limit, skip);
    }

    static async getList(userId, fieldName, limit, skip) {
        const params = [];
        params.push({ $match: Utils.IdFilter(userId) });
        params.push({ $project: { _id: 0, [fieldName]: 1 } });
        params.push({ $project: { 'value': '$' + [fieldName] } })
        params.push({ $unwind: '$value' });
        params.push({ $sort: { 'value.username': 1 } });
        params.push({ $skip: skip });
        params.push({ $limit: limit });

        const result = await DbService.aggregate(Utils.Collections.Users, params);
        const data = _.map(result, x => x.value);
        return Utils.pagingResult(data, limit, () => skip + limit);
    }

    static async getSavedBoards(userId, parent) {
        return UsersService.getMyBoards(userId, parent, "savedBoards");
    }

    static async getUploadedBoards(userId, parent) {
        return UsersService.getMyBoards(userId, parent, "uploadedBoards");
    }

    static async getMyBoards(userId, parent, collectionName) {

        const params = [];
        params.push({ $match: { _id: new ObjectID(userId) } });
        if (parent) {
            params.push({
                $project: {
                    boards: {
                        $filter: {
                            input: '$' + [collectionName],
                            as: "item",
                            cond: { $eq: ["$$item.parent", parent] }
                        }
                    }
                }
            });
        } else {
            params.push({
                $project: {
                    boards: {
                        $filter: {
                            input: '$' + [collectionName],
                            as: "item",
                            cond: { $eq: ["$$item.nestingLevel", 0] }
                        }
                    }
                }
            });
        }

        params.push({
            $project: { 'boards': 1 }
        });

        const result = await DbService.aggregate(Utils.Collections.Users, params);
        Utils.debug(result);
        if (result.length > 0) {
            const data = _.map(result[0].boards, x => {
                delete x.spotsCount;
                x.thumbnail = x.thumbnail || {
                    placeholderColor: null,
                    url: null
                }

                return x;
            });

            return { data: _.orderBy(data, ['title']) };
        } else {
            return [];
        }
    }

    static async createUser(user) {
        await DbService.insertOne(Utils.Collections.Users, user);
    }

    static async updateUserById(Id, update) {

        const result = await DbService.findOneAndUpdate(
            Utils.Collections.Users,
            { _id: new ObjectID(Id) },
            update
        );

        return result;
    }

    static async updateUser(userId, update) {

        const result = await DbService.updateOne(
            Utils.Collections.Users,
            { _id: new ObjectID(userId) },
            update
        );

        return result;
    }

    static async follow(userId, otherUserId) {

        const fn = async function (coll) {

            let users = await coll
                .find({ _id: { $in: [new ObjectID(userId), new ObjectID(otherUserId)] } })
                .project({ username: 1, name: 1, 'profile.isPublic': 1, profileImage: 1, coverImage: 1 })
                .toArray();

            if (users.length !== 2) {
                throw { message: 'user_not_found' };
            } else {
                const user = _.find(users, x => x._id == userId);
                const other = _.find(users, x => x._id == otherUserId);

                if (other.profile.isPublic) {
                    // Add to other's followers
                    await coll.updateOne(
                        Utils.IdFilter(otherUserId),
                        {
                            $addToSet: {
                                followers: new Follower(userId,
                                    user.username,
                                    user.name,
                                    user.profileImage,
                                    user.coverImage)
                            },
                            $inc: { followersCount: 1 }
                        }
                    );

                    // Add to my people
                    await coll.updateOne(
                        Utils.IdFilter(userId),
                        {
                            $addToSet: {
                                myPeople: new ToFollow(otherUserId,
                                    other.username,
                                    other.name,
                                    other.profileImage,
                                    other.coverImage)
                            },
                            $inc: { myPeopleCount: 1 }
                        }
                    );

                    MessagingService.sendMessage(userId, Utils.NotificationType.FOLLOW, null, otherUserId);

                } else {
                    await coll.updateOne(
                        Utils.IdFilter(otherUserId),
                        {
                            $addToSet: { followRequests: new Follower(userId, user.username, user.name, user.profileImage, user.coverImage) },
                            $inc: { followRequestsCount: 1 }
                        }
                    );

                    MessagingService.sendMessage(userId, Utils.NotificationType.FOLLOW_REQUEST, null, otherUserId);
                }

            }
        }

        const result = await DbService.execute(fn, Utils.Collections.Users);

        return result;
    }

    static async accept(userId, otherUserId) {

        const fn = async function (coll) {

            let users = await coll
                .find({ _id: { $in: [new ObjectID(userId), new ObjectID(otherUserId)] } })
                .project({ username: 1, name: 1, 'profile.isPublic': 1, profileImage: 1, coverImage: 1 })
                .toArray();

            if (users.length !== 2) {
                throw Utils.getError(0, 'user_not_found');
            } else {
                const user = _.find(users, x => x._id == userId);
                const other = _.find(users, x => x._id == otherUserId);

                // Add to my followers
                await coll.updateOne(
                    Utils.IdFilter(userId),
                    {
                        $addToSet: {
                            followers: new Follower(otherUserId,
                                other.username,
                                other.name,
                                other.profileImage,
                                other.coverImage)
                        },
                        $pull: { followRequests: { id: otherUserId } },
                        $inc: { followRequestsCount: -1, followersCount: 1 }
                    }
                );

                // Add to other's my people
                await coll.updateOne(
                    Utils.IdFilter(otherUserId),
                    {
                        $addToSet: {
                            myPeople: new ToFollow(userId,
                                user.username,
                                user.name,
                                user.profileImage,
                                user.coverImage)
                        },
                        $inc: { myPeopleCount: 1 }
                    }
                );
            }
        }

        const result = await DbService.execute(fn, Utils.Collections.Users);

        return result;
    }

    static async unFollow(userId, otherUserId) {

        let fn = async function (coll) {
            // remove from other's followers
            await coll.updateOne(
                Utils.IdFilter(otherUserId),
                { $pull: { followers: { id: userId } }, $inc: { followersCount: -1 } }
            );

            // remove from myPeople
            await coll.updateOne(
                Utils.IdFilter(userId),
                { $pull: { myPeople: { id: otherUserId } }, $inc: { myPeopleCount: -1 } }
            );
        }

        const result = await DbService.execute(fn, Utils.Collections.Users);

        return result;
    }

    // TODO: keep a list of rejected requests?
    static async reject(userId, otherUserId) {

        const result = await DbService.updateOne(
            Utils.Collections.Users,
            Utils.IdFilter(userId),
            {
                $pull: { followRequests: { id: otherUserId } },
                $inc: { followRequestsCount: -1 }
            }
        );

        return result;
    }

    static async setNotificationToken(userId, notificationToken) {
        const result = await DbService.updateOne(Utils.Collections.Users,
            Utils.IdFilter(userId),
            {
                $push: { 'settings.notificationTokens': notificationToken }
            });

        return result;
    }

    static async setNotificationSetting(userId, isEnabled) {
        const result = await DbService.updateOne(Utils.Collections.Users,
            Utils.IdFilter(userId),
            {
                $set: { 'settings.isPushNotificationsEnabled': isEnabled }
            });

        return result;
    }

    static async deleteById(userId) {

        var result = await DbService.deleteById(Utils.Collections.Users, userId);

        //let user = await DbService.findById(Utils.Collections.Users, userId);
        //if (user) {
        //await DbService.deleteByIds(Utils.Collections.Users, _.map(user.savedBoards, savedBoard => savedBoard.id))
        //Utils.deleteImages('users/'+user.firebaseId);
        //}
        return { isSuccessful: result };
    }
}
module.exports = UsersService;