// set up ======================================================================
var express = require('express');
var app = express(); // create our app w/ express
var mongoose = require('mongoose'); // mongoose for mongodb

mongoose.Promise = require('bluebird');

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
var request = require('request');


// Debug Socketio
//var debug = require('debug')('http'), http = require('http'), name = 'My App';
//debug=* node app.js;
//debug('booting %o', name);

//
// socket.io
//
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io')(server);

server.setMaxListeners(0);
io.sockets.setMaxListeners(0);

// 04/07/18
io.set('transports', ['websocket']);







conversationCreated = function(data) {
    console.log('socket_ns conversation_created, conv id: ' + data.conversation_id + ' , participants: ' + data.participants, ', admin: ' + data.admin);
    console.log(data.participants);
    console.log('socket_ns namespace: ' + this.nsp.name + ', clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
    // notify relevant namespace(s) of the cards creation
    for (var i in data.participants) {
        for (var y in Object.keys(io.nsps)) {
            // if the namespace exists on the server
            console.log(Object.keys(io.nsps)[y]);
            if (Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length) === data.participants[i]._id) {
                //if (Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length).indexOf(data.participants[i]._id)) {
                // emit to the participant
                //var nsp_new = io.of('/' + data.participants[i]._id);
                var nsp_new = io.of('/' + Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length));
                //console.log('emit notify_users: ' + data.participants[i]._id);
                console.log('socket_ns emit conversation_created: ' + Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length));
                nsp_new.emit('notify_conversation_created', { conversation_id: data.conversation_id, participants: data.participants, admin: data.admin });
            }
        }
    }
};

privateCreated = function(data) {
    console.log('socket_ns private_created, conv id: ' + data.conversation_id + ' , card_id: ' + data.card_id + ' , participants: ' + data.participants + ' , viewed_users: ' + data.viewed_users);
    console.log(data.participants);
    console.log('socket_ns namespace: ' + this.nsp.name + ', clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
    // notify relevant namespace(s) of the cards creation
    for (var i in data.participants) {
        // dont emit to the user which sent the card
        //if (data.participants[i]._id != data.sender_id) {
        for (var y in Object.keys(io.nsps)) {
            // if the namespace exists on the server
            console.log(Object.keys(io.nsps)[y]);
            if (Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length) === data.participants[i]._id) {
                //if (Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length).indexOf(data.participants[i]._id)) {
                // emit to the participant
                //var nsp_new = io.of('/' + data.participants[i]._id);
                var nsp_new = io.of('/' + Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length));
                //console.log('emit notify_users: ' + data.participants[i]._id);
                console.log('socket_ns emit private_created: ' + Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length));
                nsp_new.emit('notify_private_created', { conversation_id: data.conversation_id, card_id: data.card_id, participants: data.participants, viewed_users: data.viewed_users });
            }
        }
        //}
    }
};

privateUpdated = function(data) {
    console.log('socket_ns private_updated, conv id: ' + data.conversation_id + ' , card_id: ' + data.card_id + ' , participants: ' + data.participants + ' , viewed_users: ' + data.viewed_users);
    console.log(data.participants);
    console.log('socket_ns namespace: ' + this.nsp.name + ', clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
    // notify relevant namespace(s) of the cards creation
    for (var i in data.participants) {
        // dont emit to the user which sent the card
        //if (data.participants[i]._id != data.sender_id) {
        for (var y in Object.keys(io.nsps)) {
            // if the namespace exists on the server
            console.log(Object.keys(io.nsps)[y]);
            if (Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length) === data.participants[i]._id) {
                //if (Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length).indexOf(data.participants[i]._id)) {
                // emit to the participant
                //var nsp_new = io.of('/' + data.participants[i]._id);
                var nsp_new = io.of('/' + Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length));
                //console.log('emit notify_users: ' + data.participants[i]._id);
                console.log('socket_ns emit private_updated: ' + Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length));
                nsp_new.emit('notify_private_updated', { conversation_id: data.conversation_id, card_id: data.card_id, participants: data.participants, viewed_users: data.viewed_users });
            }
        }
        //}
    }
};

