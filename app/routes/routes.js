var Card = require('../models/card');
var User = require('../models/user');
var Invite = require('../models/invite');
var Conversation = require('../models/conversation');
var formidable = require('formidable');
var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var nodemailer = require('nodemailer');
var base64url = require('base64url');
var request = require('request');
var fcm = require('../configs/fcm');

// load the auth variables
var configAuth = require('../configs/auth'); // use this one for testing

function getContacts(res) {
    User.find(function(err, users) {
        // if there is an error retrieving, send the error. nothing after res.send(err) will execute
        if (err) {
            return res.send(err);
        }
        res.json(cards);
    });
}

function getConversationId(id) {
    var query = Conversation.findOne({ '_id': id });
    return query;
}

// find the array index of an object value
function findWithAttr(array, attr, value) {
    for (var i = 0; i < array.length; i += 1) {
        if (String(array[i][attr]) === String(value)) {
            return i;
        }
    }
    return -1;
}

function createTokenArray(arr) {
    var token_array = [];
    for (var i in arr) {
        if (arr[i].token) {
            token_array.push(arr[i].token);
        }
    }
    token_array.reverse();
    return token_array;
}

// Public conversation created when user first logs in.
function createPublicConversation(user, callback) {
    // reset the participants array.
    var participants = [];
    // Add current user as a participant
    participants.push({ _id: user._id, unviewed: [] });
    // Create conversation in DB.
    Conversation.create({
        conversation_name: 'Public',
        conversation_type: 'public',
        conversation_avatar: user.avatar,
        admin: user._id,
        participants: participants,
        done: false
    }, function(err, conversation) {
        if (err) {
            console.log('error: ' + err);
            res.send(err);
        }
        // return the created conversation
        callback(conversation);
    });
}

// route middleware to ensure user is logged in and a member of the conversation
function isMember(req, res, next) {
    // must be logged in to be a member
    if (req.isAuthenticated()) {
        // get the members of this conversation
        var query = getConversationId(req.params.id);
        query.exec(function(err, conversation) {
            if (err) {
                return console.log(err);
            }
            var user_pos = findWithAttr(conversation.participants, '_id', req.user._id);
            // Check that the conversation exists.
            if (conversation === null) {
                res.redirect('/');
            } else if (user_pos >= 0) {
                // if the current is is a member of this conversation continue
                return next();
            } else {
                // otherwise redirect to login
                res.redirect('/api/login');
            }
        });
    } else {
        // causing infinite loop
        res.redirect('/api/login');
    }
}

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/api/login');
    }
}

