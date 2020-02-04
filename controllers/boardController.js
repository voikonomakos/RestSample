var _ = require('lodash');
const Utils = require('../common/utils');
const BaseController = require('./baseController');
const boardService = require('../services/boardService');


class boardController {
   
    getBoard(req, res) {
        const { type, uid } = req.query;
        const { take, skip } = Utils.extract(req.query, Utils.BoardQueryDefaultLimit, 0);
        BaseController.prototype.executeRequest(res, () => boardService.getBoard(type, uid, take, skip));
    }
}

module.exports = new boardController();