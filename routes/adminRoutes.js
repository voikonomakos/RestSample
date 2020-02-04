const express = require('express');
const adminRouter = express.Router();

module.exports = function () {
  const adminController = require('../controllers/adminController');

  adminRouter.get('/count', adminController.getCount);
  adminRouter.get('/create', adminController.create);
  adminRouter.get('/user/exists', adminController.checkUser);

  adminRouter.post('/categories', adminController.importCategories);
  adminRouter.post('/accounts', adminController.registerUser);
  adminRouter.post('/import', adminController.importSpots);
  adminRouter.post('/save', adminController.saveSpot);
  adminRouter.post('/clear/users/boards', adminController.clearUsersBoards);
  adminRouter.post('/clear/users/social', adminController.clearUsersSocial);
  adminRouter.post('/notification', adminController.testNotification);
  adminRouter.post('/feed', adminController.setCuratedFeed);

  adminRouter.put('/feed', adminController.updateCuratedFeed);
  adminRouter.put('/user/email', adminController.updateUserEmail);

  adminRouter.delete('/feed', adminController.clearFeed)
  adminRouter.delete('/users', adminController.deleteUsers)

  return adminRouter;
};
