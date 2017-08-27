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

module.exports = function(app) {
/*
    app.post('/upload', function(req, res) {
        console.log('called');
        // create an incoming form object
        var form = new formidable.IncomingForm();
        // specify that we want to allow the user to upload multiple files in a single request
        form.multiples = true;
        // store all uploads in the /uploads directory
        // TODO Change directory location
        form.uploadDir = path.join(__dirname, '../../uploads');
        // every time a file has been uploaded successfully,
        // rename it to it's orignal name
        form.on('file', function(field, file) {
            fs.rename(file.path, path.join(form.uploadDir, file.name));
        });
        // log any errors that occur
        form.on('error', function(err) {
            console.log('An error has occured: \n' + err);
        });
        // once all the files have been uploaded, send a response to the client
        form.on('end', function() {
            res.end('success');
        });
        // parse the incoming request containing the form data
        form.parse(req);
    });
    */
    /*
   app.post('/upload', function(req, res) {
        // create an incoming form object
        var form = new formidable.IncomingForm();
        // specify that we want to allow the user to upload multiple files in a single request
        form.multiples = true;
        // store all uploads in the /uploads directory
        // TODO Change directory location
        form.uploadDir = path.join(__dirname, '../../upload');
        //form.uploadDir = "http://www.snipbee.com:8060/upload";
        //var dirname = "/home/steve/node/file-upload";
        //form.uploadDir = dirname + "/uploads/";
        // every time a file has been uploaded successfully,
        // rename it to it's orignal name
        form.on('file', function(field, file) {
            fs.rename(file.path, path.join(form.uploadDir, file.name));
        });
        // log any errors that occur
        form.on('error', function(err) {
            console.log('An error has occured: \n' + err);
        });
        // once all the files have been uploaded, send a response to the client
        form.on('end', function() {
            res.end('success');
        });
        // parse the incoming request containing the form data
        form.parse(req);
    });
*/

    app.get('/api/cards', function(req, res) {
        // use mongoose to get all cards in the database
        getCards(res);
    });

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

    // create card and send back all cards after creation
    app.post('/api/cards', function(req, res) {
        // create a card, information comes from AJAX request from Angular
        Card.create({
            title: req.body.title,
            content: req.body.content,
            user: req.body.user,
            lang: req.body.lang,
            done: false
        }, function(err, card) {
            if (err)
                res.send(err);
            // get and return all the cards after you create another
            getCards(res);
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
                if (err)
                    res.send(err);
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