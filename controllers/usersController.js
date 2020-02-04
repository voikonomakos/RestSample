'use strict';
var _ = require('lodash');
const { User } = require('../data/userData');
const BaseController = require('./baseController');
const Utils = require('../common/utils');
const UsersService = require('../services/usersService');
const DbService = require('../services/dbService');

class UsersController extends BaseController {

    getAllUsers(req, res) {
        UsersController.prototype.getUsers(req, res, {});
    }

    getAllUsersInfo(req, res) {

        const fields = { username: 1, name: 1, email: 1, profileImage: 1, coverImage: 1 };
        UsersController.prototype.getUsers(req, res, fields);
    }

    getUsers(req, res, fields) {
        let { username, fid, take, skip } = req.query;

        BaseController.prototype.executeRequest(
            res,
            () => UsersService.getUsers(username, fid, take, skip, fields)
        );
    }

    getNames(req, res) {
        const fields = { username: 1 };
        UsersController.prototype.getUsers(req, res, fields);
    }

    search(req, res) {

        if (req.query.uid || req.params.userId) {
            let userId = req.query.uid ? req.query.uid : req.params.userId
            BaseController.prototype.executeRequest(
                res,
                () => DbService.findById(Utils.Collections.Users, userId),
                Utils.mapId());
        } else {
            const userId = req.payload.userId;
            let { keyword, take, skip } = req.query;

            take = take ? parseInt(take) : Utils.UsersQueryDefaultLimit;
            skip = skip ? parseInt(skip) : 0;

            BaseController.prototype.executeRequest(
                res,
                () => UsersService.search(userId, keyword, take, skip),
                users => users
                // users => {
                //     return {
                //         users: users,
                //         next: users.length == take ? skip + 1 : null
                //     }
                // },
            );
        }

    }

    createUser(req, res) {
        const { firebaseId, username, name, email, profileImage, coverImage, bio, profile } = req.body;
        const user = new User(firebaseId, username, name, email, profileImage, coverImage, bio, profile);

        BaseController.prototype.executeRequest(
            res,
            () => UsersService.createUser(user)
        );
    }

    updateUser(req, res) {
        const { id, name, email, bio, profile } = req.body;
        const update = {
            $set: { 'name': name, 'email': email, 'bio': bio, 'profile': profile }
        };
        BaseController.prototype.executeRequest(
            res,
            () => DbService.updateOne(Utils.Collections.Users, Utils.IdFilter(id), update)
        );
    }

    deleteById(req, res) {
        const { id } = req.params;

        BaseController.prototype.executeRequest(
            res,
            () => UsersService.deleteById(id),
            result => {
                if (!result.isSuccessful) {
                    throw Utils.getError(ErrorCodes.NotFound, "User not found.")
                }
            });
    }
}

module.exports = new UsersController();
