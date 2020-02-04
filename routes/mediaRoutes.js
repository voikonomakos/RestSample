'use strict';
const express = require('express');
const mediaRouter = express.Router();

module.exports = function () {
    const mediaController = require('../controllers/mediaController');

    mediaRouter.get("/images/me", mediaController.getMyPhotos);
    mediaRouter.get("/images/:googlePlaceId?", mediaController.getRelatedPhotos);

    mediaRouter.post('/images', mediaController.uploadPhotos);

    return mediaRouter;
};
