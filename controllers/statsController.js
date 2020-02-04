const BaseController = require('./baseController');
const StatsService = require('../services/statsService');

class statsController {
    getAllCount(req, res) {
        BaseController.prototype.executeRequest(res, () => StatsService.getStats());
    }

    getStatsList(req, res) {
        const { to, from } = req.query;
        BaseController.prototype.executeRequest(res, () => StatsService.getStatList(to, from));
    }
}

module.exports = new statsController();