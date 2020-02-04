'use strict';
var _ = require('lodash');
const Utils = require('../common/utils');
const LocationService = require('../services/locationService');
const BaseController = require('./baseController');

class LocationController {

    getLocations(req, res) {
        const { take, skip } = Utils.extract(req.query, Utils.SpotsQueryDefaultLimit, 0);
        const { keyword } = req.query;

        BaseController.prototype.executeRequest(res,
            () => LocationService.getLocations(keyword, take, skip));
    }

}

module.exports = new LocationController();