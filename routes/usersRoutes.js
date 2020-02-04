'use strict';
const express = require('express');
const usersRouter = express.Router();

module.exports = function () {
  const usersController = require('../controllers/usersController');

  usersRouter.get('/', usersController.search);
  usersRouter.get('/:userId', usersController.search);
  usersRouter.get('/basic', usersController.getAllUsersInfo);
  usersRouter.get('/names', usersController.getNames);

  usersRouter.post('/', usersController.createUser);

  usersRouter.put('/', usersController.updateUser);

  usersRouter.delete('/:id', usersController.deleteById);

  return usersRouter;
};
