'use strict';
const { MongoClient, ObjectID } = require('mongodb');
var _ = require('lodash');
const Respond = require('../common/respond.js');
const Utils = require('../common/utils');
const { iSpot } = require('../data/iSpot');
const BaseController = require('./baseController');
const { UserBasicInfo } = require('../data/userData');
const MessagingService = require('../services/messagingService');
const DbService = require('../services/dbService');
const AdminService = require('../services/adminService');
const Errors = require('../common/errors.js');
const Location = require('../data/location');

class AdminController {

    importCategories(req, res) {

        var subCategories = new Map();
        subCategories.set("2LqNMhgW9VFcmbR2a2xg", "Scenic");
        subCategories.set("2j74XODVNpqCRi75zXCY", "Unique");
        subCategories.set("3JKu5yEaus0lRoo5Xx1n", "Nightlife");
        subCategories.set("88KttsMUUa6yQI7DLGSc", "Kid Friendly");
        subCategories.set("IL9oWQ3l7nn7FmgCCs0t", "Pamper");
        subCategories.set("KhFrPKYXxy6oSCHG5tmD", "Active");
        subCategories.set("XGxGeH5YtlC5Iqr2my4t", "Entertainment");
        subCategories.set("f0CIUHJkmGVJE8i7v7C2", "Outdoors");
        subCategories.set("jTw1CnyOoDRMo1wR7FHv", "Art/Culture");
        subCategories.set("uqxg4bvh3OowPMOtgzYG", "Must-see");
        subCategories.set("xmghXP0ckufe8TyrWIUt", "Shopping");
        subCategories.set("xvebrZF30y1yZz3yXQpq", "Tours");

        var subCategories1 = new Map();
        subCategories1.set("7xQnroqCN8sCkJYL4V3Y", "Fun Vibes");
        subCategories1.set("Frq9toGR9MG9Q7vL1PxU", "Views");
        subCategories1.set("Ipx6R0TzbyZLgrizGF9T", "Romantic");
        subCategories1.set("MUcJkyAGcKblOpuYnWv6", "Healthy");
        subCategories1.set("PEh8Ex9fAn7lpjQ0O9Ee", "Meet-up");
        subCategories1.set("QPbhAvOwhV0bckJVGoIe", "Comfort Food");
        subCategories1.set("YmqySFcGYR4C3WFG7fYT", "Good 4 Groups");
        subCategories1.set("gCOMQuuxLYOcqxcn2Wnw", "Unique");
        subCategories1.set("jIuIMxy6cVBrpMVzVTwP", "Aesthetic");
        subCategories1.set("phYfZ6qV79JZ1JSIlmbF", "Study Spot");
        subCategories1.set("ufKchEZnSUBJ4jeQrYEM", "Fast");
        subCategories1.set("yKSLstHIH4o8MztScnlp", "Sweet Tooth");

        var subCategories2 = new Map();
        subCategories2.set("04BdvX69j1ORxXuVFecw", "Luxury");
        subCategories2.set("3M5RHGrp177rE02Zcjz3", "Camping");
        subCategories2.set("6uznJhnnugKO6ArUu4ns", "Romantic");
        subCategories2.set("E6IIsWU1pY1kyRvmhd67", "Oceanic");
        subCategories2.set("MSfaVYIhTNTF3Ur6czqS", "Aesthetic");
        subCategories2.set("OYx54egGYrFgDC7U31sJ", "Let's Party");
        subCategories2.set("YfJmrnahDvgT7J1o7T6f", "Central");
        subCategories2.set("ZUYZ2L3ccylMBr2xbhhx", "Iconic");
        subCategories2.set("comJE3scjImhV3aTM1kW", "Business");
        subCategories2.set("mCv3r5L7eGYyy5QEPvEX", "Boutique");
        subCategories2.set("nhCI3XYUWlDNaYC3CKBE", "Budget");
        subCategories2.set("v3cEhvE0lsF4cl2v9JCG", "Scenic");


        const asyncFn = async function () {
            let r = await DbService.insertOne("categories", { name: "Play", firebaseId: "MDoFOlyLFkWpYmS9Axkw" });
            Utils.log(r);
            for (var [key, value] of subCategories) {
                await DbService.insertOne("subCategories", {
                    name: value,
                    firebaseId: key,
                    category: r.id.toString()
                })
            }

            r = await DbService.insertOne("categories", { name: "Eat", firebaseId: "pMiwbYSX1mbxUBsQTnIy" });
            for (var [key, value] of subCategories1) {
                await DbService.insertOne("subCategories", {
                    name: value,
                    firebaseId: key,
                    category: r.id.toString()
                })
            }

            r = await DbService.insertOne("categories", { name: "Stay", firebaseId: "vNfMoktZBm2kpXWEinXx" });
            for (var [key, value] of subCategories2) {
                await DbService.insertOne("subCategories", {
                    name: value,
                    firebaseId: key,
                    category: r.id.toString()
                })
            }

        };

        BaseController.prototype.executeRequest(res, asyncFn);
    }

