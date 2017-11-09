var mongoose = require('mongoose');

var Schema = mongoose.Schema;

// Card
var cardSchema = new Schema({
    content: String,
    user: String,
    //conversationId: { type: Schema.Types.ObjectId, required: true },
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

var Card = mongoose.model('Card', cardSchema);
module.exports = Card;