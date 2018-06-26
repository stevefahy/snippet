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

var jwt = require('jsonwebtoken');

// load the auth variables
var configAuth = require('../configs/auth'); // use this one for testing

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
        conversation_name: user.user_name,
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

// route middleware to ensure user is logged in and is a member of the conversation
function isMember(req, res, next) {
    // must be logged in to be a member
    var token = req.headers['x-access-token'];
    if (token) {
        try {
            var decoded = jwt.verify(token, configAuth.tokenAuth.token.secret);
            req.principal = {
                isAuthenticated: true,
                _id: decoded.data.user._id
            };
        } catch (err) {
            console.log('ERROR when parsing access token.', err);
            req.principal.isAuthenticated = false;
        }
    }

    if (req.principal.isAuthenticated) {
        // get the members of this conversation
        var query = getConversationId(req.params.id);
        query.exec(function(err, conversation) {
            if (err) {
                return console.log(err);
            }
            var user_pos = findWithAttr(conversation.participants, '_id', req.principal._id);
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
    var token = req.headers['x-access-token'];
    if (token) {
        try {
            var decoded = jwt.verify(token, configAuth.tokenAuth.token.secret);
            req.principal = {
                isAuthenticated: true,
                _id: decoded.data.user._id
            };
            // Authenticated, continue.
            return next();
        } catch (err) {
            console.log('ERROR when parsing access token.', err);
        }
    }
    return res.status(401).json({ error: 'Invalid access token!' });
}


module.exports = function(app, passport) {

    // LOGOUT
    app.get('/api/logout', function(req, res) {
        req.logout();
        req.logOut();
    });

    // Route to get user data.
    app.get('/api/user_data', isLoggedIn, function(req, res) {
        if (!req.principal.isAuthenticated) {
            // The user is not logged in
            res.json({ 'auth': 'forbidden' });
        } else {
            User.findById({ _id: req.principal._id }, function(err, user) {
                if (err) {
                    console.log('err: ' + err);
                    res.send(err);
                } else {
                    res.json({
                        user: user
                    });
                }
            });
        }
    });

    // Get the FCM data
    app.get('/api/fcm_data', isLoggedIn, function(req, res) {
        res.json({
            fcm: fcm
        });
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
            scope: ['profile', 'email'],
            prompt: "select_account"
        }),
        function(req, res) {
            //
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
        var state;
        // Decode the state if it exists.
        if (req.query.state != undefined) {
            state = JSON.parse(base64url.decode(req.query.state));
        }
        // If this is a callback from importing contacts then pass use_access_token true to passport authenticate.
        if (state != undefined && state.redirect == 'contacts/import') {
            req.use_access_token = true;
        } else {
            req.use_access_token = false;
        }

        // create the JWT and set it in a cookie.
        createToken = function(id) {

            var userData = {
                _id: id
            };

            var tokenData = {
                user: userData
            };

            var token = jwt.sign({ data: tokenData },
                configAuth.tokenAuth.token.secret, { expiresIn: configAuth.tokenAuth.token.expiresIn });

            res.cookie(configAuth.tokenAuth.cookieName, token, { expires: new Date(Date.now() + configAuth.tokenAuth.token.expiresIn * 1000) });
        };

        passport.authenticate('google', function(err, user, info) {

            if (err) {
                console.log(err);
                res.redirect('/login');
            }

            // cancelled permission

            if (!user) {
                if (req.user) {
                    user = req.user;
                } else {
                    res.redirect('/login');
                }
            }

            req.logIn(user, { session: false }, function(err) {
                if (err) {
                    console.log(err);
                    res.redirect('/login');
                }

                // Logged in correctly. Create the access token and set cookie
                createToken(user._id);

                // If this is a callback from an invite link then there will be a state variable
                if (state != undefined) {
                    if (state.invite_id != undefined) {
                        // Invite accepted
                        // Add this user to the inviter's list of contacts
                        // Send the newly logged in user to the relevant group if stated
                        // delete or set invite to accepted
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
                        // Google contacts callback.
                        if (state.redirect == 'contacts/import') {

                            // Find the user and store the acces_token their uder details in the database temporarily.
                            User.findOne({ 'google.id': user.google.id }, function(err, user) {
                                if (err) {
                                    return done(err);
                                }

                                if (user) {
                                    user.google.token = info.access_token;

                                    user.save(function(err) {
                                        if (err) {
                                            console.log('err: ' + err);
                                            return done(err);
                                        }
                                    });
                                }
                            });
                            res.redirect('/c/contacts/import');
                        }
                    }
                } else {
                    // Check if this is first log in
                    // if so go to settings if not go to home /
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
    app.get('/api/search_member', isLoggedIn, function(req, res) {
        var username = new RegExp(req.query["term"], 'i');
        User.find({ 'google.name': username }, function(err, user) {
            if (err) {
                return res.send(err);
            }
            res.json(user);
        }).limit(10);
    });

    //
    // USER CONTACTS
    //

    // Get permision for all user contacts from social login
    app.get('/auth/google_contacts/:email', function(req, res) {
        var email = req.params.email;
        var stateString = base64url('{ "redirect" : "contacts/import" }');
        passport.authenticate('google', {
            scope: ['profile', 'email', 'https://www.googleapis.com/auth/contacts.readonly'],
            state: stateString,
            loginHint: email,
            authorizationParams: {
                access_type: 'offline',
                approval_prompt: 'force'
            }
        })(req, res);
    });

    // Get all user contacts from social login
    // TODO - Make work as API endpoint.
    // Contacts.getContacts()
    app.get('/api/user_contacts/', isLoggedIn, function(req, res) {
        // Get the temporarily stored access token.
        User.findOne({ '_id': req.principal._id }, function(err, user) {
            if (err) {
                console.log(err);
                return done(err);
            }

            if (user) {
                request.get({
                    url: 'https://www.google.com/m8/feeds/contacts/default/full/?alt=json&max-results=10000',
                    headers: {
                        'Gdata-version': '3.0',
                        'Content-length': '0',
                        'Authorization': 'Bearer ' + user.google.token
                    },
                    qs: '100', //Optional to get limit, max results etc
                    alt: 'json',
                    method: 'GET'
                }, function(err, response, body) {
                    // CONTACTS RECEIVED
                    if (body != null) {
                        var parsed = JSON.parse(body);
                        var user_contacts = [];
                        for (var i in parsed.feed.entry) {
                            if (parsed.feed.entry[i].gd$email != undefined) {
                                //var temp = { name: '', email: parsed.feed.entry[i].gd$email[0].address, avatar: '' };
                                var temp = { name: '', email: parsed.feed.entry[i].gd$email[0].address };
                                if (parsed.feed.entry[i].gd$name != undefined) {
                                    temp.name = parsed.feed.entry[i].gd$name.gd$fullName.$t;
                                }
                                user_contacts.push(temp);
                            }
                        }

                        var contacts_obj = { name: 'google', contacts: user_contacts };

                        user.google.token = 'deleted';
                        // Add the users contacts.
                        user.imported_contacts.push(contacts_obj);

                        user.save(function(err) {
                            if (err) {
                                console.log('err: ' + err);
                                return done(err);
                            }
                            res.json(user);
                        });
                    }
                });
            }
        });
    });

    //
    // USERS
    //

    // Search for user by id
    // TODO - Needed for Public not logged in route?
    // Users.search_id(key.user)
    app.post('/api/users/search_id/:id', isLoggedIn, function(req, res) {
        var id = req.params.id;
        User.findById({ '_id': id }, function(error, user) {
            if (error) {
                //console.log(error);
                res.json(error);
            } else if (user === null) {
                // no user found
                res.json({ 'error': 'null' });
            } else {
                res.json({ 'success': user });
            }
        });
    });

    // delete a user contact by id
    app.post('/api/users/delete_contact/:id', isLoggedIn, function(req, res) {
        // get the position of this contact within the contacts array and delete it
        User.findById({ _id: req.principal._id }, function(err, user) {
            if (err) {
                console.log(err);
                res.json(err);
            }
            var index = user.contacts.indexOf(req.params.id);
            user.contacts.splice(index, 1);
            user.save(function(err, user) {
                if (err) {
                    res.send(err);
                } else {
                    res.json(user);
                }
            });
        });
    });

    // delete user contacts by id using an array of contacts.
    app.put('/api/users/delete_contacts', isLoggedIn, function(req, res) {
        var arr = req.body.contacts;
        User.findById({ _id: req.principal._id }, function(err, user) {
            if (err) {
                console.log(err);
                res.json(err);
            }
            // get the position of this contact within the contacts array and delete it
            for (var i = 0; i < arr.length; i++) {
                var index = user.contacts.indexOf(arr[i]);
                user.contacts.splice(index, 1);
            }

            user.save(function(err, user) {
                if (err) {
                    res.send(err);
                } else {
                    res.json(user);
                }
            });
        });
    });

    // Update User profile
    app.put('/api/users/update_user/:user_id', isLoggedIn, function(req, res) {
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
    app.post('/api/users/add_contact/:id', isLoggedIn, function(req, res) {
        var id = req.params.id;
        // get the users contact array
        User.findById({ _id: req.principal._id }, function(err, user) {
            if (err) {
                console.log('err: ' + err);
                res.send(err);
            } else {
                // add the id to the users contacts if it is not already there
                if (user.contacts.indexOf(id) < 0) {
                    user.contacts.push(id);
                    // Save
                    user.save(function(err, user) {
                        if (err) {
                            res.send(err);
                        } else {
                            res.json(user);
                        }
                    });
                } else {
                    res.json(user);
                }
            }
        });
    });

    // notify user
    app.post('/api/users/send_notification', isLoggedIn, function(req, res) {
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
    app.post('/api/users/update_notification', isLoggedIn, function(req, res) {
        // Find the current users details
        console.log('body');
        console.log(req.body);
        User.findById({ '_id': req.principal._id }, function(error, user) {
            if (error) {
                console.log('error');
                res.json(error);
            } else if (user === null) {
                // no user found
                console.log('no user');
                res.json({ 'error': 'null' });
            } else {
                // User found
                // Set the FCM data for the request
                console.log(user);
                console.log(req.body.id);
                var data = {
                    "operation": "",
                    "notification_key_name": req.principal._id,
                    //"registration_ids": [req.body.refreshedToken]
                    "registration_ids": [req.body.id]
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
                    console.log('first');
                    data.operation = "create";
                    request(options, function(err, response, body) {
                        if (err) {
                            console.log('err: ' + err);
                            throw err;
                        } else {
                            console.log('create notification_key');
                            console.log(body);
                            var notification_key = body.notification_key;
                            console.log(notification_key);
                            // Save to DB
                            var updateuser = new User(user);
                            updateuser.notification_key_name = user._id;
                            updateuser.notification_key = notification_key;
                            updateuser.tokens.push({ _id: req.body.id, token: req.body.refreshedToken });
                            updateuser.save(function(err, user) {
                                if (err) {
                                    console.log(err);
                                    res.send(err);
                                } else {
                                    console.log('first success');
                                    console.log(user);
                                    res.json(user);
                                }
                            });
                        }
                    });
                } else {
                    // User notification key already created. Update tokens if necessary.
                    // Find the Android device id
                    console.log('already');
                    var id_pos = findWithAttr(user.tokens, '_id', req.body.id);
                    var new_user = new User(user);
                    var token_array;
                    console.log(id_pos);
                    if (id_pos >= 0) {
                        console.log('check changed');
                        // This device was already registered
                        // Check if the token has been changed
                        console.log(user.tokens[id_pos].token);
                        console.log(req.body.refreshedToken);
                        if (user.tokens[id_pos].token != req.body.refreshedToken) {
                            // The token has been changed. Update DB and FCM
                            new_user.tokens[id_pos].token = req.body.refreshedToken;
                            new_user.save(function(err, user) {
                                if (err) {
                                    console.log(err);
                                    res.send(err);
                                } else {
                                    console.log(user);
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
                                    console.log(err);
                                    throw err;
                                } else {
                                     console.log(body);
                                }
                            });
                        }
                    } else {
                        console.log('new device');
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
                                console.log(err);
                                throw err;
                            } else {
                                console.log(body);
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
    app.post('/api/cards/search_user/:username', isLoggedIn, function(req, res) {
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
    app.post('/api/cards/search_id/:snip', isLoggedIn, function(req, res) {
        var snip = req.params.snip;
        Card.find({ '_id': snip }, function(err, cards) {
            if (err) {
                return res.send(err);
            }
            res.json(cards);
        });
    });

    // search all cards by string
    app.post('/api/cards/search/:input', isLoggedIn, function(req, res) {
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
    app.post('/api/cards', isLoggedIn, function(req, res) {
        Card.create({
            conversationId: req.body.conversationId,
            content: req.body.content,
            user: req.principal._id,
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
    app.put('/api/cards/:card_id', isLoggedIn, function(req, res) {
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
    app.delete('/api/cards/:card_id', isLoggedIn, function(req, res) {
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
    app.post('/api/invite', isLoggedIn, function(req, res) {
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
    app.post('/api/invite/search_id/:code', isLoggedIn, function(req, res) {
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
    // TODO - make values VARS
    // send email invite
    app.post('/api/post_email', isLoggedIn, function(req, res) {
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
    app.post('/chat/conversation', isLoggedIn, function(req, res) {
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

    // Update Conversation
    // Update User profile
    app.put('/chat/update_conversation/:conversation_id', isLoggedIn, function(req, res) {
        Conversation.findById({ _id: req.params.conversation_id }, function(err, conversation) {
            if (err) {
                console.log(err);
                res.send(err);
            }
            var toupdate = req.body.conversation;
            conversation.conversation_avatar = toupdate.conversation_avatar;
            conversation.conversation_name = toupdate.conversation_name;
            // Update participants with the latest viewed data.
            // Convert the conversation model to JSON so that findWithAttr functions.
            conversation_temp = conversation.toJSON();
            // Add new participants.
            for (var i in toupdate.participants) {
                var index = findWithAttr(conversation_temp.participants, '_id', toupdate.participants[i]._id);
                // If new participant. Add
                if (index < 0) {
                    var temp = { _id: toupdate.participants[i]._id, unviewed: [] };
                    conversation.participants.push(temp);
                }
            }
            // Delete old participants.
            for (var j in conversation_temp.participants) {
                var index2 = findWithAttr(toupdate.participants, '_id', conversation_temp.participants[j]._id);
                // If old participant. Delete.
                if (index2 < 0) {
                    conversation.participants.splice(j, 1);
                }
            }
            // Update the Conversations updatedAt time.
            conversation.updatedAt = new Date().toISOString();
            var updateConversation = new Conversation(conversation);
            updateConversation.save(function(err, conversation_update) {
                if (err) {
                    console.log(err);
                    res.send(err);
                } else {
                    res.json(conversation_update);
                }
            });
        });
    });

    // TODO just update the updatedAt
    // Update a conversation updatedAt time (For sorting conversations by most recent updates)
    // Conversations.updateTime(id);
    app.put('/chat/conversation_time/:id', isLoggedIn, function(req, res) {
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
    //Conversations.updateViewed(id, user_id, card_id);
    app.put('/chat/conversation_viewed/:id/:user_id/:card_id', isLoggedIn, function(req, res) {
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
    app.put('/chat/conversation_viewed_remove/:id/:user_id/:card_id', isLoggedIn, function(req, res) {
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
    app.put('/chat/conversation_avatar/:id', isLoggedIn, function(req, res) {
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
    // Conversations.clearViewed(id, user_id)
    app.put('/chat/conversation_viewed_clear/:id/:user_id/', isMember, function(req, res) {
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
    // Conversations.find();
    app.get('/chat/conversation', isLoggedIn, function(req, res) {
        Conversation.find({ 'participants._id': req.principal._id }, function(err, conversations) {
            if (err) {
                console.log('err: ' + err);
                return res.send(err);
            }
            res.send(conversations);
        });
    });

    // get a conversation by conversation id
    app.get('/chat/conversation_id/:id', isMember, function(req, res) {
        Conversation.findOne({ '_id': req.params.id }, function(err, conversation) {
            if (err) {
                return done(err);
            }
            res.json(conversation);
        });
    });

    // get all conversations by user id
    // find_user_conversations(id) 
    app.get('/chat/user_conversations/:id', isLoggedIn, function(req, res) {
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

    // TODO - check for null.
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
    // Conversations.find_user_public_conversation_id(username);
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

    // Get all cards for a PRIVATE conversation by conversation id.
    // Needs to be a member.
    // getConversationById(id)
    app.get('/chat/get_conversation/:id', isMember, function(req, res) {
        // TODO if no id exists then re-route
        Card.find({ 'conversationId': req.params.id }, function(err, cards) {
            if (err) {
                console.log('err: ' + err);
            }
            res.json(cards);
        });
    });

    // Get all cards for a PUBLIC conversation by conversation id.
    // Does not need to be a member or logged in because it is a public chat.
    // getPublicConversationById(id);
    app.get('/chat/get_public_conversation/:id', function(req, res) {
        // Ensure the conversation id is a public conversation
        Conversation.findOne({ '_id': req.params.id, 'conversation_type': 'public' }, function(err, conversation) {
            if (err) {
                res.json({ 'error': 'not found' });
            }
            if (conversation == null) {
                res.json({ 'error': 'denied' });
            } else {
                if (conversation.conversation_type === 'public') {
                    Card.find({ 'conversationId': req.params.id }, function(err, cards) {
                        if (err) {
                            console.log('err: ' + err);
                        }
                        res.json(cards);
                    });
                } else {
                    res.json({ 'error': 'denied' });
                }
            }
        });

    });

    // get latest card for a conversation by conversation id
    app.get('/chat/get_conversation_latest_card/:id', isLoggedIn, function(req, res) {
        Card.findOne({ 'conversationId': req.params.id }).sort('-updatedAt').exec(function(err, card) {
            if (err) {
                console.log('err: ' + err);
            }
            res.json(card);
        });
    });

    // Catch all. If none of the above routes match serve the index.html.
    app.all('*', function(req, res, next) {
        // Just send the index.html for other files to support HTML5Mode
        res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
    });

};