'use strict';

const Respond = require('../common/respond.js');
const Utils = require('../common/utils');

class BaseController {

  executeRequest(res, operation, mapFn) {
    (async function fn() {

      try {
        let result = await operation();

        if (result) {
          if (mapFn) {
            result = mapFn(result);
          }
          Respond.ok(res, result);
        } else {
          Respond.ok(res);
        }

      } catch (error) {
        Utils.debug(error.stack);
        if (error.code) {
          Respond.badRequest(res, error);
        } else {
          Respond.serverError(res, { message: error.message || error.toString() });
        }
      }
    })();
  }
}

module.exports = BaseController;
