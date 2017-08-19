var Card = require('../models/card');

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
        app.post('/api/file', function(req, res) {
            var upload = multer({
                storage: storage
            }).single('userFile');
            upload(req, res, function(err) {
                res.end('File is uploaded');
            });
        });
        */
        /*
    app.post('/api/photo', function(req, res) {
         console.log('photo');
         
        upload(req, res, function(err) {
            console.log(req.body);
            console.log(req.files);
            if (err) {
                return res.end("Error uploading file.");
            }
            res.end("File is uploaded");
        });
        
    });
    */

   app.post('/api/cards/photo:input', function(req, res) {
        var input = req.params.input;
        // use mongoose to get all cards in the database
        console.log('photo');
        //getCards(res);
    });
 

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