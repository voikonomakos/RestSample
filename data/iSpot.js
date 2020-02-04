'use strict';
const Location = require('./location');
const _ = require('lodash');
const Utils = require('../common/utils');
const { boardGroupSubPriorities, boardGroupSubPrioritiesNYLA, boroughsNY } = require('./board-group-priorities');

class iSpot {


    constructor() {

    }


    getCity() {
        return this.location.getCity();
    }

    getCountry() {
        return this.location.getCountry();
    }


    getBoards(location) {
        let country, city;
        country = location.gmsAddress ? location.gmsAddress.country : 'Other';
        city = location.gmsAddress ? location.gmsAddress.locality : 'Other';

        let neighborhood = '';
        const isNatural = location.types && location.types.includes("Natural feature");
        if (country === 'United States' && !isNatural) {
            const isLASpot = location.gmsAddress.administrative_area_level_2 === 'Los Angeles County';
            let isNYSpot = false;

            if (!isLASpot) {
                isNYSpot = city === 'New York' || (boroughsNY.indexOf(location.gmsAddress.sublocality) != -1 || boroughsNY.indexOf(location.gmsAddress.sublocality_level_1) != -1);
            }
            if (isLASpot || isNYSpot) {

                city = isLASpot ? 'Los Angeles' : 'New York';
                const groupSubProperty = isLASpot ?
                    location.gmsAddress.locality == 'Los Angeles' ? 'neighborhood' : 'locality' :
                    this.getBoardGroupProperty(location.gmsAddress, boardGroupSubPrioritiesNYLA);

                neighborhood = location.gmsAddress[groupSubProperty] || 'Other';
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
                boardTitle = location.gmsAddress.administrative_area_level_2
            } else if (this.location.gmsAddress.administrative_area_level_1) {
                boardTitle = location.gmsAddress.administrative_area_level_1;
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



module.exports = { iSpot };
