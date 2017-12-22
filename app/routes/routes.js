var Card = require('../models/card');
var User = require('../models/user');
var Invite = require('../models/invite');
var Conversation = require('../models/conversation');
var formidable = require('formidable');
var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var nodemailer = require('nodemailer');
var base64url = require('base64url');
var request = require('request');
var fcm = require('../configs/fcm'); // load the urls config

function getCards(res) {
    Card.find(function(err, cards) {
        // if there is an error retrieving, send the error. nothing after res.send(err) will execute
        if (err) {
            return res.send(err);
        }
        res.json(cards);
    });
}

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

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        // causing infinite loop
        res.redirect('/login');
    }
}

// TODO make service
// find the array index of an object value
function findWithAttr(array, attr, value) {
    for (var i = 0; i < array.length; i += 1) {
        if (String(array[i][attr]) === String(value)) {
            return i;
        }
    }
    return -1;
}

// route middleware to ensure user is logged in and a member of the conversation
function isMember(req, res, next) {
    // must be logged in to be a member
    if (req.isAuthenticated()) {
        // get the members of this conversation
        var query = getConversationId(req.params.id);
        query.exec(function(err, conversation) {
            if (err) {
                console.log('err: ' + err);
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
                res.redirect('/login');
            }
        });
    } else {
        // causing infinite loop
        res.redirect('/login');
    }
}

