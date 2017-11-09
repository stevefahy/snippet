var Card = require('../models/card');
var User = require('../models/user');
var Invite = require('../models/invite');
var formidable = require('formidable');
var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var nodemailer = require('nodemailer');
var base64url = require('base64url');

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

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    // console.log(req);
    if (req.isAuthenticated()) {
        //console.log('middleware logged in');
        return next();
    } else {
        //console.log('middleware not logged in');
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
            res.sendFile('indexa.html', { root: path.join(__dirname, '../') });
        }
    });
    // LOGOUT
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
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
            scope: ['profile', 'email']
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
            res.redirect('/' + req.user.google.name);
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
    //
    // CARDS
    //
    // search for cards by username
    app.post('/api/cards/search_user/:username', function(req, res) {
        var username = req.params.username;
        Card.find({ 'user': new RegExp('^' + username + '$', "i") }, function(err, cards) {
            if (err) {
                return res.send(err);
            }
            res.json(cards);
        }).limit(20);
    });
    // search for a card by id
    app.post('/api/cards/search_id/:snip', function(req, res) {
        console.log('snip');
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
        Card.create({
            content: req.body.content,
            user: req.body.user,
            //conversationId: { type: Schema.Types.ObjectId, required: true },
            done: false
        }, function(err, card) {
            if (err) {
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
                }
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
                //console.log('Email sent: ' + info.response);
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
};