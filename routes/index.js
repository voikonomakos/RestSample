'use strict';
const admin = require('firebase-admin');
const Utils = require('../common/utils');
const Respond = require('../common/respond.js');
const DbService = require('../services/dbService');
const bearerToken = require('express-bearer-token');
const Errors = require('../common/errors.js');

class Routes {
  set(app) {
    var userRouter = require('./userRoutes')();
    var usersRouter = require('./usersRoutes')();
    var adminRouter = require('./adminRoutes')();
    var spotsRouter = require('./spotsRoutes')();
    var mediaRouter = require('./mediaRoutes')();
    var statsRoutes = require('./statsRoutes')();
    var configurationsRoutes = require('./configurationsRoutes')();
    var notificationsRoutes = require('./notificationsRoutes')();
    var locationRouter = require('./locationRoutes')();
    var migrationsRouter = require('./migrationRoutes')();

    app.use('/admin', adminRouter);
    app.use('/migration', migrationsRouter);

    app.use(bearerToken());

    app.use(function (req, res, next) {

      (async function mongo() {
        try {
          let firebaseId;
          if (req.token) {
            const decodedToken = await admin.auth().verifyIdToken(req.token);
            firebaseId = decodedToken.uid;
          } else if (req.query.fid) {
            firebaseId = req.query.fid;
          }

          if (firebaseId) {
            const user = await DbService.findOne(Utils.Collections.Users, { firebaseId: firebaseId }, { _id: 1 });
            if (user) {
              req.payload = { userId: user._id.toString() };
              next();
            } else {
              Respond.badRequest(res, Errors.UserNotFound);
            }
          } else {
            Respond.unauthorized(res);
          }
        } catch (error) {
          Respond.badRequest(res, { message: error.message });
        }
      })();
    });


    app.use('/users', usersRouter);
    app.use('/me', userRouter);
    app.use('/spots', spotsRouter);
    app.use('/boards', spotsRouter);
    app.use('/media', mediaRouter);
    app.use('/locations', locationRouter);
    app.use('/stats', statsRoutes);
    app.use('/config', configurationsRoutes);
    app.use('/notifications', notificationsRoutes);
    app.use('/uploadMessages', configurationsRoutes);
  }
}

module.exports = new Routes();