    importLocations(req, res) {
        const spot = req.body;

        let location = new Location(
            spot.location.name,
            spot.location.coordinate.longitude,
            spot.location.coordinate.latitude,
            spot.location.formattedAddress,
            spot.location.gmsAddress,
            spot.location.googlePlaceId,
            spot.location.about,
            spot.location.types
        );

        const asyncFn = async function (coll) {
            const doc = await coll.findOne({ name: location.text }, { _id: 1 });

            if (!doc) {
                await coll.insertOne({ name: location.text, spots: [], })
            }
        }
    }

    importSpots(req, res) {

        const spot = req.body;
        const model = new iSpot();
        spot.boards = [];
        spot.comments = [];
        spot.isMediaServed = false;
        spot.verifiedBy = [];
        spot.verifiedCount = 0;
        spot.savedBy = [];
        spot.commentsCount = 0;

        const { boardId, boardTitle, boards } = model.getBoards(spot.location);
        const asyncFn = async function (db) {
            const usersColl = await db.collection(Utils.Collections.Users);
            const spotsColl = await db.collection(Utils.Collections.Spots);
            const uploadedBoardsColl = await db.collection(Utils.Collections.UploadedBoards);
            const feedColl = await db.collection(Utils.Collections.Feed);
            const categoriesColl = await db.collection(Utils.Collections.Categories);
            const subcategoriesColl = await db.collection(Utils.Collections.SubCategories);
            const locationsColl = await db.collection(Utils.Collections.Locations);

            const me = await usersColl.findOne(
                { firebaseId: spot.user.id },
                {
                    projection: {
                        username: 1,
                        name: 1,
                        profileImage: 1,
                        coverImage: 1,
                        uploadedBoards: 1
                    }
                });
            Utils.debug(spot);
            const userInfo = new UserBasicInfo(me._id.toString(), me.username, me.name, me.profileImage, me.coverImage);
            const userId = userInfo.id;
            spot.user = userInfo;
            spot.boardId = boardId;
            spot.boardTitle = boardTitle;
            spot.boards = boards;
            spot.isPublic = true;
            spot.location = new Location(
                spot.location.name,
                spot.location.geo.coordinates[0],
                spot.location.geo.coordinates[1],
                spot.location.formattedAddress,
                spot.location.gmsAddress,
                spot.location.googlePlaceId,
                spot.location.about,
                spot.location.types
            );

            const category = await categoriesColl.findOne({ firebaseId: spot.category.id });


            const subs = [];
            for (var n in spot.category.subCategories) {
                var subcategory = await subcategoriesColl.findOne({ firebaseId: n });
                subs.push({ id: subcategory._id.toString(), name: subcategory.name })
            }

            spot.category = { id: category._id.toString(), name: category.name };
            spot.subCategories = subs;

            const mediaList = [];

            for (var field in spot.media) {
                var obj = spot.media[field];
                mediaList.push({
                    url: obj.url,
                    placeholderColor: obj.placeholderColor,
                    type: obj.type
                })
            }

            spot.media = mediaList;
            // insert spot
            const insertedSpot = await spotsColl.insertOne(spot);

            //update spot object
            spot.id = insertedSpot.insertedId.toString();
            delete spot._id;

            delete spot.boardId;
            delete spot.boardTitle;
            delete spot.boards;


            const locationDoc = await locationsColl.findOne({ name: spot.location.text }, { _id: 1 });
            if (!locationDoc) {
                await locationsColl.insertOne(
                    {
                        name: spot.location.text,
                        spots: [spot.id],
                        coordinate: {
                            longitude: spot.location.geo.coordinates[0],
                            latitude: spot.location.geo.coordinates[1]
                        },
                        verifiedCount: 0
                    })
            }

            await uploadedBoardsColl.updateOne(
                { boardId: boardId, userId: userInfo.id, quarter: Utils.getYearQuarter(spot.timestamp) },
                {
                    $push: { spots: spot },
                    $set: { title: boardTitle },
                    $inc: { spotsCount: 1 }
                },
                { upsert: true }
            );

            await feedColl.updateOne({ userId: spot.user.id, month: Utils.getYearMonth(spot.timestamp) },
                {
                    $push: { spots: spot },
                    $inc: { spotsCount: 1 }
                },
                { upsert: true });

            let boardMedia;
            for (var name in spot.media) {
                boardMedia = boardMedia ? boardMedia : spot.media[name];
            }

            // Update user with new boards
            let newBoards = [];
            const userUploadedBoards = me.uploadedBoards || [];
            for (let index = 0; index < boards.length; index++) {
                const board = _.find(userUploadedBoards, { id: boards[index].id });

                if (!board) {
                    boards[index].thumbnail = boardMedia
                    boards[index].spotsCount = 1;
                    newBoards.push(boards[index]);
                } else {
                    await DbService.updateOne(
                        Utils.Collections.Users,
                        { _id: new ObjectID(userId), 'uploadedBoards.id': boards[index].id },
                        {
                            $set: { 'uploadedBoards.$.thumbnail': boardMedia },
                            $inc: { 'uploadedBoards.$.spotsCount': 1 }
                        }
                    );
                }
            }

            if (newBoards.length > 0) {

                var newCountriesCount = _.filter(newBoards, { type: Utils.BoardType.COUNTRY }).length;
                var newCitiesCount = _.filter(newBoards, { type: Utils.BoardType.CITY }).length;
                await usersColl.updateOne(
                    { _id: new ObjectID(userId) },
                    {
                        $push: { uploadedBoards: { $each: newBoards } },
                        $inc: { countriesCount: newCountriesCount, citiesCount: newCitiesCount, uploadedSpotsCount: 1 }
                    }
                );
            } else {
                await usersColl.updateOne(
                    { _id: new ObjectID(userId) },
                    {
                        $inc: { uploadedSpotsCount: 1 }
                    }
                );
            }

            return {
                id: spot.id
            };
        }

        BaseController.prototype.executeRequest(res, () => DbService.execute(asyncFn));
    }

