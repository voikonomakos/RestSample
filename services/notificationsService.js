'use strict';
const _ = require('lodash');
const Utils = require('../common/utils');
const DbService = require('./dbService');

class notificationsService {

    static async getNotifications(take, skip, userId) {

        const sortBy = { timestamp: -1 };
        let filter = { 'userId': userId };

        let notifications = await DbService.find(Utils.Collections.Notifications, filter, {}, sortBy, take, (skip * take));

        return {
            data: _.map(notifications, Utils.notificationMapping())
        }
    }
}

module.exports = notificationsService;


