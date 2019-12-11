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

// Helper functions

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
            //console.log('error: ' + err);
            res.send(err);
        }
        // Add this users public conversation to their following list
        // get the users following array and update it.
        User.findById({ _id: user._id }, function(err, user) {
            if (err) {
                //console.log('err: ' + err);
                res.send(err);
            } else {
                // add the id to the users following list if it is not already there
                if (user.following.indexOf(conversation._id) < 0) {
                    user.following.push(conversation._id);
                    // Save
                    user.save(function(err, user) {
                        if (err) {
                            //res.send(err);
                        } else {
                            //res.json(user);
                        }
                    });
                } else {
                    //res.json(user);
                }
            }
        });
        // return the created conversation
        callback(conversation);
    });
}


// TODO - check routes for isMember and isLoggedIn sufficent. e.g. only current user should be able to change own avatar.

// route middleware to ensure user is logged in and is a member of the conversation
function isMember(req, res, next) {
    // must be logged in to be a member
    var token = req.headers['x-access-token'];
console.log(req.principal);
console.log(token);
    if (req.principal) {
        req.principal.isAuthenticated = false;
    } else {
        //res.redirect('/api/login');
    }
    if (token) {
        try {
            var decoded = jwt.verify(token, configAuth.tokenAuth.token.secret);
            req.principal = {
                isAuthenticated: true,
                _id: decoded.data.user._id
            };
        } catch (err) {
            //console.log('ERROR when parsing access token.', err);
            //req.principal.isAuthenticated = false;
            res.redirect('/api/login');
        }
    } else {
// otherwise redirect to login
                res.redirect('/api/login');

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
            res.redirect('/api/login');
            //console.log('ERROR when parsing access token.', err);
        }
    }
    res.redirect('/api/login');
    return res.status(401).json({ error: 'Invalid access token!' });
}


