// Service
// Each function returns a promise object 

cardApp.factory('Cards', ['$http', function($http) {
    return {
        logout: function() {
            return $http.get("/api/logout");
        },
        create_card: function() {
            return $http.get("/create_card");
        },
        create: function(carddata) {
            return $http.post('api/cards', carddata)
                .then(function(response) {
                    return response;
                });
        },
        delete: function(id) {
            return $http.delete('api/cards/' + id);
        },
        update: function(pms) {
            var theurl = 'api/cards/' + pms.id;
            return $http.put(theurl, pms);
        },
        search: function(input) {
            return $http.post('api/cards/search/' + input);
        },
        search_user: function(username) {
            return $http.post('api/cards/search_user/' + username);
        },
        search_id: function(snip) {
            return $http.post('api/cards/search_id/' + snip);
        }
    };
}]);

cardApp.factory('Invites', ['$http', function($http) {
    return {
        create_invite: function(invite_input) {
            return $http.post('api/invite', invite_input)
                .then(function(response) {
                    return response;
                });
        },
        search_id: function(code) {
            return $http.post('api/invite/search_id/' + code);
        }
    };

}]);

cardApp.factory('Email', ['$http', function($http) {
    return {
        postEmail: function(email_data) {
            return $http.post("api/post_email", email_data);
        }
    };
}]);


cardApp.factory('Contacts', ['$http', function($http) {
    return {
        getContacts: function() {
            return $http.get("api/user_contacts/");
        }
    };
}]);

cardApp.factory('Users', ['$http', function($http) {
    return {
        search_id: function(id) {
            return $http.post('api/users/search_id/' + id);
        },
        add_contact: function(id) {
            return $http.post('api/users/add_contact/' + id);
        },
        update_user: function(user) {
            var theurl = 'api/users/update_user/' + user.id;
            return $http.put(theurl, user);
        },
        delete_contact: function(id) {
            return $http.post('api/users/delete_contact/' + id);
        },
        delete_contacts: function(contacts) {
            var theurl = 'api/users/delete_contacts/';
            return $http.put(theurl, contacts);
        },
        update_notification: function(refreshedToken) {
            return $http.post('api/users/update_notification', refreshedToken);
        },
        send_notification: function(notification_data) {
            return $http.post('api/users/send_notification', notification_data);
        }
    };
}]);

cardApp.factory('Conversations', ['$http', function($http) {
    return {
        create: function(conversation_data) {
            return $http.post('chat/conversation', conversation_data)
                .then(function(response) {
                    return response;
                });
        },
        find: function() {
            return $http.get('chat/conversation')
                .then(function(response) {
                    return response;
                });
        },
        updateViewed: function(id, user_id, card_id) {
            return $http.put('chat/conversation_viewed/' + id + '/' + user_id + '/' + card_id);
        },
        clearViewed: function(id, user_id) {
            return $http.put('chat/conversation_viewed_clear/' + id + '/' + user_id);
        },
        removeViewed: function(conv_id, user_id, card_id) {
            return $http.put('chat/conversation_viewed_remove/' + conv_id + '/' + user_id + '/' + card_id);
        },
        updateAvatar: function(obj) {
            var theurl = 'chat/conversation_avatar/' + obj.id;
            return $http.put(theurl, obj);
        },
        find_conversation_id: function(id) {
            return $http.get('chat/conversation_id/' + id);
        },
        find_user_conversations: function(id) {
            return $http.get('chat/user_conversations/' + id)
                .then(function(response) {
                    return response;
                });
        },
        find_user_public_conversation: function(username) {
            return $http.get('chat/user_public_conversation/' + username)
                .then(function(response) {
                    return response;
                });
        },
        find_user_public_conversation_id: function(username) {
            return $http.get('chat/user_public_conversation_id/' + username)
                .then(function(response) {
                    return response;
                });
        },
        find_user_public_conversation_by_id: function(id) {
            return $http.get('chat/user_public_conversation_by_id/' + id)
                .then(function(response) {
                    return response;
                });
        },
        getConversationId: function() {
            return property;
        },
        setConversationId: function(value) {
            property = value;
        },
        updateTime: function(id) {
            return $http.put('chat/conversation_time/' + id);
        },
        getConversationById: function(id) {
            console.log(id);
            return $http.get('/chat/get_conversation/' + id);
        },
        getPublicConversationById: function(id) {
            return $http.get('/chat/get_public_conversation/' + id);
        },
        getConversationLatestCard: function(id) {
            return $http.get('/chat/get_conversation_latest_card/' + id);
        }
    };
}]);

cardApp.factory('socket', function($rootScope, $window) {

    var socket;
    socket = io();

    return {
        // called by index_ctrl once when the app loads 
        connect: function(id) {
            //console.log('connect: ' + socket.id + ' : ' + id);
            // Connected, request unique namespace to be created
            socket.emit('create_ns', id);
            // create the unique namespace on the client
            socket = io('/' + id);
            // namespace connect
            socket.on('connect', function() {
                //console.log('CLIENT NS connect: ' + socket.id);
            });
            // server confirming that the namespace has been created
            socket.on('joined_ns', function(id) {
                //console.log('CLIENT joined_ns: ' + socket.id);
            });
            // server notifying users by namespace of update
            socket.on('notify_users', function(msg) {
                //console.log('notify_users, conv id: ' + msg.conversation_id + ', participants: ' + msg.participants);
                $rootScope.$broadcast('NOTIFICATION', msg);
            });
            // namespace disconnected by server
            socket.on('disconnect', function(reason) {
                //console.log('CLIENT NS disconnected by server: ' + reason);
            });
        },
        delete: function() {
            socket.emit('delete');
        },
        getId: function() {
            return property;
        },
        setId: function(value) {
            property = value;
        },
        on: function(eventName, callback) {
            socket.on(eventName, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function(eventName, data, callback) {
            socket.emit(eventName, data, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        }
    };
});