module.exports = function(app, passport) {
    //
    // WEB ROUTE
    //----------------------------------------------------------------------
    //
    // NOT LOGGED IN
    app.get('/api/login', function(req, res) {
        // load the single view file (angular will handle the page changes on the front-end)
        res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
    });
    // LOGGED IN
    app.get('/', isLoggedIn, function(req, res) {
        res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
    });
    // LOGOUT
    app.get('/api/logout', function(req, res) {
        req.logout();
        req.logOut();

        req.session.destroy(function(err) {
            if (err) {
                console.log('err: ' + err);
            }
            res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
        });
    });

    // /:USERNAME (users home page)
    app.get('/:username', function(req, res) {
        res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
    });
    // /:SNIP (single snip)
    app.get('/s/:snip', function(req, res) {
        res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
    });
    // CONTACTS
    app.get('/c/contacts', isLoggedIn, function(req, res) {
        res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
    });

    // CONTACTS - IMPORT
    app.get('/c/contacts/import', isLoggedIn, function(req, res) {
        res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
    });
    /*
    // CONTACTS - IMPORT
    app.get('/c/contacts/search', isLoggedIn, function(req, res) {
        res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
    });
    // CONTACTS - IMPORT
    app.get('/c/contacts/contacts', isLoggedIn, function(req, res) {
        res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
    });
    */
    // CONVERSATION
    app.get('/chat/conversation/:id', isMember, function(req, res) {
        res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
    });
    // CONVERSATIONS
    app.get('/chat/conversations', isLoggedIn, function(req, res) {
        res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
    });
    // USER SETTING
    app.get('/api/user_setting', isLoggedIn, function(req, res) {
        res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
    });
    // Route to check passort authentication
    app.get('/api/user_data', isLoggedIn, function(req, res) {
        if (req.user === undefined) {
            // The user is not logged in
            res.json({ 'username': 'forbidden' });
        } else {
            res.json({
                user: req.user
            });
        }
    });
    // Get the FCM data
    app.get('/api/fcm_data', function(req, res) {
        if (req.user === undefined) {
            // The user is not logged in
            res.json({ 'fcm': 'forbidden' });
        } else {
            res.json({
                fcm: fcm
            });
        }
    });
    //
    // API
    //------------------------------------------------------------------
    //
    // Use for API only. Angular handles web routes
    //
    // GOOGLE
    //
    // Login from the /login route
    // send to google to do the authentication
    app.get('/auth/google',
        passport.authenticate('google', {
            //scope: ['profile', 'email', 'https://www.google.com/m8/feeds/'],
            //scope: ['profile', 'email', 'https://www.googleapis.com/auth/contacts.readonly'],
            scope: ['profile', 'email'],
            prompt: "select_account"
        }),
        function(req, res) {
            //
        });


    app.get('/auth/google_contacts', function(request, response) {
        var stateString = base64url('{ "redirect" : "contacts/import" }');
        passport.authenticate('google', {
            //scope: ['profile', 'email', 'https://www.google.com/m8/feeds/'],
            scope: ['profile', 'email', 'https://www.googleapis.com/auth/contacts.readonly'],
            //scope: ['https://www.googleapis.com/auth/contacts.readonly'],
            //prompt: "select_account",

            state: stateString,
            loginHint: 'stevefahy@gmail.com',

            authorizationParams: {
                access_type: 'offline',
                approval_prompt: 'force'
            }
        })(request, response);
    });


    // Login from /api/join route
    // send to google to do the authentication. Pass the invite id to google within state.
    app.get("/auth/google/join/:code", function(request, response) {
        var invite_code = request.params.code;
        // encode the invite code to base 64 before sending
        var stateString = base64url('{ "invite_id" : "' + invite_code + '" }');
        // athenticate with google
        passport.authenticate("google", {
            scope: [
                "profile",
                "email"
            ],
            state: stateString
        })(request, response);
    });

    // google callback
    // log in via join page already goes to user settings/
    app.get('/auth/google/callback', function(req, res, next) {

        passport.authenticate('google', function(err, user, info) {

            if (err) {
                console.log(err);
                res.redirect('/login');
            }

            // cancelled permission
            if (!user) {
                console.log('!user');
                console.log(req.user);
                if (req.user) {
                    user = req.user;
                } else {
                    res.redirect('/login');
                }
            }

            req.logIn(user, function(err) {
                if (err) {
                    console.log(err);
                    res.redirect('/login');
                }

                // If this is a callback from an invite link then there will be a state variable
                if (req.query.state) {
                    // Invite accepted
                    // Add this user to the inviter's list of contacts
                    // Send the newly logged in user to the relevant group if stated
                    // delete or set invite to accepted
                    //
                    // decode the invite code
                    var state = JSON.parse(base64url.decode(req.query.state));
                    if (state.invite_id != undefined) {
                        var invite_code = state;
                        // Find the invite using the decoded invite code
                        Invite.findById({ _id: invite_code.invite_id }, function(err, invite) {
                            if (err) {
                                res.send(err);
                            }
                            // ADD NEW INVITED USER TO INVITER CONTACTS
                            var sender = invite.sender_id;
                            // Find the inviter User
                            User.findById({ _id: sender }, function(err, user) {
                                if (err) {
                                    res.send(err);
                                }
                                // get the inviter contact array
                                var current_contacts = user.contacts;
                                // check if this contact already exist, if not add it
                                if (current_contacts.indexOf(req.user._id) < 0) {
                                    // add the invited User id to the inviter array of contacts
                                    current_contacts.push(req.user._id);
                                    user.contacts = current_contacts;
                                    // Save the new contact to the to the inviter array of contacts
                                    var updateuser = new User(user);
                                    updateuser.save(function(err, user) {
                                        if (err) {
                                            res.send(err);
                                        } else {}
                                    });
                                }
                            });
                            // ADD INVITER USER TO NEW INVITED USER CONTACTS
                            // get the invited contact array
                            var current_contacts = req.user.contacts;
                            // check if this contact already exist, if not add it
                            if (current_contacts.indexOf(sender) < 0) {
                                // add the inviter User id to the invited array of contacts
                                current_contacts.push(sender);
                                req.user.contacts = current_contacts;
                                // Save the new contact to the to the invited array of contacts
                                var updateuser = new User(req.user);
                                updateuser.save(function(err, user) {
                                    if (err) {
                                        res.send(err);
                                    } else {}
                                });
                            }
                        });
                        // First time logging in. Redirect to the User Settings screen.
                        res.redirect('/api/user_setting');
                    } else if (state.redirect != undefined) {
                        if (state.redirect == 'contacts/import') {
                            console.log('callback import');
                            //res.redirect('/c/contacts/import');
                        }
                    }
                } else {
                    // Check if this is first log in
                    // if so got to settings of not go to home /
                    if (req.user.first_login == true) {
                        req.user.first_login = false;

                        // Save the new contact to the to the inviter array of contacts
                        var updateuser = new User(req.user);
                        updateuser.save(function(err, user) {
                            if (err) {
                                res.send(err);
                            } else {
                                //console.log(user);
                            }
                        });

                        // Create Public conversation for this user
                        // Any time profile changes update Public conv profile also.
                        createPublicConversation(req.user, function(result) {
                            res.redirect('/api/user_setting');
                        });
                    } else {
                        res.redirect('/');
                    }
                }
            });
        })(req, res, next);
    });

    /*
        // google callback
        // log in via join page already goes to user settings/
        app.get('/auth/google/callback',
            passport.authenticate('google', {
                //failureRedirect: '/login'

            }),
            function(req, res) {
                console.log('google callback');
                console.log(req.query.state);
                // If this is a callback from an invite link then there will be a state variable
                if (req.query.state) {
                    // Invite accepted
                    // Add this user to the inviter's list of contacts
                    // Send the newly logged in user to the relevant group if stated
                    // delete or set invite to accepted
                    //
                    // decode the invite code
                    var state = JSON.parse(base64url.decode(req.query.state));
                    console.log(state);
                    if (state.invite_id != undefined) {
                        //var invite_code = JSON.parse(base64url.decode(req.query.state));
                        //}
                        var invite_code = state;
                        // Find the invite using the decoded invite code
                        Invite.findById({ _id: invite_code.invite_id }, function(err, invite) {
                            if (err) {
                                res.send(err);
                            }
                            // ADD NEW INVITED USER TO INVITER CONTACTS
                            var sender = invite.sender_id;
                            // Find the inviter User
                            User.findById({ _id: sender }, function(err, user) {
                                if (err) {
                                    res.send(err);
                                }
                                // get the inviter contact array
                                var current_contacts = user.contacts;
                                // check if this contact already exist, if not add it
                                if (current_contacts.indexOf(req.user._id) < 0) {
                                    // add the invited User id to the inviter array of contacts
                                    current_contacts.push(req.user._id);
                                    user.contacts = current_contacts;
                                    // Save the new contact to the to the inviter array of contacts
                                    var updateuser = new User(user);
                                    updateuser.save(function(err, user) {
                                        if (err) {
                                            res.send(err);
                                        } else {}
                                    });
                                }
                            });
                            // ADD INVITER USER TO NEW INVITED USER CONTACTS
                            // get the invited contact array
                            var current_contacts = req.user.contacts;
                            // check if this contact already exist, if not add it
                            if (current_contacts.indexOf(sender) < 0) {
                                // add the inviter User id to the invited array of contacts
                                current_contacts.push(sender);
                                req.user.contacts = current_contacts;
                                // Save the new contact to the to the invited array of contacts
                                var updateuser = new User(req.user);
                                updateuser.save(function(err, user) {
                                    if (err) {
                                        res.send(err);
                                    } else {}
                                });
                            }
                        });
                        // First time logging in. Redirect to the User Settings screen.
                        res.redirect('/api/user_setting');
                    } else if (state.redirect != undefined) {
                        console.log('redirect: ' + state);
                        if (state.redirect == 'contacts/import') {
                            res.redirect('/c/contacts');
                        }
                    }
                } else {
                    // Check if this is first log in
                    // if so got to settings of not go to home /
                    if (req.user.first_login == true) {
                        req.user.first_login = false;

                        // Save the new contact to the to the inviter array of contacts
                        var updateuser = new User(req.user);
                        updateuser.save(function(err, user) {
                            if (err) {
                                res.send(err);
                            } else {
                                //console.log(user);
                            }
                        });

                        // Create Public conversation for this user
                        // Any time profile changes update Public conv profile also.
                        createPublicConversation(req.user, function(result) {
                            res.redirect('/api/user_setting');
                        });
                    } else {
                        res.redirect('/');
                    }
                }
            });
    */

    // Login from /api/join route
    // send to google to do the authentication. Pass the invite id to google within state.
    app.get("/auth/google/join/:code", function(request, response) {
        var invite_code = request.params.code;
        // encode the invite code to base 64 before sending
        var stateString = base64url('{ "invite_id" : "' + invite_code + '" }');
        // athenticate with google
        passport.authenticate("google", {
            scope: [
                "profile",
                "email"
            ],
            state: stateString
        })(request, response);
    });
    //
    // CONTACTS
    //
    // contact search box
    app.get('/api/search_member', function(req, res) {
        var username = new RegExp(req.query["term"], 'i');
        User.find({ 'google.name': username }, function(err, user) {
            if (err) {
                return res.send(err);
            }
            res.json(user);
        }).limit(10);
    });

    // Get all contacts
    app.get('/api/contacts/', function(req, res) {
        getContacts(res);
    });
    //
    // CHECK OATH PERMISSION
    //
    app.get('/api/user_permission/', function(req, res) {
        if (req.user.google) {
            request.get({
                url: 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + req.user.google.token
            }, function(err, response, body) {
                res.json(body);
            });
        }
    });
    //
    // USER CONTACTS
    //
    // Get all user contacts from social login
    app.get('/api/user_contacts/', function(req, res) {
        console.log(req.user);
        //?max-results=999999&alt=json&oauth_token=' + token;
        request.get({
            url: 'https://www.google.com/m8/feeds/contacts/default/full/?alt=json&max-results=10000',
            //url: 'https://www.googleapis.com/auth/contacts.readonly',
            headers: {
                //'alt':'json',
                //'dataType': 'jsonp',
                'Gdata-version': '3.0',
                'Content-length': '0',
                //'Authorization': 'Bearer ya29.GlykBUVUz7U18Cyq-8yivLgs4crIU8c4TGEWEgjTKQN-Isy2HV5iRDBjSXoJQ2HFkBvm2JSsWnxtBLiIYFQVW3MSzn8qJp28Wl3JFZJQRpRJw6A95vfdWiPJd1VECw'
                'Authorization': 'Bearer ' + req.user.google.token
                //'Authorization': configAuth.googleAuth.clientID,
                //'Content-Type': 'application/json'
            },
            qs: '100', //Optional to get limit, max results etc
            alt: 'json',
            method: 'GET'
        }, function(err, response, body) {
            //console.log(err);
            //console.log(response);
            //console.log(body);
            // CONTACTS RECEIVED

            var parsed = JSON.parse(body);
            //console.log(body);
            //console.log(parsed.feed.entry);
            var user_contacts = [];
            for (var i in parsed.feed.entry) {
                //console.log(parsed.feed.entry[i].id);
                //console.log(parsed.feed.entry[i].gd$name);
                if (parsed.feed.entry[i].gd$email != undefined) {
                    var temp = { name: '', email: parsed.feed.entry[i].gd$email[0].address, avatar:'' };
                    if (parsed.feed.entry[i].gd$name != undefined) {
                        temp.name = parsed.feed.entry[i].gd$name.gd$fullName.$t;
                    }
                    if (parsed.feed.entry[i].link[0] != undefined) {
                        temp.avatar = parsed.feed.entry[i].link[0].href;
                    }
                    user_contacts.push(temp);

                }


                //console.log(parsed.feed.entry[i].gd$email[0].address);
            }
            //res.json(parsed);
            res.json(user_contacts);


        });


    });
    //
    // USERS
    //
    // search for user by id
    app.post('/api/users/search_id/:id', function(req, res) {
        var id = req.params.id;
        User.findById({ '_id': id }, function(error, user) {
            if (error) {
                res.json(error);
            } else if (user === null) {
                // no user found
                res.json({ 'error': 'null' });
            } else {
                res.json({ 'success': user });
            }
        });
    });

    // delete user contact by id
    app.post('/api/users/delete_contact/:id', function(req, res) {
        // get the position of this contact within the contacts array and delete it
        var index = req.user.contacts.indexOf(req.params.id);
        req.user.contacts.splice(index, 1);
        req.user.save(function(err, user) {
            if (err) {
                res.send(err);
            } else {
                res.json(user);
            }
        });
    });

    // Update User profile
    app.put('/api/users/update_user/:user_id', function(req, res) {
        User.findById({ _id: req.params.user_id }, function(err, user) {
            if (err) {
                res.send(err);
            }
            var toupdate = req.body.user;
            user.avatar = toupdate.avatar;
            user.user_name = toupdate.user_name;
            var updateuser = new User(user);
            updateuser.save(function(err, user) {
                if (err) {
                    res.send(err);
                } else {
                    res.json(user);
                }
            });
        });
    });

    // add user contact by id
    app.post('/api/users/add_contact/:id', function(req, res) {
        var id = req.params.id;
        // get the users contact array
        var current_contacts = req.user.contacts;
        // add the id to the users contacts if it is not already there
        if (current_contacts.indexOf(id) < 0) {
            current_contacts.push(id);
            req.user.contacts = current_contacts;
            // Save
            var updateuser = new User(req.user);
            updateuser.save(function(err, user) {
                if (err) {
                    res.send(err);
                } else {
                    res.json(user);
                }
            });
        }
    });

    // notify user
    app.post('/api/users/send_notification', function(req, res) {
        var options = req.body;
        request(options, function(err, response, body) {
            if (err) {
                console.log('err: ' + err);
                throw err;
            } else {
                res.status(200).send('ok');
            }
        });
    });

    // update user notification data
    app.post('/api/users/update_notification', function(req, res) {
        // Find the current users details
        User.findById({ '_id': req.user._id }, function(error, user) {
            if (error) {
                console.log('error');
                res.json(error);
            } else if (user === null) {
                // no user found
                res.json({ 'error': 'null' });
            } else {
                // User found
                // Set the FCM data for the request
                var data = {
                    "operation": "",
                    "notification_key_name": req.user._id,
                    "registration_ids": [req.body.refreshedToken]
                };
                var headers = {
                    'Authorization': 'key=' + fcm.firebaseserverkey,
                    'Content-Type': 'application/json',
                    'project_id': fcm.project_id

                };
                var options = {
                    uri: 'https://android.googleapis.com/gcm/notification',
                    method: 'POST',
                    headers: headers,
                    json: data
                };
                // First time. Create notification key
                if (user.notification_key === undefined) {
                    data.operation = "create";
                    request(options, function(err, response, body) {
                        if (err) {
                            console.log('err: ' + err);
                            throw err;
                        } else {
                            var notification_key = body.notification_key;
                            // Save to DB
                            var updateuser = new User(user);
                            updateuser.notification_key_name = user._id;
                            updateuser.notification_key = notification_key;
                            updateuser.tokens.push({ _id: req.body.id, token: req.body.refreshedToken });
                            updateuser.save(function(err, user) {
                                if (err) {
                                    res.send(err);
                                } else {
                                    res.json(user);
                                }
                            });
                        }
                    });
                } else {
                    // User notification key already created. Update tokens if necessary.
                    // Find the Android device id
                    var id_pos = findWithAttr(user.tokens, '_id', req.body.id);
                    var new_user = new User(user);
                    var token_array;
                    if (id_pos >= 0) {
                        // This device was already registered
                        // Check if the token has been changed
                        if (user.tokens[id_pos].token != req.body.refreshedToken) {
                            // The token has been changed. Update DB and FCM
                            new_user.tokens[id_pos].token = req.body.refreshedToken;
                            new_user.save(function(err, user) {
                                if (err) {
                                    res.send(err);
                                } else {
                                    res.json(user);
                                }
                            });
                            // Get the updated array of tokens before updating FCM
                            token_array = createTokenArray(new_user.tokens);
                            // FCM Delete old token and add new token
                            data.operation = "add";
                            data.notification_key = new_user.notification_key;
                            data.registration_ids = token_array;
                            request(options, function(err, response, body) {
                                if (err) {
                                    throw err;
                                } else {
                                    // console.log(body);
                                }
                            });
                        }
                    } else {
                        // User notification key already created.
                        // New Device.
                        // Update DB and FCM
                        new_user.tokens.push({ _id: req.body.id, token: req.body.refreshedToken });
                        new_user.save(function(err, user) {
                            if (err) {
                                res.send(err);
                            } else {
                                res.json(user);
                            }
                        });
                        // Get the updated array of tokens before updating FCM
                        token_array = createTokenArray(new_user.tokens);
                        // FCM add new token to the group
                        data.notification_key = new_user.notification_key;
                        data.operation = "add";
                        data.registration_ids = token_array;
                        request(options, function(err, response, body) {
                            if (err) {
                                throw err;
                            } else {
                                //console.log(body);
                            }
                        });
                    }
                }
            }
        });
    });
    //
    // CARDS
    //
    // search for cards by username
    app.post('/api/cards/search_user/:username', function(req, res) {
        var username = req.params.username;
        // get the user id for this user name
        User.findOne({ 'google.name': new RegExp('^' + username + '$', "i") }, function(err, user) {
            if (err) {
                return res.send(err);
            }
            // user not found
            if (user === null) {
                res.redirect('/');
            } else {
                var user_id = user._id;
                // get the cards for this user
                Card.find({ 'user': user_id }, function(err, cards) {
                    if (err) {
                        return res.send(err);
                    }
                    res.json(cards.reverse());
                }).sort('-updatedAt').limit(10);
            }
        });
    });

    // search for a card by id
    app.post('/api/cards/search_id/:snip', function(req, res) {
        var snip = req.params.snip;
        Card.find({ '_id': snip }, function(err, cards) {
            if (err) {
                return res.send(err);
            }
            res.json(cards);
        });
    });

    // search all cards by string
    app.post('/api/cards/search/:input', function(req, res) {
        // use mongoose to search all cards in the database
        var input = req.params.input;
        Card.find()
            .or([{ 'title': new RegExp(input, "i") }, { 'content': new RegExp(input, "i") }])
            .sort('title').exec(function(err, results) {
                if (err) {
                    return res.send(err);
                }
                res.json(results);
            });
    });

    // create card and send back the created card after creation
    app.post('/api/cards', function(req, res) {
        Card.create({
            conversationId: req.body.conversationId,
            content: req.body.content,
            user: req.user._id,
            done: false
        }, function(err, card) {
            if (err) {
                console.log('err: ' + err);
                res.send(err);
            }
            // return the created card
            res.send(card);
        });
    });

    // update a card by id
    app.put('/api/cards/:card_id', function(req, res) {
        Card.findById({ _id: req.params.card_id }, function(err, card) {
            if (err) {
                res.send(err);
            }
            var toupdate = req.body.card;
            if (card.length < req.body.card.length) {
                card.push({ content: '', user: '' });
            }
            card.content = toupdate.content;
            card.user = toupdate.user;
            var newcard = new Card(card);
            newcard.save(function(err, card) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(card);
                }
            });
        });
    });

    // delete a card by id.
    app.delete('/api/cards/:card_id', function(req, res) {
        Card.remove({
            _id: req.params.card_id
        }, function(err, card) {
            if (err)
                res.send(err);
            res.json(card);
        });
    });
    //
    // INVITES
    //
    // create invite and send back the created invite
    app.post('/api/invite', function(req, res) {
        Invite.create({
            sender_id: req.body.sender_id,
            sender_name: req.body.sender_name,
            recipient: req.body.recipient,
            group_id: 'the group',
            done: false
        }, function(err, invite) {
            if (err) {
                res.send(err);
            }
            // return the created invite
            res.send(invite);
        });
    });

    // search for an invite by id
    app.post('/api/invite/search_id/:code', function(req, res) {
        var code = req.params.code;
        Invite.findOne({ '_id': code }, function(err, invites) {
            if (err) {
                return res.send(err);
            }
            res.json(invites);
        });
    });
    // 
    // EMAIL
    //
    // TODO - email and password to safe config file.
    // send email invite
    app.post('/api/post_email', function(req, res) {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'snipbee@gmail.com',
                pass: '157duk385cw'
            }
        });
        var mailOptions = {
            from: 'snipbee@gmail.com',
            to: req.body.recipient,
            subject: 'Snipbee invite',
            html: "<h1>Welcome</h1><p>" + req.body.sender_name + " has invited you to join them on www.snipbee.com</p><a href=" + global.mailUrl + "/api/join/" + req.body._id + ">JOIN</a>"
        };
        transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
                console.log(error);
            } else {
                //console.log(info);
                res.sendStatus(200);
            }
        });

    });
    //
    // JOIN
    //
    // User has accepted invite to join via email.
    app.get('/api/join/:code', function(req, res) {
        res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
    });
    //
    // CONVERSATION
    //
    // create conversation
    app.post('/chat/conversation', function(req, res) {
        Conversation.create({
            conversation_name: req.body.conversation_name,
            conversation_avatar: req.body.conversation_avatar,
            conversation_type: req.body.conversation_type,
            admin: req.body.admin,
            participants: req.body.participants,
            done: false
        }, function(err, conversation) {
            if (err) {
                console.log('error: ' + err);
                res.send(err);
            }
            // return the created conversation
            res.send(conversation);
        });
    });

    // TODO just update the updatedAt
    // Update a conversation updatedAt time (For sorting conversations by most recent updates)
    app.put('/chat/conversation_time/:id', function(req, res) {
        Conversation.findById({ _id: req.params.id }, function(err, conversation) {
            if (err) {
                console.log('err: ' + err);
                res.send(err);
            }
            var new_conversation = new Conversation(conversation);
            new_conversation.updatedAt = new Date().toISOString();
            new_conversation.save(function(err, conversation) {
                if (err) {
                    console.log('err: ' + err);
                    res.send(err);
                } else {
                    res.json(conversation);
                }
            });
        });

    });

    // Update the conversation unviewed array for this participant with this card id.
    // Only add the card if it doesnt already exist in the array (for Updates).
    app.put('/chat/conversation_viewed/:id/:user_id/:card_id', function(req, res) {
        Conversation.update({ _id: req.params.id, 'participants._id': req.params.user_id }, {
                $addToSet: {
                    'participants.$.unviewed': { '_id': req.params.card_id }
                }
            },
            function(err, conversation) {
                if (err) {
                    console.log('err: ' + err);
                    res.send(err);
                }
                res.json(conversation);
            });
    });

    // Remove a card id from from this users unviewed array
    app.put('/chat/conversation_viewed_remove/:id/:user_id/:card_id', function(req, res) {
        Conversation.findById({ _id: req.params.id }, function(err, conversation) {
            if (err) {
                console.log('err: ' + err);
                return res.send(err);
            }
            // Convert the conversation model to JSON so that findWithAttr functions.
            conversation_temp = conversation.toJSON();
            // Find this Card Id within All participants unviwed arrays and remove it if found.
            for (var prop in conversation_temp.participants) {
                if (conversation_temp.participants.hasOwnProperty(prop)) {
                    var user_pos = findWithAttr(conversation_temp.participants[prop].unviewed, '_id', req.params.card_id);
                    if (user_pos >= 0) {
                        conversation.participants[prop].unviewed.splice(user_pos, 1);
                    }
                }
            }
            // Update the Conversations updatedAt time.
            conversation.updatedAt = new Date().toISOString();
            // Save the updated Conversation to the DB.
            var updated_conversation = new Conversation(conversation);
            updated_conversation.save(function(err, conversation) {
                if (err) {
                    console.log('err: ' + err);
                    res.send(err);
                } else {
                    res.send(conversation);
                }
            });
        });
    });

    // Update the conversation avatar.
    app.put('/chat/conversation_avatar/:id', function(req, res) {
        Conversation.findById({ _id: req.params.id }, function(err, conversation) {
            if (err) {
                console.log('err: ' + err);
                return res.send(err);
            }
            conversation.conversation_avatar = req.body.avatar;
            // Save the updated Conversation to the DB.
            var updated_conversation = new Conversation(conversation);
            updated_conversation.save(function(err, conversation) {
                if (err) {
                    console.log('err: ' + err);
                    res.send(err);
                } else {
                    res.json(conversation);
                }
            });
        });
    });

    // clear a conversation unviewed array by conversation id and user id
    app.put('/chat/conversation_viewed_clear/:id/:user_id/', function(req, res) {
        Conversation.update({ _id: req.params.id, 'participants._id': req.params.user_id }, {
                '$set': {
                    'participants.$.unviewed': []
                }
            },
            function(err, conversation) {
                if (err) {
                    console.log('err: ' + err);
                    res.send(err);
                }
                return res.status(201).end("created");
            });
    });

    // get all conversations for current user
    app.get('/chat/conversation', function(req, res) {
        Conversation.find({ 'participants._id': req.user._id }, function(err, conversations) {
            if (err) {
                console.log('err: ' + err);
                return res.send(err);
            }
            res.send(conversations);
        });
    });

    // get a conversation by conversation id
    app.get('/chat/conversation_id/:id', function(req, res) {
        Conversation.findOne({ '_id': req.params.id }, function(err, conversation) {
            if (err) {
                return done(err);
            }
            res.json(conversation);
        });
    });

    // get all conversations by user id
    app.get('/chat/user_conversations/:id', function(req, res) {
        Conversation.find({ 'participants._id': req.params.id }, function(err, conversations) {
            if (err) {
                return done(err);
            }
            res.json(conversations);
        });
    });

    // get user public conversation by user name
    app.get('/chat/user_public_conversation/:username', function(req, res) {
        // Get the user id associated with this name
        User.findOne({ 'google.name': req.params.username }, function(error, user) {
            if (error) {
                console.log('error: ' + error);
                res.json(error);
            } else if (user === null) {
                // no user found
                res.json({ 'error': 'null' });
            } else {
                // Get the public conversation for this user id
                Conversation.findOne({ 'participants._id': user._id, 'conversation_type': 'public' }, function(err, conversation) {
                    if (err) {
                        console.log('err: ' + err);
                        return done(err);
                    }
                    // Get and return cards for this conversation
                    Card.find({ 'conversationId': conversation._id }, function(err, cards) {
                        if (err) {
                            return done(err);
                        }
                        res.json(cards);
                    });
                });
            }
        });
    });

    // Get the public conversation for a user by user id.
    app.get('/chat/user_public_conversation_by_id/:id', function(req, res) {
        Conversation.findOne({ 'admin': req.params.id, 'conversation_type': 'public' }, function(err, conversation) {
            if (err) {
                res.json({ 'error': 'not found' });
            }
            res.json(conversation);
        });
    });

    // get user public conversation id by user name
    app.get('/chat/user_public_conversation_id/:username', function(req, res) {
        // Get the user id associated with this name
        User.findOne({ 'google.name': req.params.username }, function(error, user) {
            if (error) {
                console.log('error: ' + error);
                res.json(error);
            } else if (user === null) {
                // no user found
                res.json({ 'error': 'null' });
            } else {
                // Get the public conversation for this user id
                Conversation.findOne({ 'participants._id': user._id, 'conversation_type': 'public' }, function(err, conversation) {
                    if (err) {
                        console.log('err: ' + err);
                        res.json({ 'error': 'not found' });
                    }
                    res.json(conversation);
                });
            }
        });
    });

    // get all cards for a conversation by conversation id
    // does not need to be a member because public chats are available even if not logged in
    app.get('/chat/get_conversation/:id', function(req, res) {
        // TODO if no id exists then re-route
        Card.find({ 'conversationId': req.params.id }, function(err, cards) {
            if (err) {
                console.log('err: ' + err);
            }
            res.json(cards);
        });
    });

    // get latest card for a conversation by conversation id
    app.get('/chat/get_conversation_latest_card/:id', function(req, res) {
        Card.findOne({ 'conversationId': req.params.id }).sort('-updatedAt').exec(function(err, card) {
            if (err) {
                console.log('err: ' + err);
            }
            res.json(card);
        });
    });
};