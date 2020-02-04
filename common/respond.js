'use strict';
var util = require('util');
var _ = require('lodash');

module.exports = (function () {
  var logToConsole = function (content) {
    console.log('------------------------');
    console.log(util.inspect(content, { showHidden: true, depth: null }));
    console.log('------------------------');
  };

  var httpStatus = {
    OK: 200,
    Created: 201,
    BadRequest: 400,
    Unauthorized: 401,
    Forbidden: 403,
    NotFound: 404,
    ServerError: 500
  };

  var sendJsonResponse = function (status) {
    return function (res, content) {
      res.status(status);
      if (content) {
        res.json(content);
      } else {
        res.send();
      }
    };
  };

  var sendErrorJsonResponse = function (status) {
    return function (res, error) {
      res.status(status);
      res.json(error);
    };
  }

  var ok = sendJsonResponse(httpStatus.OK);
  var created = sendJsonResponse(httpStatus.Created);
  var badRequest = sendErrorJsonResponse(httpStatus.BadRequest);
  var unauthorized = sendJsonResponse(httpStatus.Unauthorized);
  var forbidden = sendJsonResponse(httpStatus.Forbidden);
  var notFound = sendJsonResponse(httpStatus.NotFound);
  var serverError = sendErrorJsonResponse(httpStatus.ServerError);

  return {
    ok: ok,
    created: created,
    badRequest: badRequest,
    unauthorized: unauthorized,
    forbidden: forbidden,
    notFound: notFound,
    serverError: serverError,
    logToConsole: logToConsole
  };
})();