module.exports = function(app, passport) {
    //
    // WEB ROUTE
    //----------------------------------------------------------------------
    //
    // NOT LOGGED IN
    app.get('/login', function(req, res) {
        // load the single view file (angular will handle the page changes on the front-end)
        res.sendFile('login.html', { root: path.join(__dirname, '../views/') });
    });
    // LOGGED IN
    app.get('/', isLoggedIn, function(req, res) {
        if (req.user !== undefined) {
            // load the single view file (angular will handle the page changes on the front-end)
            res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
        } else {
            res.sendFile('login.html', { root: path.join(__dirname, '../views/') });
        }
    });

    // LOGOUT
    app.get('/api/logout', function(req, res) {
        req.logout();
        req.logOut();


        req.session.destroy(function(err) {
            if (err) {
                console.log('err: ' + err);
            }
            console.log('destroy');
            res.sendFile('login.html', { root: path.join(__dirname, '../views/') });
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
    // CREATE CARD
    app.get('/c/create_card', isLoggedIn, function(req, res) {
        res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
    });
    // CONTACTS
    app.get('/c/contacts', isLoggedIn, function(req, res) {
        res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
    });
    // CONVERSATION
    app.get('/chat/conversation/:id', isMember, function(req, res) {
        res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
    });
    // CONVERSATIONS
    app.get('/chat/conversations', isLoggedIn, function(req, res) {
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
        stateString = base64url('{ "invite_id" : "' + invite_code + '" }');
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
    app.get('/auth/google/callback',
        passport.authenticate('google', {
            failureRedirect: '/login'
        }),
        function(req, res) {
            // If this is a callback from an invite link then there will be a state variable
            if (req.query.state) {
                // Invite accepted
                // Add this user to the inviter's list of contacts
                // Send the newly logged in user to the relevant group if stated
                // delete or set invite to accepted
                //
                // decode the invite code
                var invite_code = JSON.parse(base64url.decode(req.query.state));
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
            }
            // redirect to the newly created users home page (/:USERNAME)
            //res.redirect('/' + req.user.google.name);
            res.redirect('/');
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
    // get user notification data
    app.post('/api/users/update_notification', function(req, res) {

        //var notification_key_name = req.user.notification_key_name;
        console.log('id: ' + req.body.id);
        console.log('token: ' + req.body.refreshedToken);
        console.log('user id: ' + req.user._id);

        User.findById({ '_id': req.user._id }, function(error, user) {
            if (error) {
                console.log('user error');
                res.json(error);
            } else if (user === null) {
                // no user found
                console.log('no user');
                res.json({ 'error': 'null' });
            } else {
                console.log('user: ' + user);
                //res.json({ 'success': user });
                // if no notification group create it
                console.log('user.notification_key_name: ' + user.notification_key_name);
                console.log('user.notification_key: ' + user.notification_key);

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
                    console.log('First time. Create notification key');
                    /*
                    var data = {
                        "operation": "create",
                        "notification_key_name": req.user._id,
                        "registration_ids": [req.body.refreshedToken]
                    };
                    */

                    data.operation = "create";


                    /*
                    var options = {
                        uri: 'https://android.googleapis.com/gcm/notification',
                        method: 'POST',
                        headers: headers,
                        json: data
                    };
                    */

                    request(options, function(err, response, body) {
                        if (err) {
                            console.log('err: ' + err);
                            throw err;
                        } else {
                            console.log(body);
                            var notification_key = body.notification_key;
                            //var notification_key = 'APA91bEG5H3StdrWn4kH2IrstKKbKHHIr16CtMUijPccHs9ugXwHuh-ZUnEo5iAFCV_BQV4K-OW-4y4p5pV16_CDt7bY95QCOrG0tp4-isMAfOaWpECt-S-jjus9iXZmLToZptpkl8EO';

                            // Save
                            var updateuser = new User(user);
                            updateuser.notification_key_name = user._id;
                            updateuser.notification_key = notification_key;
                            //$scope.chat_create.participants.push({ _id: $scope.currentUser._id, viewed: 0 });
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
                    // Second time. Update tokens if necessary.
                    // Find the Android device id
                    //console.log('id: ' + req.body.id);
                    //console.log('token: ' + req.body.refreshedToken);
                    var id_pos = findWithAttr(user.tokens, '_id', req.body.id);
                    console.log('found: ' + id_pos);
                    console.log('Second time. Update tokens if necessary');
                    if (id_pos >= 0) {
                        // This device was already registered
                        // Check if the token has been changed
                        if (user.tokens[id_pos].token != req.body.refreshedToken) {
                            // The token has been changed. Update DB and FCM

                            console.log('The token has been changed. Update DB and FCM');

                            var new_user = new User(user);
                            new_user.tokens[id_pos].token = req.body.refreshedToken;
                            console.log('tokens: ' + new_user.tokens);
                            //new_user.updatedAt = new Date().toISOString();
                            new_user.save(function(err, user) {
                                if (err) {
                                    res.send(err);
                                } else {
                                    res.json(user);
                                }
                            });

                            // FCM Delete old token and add new token
                            var token_array = [];
                            for (var i in new_user.tokens) {
                                if (new_user.tokens[i].token) {
                                    console.log(new_user.tokens[i].token);
                                    //token_array.push('"' + new_user.tokens[i].token + '"');
                                    token_array.push(new_user.tokens[i].token);
                                }
                            }
                            /*
                            for (var key in new_user.tokens) {
                                if (new_user.tokens[key].token {
                                    console.log(key + " -> " + new_user.tokens[key].token);
                                    token_array.push(new_user.tokens[key].token);

                                }
                            }
                            */
                            token_array.reverse();
                            console.log('token_array: ' + token_array);
                            /*
                            var new_data = {
                                "operation": "add",
                                "notification_key_name": req.user._id,
                                "notification_key": new_user.notification_key,
                                "registration_ids": token_array
                            };
                            */
                            data.operation = "add";
                            /*
                            var new_headers = {
                                'Authorization': 'key=' + fcm.firebaseserverkey,
                                'Content-Type': 'application/json',
                                'project_id': fcm.project_id

                            };
                            */
                            /*
                            var new_options = {
                                uri: 'https://android.googleapis.com/gcm/notification',
                                method: 'POST',
                                headers: headers,
                                json: data
                            };
                            */

                            request(options, function(err, response, body) {
                                if (err) {
                                    console.log('err: ' + err);
                                    throw err;
                                } else {
                                    console.log(body);
                                }
                            });


                        } else {
                            console.log('token up to date');
                        }


                    } else {
                        // New Device.
                        // Update DB and FCM
                        console.log('new device update token');
                        // WORKS!

                        var new_user = new User(user);
                        //new_user.tokens[id_pos].token = req.body.refreshedToken;
                        new_user.tokens.push({ _id: req.body.id, token: req.body.refreshedToken });
                        //new_user.updatedAt = new Date().toISOString();
                        console.log('tokens: ' + new_user.tokens);
                        new_user.save(function(err, user) {
                            if (err) {
                                res.send(err);
                            } else {
                                res.json(user);
                            }
                        });

                        // FCM Delete old token and add new token
                        var token_array = [];
                        for (var i in new_user.tokens) {
                            if (new_user.tokens[i].token) {
                                console.log(new_user.tokens[i].token);
                                //token_array.push('"' + new_user.tokens[i].token + '"');
                                token_array.push(new_user.tokens[i].token);
                            }
                        }
                        token_array.reverse();
                        console.log('token_array: ' + token_array);
                        console.log('new_user.notification_key: ' + new_user.notification_key);
                        console.log('notification_key_name: ' + req.user._id);
                        console.log('auth: ' + 'key=' + fcm.firebaseserverkey);
                        /*
                        var new_data = {
                            "operation": "add",
                            "notification_key_name": req.user._id,
                            "notification_key": new_user.notification_key,
                            "registration_ids": token_array
                        };
                        */
                        data.operation = "add";
                        /*
                        var new_headers = {
                            'Authorization': 'key=' + fcm.firebaseserverkey,
                            'Content-Type': 'application/json',
                            'project_id': fcm.project_id

                        };
                        */
                        /*
                        var new_options = {
                            uri: 'https://android.googleapis.com/gcm/notification',
                            method: 'POST',
                            headers: headers,
                            json: data
                        };
                        */
                        //console.log('new_options: ' + new_options);

                        request(options, function(err, response, body) {
                            if (err) {
                                console.log('err: ' + err);
                                throw err;
                            } else {
                                console.log(body);
                            }
                        });

                    }




                }



                //notification_key_name: String,
                // the users id
                //notification_key: String,   

                // else check whether the token needs to be added to the group or updated.
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
                console.log('err: ' + err);
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
                        console.log('err: ' + err);
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
    // get all cards
    app.get('/api/cards/', function(req, res) {
        // use mongoose to get all cards in the database
        getCards(res);
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
        //console.log('create: ' + req.io);
        //req.io.emit('some_event',{ my: 'datax' });
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
                } else {}
            });
        });
    });

    // delete a card
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
    // send email invite
    app.post('/api/post_email', function(req, res) {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'snipbee@gmail.com',
                pass: 'stevesnipbeepass'
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
                //
            } else {
                res.send(200);
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
                res.send(err);
            }
            var new_conversation = new Conversation(conversation);
            new_conversation.updatedAt = new Date().toISOString();
            new_conversation.save(function(err, conversation) {
                if (err) {
                    res.send(err);
                } else {
                    res.json(conversation);
                }
            });
        });

    });

    // Update a conversation viewed number by ocnversation id and user id
    app.put('/chat/conversation_viewed/:id/:user_id/:number', function(req, res) {
        Conversation.update({ _id: req.params.id, 'participants._id': req.params.user_id }, {
                '$set': {
                    'participants.$.viewed': req.params.number
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

    // get all conversations for this user
    // TODO - web route?
    // TODO - check all these use are used and without redundancy
    app.get('/chat/conversations', function(req, res) {
        res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
    });

    // get all conversations for current user
    app.get('/chat/conversation', function(req, res) {
        Conversation.find({ 'participants': req.user._id }, function(err, conversations) {
            if (err) {
                return res.send(err);
            }
            res.send(conversations);
        });
    });

    // get a conversation by conversation id
    app.get('/chat/conversation_id/:id', function(req, res) {
        Conversation.findOne({ '_id': req.params.id }, function(err, conversation) {
            if (err) {
                console.log('err: ' + err);
                return done(err);
            }
            res.json(conversation);
        });
    });

    // get all conversations by user id
    // TODO check redundant?
    app.get('/chat/user_conversations/:id', function(req, res) {
        Conversation.find({ 'participants._id': req.params.id }, function(err, conversations) {
            if (err) {
                return done(err);
            }
            res.json(conversations);
        });
    });

    // get all cards for a conversation by conversation id
    app.get('/chat/get_conversation/:id', function(req, res) {
        // TODO if no id exists then re-route
        Card.find({ 'conversationId': req.params.id }, function(err, cards) {
            if (err) {
                return done(err);
            }
            res.json(cards);
        });
    });
};