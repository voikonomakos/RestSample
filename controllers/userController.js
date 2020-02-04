'use strict';

var _ = require('lodash');
const Utils = require('../common/utils');
const BaseController = require('./baseController');
const DbService = require('../services/dbService');
const UsersService = require('../services/usersService');
const LocationService = require('../services/locationService');

class UserController {

    get(req, res, fields, mapFn) {
        const userId = req.payload.userId;

        BaseController.prototype.executeRequest(
            res,
            () => DbService.findById(Utils.Collections.Users, userId, fields),
            result => { return { data: mapFn(result) } }
        );
    }

    me(req, res) {
        const fields = { uploadedBoards: 0, savedBoards: 0, followRequests: 0, myPeople: 0, followers: 0 };
        UserController.prototype.get(req, res, fields, Utils.mapId());
    }

    getSettings(req, res) {
        const fields = { username: 1, name: 1, email: 1, 'settings.isPushNotificationsEnabled': 1 };
        UserController.prototype.get(req, res, fields, Utils.mapId());
    }

    getMyFollowersNames(req, res) {
        const fields = { 'followers.username': 1, 'followers.userId': 1, _id: 0 };

        const mapFn = user => {
            let followers = _.map(user.followers, x => x.username);
            followers = _.orderBy(followers, x => x);
            return followers;
        };

        return UserController.prototype.get(req, res, fields, mapFn);
    }

    getMyFollowers(req, res) {
        const { take, next } = Utils.extract(req.query, Utils.SpotsQueryDefaultLimit, 0);
        const userId = req.payload.userId;

        const skip = next;
        BaseController.prototype.executeRequest(
            res,
            () => UsersService.getMyFollowers(userId, take, skip));
    }

    getMyPeople(req, res) {

        const { take, next } = Utils.extract(req.query, Utils.SpotsQueryDefaultLimit, 0);
        const userId = req.payload.userId;

        const skip = next;
        BaseController.prototype.executeRequest(
            res,
            () => UsersService.getMyPeople(userId, take, skip));
    }

    getFollowRequests(req, res) {
        const { take, next } = Utils.extract(req.query, Utils.SpotsQueryDefaultLimit, 0);
        const userId = req.payload.userId;

        const skip = next;
        BaseController.prototype.executeRequest(
            res,
            () => UsersService.getFollowRequests(userId, take, skip));
    }

    getMyCities(req, res) {
        const { take, next } = Utils.extract(req.query, Utils.UsersQueryDefaultLimit, 0);
        const userId = req.payload.userId;

        const skip = next;
        BaseController.prototype.executeRequest(res,
            () => LocationService.getCountriesCites(userId, take, skip, "cities"));
    }

    getMyCountries(req, res) {
        const { take, next } = Utils.extract(req.query, Utils.UsersQueryDefaultLimit, 0);
        const userId = req.payload.userId;

        const skip = next;
        BaseController.prototype.executeRequest(res,
            () => LocationService.getCountriesCites(userId, take, skip, "countries"));

        //  return UserController.prototype.getMyCitiesCountries(req, res, Utils.BoardType.COUNTRY);
    }

    getMyCitiesCountries(req, res, boardType) {
        const fields = { 'uploadedBoards.id': 1, 'uploadedBoards.title': 1, 'uploadedBoards.hasNestedBoards': 1, 'uploadedBoards.type': 1, _id: 0 };
        const mapFn = user => {
            const boards = _.filter(user.uploadedBoards, { type: boardType });
            return {
                boards: _.orderBy(boards, ['title']),
                next: null
            }
        }

        return UserController.prototype.get(req, res, fields, mapFn);
    }

    getBoards(req, res) {
        let userId = req.payload.userId;
        const { type } = req.query;
        const { boardId } = req.params;

        if (type == "1") {
            BaseController.prototype.executeRequest(
                res,
                () => UsersService.getSavedBoards(userId, boardId)
            );
        }
        else {
            BaseController.prototype.executeRequest(
                res,
                () => UsersService.getUploadedBoards(userId, boardId)
            );
        }
    }

    updateUserInfo(req, res) {
        const { name, email, bio, profile } = req.body;
        UserController.prototype.updateUser(req, res, {
            $set: { 'name': name, 'email': email, 'bio': bio, 'profile': profile }
        });
    }

    updateProfile(req, res) {
        UserController.prototype.updateUser(req, res, { $set: { 'profile': req.body } });
    }

    updateProfileImage(req, res) {
        const { image } = req.body;

        UserController.prototype.updateUser(req, res, { $set: { 'profileImage': image } });
    }

    updateCoverImage(req, res) {
        const { image } = req.body;

        UserController.prototype.updateUser(req, res, { $set: { 'coverImage': image } });
    }

    updateUser(req, res, update) {
        const userId = req.payload.userId;

        BaseController.prototype.executeRequest(
            res,
            () => UsersService.updateUser(userId, update)
        );
    }

    follow(req, res) {
        const userId = req.payload.userId;
        const { id } = req.body;

        BaseController.prototype.executeRequest(
            res,
            () => UsersService.follow(userId, id),
            Utils.Collections.Users
        );
    }

    accept(req, res) {
        const userId = req.payload.userId;
        const { id } = req.body;

        BaseController.prototype.executeRequest(
            res,
            () => UsersService.accept(userId, id)
        );
    }

    unFollow(req, res) {
        const userId = req.payload.userId;
        const { id } = req.body;

        BaseController.prototype.executeRequest(
            res,
            () => UsersService.unFollow(userId, id)
        );
    }

    // TODO: keep a list of rejected requests?
    reject(req, res) {
        const userId = req.payload.userId;
        const { id } = req.body;

        BaseController.prototype.executeRequest(
            res,
            () => UsersService.reject(userId, id)
        );
    }

    setNotificationToken(req, res) {
        const userId = req.payload.userId;
        const { token } = req.body;

        BaseController.prototype.executeRequest(res,
            () => UsersService.setNotificationToken(userId, token));
    }

    setNotificationSetting(req, res) {
        const userId = req.payload.userId;
        const { isEnabled } = req.body;

        BaseController.prototype.executeRequest(res,
            () => UsersService.setNotificationSetting(userId, isEnabled));
    }
}

module.exports = new UserController();