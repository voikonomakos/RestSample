'use strict';
const _ = require('lodash');
const Utils = require('../common/utils');
const DbService = require('./dbService');
const { ObjectID } = require('mongodb');

class configurationsService {

    static async getRandom() {
        let result = await DbService.getRandom(Utils.Collections.UploadMessage, 1);
        return result[0].text;
    }

    static async getUploadMessages(limit, next) {
        limit = limit ? parseInt(limit) : Utils.UploadMessageQueryDefaultLimit;
        next = next ? parseInt(next) : 0;
        const skip = next * limit;
        let filter = {};

        let uploadMessages = await DbService.find(Utils.Collections.UploadMessage, filter, {}, { _id: -1 }, limit, skip);
        
        let retMsg = [];

        _.map(uploadMessages, msg => {
            msg.id = msg._id;
            delete msg._id;
            retMsg.push(msg);
        });

        return {
            uploadMessages: retMsg,
            next: uploadMessages.length == limit ? next + 1 : null
        }
    }

    static async createUploadMessages(payload) {
        let result = await DbService.insertOne(Utils.Collections.UploadMessage, payload);
        return result;
    }
    
    static async deleteUploadMessages(msgId) {
        let result = await DbService.deleteById(Utils.Collections.UploadMessage, msgId);
        return result;
    }
    
    static async updateUploadMessages(payload, msgId) {
        let result =  await DbService.update(
            Utils.Collections.UploadMessage,
            { _id: new ObjectID(msgId) },
            {
                $set: payload
            });
        return result;
    }
    
   
}

module.exports = configurationsService;


