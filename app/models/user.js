var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var Schema = mongoose.Schema;

// User
// define the schema for our user model
var userSchema = new Schema({
    _id: Schema.Types.ObjectId,
    contacts: [{ "type": Schema.Types.ObjectId, "ref": "User" }],
    imported_contacts: [],
    following: [{ "type": Schema.Types.ObjectId, "ref": "Conversation" }],
    notification_key_name: String,
    first_login: Boolean,
    user_name: String,
    avatar: String,
    tokens: [{ _id: String, token: String }],
    local: {
        email: String,
        password: String
    },
    facebook: {
        id: String,
        token: String,
        email: String,
        name: String
    },
    twitter: {
        id: String,
        token: String,
        displayName: String,
        username: String
    },
    google: {
        id: String,
        token: String,
        email: String,
        name: String
    }

});

// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

// create the model for users and expose it to our app
var User = mongoose.model('User', userSchema);
module.exports = User;