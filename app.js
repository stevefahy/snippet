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
var favicon = require('serve-favicon');
var nodemailer = require('nodemailer');
//
// socket.io
//
//var http = require('http').Server(app);
//var io = require('socket.io')(http);
var io = require('socket.io');
var http = require('http');
var server = http.createServer(app);
var io = io.listen(server);

io.on('connection', function(socket) {
    console.log('socket.io SERVER connection made: ' + socket.id);
    console.log('SERVER socket clients: ' + Object.keys(io.sockets.sockets));
    console.log('SERVER socket namespaces: ' + Object.keys(io.nsps));

    var ns;

    socket.on('create_ns', function(ns) {
        console.log('SERVER client request to create ns: ' + ns);
        // create unique namespace requested by client
        var nsp = io.of('/' + ns);
        var nspn;
        // nsp namespace connection
        nsp.on('connection', function(nsp) {
            console.log('SERVER NS connected: ' + nsp.nsp.name);
            console.log('SERVER socket clients: ' + Object.keys(io.sockets.sockets));
            console.log('SERVER socket namespaces: ' + Object.keys(io.nsps));
            // store the namespace name
            nspn = nsp.nsp.name;
            // confirm that namespace has been created to client
            nsp.emit('joined_ns', nsp.nsp.name);
            // emited by cardcreate_ctrl when card has been created
            nsp.on('card_posted', function(data) {
                console.log('SERVER NS connected: ' + nsp.nsp.name);
                console.log('SERVER socket clients: ' + Object.keys(io.sockets.sockets));
                console.log('SERVER socket namespaces: ' + Object.keys(io.nsps));
                console.log('card_posted, conv id: ' + data.conversation_id + ' , participants: ' + data.participants);
                // notify relevant namespace of the cards creation
                for (var i in data.participants) {
                    console.log('check for namespace:' + data.participants[i]._id);
                    // dont emit to the user which sent the card
                    if (data.participants[i]._id === nspn.substring(1, nspn.length)) {
                        console.log(data.participants[i]._id + '===' + nspn.substring(1, nspn.length));
                    } else {
                        for (var y in Object.keys(io.nsps)) {
                            console.log('nsp: ' + Object.keys(io.nsps)[y]);
                            if (Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length) === data.participants[i]._id) {
                                console.log('emit to: ' + data.participants[i]._id);
                                var nsp_new = io.of('/' + data.participants[i]._id);
                                nsp_new.emit('notify_users', { conversation_id: data.conversation_id, participants: data.participants });
                            }
                        }
                    }
                }
            });

            nsp.on('send_ping', function() {
                nsp.emit('return_ping', { sockets: Object.keys(io.sockets.sockets), nsps: Object.keys(io.nsps) });
            });

            // on namespace disconnect
            nsp.on('disconnect', function(sock) {
                console.log('SERVER NS disconnected: ' + nspn);
                // delete this namespace after it has disconnected
                delete io.nsps[nspn];
                console.log('SERVER socket clients: ' + Object.keys(io.sockets.sockets));
                console.log('SERVER socket namespaces: ' + Object.keys(io.nsps));
            });

        });

    });

    // on socket disconnect
    socket.on('disconnect', function() {
        console.log('socket.io server disconnected: ' + socket.id);
        console.log('SERVER socket clients: ' + Object.keys(io.sockets.sockets));
        console.log('SERVER socket namespaces: ' + Object.keys(io.nsps));
    });

});

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
    global.mailUrl = 'http://localhost:8090';
} else {
    // MongoDB
    var dburl = urls.remoteUrl;
    // Google Auth callBackURL
    global.callbackURL = 'http://www.snipbee.com/auth/google/callback';
    global.mailUrl = 'http://www.snipbee.com';
}
// set up our express application
//app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)

// Passport
require('./app/configs/passport')(passport); // pass passport for configuration
// required for passport
app.use(session({
    secret: 'ilovescotchscotchyscotchscotchx', // session secret
    resave: true,
    saveUninitialized: true
}));
app.use(favicon(path.join(__dirname, '/app/assets', 'images', 'favicon.ico')));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
//app.use(flash()); // use connect-flash for flash messages stored in session

app.use(express.static('app'));

app.use('/fileuploads', express.static(path.join(__dirname, '../upload_dir')));
app.use('/assets', express.static(path.join(__dirname, '/app/assets')));
//app.use('/snip', express.static(path.join(__dirname, '/app')));
app.use('/', express.static(path.join(__dirname, '/app')));

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

require('./app/routes/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// listen (start app with node server.js) ======================================

server.listen(port);

console.log("App listening on port " + port);
console.log("Mongoose connection: " + dburl);