    saveFeedSpot(req, res) {
        const { fsid, fuid } = req.body;

        const asyncFn = async function (db) {
            const usersColl = await db.collection(Utils.Collections.Users);
            const spotsColl = await db.collection(Utils.Collections.Spots);
            const curatedFeedColl = await db.collection(Utils.Collections.CuratedFeed);

            const user = await usersColl.findOne(
                { firebaseId: fuid },
                { projection: { _id: 1 } }
            );

            const userId = user._id.toString();

            const spot = await spotsColl.findOne(
                { firebaseId: fsid }
            );


            if (spot && user) {
                debug(spot._id);

                const spotId = spot._id.toString();
                spot.id = spotId;
                delete spot._id;

                await curatedFeedColl.updateOne(
                    { userId: userId },
                    {
                        $push: { spots: spot },
                        $inc: { spotsCount: 1 }
                    },
                    { upsert: true }
                );
            } else {
                Utils.debug('Not found');
            }

        }

        BaseController.prototype.executeRequest(res, () => DbService.execute(asyncFn));

    }

    saveSpot(req, res) {
        const { fsid, fuid } = req.body;

        const asyncFn = async function (db) {
            const usersColl = await db.collection(Utils.Collections.Users);
            const spotsColl = await db.collection(Utils.Collections.Spots);
            const savedBoardsColl = await db.collection(Utils.Collections.SavedBoards);
            const uploadedBoardsColl = await db.collection(Utils.Collections.UploadedBoards);
            const feedColl = await db.collection(Utils.Collections.Feed);
            const curatedFeedColl = await db.collection(Utils.Collections.CuratedFeed);

            // Find user
            const user = await usersColl.findOne(
                { firebaseId: fuid },
                { projection: { 'savedBoards.id': 1, username: 1, name: 1, email: 1, profileImage: 1, coverImage: 1 } }
            );

            const userId = user._id.toString();

            const userInfo = new UserBasicInfo(userId, user.username, user.name, user.profileImage, user.coverImage);

            // Update spot
            let result = await spotsColl.findOneAndUpdate(
                { firebaseId: fsid },
                {
                    $addToSet: { savedBy: userInfo }
                },
                { returnOriginal: false }
            );


            if (result && result.value && user) {
                Utils.debug(result.value._id);

                let spot = result.value;
                const spotId = spot._id.toString();

                spot.id = spotId;
                delete spot._id;

                // Update user's boards
                let boardMedia;
                for (var name in spot.media) {
                    boardMedia = boardMedia ? boardMedia : spot.media[name];
                }

                const boards = spot.boards || [];
                const userSavedBoards = user.savedBoards || [];
                let newBoards = [];

                for (var index = 0; index < boards.length; index++) {
                    const board = _.find(userSavedBoards, { id: boards[index].id });

                    if (!board) {
                        boards[index].thumbnail = boardMedia;
                        newBoards.push(boards[index]);
                        boards[index].spotsCount = 1;
                    } else {
                        await DbService.updateOne(
                            Utils.Collections.Users,
                            { _id: new ObjectID(userId), 'savedBoards.id': boards[index].id },
                            { $set: { 'savedBoards.$.thumbnail': boardMedia } }
                        );
                    }
                }

                if (newBoards.length > 0) {
                    await usersColl.updateOne(
                        Utils.IdFilter(userId),
                        {
                            $push: { savedBoards: { $each: newBoards } }
                        }
                    );
                }


                // Update user's saved board
                const boardId = spot.boardId;
                const boardTitle = spot.boardTitle;

                delete spot.boards;
                delete spot.boardId;
                delete spot.boardTitle;
                await savedBoardsColl.updateOne(
                    { boardId: boardId, userId: userId, quarter: Utils.getYearQuarter(spot.timestamp) },
                    {
                        $push: { spots: spot },
                        $set: { title: boardTitle },
                        $inc: { spotsCount: 1 }
                    },
                    { upsert: true }
                );


                const pushUpdate = {
                    $addToSet: {
                        'spots.$.savedBy': userInfo
                    },
                    $inc: { 'spots.$.saves': 1 }
                };

                // Update uploaded boards
                await uploadedBoardsColl.updateOne(
                    { boardId: boardId, userId: spot.user.id, quarter: Utils.getYearQuarter(spot.timestamp), 'spots.id': spot.id },
                    pushUpdate
                );

                // Update other saved boards
                await savedBoardsColl.updateMany(
                    { boardId: boardId, quarter: Utils.getYearQuarter(spot.timestamp), 'spots.id': spot.id },
                    pushUpdate
                );

                // Update feed
                await feedColl.updateMany(
                    { month: Utils.getYearMonth(spot.timestamp), 'spots.id': spot.id },
                    pushUpdate
                );


                // Update curatedFeed
                await curatedFeedColl.updateMany(
                    { 'spots.id': spot.id },
                    pushUpdate
                );

            } else {
                Utils.debug('Not found');
            }

        }

        BaseController.prototype.executeRequest(res, () => DbService.execute(asyncFn));
    }

    updateUserEmail(req, res) {
        const { fid, email } = req.body;

        BaseController.prototype.executeRequest(
            res,
            () => DbService.updateOne({ firebaseId: fid }, { $set: { email: email } }));
    }
}

module.exports = new AdminController();