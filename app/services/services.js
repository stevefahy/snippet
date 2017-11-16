// Service
// Each function returns a promise object 
cardApp.factory('Cards', ['$http', function($http) {
    return {
        create_card: function() {
            return $http.get("/create_card");
        },
        get: function() {
            return $http.get('api/cards');
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
            //console.log(invitedata);
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

cardApp.factory('Users', ['$http', function($http) {
    return {
        search_id: function(id) {
            return $http.post('api/users/search_id/' + id);
        },
        add_contact: function(id) {
            return $http.post('api/users/add_contact/' + id);
        },
        delete_contact: function(id) {
            return $http.post('api/users/delete_contact/' + id);
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
        find_conversation: function(id) {
            return $http.get('chat/conversation/' + id)
                .then(function(response) {
                    return response;
                });
        },
        find_user_conversations: function(id) {
            return $http.get('chat/user_conversations/' + id)
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
        }
    };
}]);