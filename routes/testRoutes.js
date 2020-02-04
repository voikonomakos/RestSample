const express = require('express');
const testRouter = express.Router();

module.exports = function () {
    const testController = require('../controllers/testController');

    testRouter.get('/count', testController.getCount);

    testRouter.post('/clear/users/boards', testController.clearUsersBoards);
    testRouter.post('/clear/users/social', testController.clearUsersSocial);
    testRouter.post('/notification', testController.testNotification);

    testRouter.delete('/feed', testController.clearFeed)

    return testRouter;
};
