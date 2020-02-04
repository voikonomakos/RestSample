const _ = require('lodash');
const moment = require('moment');
const debug = require('debug')('app');
const { ObjectID } = require('mongodb');
const util = require('util');
const admin = require('firebase-admin');
let _settings = [];


class Utils {

  static get BoardType() { return { COUNTRY: 1, CITY: 2, NEIGHBORHOOD: 3 }; }
  static get SpotsQueryDefaultLimit() { return 20; };
  static get NotificationsQueryDefaultLimit() { return 20; };
  static get CommentsQueryDefaultLimit() { return 20; };
  static get UsersQueryDefaultLimit() { return 20; };
  static get PhotosDefaultLimit() { return 20; };
  static get BoardQueryDefaultLimit() { return 40; };
  static get UploadMessageQueryDefaultLimit() { return 100; };
  static get NotificationType() { return { SAVE: 1, FOLLOW: 2, COMMENT: 3, FOLLOW_REQUEST: 4 } };
  static get MediaType() { return { IMAGE: 0, VIDEO: 1 }; }
  static get BoardQueryDefaultLimit() { return 40; };
  static get UploadMessageQueryDefaultLimit() { return 100; };
  static get SpotProjection() { return { boards: 0, boardId: 0, boardTitle: 0, 'firebaseId': 0, comments: 0, isPublic: 0 }; }
  static get SpotsListProjection() { return { 'spots.boards': 0, 'spots.boardId': 0, 'spots.boardTitle': 0, 'spots.firebaseId': 0, 'spots.comments': 0, 'spots.isPublic': 0 }; }

  static get MongoDbConnectionString() {
    return _settings[0];
  }

  static get MongoDbName() {
    return _settings[1];
  }

  static get FirebaseDatabaseUrl() {
    return _settings[2];
  }


  static get FirebaseDb() {
    return _settings[2];
  }

  static get FirebaseServiceAccountFileName() {
    return _settings[3];
  }

  static get Settings() {
    return _settings;
  }

  static get Collections() {
    return {
      Feed: 'feed',
      Spots: 'spots',
      SavedBoards: 'savedBoards',
      UploadedBoards: 'uploadedBoards',
      Users: 'users',
      Categories: 'categories',
      SubCategories: 'subCategories',
      Comments: 'comments',
      PrivateSpots: 'privateSpots',
      Notifications: 'notifications',
      CuratedFeed: 'curatedFeed',
      UploadMessage: 'uploadMessage',
      Locations: 'locations'
    }
  };

  static getCurrentDate() {
    return Date.now();
  }

  static getYear(date) {
    var d = moment(date).format('YYYY');
    return parseInt(d);
  }

  static getYearQuarter(date) {
    var month = parseInt(moment(date).format('MM'));
    var quarter = (parseInt((month - 1) / 3)) + 1;
    var d = moment(date).format('YYYY');
    var value = d.concat(quarter);
    return parseInt(value);
  }

  static getYearMonth(date) {
    var d = moment(date).format('YYYYMM');
    return parseInt(d);
  }

  static mapId() {
    let mapFn = model => {
      model.id = model._id;
      delete model._id;

      return model;
    }

    return mapFn;
  }

  static exists(list, cond) {
    const item = _.find(list, cond);

    return item ? true : false;
  }

  static IdFilter(id) {
    return { _id: new ObjectID(id) };
  }

  static log(value, message) {
    if (message) {
      console.log(message);
    }
    console.log(util.inspect(value, { showHidden: true, depth: null, colors: true }));
  }

  static debug(message) {
    debug(message);
  }

  static spotsResult(spots, limit) {
    return {
      spots: spots,
      next: spots.length === limit ? spots[spots.length - 1].timestamp : null
    };
  }

  static slice(list, limit, next) {
    const start = next;
    const end = start + limit;
    return _.slice(list, start, end);
  }

  static extract(query, defaultTake, defaultNext) {
    let { take, next } = query;

    take = take ? parseInt(take) : defaultTake;
    next = next ? parseInt(next) : defaultNext;

    return {
      take: take,
      next: next
    }
  }

  static initializeFirebaseAdmin() {
    try {
      const serviceAccount = require('../' + Utils.FirebaseServiceAccountFileName);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: Utils.firebaseDatabaseUrl
      });

    } catch (error) {
      Utils.debug('error initializing firebase admin');
    }
  }

  static isBoolean(value) {
    // A future-safe way
    return typeof (value) === typeof (true);
  }

  static async deleteImages(directoryUrl) {

    const bucket = admin.storage().bucket('gs://pao-app.appspot.com');
    //await bucket.deleteFiles({ directory: url })

  }

  static objectToList(obj) {

    const list = [];
    if (obj) {
      for (var name in obj) {
        list.push(obj[name]);
      }
    }

    return list;
  }

  static listToObject(list) {
    var obj = {};
    for (var index = 0; index < list.length; index++) {
      let item = list[index];
      obj[item.id] = item;
    }

    return obj;
  }

  static spotMapping() {
    return spot => {
      spot.location.coordinate = {
        latitude: spot.location.geo.coordinates[1],
        longitude: spot.location.geo.coordinates[0]
      };
      spot.id = spot._id;
      delete spot._id;
      delete spot.location.geo;
      return spot;
    };
  }

  static notificationMapping() {
    return notification => {
      let retObj = {};
      retObj.id = notification._id;
      retObj.timestamp = notification.timestamp;
      retObj.user = {
        id: notification.user.id,
        name: notification.user.name,
        username: notification.user.username,
        coverImage: notification.user.coverImage,
        profileImage: notification.user.profileImage
      }
      if (notification.spot) {
        retObj.spot = {
          id: notification.spot.id,
          timestamp: notification.spot.timestamp,
          media: notification.spot.media
        };
      }
      else {
        retObj.spot = {};
      }

      return retObj;
    };
  }

  static pagingResult(data, limit, nextFn) {
    return {
      data: data,
      next: data.length == limit ? nextFn() : null
    }
  }

}

module.exports = Utils;
