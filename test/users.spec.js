var should = require('chai').should();
var chai = require("chai");
const expect = require('chai').expect;
const nconf = require('nconf');
const pkg = require('../package.json');

const Utils = require('../common/utils');
const DBService = require('../services/dbService');
const UsersService = require('../services/usersService');

describe.skip('Test', async function () {
    this.timeout(50000);
    beforeEach(async () => {
        /* console.log('running before each test');
         nconf.argv().env('__');
         nconf.defaults({ conf: `${__dirname}/config.json` });
         nconf.file(nconf.get('conf'));
         */

        const mongodbConnectionString = "mongodb+srv://viko:viko123@pao-dev-m596x.mongodb.net/test?retryWrites=true";// nconf.get('atlas'); //nconf.get('heroku');
        const mongodbName = "pao"; // nconf.get('dbName');
        const firebasedb = nconf.get('firebasedb');

        Utils.MongoDbSettings.push(mongodbConnectionString);
        Utils.MongoDbSettings.push(mongodbName);
        Utils.MongoDbSettings.push(firebasedb);
    });

    it('Nancy follows Richard', async function () {

        const richardId = "5bbba9fcaf6d7e1d0c8012ae";
        const nancyId = "5bbba9e7af6d7e1d0c801243";
        let richard = await DBService.findById(Utils.Collections.Users, richardId);
        let nancy = await DBService.findById(Utils.Collections.Users, nancyId);

        /*richard.followersCount.should.equal(0);
        richard.followers.should.be.empty;
        nancy.myPeopleCount.should.equal(0);
        nancy.myPeople.should.be.empty;*/

        await UsersService.follow(nancyId, richardId);

        richard = await DBService.findById(Utils.Collections.Users, richardId);
        nancy = await DBService.findById(Utils.Collections.Users, nancyId);

        richard.followersCount.should.equal(2);
        richard.followers.should.have.lengthOf(2);
        nancy.myPeopleCount.should.equal(1);
        nancy.myPeople.should.have.lengthOf(1);
    });

    it('Nancy unfollows Richard', async function () {

        const richardId = "5bbba9fcaf6d7e1d0c8012ae";
        const nancyId = "5bbba9e9af6d7e1d0c80124c";

        await UsersService.unFollow(nancyId, richardId);

        let richard = await DBService.findById(Utils.Collections.Users, richardId);
        let nancy = await DBService.findById(Utils.Collections.Users, nancyId);


        richard.followersCount.should.equal(0);
        richard.followers.should.have.lengthOf(0);
        nancy.myPeopleCount.should.equal(0);
        nancy.myPeople.should.have.lengthOf(0);
    });

    it('Follow private profile', async function () {
        const nancyId = "5bbba9e9af6d7e1d0c80124c";
        const richardId = "5bbba9fcaf6d7e1d0c8012ae";

        await UsersService.follow(nancyId, richardId);

        let richard = await DBService.findById(Utils.Collections.Users, richardId);

        richard.followRequestsCount.should.equal(1);
        richard.followRequests.should.have.lengthOf(1);
    });

    it('Accepts', async function () {
        const nancyId = "5bbba9e9af6d7e1d0c80124c";
        const richardId = "5bbba9fcaf6d7e1d0c8012ae";

        await UsersService.accept(richardId, nancyId);

        let richard = await DBService.findById(Utils.Collections.Users, richardId);
        let nancy = await DBService.findById(Utils.Collections.Users, nancyId);

        richard.followersCount.should.equal(1);
        richard.followers.should.have.lengthOf(1);
        nancy.myPeopleCount.should.equal(1);
        nancy.myPeople.should.have.lengthOf(1);
    });

    it('Richard rejects', async function () {
        const nancyId = "5bbba9e9af6d7e1d0c80124c";
        const richardId = "5bbba9fcaf6d7e1d0c8012ae";

        let richard = await DBService.findById(Utils.Collections.Users, richardId);

        richard.followRequestsCount.should.equal(1);
        richard.followRequests.should.have.lengthOf(1);

        await UsersService.reject(richardId, nancyId);

        richard = await DBService.findById(Utils.Collections.Users, richardId);

        richard.followRequestsCount.should.equal(0);
        richard.followRequests.should.have.lengthOf(0);
    });


    afterEach(async () => {
        //console.log('running after each test');
    })
})