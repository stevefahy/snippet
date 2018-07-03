var mongoose = require('mongoose');

var Schema = mongoose.Schema;

// Card
var cardSchema = new Schema({
    conversationId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    content: String,
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

cardSchema.pre('save', function(next) {
    var currentTime = new Date().toISOString();
    if (currentTime != this.createdAt.toISOString()) {
        this.updatedAt = currentTime;
    }
    next();
});


cardSchema.pre('find', function() {
  console.log(this instanceof mongoose.Query); // true

  console.log('readyState');
  console.log(mongoose.connection.readyState);
  this.start = Date.now();
});

cardSchema.post('find', function(result) {
  console.log(this instanceof mongoose.Query); // true
  // prints returned documents
  console.log('find() returned ' + JSON.stringify(result));
  // prints number of milliseconds the query took
  console.log('find() took ' + (Date.now() - this.start) + ' millis');
});

var Card = mongoose.model('Card', cardSchema);
module.exports = Card;