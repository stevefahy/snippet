//
// LocalDB Factory
//

cardApp.factory('LocalDB', function($q, General) {

    var db_users = [];
    var db_conversations = [];

    return {

        //
        // Users
        //

        getUser: function(id) {
            var deferred = $q.defer();
            var res;
            var pos = General.findIncludesAttr(db_users, '_id', id);
            if (pos >= 0) {
                res = { found: true, data: db_users[pos] };
                deferred.resolve(res);
            } else {
                res = { found: false };
                deferred.resolve(res);
            }
            return deferred.promise;
        },

        updateUser: function(user) {
            var pos = General.findIncludesAttr(db_users, '_id', user._id);
            if (pos >= 0) {
                db_users[pos] = user;
            } else {
                db_users.push(user);
            }
        },

        //
        // Conversations
        //

        updateConversation: function(conv) {
            var conv_pos = General.findIncludesAttr(db_conversations, '_id', conv._id);
            if (conv_pos >= 0) {
                db_conversations[conv_pos] = conv;
            } else {
                db_conversations.push(conv);
            }
        },

        getConversationById: function(id) {
            var deferred = $q.defer();
            var res;
            var conv_pos = General.findWithAttr(db_conversations, '_id', id);
            if (conv_pos >= 0) {
                res = { found: true, data: db_conversations[conv_pos] };
                deferred.resolve(res);
            } else {
                res = { found: false };
                deferred.resolve(res);
            }
            return deferred.promise;
        },

        getConversationByUserId: function(id) {
            var deferred = $q.defer();
            var res;
            var conv_pos = General.findIncludesAttrs(db_conversations, 'admin', id, 'conversation_type', 'public');
            if (conv_pos >= 0) {
                res = { found: true, data: db_conversations[conv_pos] };
                deferred.resolve(res);
            } else {
                res = { found: false };
                deferred.resolve(res);
            }
            return deferred.promise;
        },

        getConversationByUserName: function(username) {
            var deferred = $q.defer();
            var res;
            var conv_pos = General.findWithAttr(db_conversations, 'conversation_name', username);
            if (conv_pos >= 0) {
                res = { found: true, data: db_conversations[conv_pos] };
                deferred.resolve(res);
            } else {
                res = { found: false };
                deferred.resolve(res);
            }
            return deferred.promise;
        },

        addConversation: function(conv) {
            var conv_pos = General.findIncludesAttr(db_conversations, '_id', conv._id);
            if (conv_pos < 0) {
                db_conversations.push(conv);
            }
        }

    };

});