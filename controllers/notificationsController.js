
var _ = require('lodash');
const Utils = require('../common/utils');
const BaseController = require('./baseController');
const notificationsService = require('../services/notificationsService');

class notificationsController {
    getNotificatons(req, res) {
        const userId = req.payload.userId;
        const { take, next } = Utils.extract(req.query, Utils.NotificationsQueryDefaultLimit, 0);
        const skip = next;
        BaseController.prototype.executeRequest(res, () => notificationsService.getNotifications(take, skip, userId));
    }
}

module.exports = new notificationsController();