//
// LocalDB Factory
//


cardApp.factory('LocalDB', function($q, General) {

    var db_users = [];
    var db_conversations = [];
    console.log('EMPTY');

    return {
        // Users

        getUser: function(id){
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

        // Conversations
        updateConversation: function(conv) {
            console.log(conv);
            var conv_pos = General.findIncludesAttr(db_conversations, '_id', conv._id);
            if (conv_pos >= 0) {
                db_conversations[conv_pos] = conv;
                console.log(db_conversations);
            }
        },
        getConversationById: function(id) {
            console.log(id);
            var deferred = $q.defer();
            var res;
            var conv_pos = General.findWithAttr(db_conversations, '_id', id);
            if (conv_pos >= 0) {
                res = { found: true, data: db_conversations[conv_pos] };
                console.log(res);
                deferred.resolve(res);
            } else {
                res = { found: false };
                console.log(res);
                deferred.resolve(res);
            }
            return deferred.promise;
        },
        getConversationByUserId: function(id) {
            var deferred = $q.defer();
            var res;
            var conv_pos = General.findIncludesAttr(db_conversations, 'admin', id);
            if (conv_pos >= 0) {
                res = { found: true, data: db_conversations[conv_pos] };
                deferred.resolve(res);
            } else {
                res = { found: false };
                deferred.resolve(res);
            }
            return deferred.promise;
        },
        getConversationByUserName: function(username){
            console.log(username);
            var deferred = $q.defer();
            var res;
            var conv_pos = General.findWithAttr(db_conversations, 'conversation_name', username);
            if (conv_pos >= 0) {
                console.log(db_conversations[conv_pos]);
                res = { found: true, data: db_conversations[conv_pos] };
                deferred.resolve(res);
            } else {
                res = { found: false };
                deferred.resolve(res);
            }
            return deferred.promise;
        },
        addConversation: function(conv) {
            console.log(conv);
            db_conversations.push(conv);
        }
    };

});