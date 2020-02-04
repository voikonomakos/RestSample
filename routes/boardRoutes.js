const express = require('express');
const boardRouter = express.Router();

module.exports = function () {
  const boardController = require('../controllers/boardController');

  boardRouter.get('/', boardController.getBoard);


  return boardRouter;
};
