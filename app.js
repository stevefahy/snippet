// set up ======================================================================
var express = require('express');
var app = express(); // create our app w/ express
var mongoose = require('mongoose'); // mongoose for mongodb
var mongodb = require('mongodb');
var port = process.env.PORT || 8090; // set the port
var urls = require('./app/configs/urls'); // load the urls config
var regex = require('regex');
var bodyParser = require('body-parser');
var path = require('path');
var formidable = require('formidable');
var fs = require('fs');
// Auth
var passport = require('passport');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

// Check for local or production environment
var os = require('os');
var interfaces = os.networkInterfaces();
var addresses = [];
for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
            addresses.push(address.address);
        }
    }
}
// Dell XPS 13
if (addresses == '192.168.192.60') {
    // MongoDB
    var dburl = urls.localUrl;
    // Google Auth callBackURL
    global.callbackURL = 'http://localhost:8090/auth/google/callback';
} else {
    // MongoDB
    var dburl = urls.remoteUrl;
    // Google Auth callBackURL
    global.callbackURL = 'http://www.snipbee.com/auth/google/callback2';
}
// set up our express application
//app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)

// Passport
require('./app/configs/passport')(passport); // pass passport for configuration
// required for passport
app.use(session({
    secret: 'ilovescotchscotchyscotchscotch', // session secret
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
//app.use(flash()); // use connect-flash for flash messages stored in session

app.use(express.static('app'));

app.use('/fileuploads', express.static(path.join(__dirname, '../upload_dir')));
app.use('/assets', express.static(path.join(__dirname, '/app/assets')));
app.use('/snip', express.static(path.join(__dirname, '/app')));

app.use(bodyParser.urlencoded({ 'extended': 'true' })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json. Get information from html forms
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json

// configuration ===============================================================

mongoose.connect(dburl); // Connect to local MongoDB instance. A remoteUrl is also available (modulus.io)
//mongoose.connect(dbuserurl); // User login

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {

});


// routes ======================================================================
//require('./app/routes/routes.js')(app); // load our routes and pass in our app
require('./app/routes/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// listen (start app with node server.js) ======================================
app.listen(port);

console.log("App listening on port " + port);
console.log("Mongoose connection: " + dburl);