'use strict';
const express = require('express');
const locationsRouter = express.Router();

module.exports = function () {
    const locationController = require('../controllers/locationController');

    locationsRouter.get("/", locationController.getLocations);
    
    return locationsRouter;
};