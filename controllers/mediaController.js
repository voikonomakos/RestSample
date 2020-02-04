'use strict';
var _ = require('lodash');
const Utils = require('../common/utils');
const MediaService = require('../services/mediaService');
const BaseController = require('./baseController');

class MediaController {

    getMyPhotos(req, res) {
        const userId = req.payload.userId;
        //TODO: change 0 to null
        const { take, skip } = Utils.extract(req.query, Utils.PhotosDefaultLimit, 0);

        BaseController.prototype.executeRequest(res,
            () => MediaService.getMyPhotos(userId, take, skip));
    }

    getRelatedPhotos(req, res) {
        //TODO: change 0 to null
        const { take, skip } = Utils.extract(req.query, Utils.PhotosDefaultLimit, 0);
        const { long, lat } = req.query;
        const { googlePlaceId } = req.params;

        BaseController.prototype.executeRequest(
            res,
            () => MediaService.getRelatedPhotos(googlePlaceId, long, lat, take, skip));
    }

    uploadPhotos(req, res) {
        const { spotId, media } = req.body;

        BaseController.prototype.executeRequest(res,
            () => MediaService.uploadPhotos(spotId, media)
        );
    }
}

module.exports = new MediaController();