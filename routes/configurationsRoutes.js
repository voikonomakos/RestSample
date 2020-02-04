const express = require('express');
const configurationsRouter = express.Router();

module.exports = function () {
  const configurationsController = require('../controllers/configurationsController');

  configurationsRouter.get('/random', configurationsController.getRandom);
  configurationsRouter.get('/uploadMessage', configurationsController.getAllUploadMessages);
  configurationsRouter.delete('/uploadMessage', configurationsController.deleteUploadMessage);
  configurationsRouter.put('/uploadMessage', configurationsController.updateUploadMessage);
  configurationsRouter.post('/uploadMessage', configurationsController.createUploadMessage);
 

  return configurationsRouter;
};