privateDeleted = function(data) {
    console.log('socket_ns private_deleted, conv id: ' + data.conversation_id + ' , card_id: ' + data.card_id + ' , participants: ' + data.participants + ' , viewed_users: ' + data.viewed_users);
    console.log(data.participants);
    console.log('socket_ns namespace: ' + this.nsp.name + ', clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
    // notify relevant namespace(s) of the cards creation
    for (var i in data.participants) {
        // dont emit to the user which sent the card
        //if (data.participants[i]._id != data.sender_id) {
        for (var y in Object.keys(io.nsps)) {
            // if the namespace exists on the server
            console.log(Object.keys(io.nsps)[y]);
            if (Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length) === data.participants[i]._id) {
                //if (Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length).indexOf(data.participants[i]._id)) {
                // emit to the participant
                //var nsp_new = io.of('/' + data.participants[i]._id);
                var nsp_new = io.of('/' + Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length));
                //console.log('emit notify_users: ' + data.participants[i]._id);
                console.log('socket_ns emit private_deleted: ' + Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length));
                nsp_new.emit('notify_private_deleted', { conversation_id: data.conversation_id, card_id: data.card_id, participants: data.participants, viewed_users: data.viewed_users });
            }
        }
        //}
    }
};

publicCreated = function(data) {
    console.log('socket_ns public_created, conv id: ' + data.conversation_id + ' , card id: ' + data.card_id + ' , followers: ' + data.followers);
    console.log('socket_ns namespace: ' + this.nsp.name + ', clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
    // notify relevant namespace(s) of the cards creation
    for (var i in data.followers) {
        // dont emit to the user which sent the card
        //if (data.followers[i]._id != data.sender_id) {
        for (var y in Object.keys(io.nsps)) {
            // if the namespace exists on the server
            console.log(Object.keys(io.nsps)[y]);
            if (Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length) === data.followers[i]._id) {
                // emit to the participant
                var nsp_new = io.of('/' + data.followers[i]._id);
                console.log('socket_ns emit notify_users: ' + data.followers[i]._id);

                console.log('socket_ns Clients of ' + data.followers[i]._id + ':');

                io.of('/' + data.followers[i]._id).clients((error, clients) => {
                    if (error) throw error;
                    console.log(clients); // => [PZDoMHjiu8PYfRiKAAAF, Anw2LatarvGVVXEIAAAD]
                });

                nsp_new.emit('notify_public_created', { conversation_id: data.conversation_id, card_id: data.card_id, followers: data.followers });
            }
        }
        //}
    }
};

publicDeleted = function(data) {
    console.log('socket_ns public_deleted, conv id: ' + data.conversation_id + ' , card id: ' + data.card_id + ' , followers: ' + data.followers);
    console.log('socket_ns namespace: ' + this.nsp.name + ', clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
    // notify relevant namespace(s) of the cards creation
    for (var i in data.followers) {
        // dont emit to the user which sent the card
        //if (data.followers[i]._id != data.sender_id) {
        for (var y in Object.keys(io.nsps)) {
            // if the namespace exists on the server
            console.log(Object.keys(io.nsps)[y]);
            if (Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length) === data.followers[i]._id) {
                // emit to the participant
                var nsp_new = io.of('/' + data.followers[i]._id);
                console.log('socket_ns emit notify_users public_deleted: ' + data.followers[i]._id);
                nsp_new.emit('notify_public_deleted', { conversation_id: data.conversation_id, card_id: data.card_id, followers: data.followers });
            }
        }
        //}
    }
};

publicUpdated = function(data) {
    console.log('socket_ns public_updated, conv id: ' + data.conversation_id + ' card id: ' + data.card_id + ' , followers: ' + data.followers);
    console.log('socket_ns namespace: ' + this.nsp.name + ', clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
    // notify relevant namespace(s) of the cards creation
    for (var i in data.followers) {
        // dont emit to the user which sent the card
        //if (data.followers[i]._id != data.sender_id) {
        for (var y in Object.keys(io.nsps)) {
            // if the namespace exists on the server
            console.log(Object.keys(io.nsps)[y]);
            if (Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length) === data.followers[i]._id) {
                // emit to the participant
                var nsp_new = io.of('/' + data.followers[i]._id);
                console.log('socket_ns emit notify_user public_updated: ' + data.followers[i]._id);
                nsp_new.emit('notify_public_updated', { conversation_id: data.conversation_id, card_id: data.card_id, followers: data.followers });
            }
        }
        //}
    }
};

