'use strict';
const _ = require('lodash');
const Utils = require('../common/utils');
const DbService = require('./dbService');
const { ObjectID } = require('mongodb');

class boardService {

    static async getBoard(type, uid, take, skip) {

        let filter = {};
        const sortBy = { timestamp: -1 };

        if (uid) {
            filter = { "userId": uid };
        }

        let result = {};
        if (type == 1) {
            result = await DbService.find(Utils.Collections.SavedBoards, filter, {}, sortBy, take, (skip * take));
        }
        else {
            result = await DbService.find(Utils.Collections.UploadedBoards, filter, {}, sortBy, take, (skip * take));
        }

        return result;
    }

}

module.exports = boardService;