module.exports = function(app, passport) {

    // LOGOUT
    app.get('/api/logout', function(req, res) {
        req.logout();
        req.logOut();
        // redirect to login
        res.redirect('/api/login');
    });

    // Route to get user data.
    app.get('/api/user_data', isLoggedIn, function(req, res) {
        if (!req.principal.isAuthenticated) {
            // The user is not logged in
            res.json({ 'auth': 'forbidden' });
        } else {
            User.findById({ _id: req.principal._id }, function(err, user) {
                if (err) {
                    //console.log('err: ' + err);
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
                //console.log(err);
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
                    //console.log(err);
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
                                            //console.log('err: ' + err);
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
                //console.log(err);
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
                                //console.log('err: ' + err);
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

    app.get('/api/users/search_id/:id', function(req, res) {
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

    // Used for public route
    app.post('/api/users/search_public_id/:id', function(req, res) {
        var id = req.params.id;
        User.findById({ '_id': id }, function(error, user) {
            if (error) {
                //console.log(error);
                res.json(error);
            } else if (user === null) {
                // no user found
                res.json({ 'error': 'null' });
            } else {
                var trimmed_user = {};
                trimmed_user._id = user._id;
                trimmed_user.avatar = user.avatar;
                trimmed_user.user_name = user.user_name;
                res.json({ 'success': trimmed_user });
            }
        });
    });

    // delete a user contact by id
    app.post('/api/users/delete_contact/:id', isLoggedIn, function(req, res) {
        // get the position of this contact within the contacts array and delete it
        User.findById({ _id: req.principal._id }, function(err, user) {
            if (err) {
                //console.log(err);
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
                //console.log(err);
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

    // follow conversation by id
    app.post('/api/users/follow_conversation/:id', isLoggedIn, function(req, res) {
        var id = req.params.id;
        // get the users following array and update it.
        User.findById({ _id: req.principal._id }, function(err, user) {
            if (err) {
                //console.log('err: ' + err);
                res.send(err);
            } else {
                // add the id to the users following list if it is not already there
                if (user.following.indexOf(id) < 0) {
                    user.following.push(id);
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

    // unfollow conversation by id
    app.post('/api/users/unfollow_conversation/:id', isLoggedIn, function(req, res) {
        var id = req.params.id;
        // get the users following array
        User.findById({ _id: req.principal._id }, function(err, user) {
            if (err) {
                //console.log('err: ' + err);
                res.send(err);
            } else {
                // Convert the conversation model to JSON so that findWithAttr functions.
                user_temp = user.toJSON();
                // Delete old followers.
                for (var j in user_temp.following) {
                    // If old follower. Delete.
                    if (user_temp.following[j] == id) {
                        user.following.splice(j, 1);
                    }
                }
                // Save
                user.save(function(err, user) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.json(user);
                    }
                });
            }
        });
    });

    // add user contact by id
    app.post('/api/users/add_contact/:id', isLoggedIn, function(req, res) {
        var id = req.params.id;
        // get the users contact array
        User.findById({ _id: req.principal._id }, function(err, user) {
            if (err) {
                //console.log('err: ' + err);
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

    // send notification to user
    app.post('/api/users/send_notification', isLoggedIn, function(req, res) {
        var options = req.body;
        //console.log(options);
        request(options, function(err, response, body) {
            if (err) {
                //console.log('err: ' + err);
                throw err;
            } else {
                if (body.results[0].error == "NotRegistered") {
                    res.json({ 'error': 'NotRegistered' });
                } else {
                    res.status(200).send('ok');
                }
            }
        });
    });

    // update user notification data
    app.post('/api/users/update_notification', isLoggedIn, function(req, res) {
        var device_id = req.body.id;
        var token = req.body.token;
        // Find the current users details
        User.findById({ '_id': req.principal._id }, function(error, user) {
            if (error) {
                //console.log(error);
                res.json(error);
            } else if (user === null) {
                // no user found
                res.json({ 'error': 'null' });
            } else {
                // User found
                // When notifaction data updated or new device added then update data for this users contacts.
                // First time. Create notification key name.
                if (user.notification_key_name === undefined) {
                    // Save to DB
                    var updateuser = new User(user);
                    updateuser.notification_key_name = user._id;
                    updateuser.tokens.push({ _id: device_id, token: token });
                    updateuser.save(function(err, user) {
                        if (err) {
                            //console.log(err);
                            res.send(err);
                        } else {
                            res.json(user);
                        }
                    });
                } else {
                    // User notification key already created. Update tokens if necessary.
                    // Find the Android device id
                    var id_pos = findWithAttr(user.tokens, '_id', device_id);
                    var new_user = new User(user);
                    if (id_pos >= 0) {
                        // This device was already registered
                        // Check if the token has been changed
                        if (user.tokens[id_pos].token != token) {
                            // The token has been changed. Update DB.
                            new_user.tokens[id_pos].token = token;
                            new_user.save(function(err, user) {
                                if (err) {
                                    //console.log(err);
                                    res.send(err);
                                } else {
                                    res.json(user);
                                }
                            });
                        }
                    } else {
                        // User notification key already created.
                        // New Device.Update DB.
                        new_user.tokens.push({ _id: device_id, token: token });
                        new_user.save(function(err, user) {
                            if (err) {
                                res.send(err);
                            } else {
                                res.json(user);
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

    // get card by card id
    app.get('/api/cards/get_card/:id', isLoggedIn, function(req, res) {
        Card.findOne({ '_id': req.params.id }).sort('-updatedAt').exec(function(err, card) {
            if (err) {
                //console.log('err: ' + err);
            }
            res.json(card);
        });
    });

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
                //console.log('err: ' + err);
                res.send(err);
            }
            // return the created card
            res.send(card);
        });
    });

    // update a card by id
    // TODO - Check that user has permission to update this card.
    app.put('/api/cards/', isLoggedIn, function(req, res) {
        Card.findById({ _id: req.body.card._id }, function(err, card) {
            if (err) {
                //console.log(err);
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
        Card.findOneAndDelete({
            _id: req.params.card_id
        }, function(err, card) {
            if (err) {
                res.send(err);
            }
            res.send(card);
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
                //console.log(error);
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
                //console.log('error: ' + err);
                res.send(err);
            }
            // return the created conversation
            res.send(conversation);
        });
    });


    app.put('/chat/follow_public_conversation/:conversation_id', isLoggedIn, function(req, res) {
        Conversation.findById({ _id: req.params.conversation_id }, function(err, conversation) {
            if (err) {
                //console.log(err);
                res.send(err);
            }
            var toupdate = req.body.user;
            // Convert the conversation model to JSON so that findWithAttr functions.
            conversation_temp = conversation.toJSON();
            // Add new follower.
            var index = findWithAttr(conversation_temp.followers, '_id', toupdate);
            // If new follower. Add
            if (index < 0) {
                var temp = { _id: toupdate };
                conversation.followers.push(temp);
            }
            conversation.save(function(err, conversation) {
                if (err) {
                    //console.log(err);
                    res.send(err);
                } else {
                    res.json(conversation);
                }
            });
        });
    });

    app.put('/chat/unfollow_public_conversation/:conversation_id', isLoggedIn, function(req, res) {
        Conversation.findById({ _id: req.params.conversation_id }, function(err, conversation) {
            if (err) {
                //console.log(err);
                res.send(err);
            }
            var toupdate = req.body.user;
            // Convert the conversation model to JSON so that findWithAttr functions.
            conversation_temp = conversation.toJSON();
            // Delete follower.
            var index = findWithAttr(conversation_temp.followers, '_id', toupdate);
            // If follower exists. Delete
            if (index >= 0) {
                conversation.followers.splice(index, 1);
            }
            conversation.save(function(err, conversation) {
                if (err) {
                    res.send(err);
                } else {
                    res.json(conversation);
                }
            });
        });
    });

    // Update Conversation
    // Update User profile
    app.put('/chat/update_conversation/:conversation_id', isLoggedIn, function(req, res) {
        Conversation.findById({ _id: req.params.conversation_id }, function(err, conversation) {
            if (err) {
                //console.log(err);
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
                    //console.log(err);
                    res.send(err);
                } else {
                    res.json(conversation_update);
                }
            });
        });
    });

    // Update the conversation unviewed array for this participant with this card id.
    // Only add the card if it doesnt already exist in the array (for Updates).
    //Conversations.updateViewed(id, user_id, card_id);
    app.get('/chat/conversation_viewed/:id/:card_id', isLoggedIn, function(req, res) {
        Conversation.findById({ _id: req.params.id }, function(err, conversation) {
            if (err) {
                //console.log('err: ' + err);
                return res.send(err);
            }
            // Only update viewed for private conversations
            if (conversation.conversation_type != 'public') {
                // Convert the conversation model to JSON so that findWithAttr functions.
                conversation_temp = conversation.toJSON();
                // Find this Card Id within All participants unviewed arrays and remove it if found.
                for (var prop in conversation_temp.participants) {
                    if (conversation_temp.participants.hasOwnProperty(prop)) {
                        var user_pos = findWithAttr(conversation_temp.participants[prop].unviewed, '_id', req.params.card_id);
                        if (user_pos < 0) {
                            conversation.participants[prop].unviewed.push({ '_id': req.params.card_id });
                        }
                    }
                }
            }
            // Update the Conversations updatedAt time.
            conversation.updatedAt = new Date().toISOString();
            // Save the updated Conversation to the DB.
            var updated_conversation = new Conversation(conversation);
            updated_conversation.save(function(err, conversation) {
                if (err) {
                    //console.log('err: ' + err);
                    res.send(err);
                } else {
                    res.send(conversation);
                }
            });
        });
    });

    // Remove a card id from from this users unviewed array
    app.put('/chat/conversation_viewed_remove/:id/:user_id/:card_id', isLoggedIn, function(req, res) {
        Conversation.findById({ _id: req.params.id }, function(err, conversation) {
            if (err) {
                //console.log('err: ' + err);
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
                    //console.log('err: ' + err);
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
                //console.log('err: ' + err);
                return res.send(err);
            }
            conversation.conversation_avatar = req.body.avatar;
            // Save the updated Conversation to the DB.
            var updated_conversation = new Conversation(conversation);
            updated_conversation.save(function(err, conversation) {
                if (err) {
                    //console.log('err: ' + err);
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
                    res.send(err);
                }
                Conversation.findOne({ '_id': req.params.id }, function(err, conversation) {
                    if (err) {
                        return done(err);
                    }
                    res.json(conversation);
                });
            });
    });

    // get all conversations for current user
    // Conversations.find();
    app.get('/api/conversations', isLoggedIn, function(req, res) {
        Conversation.find({ 'participants._id': req.principal._id }, function(err, conversations) {
            if (err) {
                return res.send(err);
            }
            res.json(conversations);
        });
    });

    // get a conversation by conversation id
    app.get('/chat/conversation_id/:id', isMember, function(req, res) {
        Conversation.findOne({ '_id': req.params.id }, function(err, conversation) {
            if (err) {
                //console.log(err);
                return done(err);
            } else {
               res.json(conversation); 
            }
            
        });
    });

    // get a public conversation by conversation id
    app.get('/chat/public_conversation_id/:id', function(req, res) {
        Conversation.findOne({ '_id': req.params.id, 'conversation_type': 'public' }, function(err, conversation) {
            if (err) {
                res.json({ 'error': 'not found' });
return;
            } else {
            res.json(conversation);
}
        });
    });

    // get user public conversation by user name
    app.get('/chat/user_public_conversation/:username', function(req, res) {
        // Get the user id associated with this name
        User.findOne({ 'google.name': req.params.username }, function(error, user) {
            if (error) {
                //console.log('error: ' + error);
                res.json(error);
            } else if (user === null) {
                // no user found
                res.json({ 'error': 'null' });
            } else {
                // Get the public conversation for this user id
                Conversation.findOne({ 'participants._id': user._id, 'conversation_type': 'public' }, function(err, conversation) {
                    if (err) {
                        //console.log('err: ' + err);
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

    // Get the private conversation by participants.
    app.put('/chat/user_private_conversation_by_participants', function(req, res) {
        var size = req.body.participants.length;
        Conversation.find({ "participants": { $size: size }, "participants._id": { $all: req.body.participants }, 'conversation_type': 'private' }, function(err, conversation) {
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
                //console.log('error: ' + error);
                res.json(error);
            } else if (user === null) {
                // no user found
                res.json({ 'error': 'null' });
            } else {
                // Get the public conversation for this user id
                Conversation.findOne({ 'participants._id': user._id, 'conversation_type': 'public' }, function(err, conversation) {
                    if (err) {
                        //console.log('err: ' + err);
                        res.json({ 'error': 'not found' });
                    }
                    res.json(conversation);
                });
            }
        });
    });

    // Get all cards for a PUBLIC conversation by conversation id.
    // Does not need to be a member or logged in because it is a public chat.
    // getPublicConversationById(id);
    app.get('/chat/get_public_conversation_cards/:id/:last_card', function(req, res) {
        var id = req.query.id;
        var amount = Number(req.query.amount);
        var last_card = req.query.last_card;
        var operand = req.query.operand;
        var query;
        var query1 = {}
        query1[operand] = last_card;
        if (last_card == '0') {
            query = { 'conversationId': id };
        } else {
            query = { _id: query1, 'conversationId': id };
        }
        Conversation.findOne({
            '_id': id,
            'conversation_type': 'public'
        }, function(err, conversation) {
            if (err) {
                res.json({ 'error': 'not found' });
            }
            if (conversation == null) {
                res.json({ 'error': 'denied' });
            } else {
                if (conversation.conversation_type === 'public') {
                    Card.find(
                        query,
                        function(err, cards) {
                            if (err) {
                                //console.log(err);
                            }
                            res.json(cards);
                        }).sort({ "updatedAt": -1 }).limit(amount);
                } else {
                    res.json({ 'error': 'denied' });
                }
            }
        });
    });

    // Get all cards for a PRIVATE conversation by conversation id.
    app.get('/chat/get_conversation_cards/:id/:last_card', isMember, function(req, res) {
        var id = req.query.id;
        var amount = Number(req.query.amount);
        var last_card = req.query.last_card;
        var operand = req.query.operand;
        var query;
        var query1 = {}
        query1[operand] = last_card;
        if (last_card == '0') {
            query = { 'conversationId': id };
        } else {
            query = { _id: query1, 'conversationId': id };
        }
        Card.find(
            query,
            function(err, cards) {
                if (err) {
                    console.log(err);
return;
                } else {
                res.json(cards);
        }
            }).sort({ "updatedAt": -1 }).limit(amount);
    });

    // Get more cards for the Users Feed conversations by conversation id(s).
    app.post('/chat/update_feed/:val', isLoggedIn, function(req, res) {
        var user_array = req.body.ids;
        var amount = req.body.amount;
        var last_card = req.body.last_card;
        var feed = {};
        Conversation.find({
            '_id': {
                $in: user_array.map(function(o) { return mongoose.Types.ObjectId(o); })
            },
            'conversation_type': 'public'
        }, function(err, conversations) {
            if (err) {
                //console.log(err);
            }
            feed.conversations = conversations;
            Card.find({
                'conversationId': {
                    $in: user_array.map(function(o) {
                        return mongoose.Types.ObjectId(o);
                    })
                },
                'updatedAt': {
                    '$gt': last_card
                }
            }, function(err, cards) {
                if (err) {
                    //console.log(err);
                }
                feed.cards = cards;
                res.json(feed);
            }).sort({ "updatedAt": -1 }).limit(amount);
        });
    });

    // Get cards for the Users Feed conversations by conversation id(s).
    app.get('/chat/get_feed/:ids/:last_card', function(req, res) {
        var user_array = JSON.parse(req.query.ids);
        var amount = Number(req.query.amount);
        var last_card = req.query.last_card;
        var feed = {};
        var query;
        var query1 = {};
        var oid;
        if (last_card == '0') {
            query = { 'conversationId': { $in: user_array.map(function(o) { return mongoose.Types.ObjectId(o); }) } };
        } else {
            oid = mongoose.Types.ObjectId(last_card);
            query1['$lt'] = oid;
            query = { 'conversationId': { $in: user_array.map(function(o) { return mongoose.Types.ObjectId(o); }) }, _id: query1 };
        }
        Conversation.find({
            '_id': {
                $in: user_array.map(function(o) { return mongoose.Types.ObjectId(o); })
            },
            'conversation_type': 'public'
        }, function(err, conversations) {
            if (err) {
                //console.log(err);
            }
            feed.conversations = conversations;
            Card.find(
                query,
                function(err, cards) {
                    if (err) {
                        //console.log(err);
                    }
                    feed.cards = cards;
                    res.json(feed);
                }).sort({ "updatedAt": -1 }).limit(amount);
        });
    });

    // get latest card for a conversation by conversation id
    app.get('/chat/get_conversation_latest_card/:id', isLoggedIn, function(req, res) {
        Card.findOne({ 'conversationId': req.params.id }).sort('-updatedAt').exec(function(err, card) {
            if (err) {
                //console.log('err: ' + err);
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