dataChange = function(data) {
    console.log('socket_ns data_change, update: ' + data.update + ' , user: ' + data.user + ' , users: ' + data.users);
    console.log('socket_ns namespace: ' + this.nsp.name + ', clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
    // notify relevant namespace(s) of the data change.
    for (var i in data.users) {
        // dont emit to the user which sent the change.
        if (data.users[i] != data.user) {
            for (var y in Object.keys(io.nsps)) {
                // if the namespace exists on the server
                //console.log(Object.keys(io.nsps)[y]);
                if (Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length) === data.users[i]) {
                    // emit to the participant
                    var nsp_new = io.of('/' + data.users[i]);
                    console.log('socket_ns emit update_data: ' + data.users[i]);
                    nsp_new.emit('update_data', { update_values: data.update, user: data.user });
                }
            }
        }
    }
};

contactChange = function(data) {
    console.log('socket_ns contact_change, update: ' + data.update + ' , user: ' + data.user + ' , users: ' + data.users);
    console.log('socket_ns namespace: ' + this.nsp.name + ', clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
    // notify relevant namespace(s) of the data change.
    for (var i in data.users) {
        // dont emit to the user which sent the change.
        if (data.users[i] != data.user) {
            for (var y in Object.keys(io.nsps)) {
                // if the namespace exists on the server
                //console.log(Object.keys(io.nsps)[y]);
                if (Object.keys(io.nsps)[y].substring(1, Object.keys(io.nsps)[y].length) === data.users[i]) {
                    // emit to the participant
                    var nsp_new = io.of('/' + data.users[i]);
                    console.log('socket_ns emit update_contact: ' + data.users[i]);
                    nsp_new.emit('update_contact', { update_values: data.update, user: data.user });
                }
            }
        }
    }
};

create_ns = function(ns) {
    console.log('IO create ns: ' + ns);
    // Check whether this namespace has been created already.
    var instances = Object.keys(io.nsps).indexOf('/' + ns);
    //console.log(instances);
    // Only create the namespace if it has not already been created.
    if (instances < 0) {
        // create unique namespace requested by client
        console.log('socket create_ns Creating ns: ' + ns);
        var socket_ns = io.of('/' + ns);
        //console.log(socket_ns);
        //console.log('socket create_ns clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
        socket_ns.on('connection', socket_connection);


        // TEST  20/01/19
        socket_ns.on('disconnect', function(sockets) {
            console.log('socket disconnect, clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
        });
        socket_ns.on('connect', function(socket) {
            //console.log(socket.nsp.name  + ' # ' + socket.client.conn.id);
           //console.log(this);
            //console.log(this.name);
            //console.log('socket connect: ' + socket.id + ', clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
            console.log('socket connect: ' + socket.nsp.name  + ' # ' + socket.client.conn.id + ', clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
            //console.log('socket_ns 2 SERVER CONNECT: ' + socket.id + ', clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
        });
        socket_ns.on('connect_error', function(error) {
            console.log('socket connect_error: ' + error);
        });
        socket_ns.on('connect_timeout', function(timeout) {
            console.log('socket connect_timeout:' + timeout);
        });
        socket_ns.on('error', function(error) {
            console.log('socket error: ' + error);
        });
        socket_ns.on('reconnect', function(attemptNumber) {
            console.log('socket reconnect: ' + attemptNumber);
        });
        socket_ns.on('reconnect_attempt', function(attemptNumber) {
            console.log('socket reconnect_attempt: ' + attemptNumber);
        });
        socket_ns.on('reconnecting', function(attemptNumber) {
            console.log('socket reconnecting: ' + attemptNumber);
        });
        socket_ns.on('reconnect_error', function(error) {
            console.log('socket reconnect_error: ' + error);
        });
        socket_ns.on('reconnect_failed', function() {
            console.log('socket reconnect_failed');
        });
    } else {
        console.log('already created');
        //console.log(Object.keys(io.nsps)[instances]);
        //var socket_ns = io.of(Object.keys(io.nsps)[instances]);
        //socket_ns.emit('existing_ns', this.id);
    }
};

showSockets = function(){
    setTimeout(function(){
     console.log('clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
    }, 500);
 
};

socket_connection = function(socket_ns) {
    console.log('socket_ns connection: ' + socket_ns.id);
    showSockets();
    //console.log(socket_ns.id);
    socket_ns.setMaxListeners(0);
    // confirm that namespace has been created to client
    socket_ns.emit('joined_ns', this.id);
    // Add listeners.
    //console.log('ADD card_posted, data_change, reconnect_attempt, disconnect listeners');
    socket_ns.on('conversation_created', conversationCreated);
    socket_ns.on('private_created', privateCreated);
    socket_ns.on('private_deleted', privateDeleted);
    socket_ns.on('private_updated', privateUpdated);
    socket_ns.on('public_created', publicCreated);
    socket_ns.on('public_deleted', publicDeleted);
    socket_ns.on('public_updated', publicUpdated);
    socket_ns.on('data_change', dataChange);
    socket_ns.on('contact_change', contactChange);
    //socket_ns.on('reconnect_attempt', reconnect_attempt);
    //socket_ns.on('disconnect', socket_ns_disconnect);

    // TEST  20/01/19
    socket_ns.on('connection', function(sockets) {
        console.log('socket_ns connection, clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
    });
    
    socket_ns.on('disconnect', function(sockets) {
        //console.log(this.nsp.name);
        //console.log(this.client.conn.id);
        //console.log('disconnect: ' + sockets);
        //console.log(this.id);
        console.log('socket_ns disconnect: ' + this.nsp.name  + ' # ' + this.client.conn.id + ', clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
        showSockets();
    });
    
    socket_ns.on('connect', function(socket) {
        console.log('socket_ns connect: ' + socket.id + ', clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
    });

    socket_ns.on('connect_error', function(error) {
        console.log('socket_ns connect_error: ' + error);
    });
    socket_ns.on('connect_timeout', function(timeout) {
        console.log('socket_ns connect_timeout:' + timeout);
    });
    socket_ns.on('error', function(error) {
        console.log('socket_ns error: ' + error);
    });
    socket_ns.on('reconnect', function(attemptNumber) {
        console.log('socket_ns reconnect: ' + attemptNumber);
    });
    socket_ns.on('reconnect_attempt', function(attemptNumber) {
        console.log('socket_ns reconnect_attempt: ' + attemptNumber);
        socket_ns.io.opts.transports = ['polling', 'websocket'];
    });
    socket_ns.on('reconnecting', function(attemptNumber) {
        console.log('socket_ns reconnecting: ' + attemptNumber);
    });
    socket_ns.on('reconnect_error', function(error) {
        console.log('socket_ns reconnect_error: ' + error);
    });
    socket_ns.on('reconnect_failed', function() {
        console.log('socket_ns reconnect_failed');
    });



    /*
    console.log('Clients of ' + socket_ns.nsp.name + ':');

    io.of(socket_ns.nsp.name).clients((error, clients) => {
        if (error) throw error;
        console.log(clients); // => [PZDoMHjiu8PYfRiKAAAF, Anw2LatarvGVVXEIAAAD]
    });
    */


};

/*
socket_ns_disconnect = function() {
    var socket_ns = this.nsp;
    // Delete the namespace.
    //delete io.nsps[this.nsp.name];
    console.log('socket_ns DISCONNECT 2: ' + this.id + ', clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
    //console.log('REMOVE socket_ns listeners');
    /*
    socket_ns.removeListener('create_ns', create_ns);
    socket_ns.removeListener('connection', socket_connection);
    socket_ns.removeListener('card_posted', cardPosted);
    //socket_ns.removeListener('card_deleted', cardDeleted);
    //socket_ns.removeListener('card_updated', cardUpdated);
    socket_ns.removeListener('public_posted', publicPosted);
    socket_ns.removeListener('public_deleted', publicDeleted);
    socket_ns.removeListener('public_updated', publicUpdated);
    socket_ns.removeListener('data_change', dataChange);
    socket_ns.removeListener('reconnect_attempt', reconnect_attempt);
    socket_ns.removeListener('disconnect', socket_ns_disconnect);
    */
    /*
};
*/

/*
reconnect_attempt = function() {
    console.log('socket_ns reconnect attempt');
    // on reconnection, reset the transports option, as the Websocket
    // connection may have failed (caused by proxy, firewall, browser, ...)
    socket_ns.io.opts.transports = ['polling', 'websocket'];
};
*/

io.on('connect', function(socket) {
    console.log('IO CONNECT: ' + socket.id + ', clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
    // namespace sent by client
    socket.on('create_ns', create_ns);
    /*
    // on socket disconnect
    socket.on('disconnect', function(sockets) {
        console.log('SOCKET DISCONNECT, clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
    });
    */
    

});


// TEST  20/01/19
io.on('disconnect', function(sockets) {
    console.log('IO DISCONNECT, clients: ' + Object.keys(io.sockets.sockets) + ', namespaces: ' + Object.keys(io.nsps));
});

io.on('connect_error', function(error) {
    console.log('IO connect_error: ' + error);
});
io.on('connect_timeout', function(timeout) {
    console.log('IO connect_timeout:' + timeout);
});
io.on('error', function(error) {
    console.log('IO error: ' + error);
});
io.on('reconnect', function(attemptNumber) {
    console.log('IO reconnect: ' + attemptNumber);
});
io.on('reconnect_attempt', function(attemptNumber) {
    console.log('IO reconnect_attempt: ' + attemptNumber);
});
io.on('reconnecting', function(attemptNumber) {
    console.log('IO reconnecting: ' + attemptNumber);
});
io.on('reconnect_error', function(error) {
    console.log('IO reconnect_error: ' + error);
});
io.on('reconnect_failed', function() {
    console.log('IO reconnect_failed');
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
// Dell XPS 13 or other local networks
console.log(addresses);
if (addresses == '192.168.192.59' || addresses == '10.21.221.127' || addresses == '10.61.137.245' || addresses == '10.32.139.207' || addresses == '192.168.43.199' || addresses == '10.70.216.59' || addresses == '192.168.1.85' || addresses == '192.168.43.62') {
    // MongoDB
    var dburl = urls.localUrl;
    // Google Auth callBackURL
    global.callbackURL = 'http://localhost:8090/auth/google/callback';
    global.mailUrl = 'http://localhost:8090';
} else {
    // MongoDB
    var dburl = urls.remoteUrl;
    // Google Auth callBackURL
    global.callbackURL = 'https://www.snipbee.com/auth/google/callback';
    global.mailUrl = 'http://www.snipbee.com';
}
// set up our express application
//app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)

// Passport
require('./app/configs/passport')(passport); // pass passport for configuration

app.use(favicon(path.join(__dirname, '/app/assets', 'images', 'favicon.ico')));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
//app.use(flash()); // use connect-flash for flash messages stored in session

app.use(express.static('app'));

app.use('/fileuploads', express.static(path.join(__dirname, '../upload_dir')));
app.use('/assets', express.static(path.join(__dirname, '/app/assets')));
app.use('/', express.static(path.join(__dirname, '/app')));

app.use(bodyParser.urlencoded({ 'extended': 'true' })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json. Get information from html forms
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));


// configuration ===============================================================
//mongoose.set('debug', true);
mongoose.connect(dburl, { useNewUrlParser: true }); // Connect to local MongoDB instance. A remoteUrl is also available (modulus.io)

var db = mongoose.connection;

db.on('connecting', function() {
    //console.log('connecting to MongoDB...');
});
db.on('error', function(error) {
    //console.error('Error in MongoDb connection: ' + error);
    mongoose.disconnect();
});
db.on('connected', function() {
    //console.log('MongoDB connected!');
});
db.once('open', function() {
    //console.log('MongoDB connection opened!');
});
db.on('reconnected', function() {
    //console.log('MongoDB reconnected!');
});
db.on('disconnecting', function() {
    //console.log('MongoDB disconnecting!');
});
db.on('disconnected', function() {
    //console.log('MongoDB disconnected!');
    mongoose.connect(dburl, { server: { auto_reconnect: true } });
});


// routes ======================================================================

require('./app/routes/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// listen (start app with node server.js) ======================================

server.listen(port);

console.log("App listening on port " + port);
console.log("Mongoose connection: " + dburl);