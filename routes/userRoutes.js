'use strict';
const express = require('express');
const userRouter = express.Router();

module.exports = function () {
    const userController = require('../controllers/userController');

    userRouter.get('/', userController.me);

    userRouter.get('/followers', userController.getMyFollowers);
    userRouter.get('/followers/names', userController.getMyFollowersNames);
    userRouter.get('/following', userController.getMyPeople);
    userRouter.get('/cities', userController.getMyCities);
    userRouter.get('/countries', userController.getMyCountries);
    userRouter.get('/boards/:parent?', userController.getBoards);
    userRouter.get('/settings', userController.getSettings);
    userRouter.get('/followRequests', userController.getFollowRequests);

    userRouter.post('/follow', userController.follow);
    userRouter.post('/unfollow', userController.unFollow);
    userRouter.post('/accept', userController.accept);
    userRouter.post('/reject', userController.reject);
    userRouter.post('/settings/notifications/token', userController.setNotificationToken);
    userRouter.post('/settings/notifications', userController.setNotificationSetting);


    userRouter.put('/', userController.updateUserInfo);
    userRouter.put('/profile', userController.updateProfile);
    userRouter.put('/image/profile', userController.updateProfileImage);
    userRouter.put('/image/cover', userController.updateCoverImage);

    return userRouter;
};
