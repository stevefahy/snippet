var mongoose = require('mongoose');

var Schema = mongoose.Schema;

// Invite
var inviteSchema = new Schema({
    sender_id:  Schema.Types.ObjectId,
    sender_name: String,
    recipient: String,
    group_id: String
});

var Invite = mongoose.model('Invite', inviteSchema);
module.exports = Invite;