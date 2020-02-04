const express = require('express');
const notificationsRouter = express.Router();

module.exports = function () {
  const notificationsController = require('../controllers/notificationsController');

  notificationsRouter.get('/', notificationsController.getNotificatons);

  return notificationsRouter;
};
