// set up ======================================================================
var express = require('express');
var app = express(); // create our app w/ express
var mongoose = require('mongoose'); // mongoose for mongodb
var mongodb = require('mongodb');
var port = process.env.PORT || 8090; // set the port
var database = require('./app/configs/database'); // load the database config
var regex = require('regex');
var bodyParser = require('body-parser');
var path = require('path');

app.use(express.static('app')); 
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
// Samsung Series 9 laptop
//if (addresses == '192.168.192.54') {
if (addresses == '192.168.192.60') {
    // MongoDB
    var dburl = database.localUrl;
} else {
    // MongoDB
    var dburl = database.remoteUrl;
}
//mongoose.connect(dburl); // Connect to local MongoDB instance. A remoteUrl is also available (modulus.io)
mongoose.connect('mongodb://localhost:27017/cat'); 

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    
});


// routes ======================================================================
require('./app/routes/routes.js')(app); // load our routes and pass in our app

 app.get('*', function(req, res) {
    //res.sendFile('index.html'); // load the single view file (angular will handle the page changes on the front-end)
    res.sendFile('index.html', { root: path.join(__dirname, 'app') });
    });

// listen (start app with node server.js) ======================================
app.listen(port);

 

console.log("App listening on port " + port);
console.log("Mongoose connection: " + dburl);
console.log("mongoose.connection: " + dburl);
