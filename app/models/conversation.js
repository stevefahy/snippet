var mongoose = require('mongoose');

var Schema = mongoose.Schema;

// Conversation
var conversationSchema = new Schema({
    conversation_name: String,
    admin: [{ "type": Schema.Types.ObjectId, "ref": "User" }],
    participants: [{ "type": Schema.Types.ObjectId, "ref": "User" }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

conversationSchema.pre('save', function(next) {
    var currentTime = new Date().toISOString();
    if (currentTime != this.createdAt.toISOString()) {
        this.updatedAt = currentTime;
    }
    next();
});
var Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;