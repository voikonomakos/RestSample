'use strict';
const _ = require('lodash');
const Utils = require('../common/utils');
const DbService = require('./dbService');
const { ObjectID } = require('mongodb');
const { User } = require('../data/userData');
var admin = require("firebase-admin");

class AdminService {

    static async getSpots(limit, next) {
        const filter = {};

        if (next) {
            filter = { timestamp: { $lt: next } };
        }

        const fields = { boards: 0, boardId: 0, boardTitle: 0, 'firebaseId': 0, comments: 0, isPublic: 0, savedBy: 0 };
        let sortBy = { timestamp: -1 };

        const spots = await DbService.find(Utils.Collections.Spots, filter, fields, sortBy, limit);

        return _.map(spots, Utils.mapId());
    }

    static async getCuratedFeed(userId, skip, take) {
        const fields = { 'spots.boards': 0, 'spots.boardId': 0, 'spots.boardTitle': 0, 'spots.firebaseId': 0, 'spots.comments': 0, 'spots.isPublic': 0, 'spots.savedBy': 0 };

        const result = await DbService.findOne(
            Utils.Collections.CuratedFeed,
            { userId: userId },
            fields
        );

        let spots = result.spots;
        spots = _.slice(spots, skip, skip + take);

        return _.orderBy(spots, ['timestamp'], ['desc']);
    }

    static async checkUser(username, email) {

        let returnObj = {
            isUsernameTaken: false,
            isEmailTaken: false
        }

        if (username) {
            let filter = { username: username };
            const user = await DbService.count(Utils.Collections.Users, filter);
            if (user > 0) {
                returnObj.isUsernameTaken = true;
            }
        }

        if (email) {
            let filter = { email: email };
            const user = await DbService.count(Utils.Collections.Users, filter);
            if (user > 0) {
                returnObj.isEmailTaken = true;
            }
        }

        return returnObj

    }

    static async setFeed(userId, spotIds) {

        const ids = _.map(spotIds, x => new ObjectID(x));
        const filter = { _id: { $in: ids } };

        const spots = await DbService.find(Utils.Collections.Spots, filter, {});

        await DbService.updateOne(
            Utils.Collections.CuratedFeed,
            { userId: userId },
            {
                $set: {
                    spots: spots,
                    spotsCount: spots.length
                }
            },
            { 'upsert': true });
    }


    static async updateFeed(userId, spotIds) {

        const ids = _.map(spotIds, x => new ObjectID(x));
        const filter = { _id: { $in: ids } };

        const spots = await DbService.find(Utils.Collections.Spots, filter, {});

        await DbService.updateOne(
            Utils.Collections.CuratedFeed,
            { userId: userId },
            {
                $push: { spots: { $each: spots } },
                $inc: { spotsCount: spots.length }
            },
            { 'upsert': true });
    }

    static async clearFeed(userId) {

        await DbService.updateOne(
            Utils.Collections.CuratedFeed,
            { userId: userId },
            {
                $set: { spots: [], spotsCount: 0 }
            }
        );
    }

    static async registerUser(email, password, username, name) {

        let checkUser = await AdminService.checkUser(username, email);

        if (!checkUser.isUsernameTaken && !checkUser.isEmailTaken) {
            var firebaseUser = await admin.auth().createUser({
                email: email,
                password: password
            })
                .then(function (userRecord) {
                    return userRecord;
                })
                .catch(function (error) {
                    return error;
                });

            if (firebaseUser.uid) {
                const newUser = new User(firebaseUser.uid, username, name, email);
                const insertResult = await DbService.insertOne(Utils.Collections.Users, newUser);

                let token = await admin.auth().createCustomToken(firebaseUser.uid)
                    .then(function (token) {
                        return token;
                    })
                    .catch(function (error) {
                        return error;
                    });

                return {
                    success: true,
                    token: token
                }

            }
            else {
                return firebaseUser;
            }
        }
        else {
            return checkUser;
        }
        /*
        const asyncFn = async function (db) {
            const usersColl = await db.collection(Utils.Collections.Users);
            const user = await usersColl.findOne({
                '$or': [
                    { email: email },
                    { username: username },
                ]
            }, { projection: { username: 1, email: 1 } });

            if (user) {
                if (username === user.username) {
                    return Errors.UserNameExists;
                } else {
                    return Errors.EmailExists;
                }
            } else {
                const newUser = new User(firebaseId, username, name, email);

                const insertResult = await usersColl.insertOne(newUser);

                return {
                    success: true,
                    id: insertResult.insertedId
                }
            }
        }

        const result = await DbService.execute(asyncFn);

        return result;
        */
    }


}

module.exports = AdminService;