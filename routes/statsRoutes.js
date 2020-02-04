const express = require('express');
const statsRouter = express.Router();

module.exports = function () {
  const statsController = require('../controllers/statsController');

  statsRouter.get('/all', statsController.getAllCount);
  statsRouter.get('/list', statsController.getStatsList);

  return statsRouter;
};
