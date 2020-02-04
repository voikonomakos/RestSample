const BaseController = require('./baseController');
const configurationsService = require('../services/configurationsService');

class configurationController {
    
    getRandom(req, res) {
        BaseController.prototype.executeRequest(res, () => configurationsService.getRandom());
    }

    getAllUploadMessages(req, res) {
        const { limit, next } = req.query;
        BaseController.prototype.executeRequest(res, () => configurationsService.getUploadMessages(limit, next));
    }

    createUploadMessage(req, res) {
        const payload = req.body;
        BaseController.prototype.executeRequest(res, () => configurationsService.createUploadMessages(payload));
    }

    deleteUploadMessage(req, res) {
        const { msgId } = req.query;
        BaseController.prototype.executeRequest(res, () => configurationsService.deleteUploadMessages(msgId));
    }

    updateUploadMessage(req, res) {
        const { msgId } = req.query;
        const payload = req.body;
        BaseController.prototype.executeRequest(res, () => configurationsService.updateUploadMessages(payload, msgId));
    }
}

module.exports = new configurationController();