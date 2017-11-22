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
        updateViewed: function(id, user_id, number) {
            return $http.put('chat/conversation_viewed/' + id + '/' + user_id + '/' + number);
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

cardApp.factory('socket', function($rootScope, $window) {
    var socket;
    var socket_array = [];
    //var _self = this;
    return {

        connect: function(data, name, info) {
            socket = io();
            console.log('client request connect: ' + data);

            socket.on('connect', function() {
                console.log('socket.io CLIENT connection made: ' + socket.id + ' : ' + data);
                var original_socket = socket.id;
                socket_array.push(original_socket);
                //var original_namespace = data;
                // Connected, request unique namespace to be created
                socket.emit('create_ns', data);
                // create the unique namespace on the client
                socket = io('/' + data);

                // server notifying users by namespace of update
                socket.on('connect', function() {
                    console.log('socket.io CLIENT NS connection made: ' + socket.id);
                    var original_ns = socket.id;
                });
                // server confirming that the namespace has been created
                socket.on('joined_ns', function(data) {
                    console.log('CLIENT joined_ns: ' + data);
                    console.log('NS socket.id: ' + socket.id);
                    // reconnecting
                    if (name !== undefined) {
                        console.log('2: ' + socket.id + ' : ' + name + ' : ' + info);
                        socket.emit(name, info);
                        var index = socket_array.indexOf(socket.id);
                        if (index > -1) {
                            socket_array.splice(index, 1);
                        }
                        console.log('socket_array: ' + socket_array);
                        socket.emit('clean_sockets', socket_array);
                    }
                });
                // server notifying users by namespace of update
                socket.on('notify_users', function(msg) {
                    console.log('notify_users, conv id: ' + msg.conversation_id + ', participants: ' + msg.participants);
                    $rootScope.$broadcast('NOTIFICATION', msg);
                });

                socket.on('disconnect', function() {
                    console.log('CLIENT NS disconnected by server: ' + original_socket + ' : ' + original_ns);
                });

                //
                socket.on('return_ping', function(msg) {
                    $rootScope.$broadcast('PING', msg);
                });

            });

            socket.on('disconnect', function() {
                console.log('CLIENT SOCKET disconnected by server: ' + original_socket + ' : ' + original_ns);
            });


        },
        checkConnection: function(id, name, info) {
            console.log('client check: ' + socket.id + ', details: ' + id + ' : ' + name + ' : ' + info);
            console.log('socket.connected: ' + socket.connected);
            /*
            if (socket.id === undefined) {
                this.connect(id, name, info);
            } else {
                this.emit(name, info);
            }
            */
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