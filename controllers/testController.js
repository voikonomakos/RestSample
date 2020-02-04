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
const Location = require('../data/location');

class TestController {

    getSpots(req, res) {
        const { take, next } = Utils.extract(req.query, Utils.SpotsQueryDefaultLimit, null);

        BaseController.prototype.executeRequest(res, () => AdminService.getSpots(take, next));
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

    clearFeed(req, res) {
        const userId = req.query.userId;
        BaseController.prototype.executeRequest(res, () => AdminService.clearFeed(userId));
    }
}

module.exports = new TestController();