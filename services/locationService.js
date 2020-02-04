'use strict';
const _ = require('lodash');
const Utils = require('../common/utils');
const DbService = require('./dbService');
const { ObjectID } = require('mongodb');

class LocationService {
    static async search(location, userId, following, take, skip) {

        const sortBy = { timestamp: -1 };
        //{ $and: [{ "location.gmsAddress.country" : 'United States' }, {$or: [{"user.id" : '5bbbaa15af6d7e1d0c801342' } , {"user.id" : '5bbbaa1caf6d7e1d0c80135f' }] }]}
        let filter = {
            '$or': [
                { 'location.gmsAddress.administrative_area_level_1': { '$regex': location, $options: 'i' } },
                { 'location.gmsAddress.administrative_area_level_2': { '$regex': location, $options: 'i' } },
                { 'location.gmsAddress.locality': { '$regex': location, $options: 'i' } },
                { 'location.gmsAddress.country': { '$regex': location, $options: 'i' } },
            ]
        };

        let isFollowing = false;
        if (following) {
            isFollowing = JSON.parse(following);
        }

        if (isFollowing) {
            let user = await DbService.findOne(Utils.Collections.Users, { _id: ObjectID(userId) }, {});
            if (user.myPeople.length > 0) {
                var myPeopleFilter = [];
                for (var i in user.myPeople) {
                    let tmpObjFilter = { "user.id": user.myPeople[i].id };
                    myPeopleFilter.push(tmpObjFilter);
                }

                myPeopleFilter = { '$or': myPeopleFilter };
                filter = { '$and': [filter, myPeopleFilter] }
            }
            else {
                return [];
            }
        }

        let spots = await DbService.find(Utils.Collections.Spots, filter, {}, sortBy, take, (skip * take));
        return _.map(spots, Utils.spotMapping());

    }

    static async getLocations(location, take, skip) {

        const sortBy = { timestamp: -1 };
        let filter = {
            '$or': [
                { 'location.gmsAddress.administrative_area_level_1': { '$regex': location, $options: 'i' } },
                { 'location.gmsAddress.administrative_area_level_2': { '$regex': location, $options: 'i' } },
                { 'location.gmsAddress.locality': { '$regex': location, $options: 'i' } },
                { 'location.gmsAddress.country': { '$regex': location, $options: 'i' } },
            ]

        };

        let spots = await DbService.find(Utils.Collections.Spots, filter, {}, sortBy, take, (skip * take));

        var LocationList = [];

        _.map(spots, spot => {

            let city = spot.location.gmsAddress.locality ? spot.location.gmsAddress.locality : spot.location.gmsAddress.administrative_area_level_2;
            city = city ? city : spot.location.gmsAddress.administrative_area_level_1;

            let LocationObj = {
                coordinate: {
                    longitude: spot.location.geo.coordinates[0],
                    latitude: spot.location.geo.coordinates[1]
                },
                name: city + "," + spot.location.gmsAddress.country
            };

            let countryflag = false;

            for (var i in LocationList) {
                let localObj = LocationList[i];
                let CityName = localObj.name.split(",");
                CityName = CityName[0];

                if (city == CityName) {
                    countryflag = true;
                }
                else if (!city) {
                    countryflag = true;
                }
            }

            if (!countryflag) {
                LocationList.push(LocationObj);
            }
        });

        return LocationList;
    }

    static async getCountriesCites(userId, take, skip, type) {

        const sortBy = { timestamp: -1 };
        let filter = { 'user.id': userId };

        let spots = await DbService.find(Utils.Collections.Spots, filter, {}, sortBy, take, (skip * take));

        var CountriesList = [];

        _.map(spots, spot => {

            let locName = "";

            if (type == "countries") {
                locName = spot.location.gmsAddress.country
            }
            else if (type == "cities") {
                let city = spot.location.gmsAddress.locality ? spot.location.gmsAddress.locality : spot.location.gmsAddress.administrative_area_level_2;
                locName = city ? city : spot.location.gmsAddress.administrative_area_level_1;
            }

            let LocationObj = {
                coordinate: {
                    longitude: spot.location.geo.coordinates[0],
                    latitude: spot.location.geo.coordinates[1]
                },
                name: locName
            };

            let countryflag = false;

            for (var i in CountriesList) {
                let localObj = CountriesList[i];
                if (localObj.name == LocationObj.name) {
                    countryflag = true;
                }
            }

            if (!countryflag) {
                CountriesList.push(LocationObj);
            }
        });

        return CountriesList;
    }

}

module.exports = LocationService;