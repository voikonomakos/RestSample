'use strict';
var _ = require('lodash');
const Utils = require('../common/utils');
const DbService = require('./dbService');
var _ = require('lodash');
class MediaService {

    static async getMyPhotos(userId, limit, skip) {

        const params = [];
        params.push({ $match: { "user.id": userId } });
        params.push({ $unwind: '$media' });
        //params.push({ $match: { 'media.type': Utils.MediaType.IMAGE } });
        params.push({ $skip: skip });
        params.push({ $limit: limit });
        params.push({ $project: { 'media': 1 } });

        const images = await DbService.aggregate(Utils.Collections.Spots, params);

        return images;
        /*return {
              images: images,
              next: images.length == limit ? next + limit : null
          }*/
    }

    static async getRelatedPhotos(googlePlaceId, long, lat, limit, skip) {

        let filter = {
            '$or': [
                { 'location.googlePlaceId': googlePlaceId },
                { 'geo.coordinates': [long, lat] }
                //{ 'location.formattedAddress': { '$regex': address, $options: 'i' } },
            ]
        };

        const params = [];
        params.push({ $match: filter });
        params.push({ $unwind: '$media' });
        params.match({ 'media.type': Utils.MediaType.IMAGE });
        params.push({ $skip: skip });
        params.push({ $limit: limit });
        params.project({ profileImage: { 'user.profileImage': 1 }, image: { 'media': 1 } });

        const result = await DbService.aggregate(Utils.Collections.Spots, params);

        return result;
    }

    static async uploadPhotos(spotId, media) {

        const asyncFn = async function (db) {
            const spotsColl = await db.collection(Utils.Collections.Spots);
            const uploadedBoardsColl = await db.collection(Utils.Collections.UploadedBoards);
            const savedBoardsColl = await db.collection(Utils.Collections.SavedBoards);

            const spot = await spotsColl.findOne(Utils.IdFilter(spotId), { projection: { media: 1, timestamp: 1, 'user.id': 1, boardId: 1, mediaCount: 1 } });

            let mediaCount = spot.mediaCount || 0;
            for (var name in media) {
                spot.media[name] = media[name];
                mediaCount++;
            }

            const update = { $set: { media: spot.media, mediaCount: mediaCount } };

            await spotsColl.updateOne(
                Utils.IdFilter(spotId),
                update
            );

            const quarter = Utils.getYearQuarter(spot.timestamp)

            await uploadedBoardsColl.updateOne(
                { boardId: spot.boardId, userId: spot.user.id, quarter: quarter, 'spots.id': spotId },
                update
            );

            await savedBoardsColl.updateOne(
                { boardId: spot.boardId, quarter: quarter },
                update
            );
        }

        const result = await DbService.execute(asyncFn);

        return result;
    }
}

module.exports = MediaService;