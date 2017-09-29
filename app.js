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

app.use(express.static('app'));

app.use('/fileuploads', express.static(path.join(__dirname, '../upload_dir')));
app.use('/assets', express.static(path.join(__dirname, '/app/assets')));
app.use('/snip', express.static(path.join(__dirname, '/app')));

app.use(bodyParser.urlencoded({ 'extended': 'true' })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json

// configuration ===============================================================
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
} else {
    // MongoDB
    var dburl = urls.remoteUrl;
}
mongoose.connect(dburl); // Connect to local MongoDB instance. A remoteUrl is also available (modulus.io)

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {

});

// routes ======================================================================
require('./app/routes/routes.js')(app); // load our routes and pass in our app

// WEB ROUTE
app.get('/', function(req, res) {
    // load the single view file (angular will handle the page changes on the front-end)
    res.sendFile('index.html', { root: path.join(__dirname, 'app') });
});
app.get('/:username', function(req, res) {
    // load the single view file (angular will handle the page changes on the front-end)
    res.sendFile('index.html', { root: path.join(__dirname, 'app') });
});
app.get('/s/:snip', function(req, res) {
    // load the single view file (angular will handle the page changes on the front-end)
    res.sendFile('index.html', { root: path.join(__dirname, 'app') });
});

// API
// Use for API only. Angular handles web routes
app.post('/api/cards/search_user/:id', function(req, res) {
    var id = req.params.id;
    res.json({ user: id });
});

// listen (start app with node server.js) ======================================
app.listen(port);

console.log("App listening on port " + port);
console.log("Mongoose connection: " + dburl);