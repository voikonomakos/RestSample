'use strict';
const Location = require('./location');
const _ = require('lodash');
const Utils = require('../common/utils');
const {
    boardGroupSubPriorities,
    boardGroupSubPrioritiesNYLA,
    boroughsNY
} = require('./board-group-priorities');

class Spot {
    constructor(mediaList, user, description, location, category, platform, firebaseId) {
        this.media = mediaList; // _.map(mediaList, x => new Media(x.url, x.index, x.type, x.placeholderColor));
        this.user = user;
        this.description = description;

        this.location = new Location(
            location.name,
            location.coordinate.longitude,
            location.coordinate.latitude,
            location.formattedAddress,
            location.gmsAddress,
            location.googlePlaceId,
            location.about,
            location.types
        );

        this.category = category;
        this.platform = platform;
        this.timestamp = Utils.getCurrentDate();
        this.imagesCount = _.filter(mediaList, x => x.type == 0).length;
        this.videosCount = _.filter(mediaList, x => x.type == 1).length;
        this.mediaCount = this.imagesCount + this.videosCount;
        this.saves = 0;
        this.boards = [];
        this.firebaseId = firebaseId;
        this.comments = [];
        this.isMediaServed = false;
        this.verifiedBy = [];
        this.verifiedCount = 0;
        this.savedBy = [];
        this.commentsCount = 0;
    }

    getCity() {
        return this.location.getCity();
    }

    getCountry() {
        return this.location.getCountry();
    }

    getBoardsInfo() {
        const country = this.getCountry();
        let city = this.getCity();

        let neighborhood = '';
        const isNatural = this.location.types && this.location.types.includes("Natural feature");
        if (country === 'United States' && !isNatural) {
            const isLASpot = this.location.gmsAddress.administrative_area_level_2 === 'Los Angeles County';
            let isNYSpot = false;

            if (!isLASpot) {
                isNYSpot = city === 'New York' || (boroughsNY.indexOf(this.location.gmsAddress.sublocality) != -1 || boroughsNY.indexOf(this.location.gmsAddress.sublocality_level_1) != -1);
            }
            if (isLASpot || isNYSpot) {

                city = isLASpot ? 'Los Angeles' : 'New York';
                const groupSubProperty = isLASpot ?
                    this.location.gmsAddress.locality == 'Los Angeles' ? 'neighborhood' : 'locality' :
                    this.getBoardGroupProperty(this.location.gmsAddress, boardGroupSubPrioritiesNYLA);

                neighborhood = this.location.gmsAddress[groupSubProperty] || 'Other';
            }

            const hasNeighborhood = neighborhood !== '';
            const cityBoardId = country + city;
            //const countryBoard = new Board(country, country, Utils.BoardType.COUNTRY, true, 0);
            const cityBoard = new Board(cityBoardId, city, Utils.BoardType.CITY, hasNeighborhood, 0, country);

            let boards = [cityBoard];
            let boardTitle = '';
            let boardId = '';
            if (hasNeighborhood) {
                const neighborhoodBoardId = country + city + neighborhood;
                boardId = neighborhoodBoardId;
                boardTitle = neighborhood;
                boards.push(new Board(neighborhoodBoardId, neighborhood, Utils.BoardType.NEIGHBORHOOD, false, 1, cityBoardId));
            } else {
                boardId = cityBoardId;
                boardTitle = city;
            }

            return {
                boardId: _.snakeCase(boardId),
                boardTitle: boardTitle,
                boards: boards
            };
        } else if (country === 'United States' && isNatural) {

            let boardTitle = 'Other';

            if (this.location.gmsAddress.administrative_area_level_2) {
                boardTitle = this.location.gmsAddress.administrative_area_level_2
            } else if (this.location.gmsAddress.administrative_area_level_1) {
                boardTitle = this.location.gmsAddress.administrative_area_level_1;
            }

            const boardId = country + boardTitle;

            return {
                boardId: _.snakeCase(boardId),
                boardTitle: boardTitle,
                boards: [new Board(boardId, boardTitle, Utils.BoardType.CITY, false, 0)]
            }
        } else {
            return {
                boardId: _.snakeCase(country),
                boardTitle: country,
                boards: [new Board(country, country, Utils.BoardType.COUNTRY, false, 0)]
            };
        }
    }

    getBoardGroupProperty(gmsAddress, boardGroupPriorities) {
        const properties = Object.keys(gmsAddress);
        for (let index = 0; index < boardGroupPriorities.length; index++) {
            const property = boardGroupPriorities[boardGroupPriorities.length - index - 1];
            if (properties.find(x => x == property)) {
                return property;
            }
        }

        return boardGroupPriorities[boardGroupPriorities.length - 1];
    }
}

class Media {
    constructor(url, index, mediaType, placeholderColor) {
        this.url = url;
        this.index = index;
        this.type = mediaType;
        this.placeholderColor = placeholderColor || 'blue';
    }
}

class Board {
    constructor(id, title, type, hasNestedBoards, nestingLevel, parent) {
        this.id = _.snakeCase(id);
        this.title = title;
        this.type = type;
        this.hasNestedBoards = hasNestedBoards;
        this.nestingLevel = nestingLevel;
        this.parent = parent === null ? null : _.snakeCase(parent);
    }
}

class SpotComment {
    constructor(spotId, message, user) {
        this.spotId = spotId;
        this.message = message;
        this.timestamp = Utils.getCurrentDate();

        user.id = user._id.toString();
        delete user._id;

        this.user = user;
    }

    setId(id) {
        this.id = id.toString();
        delete this._id;
    }
}

module.exports = {
    Spot,
    SpotComment,
    Board
};