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

var Card = mongoose.model('Card', cardSchema);
module.exports = Card;