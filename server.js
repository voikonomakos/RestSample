const debug = require('debug')('app');
const http = require('http');
var cors = require('cors');
const express = require('express');
// const morgan = require('morgan');
const bodyParser = require('body-parser');
const errorhandler = require('errorhandler');
const nconf = require('nconf');
const pkg = require('./package.json');
const Utils = require('./common/utils');
const DbService = require('./services/dbService');

nconf.argv().env('__');
nconf.defaults({ conf: `${__dirname}/config.json` });
nconf.file(nconf.get('conf'));

const app = express();
app.use(errorhandler());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//////CORS////////
app.options('*', cors());
app.use(cors());
//////////////////

const mongodbConnectionString = nconf.get('atlas-viko'); //nconf.get('heroku');
const mongodbName = nconf.get('dbName');
const firebaseDatabaseUrl = nconf.get('firebasedbUrl-dev');
const firebaseServiceAccountFileName = nconf.get('firebaseServiceAccountFilename-dev');

Utils.Settings.push(mongodbConnectionString);
Utils.Settings.push(mongodbName);
Utils.Settings.push(firebaseDatabaseUrl);
Utils.Settings.push(firebaseServiceAccountFileName);

Utils.initializeFirebaseAdmin();

const routes = require('./routes');
app.get('/', (req, res) => res.status(200).send('PAO API v.' + pkg.version));
app.get('/api/version', (req, res) => res.status(200).send(pkg.version));

routes.set(app);


app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});
app.use(function (err, req, res, next) {

  //logger.error('server', {error: err});

  if (err.name === 'UnauthorizedError') {
    console.log('**********************');
    console.log('Error: ' + err.toString());
    console.log('**********************');
    res.status(401);
    res.json({ 'error': { message: err.toString() } });
  } else {
    console.log('**********************');
    console.log('Error: ' + err.toString());
    console.log('**********************');
    res.status(err.status || 500);
    res.send({ 'error': { message: err.toString() } });
  }
});

const server = http.createServer(app);
const port = process.env.PORT || nconf.get('port') || 3000;

debug(`Server listening on port: ${port}`);
server.listen(port);

module.exports = app;
