'use strict';

var _ = require('lodash');
const Utils = require('../common/utils');
const { Spot } = require('../data/spotsData');
const BaseController = require('./baseController');
const SpotsService = require('../services/spotsService');
const LocationService = require('../services/locationService');

class SpotsController extends BaseController {

    search(req, res) {
        const { id } = req.params;
        const userId = req.payload.userId;

        if (id) {
            BaseController.prototype.executeRequest(
                res,
                () => SpotsService.find(id));
        } else {
            const { keyword } = req.query;
            const { take, next } = Utils.extract(req.query, Utils.SpotsQueryDefaultLimit, 0);
            const skip = next;

            BaseController.prototype.executeRequest(
                res,
                () => SpotsService.search(userId, keyword, take, skip)
            );
        }
    }

    getMyUploadedSpots(req, res) {
        SpotsController.prototype.getBoardSpots(req, res, Utils.Collections.UploadedBoards);
    }

    getMySavedSpots(req, res) {
        SpotsController.prototype.getBoardSpots(req, res, Utils.Collections.SavedBoards);
    }

    getBoardSpots(req, res, collectionName) {
        const { boardId, listView } = req.params;
        const { take, next } = Utils.extract(req.query, Utils.SpotsQueryDefaultLimit, null);
        const userId = req.payload.userId;

        const skip = next;
        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.getBoardSpots(boardId, userId, take, skip, collectionName, listView)
        )
    }

    updateBoardThumbnail(req, res) {
        const { placeholderColor, url } = req.body;
        const { boardId } = req.params;

        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.updateBoardThumbnail(placeholderColor, url, boardId)
        );
    }

    getAllSpots(req, res) {
        const { take, next } = Utils.extract(req.query, Utils.SpotsQueryDefaultLimit, 0);
        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.getAllSpots(take, next)
        );
    }

    getSpotByUserId(req, res) {
        const { take, skip } = Utils.extract(req.query, Utils.SpotsQueryDefaultLimit, 0);
        let userId = req.query.userId;
        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.getSpotByUserId(userId, take, skip)
        );
    }

    getSpotsForMe(req, res) {
        let { ts } = req.params;
        let userId = req.query.userId;
        const { take, next } = Utils.extract(req.query, Utils.SpotsQueryDefaultLimit, 0);

        const skip = next;
        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.getSpotsForMe(userId, take, skip, ts)
        );
    }

    getMyPeopleSpots(req, res) {
        const { ts } = req.params;
        const { take, next } = Utils.extract(req.query, Utils.SpotsQueryDefaultLimit, null);
        const userId = req.payload.userId;

        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.getMyPeopleSpots(userId, take, next, ts)
        );
    }

    getFeeds(req, res) {
        const { take, next } = Utils.extract(req.query, Utils.SpotsQueryDefaultLimit, 0);
        const userId = req.payload.userId;
        const type = req.query;

        const skip = next;
        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.getFeeds(userId, take, skip, type)
        );
    }


    getComments(req, res) {
        const { spotId } = req.params;
        const { take, next } = Utils.extract(req.query, Utils.CommentsQueryDefaultLimit, 0);

        const skip = next;
        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.getComments(spotId, take, skip)
        );
    }

    getVerifiedBy(req, res) {
        const userId = req.payload.userId;
        const { spotId } = req.params;
        const { take, next } = Utils.extract(req.query, Utils.UsersQueryDefaultLimit, 0);

        const skip = next;
        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.getVerifiedBy(userId, spotId, take, skip)
        );
    }

    getSavedBy(req, res) {
        const userId = req.payload.userId;
        const { spotId } = req.params;
        const { take, skip } = Utils.extract(req.query, Utils.UsersQueryDefaultLimit, 0);

        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.getSavedBy(userId, spotId, take, skip)
        );
    }


    upload(req, res) {
        const userId = req.payload.userId;
        const { media, description, location, category, platform, firebaseId } = req.body;
        const spot = new Spot(media, null, description, location, category, platform, firebaseId);

        const { boardId, boardTitle, boards } = spot.getBoardsInfo();

        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.uploadSpot(spot, userId, boardId, boardTitle, boards)
        );
    }

    verify(req, res) {
        const userId = req.payload.userId;
        const spotId = req.body.id;

        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.verify(userId, spotId));
    }

    unverify(req, res) {
        const userId = req.payload.userId;
        const spotId = req.body.id;

        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.unverify(userId, spotId));
    }

    save(req, res) {
        const userId = req.payload.userId;
        const spotId = req.body.id;

        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.save(userId, spotId));
    }

    unsave(req, res) {
        const userId = req.payload.userId;
        const spotId = req.body.id;

        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.unsave(userId, spotId));
    }

    comment(req, res) {
        const userId = req.payload.userId;
        const { spotId, message } = req.body;

        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.comment(userId, spotId, message));
    }

    update(req, res) {
        const userId = req.payload.userId;
        const { spotId, description, media, timestamp } = req.body;

        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.updateSpotDetail(userId, spotId, description, media, timestamp)
        );
    }

    updateSpotSubCategory(req, res) {
        //first
        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.updateSpotSubCategory(req.body.id, { $set: req.body })
        );
    }

    deleteSpotMedia(req, res) {
        const userId = req.payload.userId;
        const { spotId, mediaId, mediaType, timestamp } = req.body;

        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.deleteSpotMedia(userId, spotId, mediaId, mediaType, timestamp)
        );
    }

    deleteSpot(req, res) {
        const userId = req.payload.userId;
        const { spotId } = req.query;

        BaseController.prototype.executeRequest(
            res,
            () => SpotsService.deleteSpotById(spotId)
        );
    }
}

module.exports = new SpotsController();