var Card = require('../models/card');
var formidable = require('formidable');
var fs = require('fs');
var path = require('path');

function getCards(res) {
    Card.find(function(err, cards) {
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
        return next();
    } else {
        res.redirect('/');
    }
}

module.exports = function(app, passport) {

    // WEB ROUTE
    app.get('/', function(req, res) {
        // load the single view file (angular will handle the page changes on the front-end)
        res.sendFile('index.html', { root: path.join(__dirname, '../') });
    });
    app.get('/:username', function(req, res) {
        // load the single view file (angular will handle the page changes on the front-end)
        res.sendFile('index.html', { root: path.join(__dirname, '../') });
    });
    app.get('/s/:snip', function(req, res) {
        // load the single view file (angular will handle the page changes on the front-end)
        res.sendFile('index.html', { root: path.join(__dirname, '../') });
    });
    app.get('/c/create_card', isLoggedIn, function(req, res) {
        res.sendFile('index.html', { root: path.join(__dirname, '../') });
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
    // API
    // Use for API only. Angular handles web routes
    /*
    app.post('/api/cards/search_user/:id', function(req, res) {
        var id = req.params.id;
        res.json({ user: id });
    });
    */

    // google ---------------------------------

    // send to google to do the authentication
    //app.get('/auth/google', function (req, res){
    //  console.log('auth google');
    //});
    app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

    // the callback after google has authenticated the user
    app.get('/auth/google/callback',
        passport.authenticate('google', {
            successRedirect: '/c/create_card',
            failureRedirect: '/'
        }));

       app.get('/auth/google/callback2',
        passport.authenticate('google', {
            successRedirect: '/c/create_card',
            failureRedirect: '/'
        }));


    app.post('/api/cards/search_user/:username', function(req, res) {
        var username = req.params.username;
        Card.find({ 'user': new RegExp('^' + username + '$', "i") }, function(err, cards) {
            if (err) {
                return res.send(err);
            }
            res.json(cards);
        }).limit(2);
    });

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

    app.get('/api/cards/', function(req, res) {
        // use mongoose to get all cards in the database
        getCards(res);
    });

    app.post('/api/cards/search/:input', function(req, res) {
        console.log('search input');
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
            title: req.body.title,
            content: req.body.content,
            user: req.body.user,
            lang: req.body.lang,
            done: false
        }, function(err, card) {
            if (err) {
                res.send(err);
            }
            // return the created card
            res.send(card);
        });
    });

    // update a card
    app.put('/api/cards/:card_id', function(req, res) {
        Card.findById({ _id: req.params.card_id }, function(err, card) {
            if (err) {
                res.send(err);
            }
            var toupdate = req.body.card;
            if (card.length < req.body.card.length) {
                card.push({ title: '', content: '', user: '', lang: '' });
            }
            card.name = toupdate.name;
            card.title = toupdate.title;
            card.content = toupdate.content;
            card.user = toupdate.user;
            card.lang = toupdate.lang;
            var newcard = new Card(card);
            newcard.save(function(err, card) {
                if (err) {
                    console.log('error: ' + err);
                    res.send(err);
                } else {
                    console.log('success: ' + card);
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

};