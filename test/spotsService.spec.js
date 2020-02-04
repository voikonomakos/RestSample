var should = require('chai').should();
var chai = require("chai");
const expect = require('chai').expect;
const Utils = require('../common/utils');
const DBService = require('../services/dbService');
const SpotsService = require('../services/spotsService');
const { Board } = require('../data/spotsData');

describe('SpotsService', async function () {
    this.timeout(50000);
    beforeEach(async () => {
        /* console.log('running before each test');
         nconf.argv().env('__');
         nconf.defaults({ conf: `${__dirname}/config.json` });
         nconf.file(nconf.get('conf'));
         */

        const mongodbConnectionString = "mongodb+srv://viko:viko123@pao-dev-m596x.mongodb.net/test?retryWrites=true";// nconf.get('atlas'); //nconf.get('heroku');
        const mongodbName = "pao"; // nconf.get('dbName');
        //const firebasedb = nconf.get('firebasedb');

        Utils.MongoDbSettings.push(mongodbConnectionString);
        Utils.MongoDbSettings.push(mongodbName);
        //Utils.MongoDbSettings.push(firebasedb);
    });

    it('Search returns expected results count', async function () {

        const spots = await SpotsService.search("chicken", 3, 0);

        spots.should.have.lengthOf(3);
    });

    it.only("Upload spot", async function () {

        // Arrange
        const richardId = "5bbba9fcaf6d7e1d0c8012ae";
        const country = "Antarctica";
        let spot = { description: 'test 1', media: [], timestamp: 1522958475000 };
        const board = new Board(country, country, Utils.BoardType.COUNTRY, false, 0);
        const boards = [board];

        let richard = await DBService.findById(Utils.Collections.Users, richardId);
        const uploadedSpotsCount = richard.uploadedSpotsCount;

        // Act
        spot = await SpotsService.uploadSpot(spot, richardId, board.id, board.title, boards);

        Utils.log(spot);
        // Assert
        const newSpot = await DBService.findById(Utils.Collections.Spots, spot.id);
        Utils.log(newSpot);

        spot.id.should.equal(newSpot._id.toString());

        richard = await DBService.findById(Utils.Collections.Users, richardId);
        richard.uploadedSpotsCount.should.equal(uploadedSpotsCount + 1);
        richard.countriesCount.should.equal(1);
        richard.citiesCount.should.equal(0);
        richard.uploadedBoards.should.have.lengthOf(1);

        const exists = Utils.exists(richard.uploadedBoards, x => x.id === board.id);
        exists.should.equal(true);
    })


    afterEach(async () => {
        //console.log('running after each test');
    })
})