//
// FACTORIES
//

//
// Cards Factory
//

cardApp.factory('Cards', ['$http', function($http) {
    return {
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

//
// Invites Factory
//

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

//
// Email Factory
//

cardApp.factory('Email', ['$http', function($http) {
    return {
        postEmail: function(email_data) {
            return $http.post("api/post_email", email_data);
        }
    };
}]);

//
// contacts Factory
//

cardApp.factory('Contacts', ['$http', function($http) {
    return {
        getContacts: function() {
            return $http.get("api/user_contacts/");
        }
    };
}]);

//
// Users Factory
//

cardApp.factory('Users', ['$http', '$q', 'LocalDB', function($http, $q, LocalDB) {
    return {
        /*
        follow_conversation: function(id) {
            return $http.post('api/users/follow_conversation/' + id);
        },
        unfollow_conversation: function(id) {
            return $http.post('api/users/unfollow_conversation/' + id);
        },
        */
        follow_conversation: function(id) {
            var deferred = $q.defer();
            $http.post('api/users/follow_conversation/' + id)
                .then(function(response) {
                    console.log(response.data);
                    LocalDB.updateUser(response.data);
                    deferred.resolve(response.data);
                });
            return deferred.promise;
        },
        unfollow_conversation: function(id) {
            var deferred = $q.defer();
            $http.post('api/users/unfollow_conversation/' + id)
                .then(function(response) {
                    console.log(response.data);
                    LocalDB.updateUser(response.data);
                    deferred.resolve(response.data);
                });
            return deferred.promise;
        },
        /*
        search_id: function(id) {
            return $http.post('api/users/search_id/' + id);
        },
        */
        search_id: function(id) {
            var deferred = $q.defer();
            LocalDB.getUser(id)
                .then(function(response) {
                    console.log(response);
                    if (response.found) {
                        deferred.resolve(response.data);
                    } else {
                        $http.post('api/users/search_id/' + id)
                            .then(function(response) {
                                console.log(response);
                                if (response.data.success) {
                                    LocalDB.updateUser(response.data.success);
                                    deferred.resolve(response);
                                } else {
                                    deferred.resolve(response);
                                }

                            });
                    }
                });
            return deferred.promise;
        },

        search_public_id: function(id) {
            var deferred = $q.defer();
            LocalDB.getUser(id)
                .then(function(response) {
                    console.log(response);
                    if (response.found) {
                        deferred.resolve(response.data);
                    } else {
                        $http.post('api/users/search_public_id/' + id)
                            .then(function(response) {
                                console.log(response);
                                if (response.data.success) {
                                    LocalDB.updateUser(response.data.success);
                                    deferred.resolve(response);
                                } else {
                                    deferred.resolve(response);
                                }

                            });
                    }
                });
            return deferred.promise;
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
        update_notification: function(notification_values) {
            return $http.post('api/users/update_notification', notification_values);
        },
        send_notification: function(notification_data) {
            return $http.post('api/users/send_notification', notification_data);
        }
    };
}]);

//
// Conversations Factory
//

cardApp.factory('Conversations', ['$http', '$q', 'LocalDB', function($http, $q, LocalDB) {

    var id_property;
    var type_property;
    console.log('Conversations Factory');

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

        /*
        addFollower: function(conversation) {
            var theurl = 'chat/follow_public_conversation/' + conversation.id;
            return $http.put(theurl, conversation);
        },
        deleteFollower: function(conversation) {
            var theurl = 'chat/unfollow_public_conversation/' + conversation.id;
            return $http.put(theurl, conversation);
        },
        */

        addFollower: function(conversation) {
            var deferred = $q.defer();
            var theurl = 'chat/follow_public_conversation/' + conversation.id;
            $http.put(theurl, conversation)
                .then(function(response) {
                    LocalDB.updateConversation(response.data);
                    deferred.resolve(response.data);
                });
            return deferred.promise;
        },

        deleteFollower: function(conversation) {
            var deferred = $q.defer();
            var theurl = 'chat/unfollow_public_conversation/' + conversation.id;
            $http.put(theurl, conversation)
                .then(function(response) {
                    LocalDB.updateConversation(response.data);
                    deferred.resolve(response.data);
                });
            return deferred.promise;
        },
        update: function(conversation) {
            var theurl = 'chat/update_conversation/' + conversation.id;
            return $http.put(theurl, conversation);
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
        /*
        find_conversation_id: function(id) {
            return $http.get('chat/conversation_id/' + id);
        },
        // Find public conversation by conversation id
        find_public_conversation_id: function(id) {
            return $http.get('chat/public_conversation_id/' + id);
        },
        */
        find_conversation_id: function(id) {
            var deferred = $q.defer();
            LocalDB.getConversationById(id)
                .then(function(response) {
                    console.log(response);
                    if (response.found) {
                        deferred.resolve(response.data);
                    } else {
                        $http.get('chat/conversation_id/' + id)
                            .then(function(response) {
                                console.log(response);
                                LocalDB.addConversation(response.data);
                                deferred.resolve(response.data);
                            });
                    }
                });
            return deferred.promise;
        },
        // Find public conversation by conversation id
        find_public_conversation_id: function(id) {
            var deferred = $q.defer();
            LocalDB.getConversationById(id)
                .then(function(response) {
                    if (response.found) {
                        deferred.resolve(response.data);
                    } else {
                        $http.get('chat/public_conversation_id/' + id)
                            .then(function(response) {
                                console.log(response);
                                if (response.data != null) {
                                    LocalDB.addConversation(response.data);
                                }
                                deferred.resolve(response.data);
                            });
                    }
                });
            return deferred.promise;
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
        /*
        find_user_public_conversation_id: function(username) {
            return $http.get('chat/user_public_conversation_id/' + username)
                .then(function(response) {
                    return response;
                });
        },
        find_user_public_conversation_by_id: function(id) {
            return $http.get('chat/user_public_conversation_by_id/' + id)
                .then(function(response) {
                    return response.data;
                });
        },
        */

        find_user_public_conversation_id: function(username) {
            var deferred = $q.defer();
            LocalDB.getConversationByUserName(username)
                .then(function(response) {
                    console.log(response);
                    if (response.found) {
                        deferred.resolve(response.data);
                    } else {
                        $http.get('chat/user_public_conversation_id/' + username)
                            .then(function(response) {
                                console.log(response);
                                LocalDB.addConversation(response.data);
                                deferred.resolve(response.data);
                            });
                    }
                });
            return deferred.promise;
        },

        find_user_public_conversation_by_id: function(id) {
            var deferred = $q.defer();
            LocalDB.getConversationByUserId(id)
                .then(function(response) {
                    if (response.found) {
                        deferred.resolve(response.data);
                    } else {
                        $http.get('chat/user_public_conversation_by_id/' + id)
                            .then(function(response) {
                                console.log(response);
                                LocalDB.addConversation(response.data);
                                deferred.resolve(response.data);
                            });
                    }
                });
            return deferred.promise;
        },



        getConversationId: function() {
            return id_property;
        },
        setConversationId: function(value) {
            id_property = value;
        },

        getConversationType: function() {
            return type_property;
        },
        setConversationType: function(value) {
            console.log(value);
            type_property = value;
        },

        updateTime: function(id) {
            return $http.put('chat/conversation_time/' + id);
        },
        getConversationById: function(id) {
            return $http.get('/chat/get_conversation/' + id);
        },
        /*
        getPublicConversationById: function(id) {
            return $http.get('/chat/get_public_conversation/' + id);
        },
        */
        getConversationLatestCard: function(id) {
            return $http.get('/chat/get_conversation_latest_card/' + id);
        },
        getFeed: function(val) {
            var theurl = '/chat/get_feed/' + val.ids;
            return $http.post(theurl, val);
        },
        updateFeed: function(val) {
            var theurl = '/chat/update_feed/' + val.ids;
            return $http.post(theurl, val);
        },
        getConversationCards: function(val) {
            var theurl = '/chat/get_conversation_cards/' + val.id;
            return $http.post(theurl, val);
        },
        getPublicConversationCards: function(val) {
            var theurl = '/chat/get_public_conversation_cards/' + val.id;
            return $http.post(theurl, val);
        }
    };
}]);

//
// socket Factory
//

cardApp.factory('socket', function($rootScope, $window, $interval, $q) {

    var socket_m;
    var socket_n;

    //var returned_m;

    //var socket_f = this;


    //$rootScope.socket_m = socket_m;






    notifyConversationCreated = function(msg) {
        console.log('notify_conversation_created, conv id: ' + msg.conversation_id + ', participants: ' + msg.participants);
        //$rootScope.$broadcast('NOTIFICATION', msg);
        $rootScope.$broadcast('PRIVATE_CONVERSATION_CREATED', msg);
    };

    notifyPrivateCreated = function(msg) {
        console.log('notify_private_created, conv id: ' + msg.conversation_id + ' card_id: ' + msg.card_id + ', participants: ' + msg.participants);
        //$rootScope.$broadcast('NOTIFICATION', msg);
        $rootScope.$broadcast('PRIVATE_NOTIFICATION_CREATED', msg);
    };

    notifyPrivateUpdated = function(msg) {
        console.log('notify_private_updated, conv id: ' + msg.conversation_id + ' card_id: ' + msg.card_id + ', participants: ' + msg.participants + ', viewed_users: ' + msg.viewed_users);
        //$rootScope.$broadcast('NOTIFICATION', msg);
        $rootScope.$broadcast('PRIVATE_NOTIFICATION_UPDATED', msg);
    };

    notifyPrivateDeleted = function(msg) {
        console.log('notify_private_deleted, conv id: ' + msg.conversation_id + ' card_id: ' + msg.card_id + ', participants: ' + msg.participants);
        //$rootScope.$broadcast('NOTIFICATION', msg);
        $rootScope.$broadcast('PRIVATE_NOTIFICATION_DELETED', msg);
    };

    notifyPublicCreated = function(msg) {
        console.log('notify_public_created, conv id: ' + msg.conversation_id + ' card_id: ' + msg.card_id + ', followers: ' + msg.followers);
        $rootScope.$broadcast('PUBLIC_NOTIFICATION_CREATED', msg);
    };

    notifyPublicDeleted = function(msg) {
        console.log('notify_users_deleted, conv id: ' + msg.conversation_id + ' , card id: ' + msg.card_id + ', participants: ' + msg.followers);
        $rootScope.$broadcast('PUBLIC_NOTIFICATION_DELETED', msg);
    };

    notifyPublicUpdated = function(msg) {
        console.log('notify_users_updated, conv id: ' + msg.conversation_id + ' , card id: ' + msg.card_id + ', participants: ' + msg.followers);
        $rootScope.$broadcast('PUBLIC_NOTIFICATION_UPDATED', msg);
    };

    updateData = function(msg) {
        console.log('update_data: ' + msg.update_values + ', user: ' + msg.user);
        $rootScope.$broadcast('UPDATE_DATA', msg);
    };

    recreateConnection = function() {
        console.log('recreateConnection');
        console.log(socket_m);
        console.log(socket_n);
        console.log(socket_m.connected);
        console.log(socket_n.connected);
        var connection = socket_n.connect();
        var checkConnection = $interval(function() {
            console.log(connection.connected);
            if (connection.connected) {
                console.log(socket_m.connected);
                console.log(socket_n.connected);
                console.log("Made connection");
                $rootScope.$broadcast('SOCKET_RECONNECT');
                $interval.cancel(checkConnection);
            }
        }, 500, 10);

    };

    connectNamespace = function(id, factory) {
        // Connected, request unique namespace to be created
        socket_m.emit('create_ns', id);
        // create the unique namespace on the client
        //socket_n = io('/' + id);
        socket_n = io('/' + id, { transports: ['websocket'] });
        //const adminSocket = io('/admin', { forceNew: true });


        /*
                      socket_m = io({
                     transports: ['websocket'],
                      timeout: 100,
                      reconnectionAttempts: 2
                      //autoConnect: false
                  });
                  */

        $rootScope.socket_n = socket_n;
        //$rootScope.socket_n = socket_n;

        $rootScope.$watch('socket_n.connected', function(n) {
            console.log(n);
        });
        // namespace connect
        /*socket_n.on('connect', function() {
            console.log('CLIENT NS connect: ' + socket_n.id);
        });*/
        socket_n.once('connect', function() {
            console.log('CLIENT NS connect: ' + socket_n.id);
        });
        // server confirming that the namespace has been created
        socket_n.on('joined_ns', function(id) {
            console.log('CLIENT joined_ns: ' + socket_n.id);
        });
/*
        socket_n.on('existing_ns', function(id) {
            console.log('CLIENT existing_ns: ' + socket_n.id);
        });
        */


        // server notifying users by namespace of content update
        socket_n.on('notify_conversation_created', notifyConversationCreated);
        // server notifying users by namespace of content update
        socket_n.on('notify_private_created', notifyPrivateCreated);

        // server notifying users by namespace of content update
        socket_n.on('notify_private_updated', notifyPrivateUpdated);

        // server notifying users by namespace of content update
        socket_n.on('notify_private_deleted', notifyPrivateDeleted);

        // server notifying users by namespace of content update
        socket_n.on('notify_public_created', notifyPublicCreated);

        // server notifying users by namespace of content update
        socket_n.on('notify_public_deleted', notifyPublicDeleted);

        // server notifying users by namespace of content update
        socket_n.on('notify_public_updated', notifyPublicUpdated);

        // server notifying users by namespace of data update
        socket_n.on('update_data', updateData);
        // namespace disconnected by server
        socket_n.on('disconnect', function(reason) {
            console.log('CLIENT NS disconnected by server: ' + reason);
        });
        socket_n.on('connect_error', function(error) {
            console.log('CLIENT NS connect_error: ' + error);
        });
        socket_n.on('connect_timeout', function() {
            console.log('CLIENT NS connect_timeout');
        });
        socket_n.on('reconnect', function(attempt) {
            console.log('CLIENT NS reconnect: ' + attempt);
            //$rootScope.$broadcast('SOCKET_RECONNECT');
        });
        socket_n.on('reconnecting', function(attempt) {
            console.log('CLIENT NS reconnecting: ' + attempt);
        });
        socket_n.on('reconnect_attempt', function() {
            console.log('CLIENT NS reconnect_attempt');
        });
        socket_n.on('reconnect_error', function(error) {
            console.log(socket_n);
            console.log('CLIENT NS reconnect_error: ' + error);
        });
        socket_n.on('reconnect_failed', function() {
            console.log(socket_n);
            console.log('CLIENT NS reconnect_failed');
        });
        socket_n.on('ping', function() {
            console.log('ping');
        });
        socket_n.on('pong', function(ms) {
            console.log('pong: ' + ms);
        });
        socket_n.on('SERVER_CONNECTION', function(id) {
            console.log('CLIENT NS SERVER_CONNECTION: ' + id);
        });
    };

    return {
        create: function() {
            console.log('create');
            socket_m = io({
                transports: ['websocket']//,
                //timeout: 100,
                //reconnectionAttempts: 5
                //autoConnect: false
            });

            $rootScope.socket_m = socket_m;
            //$rootScope.socket_n = socket_n;

            $rootScope.$watch('socket_m.connected', function(n) {
                console.log(n);
            });

            var socket_factory = this;
            socket_m.once('connect', function() {
                //socket_m.on('connect', function() {
                console.log("connected from the client side");
                connectNamespace(socket_factory.getId(), socket_factory);
            });

           //socket_m.once('reconnect', function() {
                socket_m.on('reconnect', function() {
                console.log("reconnected from the client side");
                this.once('connect', function() {
                    console.log("connect from the client side!");
                    // Connected, request unique namespace to be created
                    socket_m.emit('create_ns', socket_factory.getId());
                    // Re-establish connection with the namespace.
                    // Wait before checking the re connect with the namespace.
                    setTimeout(recreateConnection, 500);
                });
            });


            // TEST 20/01/19
            /*
            socket_m.on('connect', function() {
                console.log(socket_factory.getId());
                //returned_m = this;
                //connectNamespace(socket_factory.getId(), socket_factory);
                console.log('M CLIENT NS connect 2ND TIME');
                console.log(socket_n);
                console.log(socket_n.connected);
                console.log(socket_factory.getId());
                connectNamespace(socket_factory.getId(), socket_factory);
                //console.log("connected from the client side");
                   // connectNamespace(socket_factory.getId(), socket_factory);
                //socket_n.connect();
               //socket_n = io('/' + socket_factory.getId());
            });
            */




            socket_m.on('connection', function() {
                console.log('M CLIENT NS connection');
            });
            socket_m.on('disconnect', function(reason) {
                console.log('M CLIENT NS disconnected by server: ' + reason);
            });
            socket_m.on('connect_error', function(error) {
                console.log('M CLIENT NS connect_error: ' + error);
            });
            socket_m.on('connect_timeout', function() {
                console.log('M CLIENT NS connect_timeout');
            });
            socket_m.on('reconnect', function(attempt) {
                console.log('M CLIENT NS reconnect: ' + attempt);
                //$rootScope.$broadcast('SOCKET_RECONNECT');
            });
            socket_m.on('reconnecting', function(attempt) {
                console.log('M CLIENT NS reconnecting: ' + attempt);
            });
            socket_m.on('reconnect_attempt', function() {
                console.log('M CLIENT NS reconnect_attempt');
            });
            socket_m.on('reconnect_error', function(error) {
                console.log('M CLIENT NS reconnect_error: ' + error);
            });
            socket_m.on('reconnect_failed', function() {
                console.log('M CLIENT NS reconnect_failed');
                socket_factory.create();

            });
            socket_m.on('ping', function() {
                console.log('ping');
            });
            socket_m.on('pong', function(ms) {
                console.log('pong: ' + ms);
            });
            socket_m.on('SERVER_CONNECTION', function(id) {
                console.log('M CLIENT NS SERVER_CONNECTION: ' + id);
            });




        },
        connect: connectNamespace,
        delete: function() {
            //socket_m.emit('delete');
        },
        disconnect: function() {
            console.log('disconnect');
            //socket.emit('conversation_created', { sender_id: socket.getId(), conversation_id: res.data._id, participants: res.data.participants });
            //socket.emit('user_disconnect', { sender_id: socket.getId(), conversation_id: res.data._id, participants: res.data.participants });
            socket_n.disconnect();
            socket_m.disconnect();
            //socket_m.emit('disconnect');
        },
        getId: function() {
            return property;
        },
        setId: function(value) {
            property = value;
        },


        recreate: function(value) {
            
            console.log('recreate');
            //recreateConnection();

            var sox = this;
            console.log(socket_m);
            console.log(socket_n);
            //socket_m.disconnect();
            if (!socket_m.connected) {
                socket_m.connect();
                //socket_n.connect();

                socket_m.once('connect', function() {
                    //socket_m.on('connect', function() {
                    console.log("connected from the client side 2");
                    //connectNamespace(sox.getId(), sox);
                    //socket_n.connect();
                    //socket_m.emit('check_ns', sox.getId());
                    socket_m.emit('create_ns', sox.getId());
                    socket_n.connect();
                    //socket_n.on('connect', function() {
                    //console.log('CLIENT NS connect 2: ' + socket_n.id);
                    //});
                });

            }


            //connectNamespace(this.getId(), this);
            //socket_m.emit('create_ns', this.getId());





            //socket_m.connect();
            //socket_m.emit('create_ns', this.getId());
            //connectNamespace(this.getId(), this);
            /*
            if(!socket_n.connected){
                //socket_n.connect();
                console.log(this.getId());
                //socket_m.emit('create_ns', this.getId());
                //connectNamespace(this.getId(), this);
                socket_n.connect();
            } else {
               // socket_m.connect();
            }
            */
            //socket_n.connect();

            //connectNamespace(sox.getId(), sox);
            /*socket_m.once('connect', function() {
                //socket_m.on('connect', function() {
                console.log("connected from the client side AGAIN");
                console.log(sox);
                connectNamespace(sox.getId(), sox);
            });*/
            //socket_n.connect();
            //$rootScope.$broadcast('SOCKET_RECONNECT');
            //console.log(socket_m);
            //console.log(returned_m);
            //socket_n.io.reconnect();

        },


        isConnected: function() {
            return socket_m.connected;
        },
        on: function(eventName, callback) {
            socket_m.on(eventName, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    callback.apply(socket_m, args);
                });
            });
        },
        emit: function(eventName, data, callback) {
            socket_n.emit(eventName, data, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    if (callback) {
                        callback.apply(socket_m, args);
                    }
                });
            });
        }
    };
});

//
// principal Factory
//

cardApp.factory('principal', function($cookies, jwtHelper, $q, $rootScope) {
    var principal = { isAuthenticated: false, roles: [], user: { name: 'Guest' } };

    try {
        var token = $cookies.get('_accessToken');
        var decoded = jwtHelper.decodeToken(token);
        if (decoded && !jwtHelper.isTokenExpired(token)) {
            principal.isAuthenticated = true;
            principal.user = decoded.data.user;
            principal.token = token;
        }
    } catch (e) {
        //console.log('ERROR while parsing principal cookie.' + e);
    }

    principal.logOut = function() {
        principal.isAuthenticated = false;
        principal.token = null;
        $cookies.remove('_accessToken');
    };

    principal.getToken = function() {
        return principal.token;
    };

    principal.isValid = function() {
        if (principal.token != undefined) {
            jwtHelper.isTokenExpired(principal.token);
            principal.isAuthenticated = !jwtHelper.isTokenExpired(principal.token);
        }
        return principal.isAuthenticated;
    };

    return principal;
});

//
// UserData Factory
//

var cards_model;
cardApp.factory('UserData', function($rootScope, $route, $timeout, $window, $http, $cookies, $location, jwtHelper, $q, principal, Users, Conversations, FormatHTML, General, socket, $filter, LocalDB) {
    var self = this;
    var user;
    var contacts = [];
    var contacts_and_user = [];
    var conversations;
    var conversationsLatestCard = [];
    var conversationsUsers = [];
    var sent_content_length = 200;
    // Final conversations model for display.
    var conversations_model = [];
    // Final cards model for display.
    cards_model = [];


// TODO - move these to main?
    var UserData = { isAuthenticated: false, isLoaded: false, isLoading: false };
    $rootScope.loaded = false;
    var isLoading = false;
    $rootScope.dataLoading = true;
    var ua = navigator.userAgent;
    $window.androidToken = this.androidToken;
    $window.androidTokenUpdated = this.androidTokenUpdated;
    $window.mobileNotification = this.mobileNotification;

    /*
    $window.networkChange = this.networkChange;
    $window.onResume = this.onResume;
    $window.onRestart = this.onRestart;
    $window.restoreState = this.restoreState;
    */

    var update_inprogress = false;

    // Android called functions.
    /*
        restoreState = function() {
            console.log('restoreState');
        };

        onPause = function() {
            console.log('onPause');
        };

        onResume = function() {
            console.log('onResume');
        };

        onRestart = function() {
            console.log('onRestart');
        };

        networkChange = function(status) {
            if (status == "connected") {
                $timeout(function() {
                    console.log('connected');
                });
            } else if (status == "disconnected") {
                console.log('disconnected');
            }
        };
    */
    mobileNotification = function(data) {
        $timeout(function() {
            $location.path("/chat/conversation/" + data);
        });
    };

    androidTokenUpdated = function() {
        UserData.getFCMToken();
    };

    this.updateUsers = function(data, user, users) {
        socket.emit('data_change', { sender_id: socket.getId(), update: data, user: user, users: users });
    };

    setNotificationData = function(data, user) {
        // get notifcation data and check if this needs to be updated or added
        Users.update_notification(data)
            .then(function(res) {
                //Notification update. Notify this users contacts of the change.
                self.updateUsers(res.data, user._id, user.contacts);
            });
    };

    androidToken = function(data) {
        notification_values = JSON.parse(data);
        // Check that the user has completed registration of their email address which creates their User data.
        if (UserData.getUser() != undefined) {
            var device_id = notification_values.id;
            var token = notification_values.token;
            if (device_id != undefined && token != undefined) {
                // Check if the token has been created yet or has changed.
                var user = UserData.getUser();
                // First time. Create notification key.
                if (user.notification_key_name === undefined) {
                    setNotificationData(data, user);
                } else {
                    // User notification key already created. Update tokens if they have changed.
                    // Find the Android device id
                    var id_pos = General.findWithAttr(user.tokens, '_id', device_id);
                    if (id_pos >= 0) {
                        // This device was already registered.  Check if the token has been changed
                        if (user.tokens[id_pos].token != token) {
                            // The token has been changed.
                            setNotificationData(data, user);
                        }
                    } else {
                        // User notification key already created. New Device.
                        setNotificationData(data, user);
                    }
                }
            }
        }
    };

    UserData.getFCMToken = function() {
        var deferred = $q.defer();
        if (ua.indexOf('AndroidApp') >= 0) {
            Android.getFCMToken();
            deferred.resolve();
        } else {
            // Web
            $timeout(function() {
                deferred.resolve();
            }, 100);
        }
        return deferred.promise;
    };

    //
    // User
    //

    UserData.loadUser = function() {
        return $http.get("/api/user_data").then(function(result) {
            return result.data.user;
        });
    };

    UserData.setUser = function(value) {
        user = value;
        return user;
    };

    UserData.getUser = function() {
        return user;
    };

    UserData.setContacts = function(value) {
        var deferred = $q.defer();
        contacts = value;
        deferred.resolve(contacts);
        return deferred.promise;
    };

    UserData.getContacts = function() {
        return contacts;
    };

    UserData.addContact = function(val) {
        var deferred = $q.defer();
        var index = General.findWithAttr(contacts, '_id', val._id);
        // Only add locally if it does not already exist.
        if (index < 0) {
            // Add.
            contacts.push(val);
            deferred.resolve(contacts);
        } else {
            // Update.
            contacts[index] = val;
            deferred.resolve(contacts);
        }
        return deferred.promise;
    };

    UserData.getContact = function(id) {
        //var deferred = $q.defer();
        var result;
        var user_pos = General.findWithAttr(contacts, '_id', id);
        if (user_pos >= 0) {
            //deferred.resolve(contacts[user_pos]);
            result = contacts[user_pos];
        } else {
            //deferred.resolve();
            result = 'Unknown';
        }
        return result;
        //return deferred.promise;
    };

    // load this users contacts
    // LDB
    UserData.loadUserContacts = function() {
        var deferred = $q.defer();
        // reset the contacts model
        var contacts = [];
        var delete_contacts = { contacts: [] };
        var promises = [];

        finish = function(contacts) {
            UserData.setContacts(contacts).then(function(result) {
                console.log(result);
                deferred.resolve(result);
                //UserData.setContactsAndUser()
                //   .then(function(res) {
                //      deferred.resolve(result);
                //   });
            });
        };

        var user_contacts = UserData.getUser().contacts;
        console.log(UserData.getUser());
        // Add current user to contact list
        user_contacts.push(UserData.getUser()._id);
        console.log(user_contacts);
        promises.push(user_contacts.map(function(key, array) {
            // Search for each user in the contacts list by id
            // LDB
            promises.push(Users.search_id(key)
                .then(function(res) {
                    console.log(res);
                    //if (res.data.error === 'null') {
                    // remove this contact as the user cannot be found
                    //return delete_contacts.contacts.push(key);
                    //}
                    if (res.data.success) {
                        // Add to the conversationsUsers list as it wil probably also be a conversation user.
                        //UserData.addConversationsUser(res.data.success);
                        // Check if individual conversation already created with this contact
                        // Get all coversations containing current user.
                        //return UserData.getConversations().then(function(result) {
                        //    var s = UserData.parseUserContact(result, res.data.success);
                        //   return contacts.push(s);
                        //});
                        return contacts.push(res.data.success);
                    }
                })
                .catch(function(error) {
                    console.log('error: ' + error);
                }));
        }));

        // All the users contacts have been mapped.
        $q.all(promises).then(function() {
            // If there are any users in the delete_contacts array then delete them.
            if (delete_contacts.contacts.length > 0) {
                return Users.delete_contacts(delete_contacts)
                    .then(function(data) {
                        finish(contacts);
                    })
                    .catch(function(error) {
                        console.log(error);
                    });
            } else {
                return finish(contacts);
            }
        }).catch(function(err) {
            // do something when any of the promises in array are rejected
        });
        //return deferred.promise;
        return deferred.promise;
    };

    UserData.getConversations = function() {
        var deferred = $q.defer();
        deferred.resolve(conversations);
        return deferred.promise;
    };

    UserData.getConversationById = function(id) {
        var deferred = $q.defer();
        var conv_pos = General.findWithAttr(conversations, '_id', id);
        deferred.resolve(conversations[conv_pos]);
        return deferred.promise;
    };

    UserData.addConversationViewed = function(id, viewed_users) {
        console.log('addConversationViewed');
        var deferred = $q.defer();
        var conv_pos = General.findWithAttr(conversations, '_id', id);
        console.log(conversations[conv_pos].participants);
        conversations[conv_pos].participants = viewed_users;
        console.log(conversations[conv_pos].participants);
        deferred.resolve(conversations[conv_pos]);
        return deferred.promise;
    };

    UserData.loadConversations = function() {
        return Conversations.find().then(function(result) {
            conversations = result.data;
            console.log(conversations);
        });
    };


    UserData.loadConversationsUsers = function() {
        var deferred = $q.defer();
        var promises = [];
        var temp_users = [];
        var result = UserData.getConversations()
            .then(function(res) {
                // Map all conversations.
                promises.push(res.map(function(key, array) {
                    // Map all participants of each conversation. 
                    key.participants.map(function(key2, array) {
                        // Check that this user does not already exist in temp_users or conversationsUsers
                        if (General.findWithAttr(temp_users, '_id', key2._id) < 0 && General.findWithAttr(conversationsUsers, '_id', key2._id) < 0) {
                            // Push this user to temp_users before looking up the user so that this user is not looked up again within this loop.
                            temp_users.push({ _id: key2._id });
                            // Look up user.
                            promises.push(Users.search_id(key2._id)
                                .then(function(res) {
                                    if (res.data.error === 'null') {
                                        // user cannot be found. Add as null user.
                                        //UserData.addConversationsUser({ _id: key2._id, user_name: res.data.error });
                                    }
                                    if (res.data.success) {
                                        // Add user
                                        //UserData.addConversationsUser(res.data.success);
                                        UserData.addContact(res.data.success);
                                    }
                                })
                                .catch(function(error) {
                                    console.log('error: ' + error);
                                }));
                        }
                    });

                }));
                // All the participants of all conversations have been mapped.
                $q.all(promises).then(function() {
                    // reset the temp_users array.
                    temp_users = [];
                    deferred.resolve(res);
                }).catch(function(err) {
                    // do something when any of the promises in array are rejected
                });
            });
        return deferred.promise;
    };

    //
    // Conversations - Latest cards
    //
    /*
    UserData.conversationsLatestCardRemove = function(id) {
        console.log('conversationsLatestCardRemove');
        console.log(id);
        var deferred = $q.defer();
        var index = General.findWithAttr(conversationsLatestCard, '_id', id);
        if (index >= 0) {
            // Delete
            console.log(conversationsLatestCard);
            conversationsLatestCard.splice(index, 1);
            console.log(conversationsLatestCard);
            deferred.resolve(conversationsLatestCard);
        } 
        return deferred.promise;
    };
    */

    UserData.conversationsLatestCardAdd = function(id, data) {
        console.log('conversationsLatestCardAdd');
        console.log(id);
        console.log(data);
        var deferred = $q.defer();
        var index = General.findWithAttr(conversationsLatestCard, '_id', id);
        // Add if conversationsLatestCard for with this id doesnt exist. otherwise update
        if (index >= 0) {
            // Update.
            conversationsLatestCard[index].data = data;
            deferred.resolve(conversationsLatestCard);
        } else {
            // Add.
            //data.avatar = 'default';
            var card = { _id: id, data: data };
            console.log(card);
            conversationsLatestCard.push(card);
            deferred.resolve(conversationsLatestCard);
        }
        return deferred.promise;
    };
    /*
        UserData.getLatestCards = function() {
            var deferred = $q.defer();
            deferred.resolve(conversationsLatestCard);
            return deferred.promise;
        };
        */

    UserData.conversationsAdd = function(conv) {
        console.log(conv);
        var deferred = $q.defer();
        // Only add if the conversation does not already exist otherwise update.
        var index = General.findWithAttr(conversations, '_id', conv._id);
        //console.log(conversations[index]);



        if (index < 0) {
            // Add
            conversations.push(conv);
            deferred.resolve(conversations);
        } else {
            // Update
            conversations[index] = conv;

            LocalDB.updateConversation(conv);

            deferred.resolve(conversations);
        }
        return deferred.promise;
    };



    UserData.getConversationLatestCardById = function(id) {
        var deferred = $q.defer();
        var index = General.findWithAttr(conversationsLatestCard, '_id', id);
        deferred.resolve(conversationsLatestCard[index]);
        return deferred.promise;
    };

    UserData.getConversationsLatestCard = function() {
        var deferred = $q.defer();
        var promises = [];
        var result = UserData.getConversations()
            .then(function(res) {
                res.map(function(key, array) {
                    // Get the latest card posted to this conversation
                    promises.push(Conversations.getConversationLatestCard(key._id)
                        .then(function(res) {
                            return UserData.conversationsLatestCardAdd(key._id, res.data)
                                .then(function(res) {
                                    //console.log(res);
                                });
                        }));
                });
                // All the conversations have been mapped.
                $q.all(promises).then(function() {
                    deferred.resolve(res);
                }).catch(function(err) {
                    // do something when any of the promises in array are rejected
                });
            });
        return deferred.promise;
    };

    UserData.updateConversationViewed = function(id) {
        // Update the DB
        var user_id = UserData.getUser()._id;
        Conversations.clearViewed(id, user_id)
            .then(function(res) {
                console.log(res);
                console.log(id);
                console.log(conversations);
                var conv_pos = General.findWithAttr(conversations, '_id', id);
                console.log(user_id);
                console.log(conversations[conv_pos]);
                console.log(conversations[conv_pos].participants);
                //var participant_pos = General.nestedArrayIndexOfValue(conversations[conv_pos].participants, '_id', user_id);

                var participant_pos = General.arrayObjectIndexOf(conversations[conv_pos].participants, user_id, '_id');
                console.log(participant_pos);
                conversations[conv_pos].participants[participant_pos].unviewed = [];
                //conversations[conv_pos].participants = viewed_users;
                //console.log(conversations[conv_pos].participants);


                // Update the local model.
                /*
                UserData.getConversationModelById(id).then(function(result) {
                    var index = General.findWithAttr(result.participants, '_id', user_id);
                    result.participants[index].unviewed = [];
                    result.new_messages = 0;
                    // Update the LM.
                    UserData.addConversationModel(result).then(function(res) {
                        //console.log(res);
                    });
                });
                */
            });
    };

    //
    // LOAD ALL USER DATA
    //

    UserData.loadUserData = function() {
        var self = this;
        isLoading = true;
        var deferred = $q.defer();
        //console.log('GET 1 LU');
        UserData.loadUser().then(function(user) {
            if (user != null) {
                return UserData.setUser(user);
            } else {
                // No user.
                // Set loaded to true.
                $rootScope.loaded = true;
                $rootScope.dataLoading = false;
                isLoading = false;
                $location.path("/api/logout");
                deferred.resolve();
            }
        }).then(function() {
            //console.log('GET 9 BC');
            //return UserData.checkFCMToken();
            return UserData.getFCMToken();
        }).then(function() {
            //console.log('GET 9 BC');
            //return UserData.checkFCMToken();
            return UserData.loadUserContacts();
            // return UserData.loadConversations();
        }).then(function() {
            //console.log('GET 9 BC');
            return UserData.loadConversations();
            //return UserData.loadConversationsUsers();
        }).then(function() {
            //console.log('GET 9 BC');
            //return UserData.loadConversations();
            return UserData.loadConversationsUsers();
        }).then(function() {
            //console.log('GET 9 BC');
            //return UserData.loadConversations();
            return UserData.getConversationsLatestCard();
        }).then(function() {
            // connect to socket.io via socket service 
            // and request that a unique namespace be created for this user with their user id
            socket.setId(UserData.getUser()._id);
            socket.create();
            // Set loaded to true.
            $rootScope.loaded = true;
            $rootScope.dataLoading = false;
            isLoading = false;
            //console.log('FIN loadUserData');
            deferred.resolve();
        });
        return deferred.promise;
    };

    // Check whether the loadUserData is loading or has been loaded already.
    UserData.checkUser = function() {
        var deferred = $q.defer();
        if (isLoading) {
            //console.log('already loading...wait');
            $rootScope.$watch('loaded', function(n) {
                if (n) {
                    // loaded!
                    deferred.resolve(user);
                }
            });
        } else {
            //console.log('not loading...get');
            // Check whether the user data has already been retrieved.
            if (UserData.getUser() != undefined) {
                //console.log('CALL VAR /api/user_data');
                deferred.resolve(user);
            } else {
                //console.log('CALL HTTP /api/user_data');
                deferred.resolve(loadUserData());
            }
        }
        return deferred.promise;
    };

    // Check that the user has a valid token.
    // Then load the users data if they have a vald token.
    if (principal.isValid()) {
        this.isAuthenticated = true;
        UserData.loadUserData().then(function(result) {
            //console.log('USER DATA LOADED');
        });
    } else {
        this.isAuthenticated = false;
    }
    return UserData;

    // Check for updates
    /*
    UserData.checkDataUpdate = function() {
        console.log('checkDataUpdate');
        if (!update_inprogress) {
            update_inprogress = true;
            var toUpdate = [];
            // Find the conversations for current user
            var user_id = UserData.getUser()._id;
            var check_objects = ['admin', 'conversation_avatar', 'conversation_name', 'participants'];
            var convs_same = true;
            var conv_same = true;

            Conversations.find_user_conversations(user_id)
                .then(function(res) {
                    res.data.map(function(key) {
                        UserData.getConversationModelById(key._id)
                            .then(function(res) {
                                // Compare the LM with the DB conversations model.
                                for (var i in check_objects) {
                                    if (!General.isEqual(key[check_objects[i]], res[check_objects[i]])) {
                                        convs_same = false;
                                    }
                                }
                                if (!convs_same) {
                                    update_inprogress = false;
                                    var msg = { conversation_id: key._id };
                                    notification(msg);
                                } else if (convs_same) {
                                    // Compare the LM with the DB conversation cards model.
                                    Conversations.getConversationById(key._id)
                                        .then(function(result) {
                                            if (result.data.length > 0) {
                                                UserData.getCardsModelById(key._id)
                                                    .then(function(res) {
                                                        if (res.data != undefined) {
                                                            for (var i in result.data) {
                                                                if (!General.isEqual(result.data[i].content, res.data[i].content)) {
                                                                    conv_same = false;
                                                                }
                                                            }
                                                            if (!conv_same) {
                                                                update_inprogress = false;
                                                                var msg = { conversation_id: res._id };
                                                                notification(msg);
                                                            }
                                                        }
                                                    });
                                            }
                                            update_inprogress = false;
                                        });
                                }
                            });
                    });
                });
        }
    };

    //
    // MAIN NOTIFICATION CENTER
    //

    notification = function(msg) {
        console.log(msg);
    };

    $rootScope.$on('NOTIFICATION', function(event, msg) {
        notification(msg);
    });

    */



    //
    // User - Contacts
    //
    /*
    // Create Contact in DB.
    UserData.createContact = function(val) {
        var deferred = $q.defer();
        // Only add to DB if it does not already exist.
        if (General.findWithAttr(contacts, '_id', val._id) < 0) {
            // Create contact in DB.
            Users.add_contact(val._id)
                .then(function(res) {
                    deferred.resolve(contacts);
                });

        } else {
            deferred.resolve(contacts);
        }
        return deferred.promise;
    };

    UserData.addContact = function(val) {
        var deferred = $q.defer();
        var index = General.findWithAttr(contacts, '_id', val._id);
        // Only add locally if it does not already exist.
        if (index < 0) {
            // Add.
            contacts.push(val);
            deferred.resolve(contacts);
        } else {
            // Update.
            contacts[index] = val;
            deferred.resolve(contacts);
        }
        return deferred.promise;
    };

    UserData.updateContact = function(val) {
        var deferred = $q.defer();
        var index = General.findWithAttr(contacts, '_id', val._id);
        // if contact found
        if (index >= 0) {
            // Update.
            contacts[index] = val;
            deferred.resolve(contacts[index]);
        } else {
            deferred.resolve('user not found');
        }
        return deferred.promise;
    };

    UserData.setContacts = function(value) {
        var deferred = $q.defer();
        contacts = value;
        deferred.resolve(contacts);
        return deferred.promise;
    };

    UserData.getContacts = function() {
        return contacts;
    };

    UserData.setContactsAndUser = function() {
        var deferred = $q.defer();
        contacts_and_user = contacts;
        contacts_and_user.push(UserData.getUser());
        deferred.resolve(contacts_and_user);
        return deferred.promise;
    };

    UserData.getContactsAndUser = function() {
        return contacts_and_user;
    };

    UserData.addUserContact = function(id) {
        var deferred = $q.defer();
        user.contacts.push(id);
        deferred.resolve(user.contacts);
        return deferred.promise;
    };

    UserData.parseUserContact = function(result, user) {
        result.map(function(key, array) {
            // check that this is a two person chat.
            // Groups of three or more are loaded in conversations.html
            if (key.conversation_name == '') {
                // Check that current user is a participant of this conversation
                if (General.findWithAttr(key.participants, '_id', user._id) >= 0) {
                    // set conversation_exists and conversation_id for the contacts
                    user.conversation_exists = true;
                    user.conversation_id = key._id;
                }
            }
        });
        return user;
    };

    UserData.parseImportedContacts = function() {
        var deferred = $q.defer();
        if (UserData.getUser().imported_contacts.length > 0) {
            // check if imported contact is already a contact
            UserData.getUser().imported_contacts[0].contacts.map(function(key, array) {
                var index = General.arrayObjectIndexOfValue(UserData.getContacts(), key.email, 'google', 'email');
                if (index >= 0) {
                    key.is_contact = true;
                }
            });
            // Check whether the current user is in the user_contacts.
            var index = General.findWithAttr(UserData.getUser().imported_contacts[0].contacts, 'email', UserData.getUser().google.email);
            if (index >= 0) {
                UserData.getUser().imported_contacts[0].contacts[index].is_contact = true;
            }
            deferred.resolve();
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    };

    // load this users contacts
    UserData.loadUserContacts = function() {
        var deferred = $q.defer();
        // reset the contacts model
        var contacts = [];
        var delete_contacts = { contacts: [] };
        var promises = [];

        finish = function(contacts) {
            UserData.setContacts(contacts).then(function(result) {
                UserData.setContactsAndUser()
                    .then(function(res) {
                        deferred.resolve(result);
                    });
            });
        };

        var user_contacts = UserData.getUser().contacts;
        promises.push(user_contacts.map(function(key, array) {
            // Search for each user in the contacts list by id
            promises.push(Users.search_id(key)
                .then(function(res) {
                    if (res.data.error === 'null') {
                        // remove this contact as the user cannot be found
                        return delete_contacts.contacts.push(key);
                    }
                    if (res.data.success) {
                        // Add to the conversationsUsers list as it wil probably also be a conversation user.
                        UserData.addConversationsUser(res.data.success);
                        // Check if individual conversation already created with this contact
                        // Get all coversations containing current user.
                        return UserData.getConversations().then(function(result) {
                            var s = UserData.parseUserContact(result, res.data.success);
                            return contacts.push(s);
                        });
                    }
                })
                .catch(function(error) {
                    console.log('error: ' + error);
                }));
        }));

        // All the users contacts have been mapped.
        $q.all(promises).then(function() {
            // If there are any users in the delete_contacts array then delete them.
            if (delete_contacts.contacts.length > 0) {
                return Users.delete_contacts(delete_contacts)
                    .then(function(data) {
                        finish(contacts);
                    })
                    .catch(function(error) {
                        console.log(error);
                    });
            } else {
                return finish(contacts);
            }
        }).catch(function(err) {
            // do something when any of the promises in array are rejected
        });
        //return deferred.promise;
        return deferred.promise;
    };

    //
    // Profile
    //

    UserData.updateProfile = function(profile) {
        var deferred = $q.defer();
        user.user_name = profile.user_name;
        user.avatar = profile.avatar;
        // public conversation.
        UserData.findPublicConversation(UserData.getUser()._id)
            .then(function(res) {
                res.avatar = profile.avatar;
                res.conversation_avatar = profile.avatar;
                res.conversation_name = profile.user_name;
                UserData.updateConversationById(res._id, res);
                deferred.resolve(user);
            });
        return deferred.promise;
    };

    //
    // Conversations
    //

    UserData.getConversations = function() {
        var deferred = $q.defer();
        deferred.resolve(conversations);
        return deferred.promise;
    };

    UserData.getConversationModelById = function(id) {
        var deferred = $q.defer();
        var index = General.findWithAttr(conversations_model, '_id', id);
        // If the conversation exist then return it, otherwise return false.
        if (index >= 0) {
            deferred.resolve(conversations_model[index]);
        } else {
            deferred.resolve(false);
        }
        return deferred.promise;
    };

    // TODO - needed?
    UserData.getConversationModel = function() {
        return conversations_model;
    };

    UserData.addConversationModel = function(conv) {
        var deferred = $q.defer();
        // Only add if the conversation does not already exist otherwise update.
        var index = General.findWithAttr(conversations_model, '_id', conv._id);
        if (index < 0) {
            // Add
            conversations_model.push(conv);
            deferred.resolve(conversations_model);
        } else {
            // Update
            conversations_model[index] = conv;
            deferred.resolve(conversations_model);
        }
        return deferred.promise;
    };

    UserData.findPublicConversation = function() {
        var deferred = $q.defer();
        var index = General.findWithAttr(conversations_model, 'conversation_type', 'public');
        deferred.resolve(conversations_model[index]);
        return deferred.promise;
    };

    UserData.updateConversationById = function(id, conv) {
        var deferred = $q.defer();
        var index = General.findWithAttr(conversations, '_id', id);
        // Only update the conversation if it exists, otherwise return false.
        if (index >= 0) {
            conversations[index] = conv;
            deferred.resolve(conversations[index]);
        } else {
            deferred.resolve(false);
        }
        return deferred.promise;
    };

    // NEEDED 09/01/19
    UserData.updateConversationViewed = function(id) {
        // Update the DB
        var user_id = UserData.getUser()._id;
        Conversations.clearViewed(id, user_id)
            .then(function(res) {
                // Update the local model.
                UserData.getConversationModelById(id).then(function(result) {
                    var index = General.findWithAttr(result.participants, '_id', user_id);
                    result.participants[index].unviewed = [];
                    result.new_messages = 0;
                    // Update the LM.
                    UserData.addConversationModel(result).then(function(res) {
                        //console.log(res);
                    });
                });
            });
    };

    UserData.loadConversations = function() {
        return Conversations.find().then(function(result) {
            conversations = result.data;
        });
    };

    UserData.removeConversations = function(conversations_delete) {
        var deferred = $q.defer();
        var i = conversations.length;
        while (i--) {
            var index = General.findWithAttr(conversations_delete, '_id', conversations[i]._id);
            // If the the conversation exists in the LM then remove it from the LM (User does not exist).
            if (index >= 0) {
                conversations.splice(i, 1);
            }
        }
        deferred.resolve(conversations);
        return deferred.promise;
    };

    UserData.cleanConversations = function() {
        var deferred = $q.defer();
        var promises = [];
        var conversations_delete = [];
        var result = UserData.getConversations()
            .then(function(res) {
                res.map(function(key, array) {
                    if (key.participants.length == 2) {
                        var index = General.findWithAttr(key.participants, '_id', principal.user._id);
                        // Get the other user.
                        index = 1 - index;
                        // Search for the other user.
                        // TODO - check users list first?
                        promises.push(Users.search_id(key.participants[index]._id)
                            .then(function(res) {
                                if (res.data.error === 'null') {
                                    // remove this conversation as the user cannot be found.
                                    conversations_delete.push({ _id: key._id });
                                }
                                if (res.data.success) {
                                    //
                                }
                            }));
                    }
                });

                // All the conversations have been mapped.
                $q.all(promises).then(function() {
                    UserData.removeConversations(conversations_delete)
                        .then(function() {
                            deferred.resolve(conversations);
                        });
                }).catch(function(err) {
                    // do something when any of the promises in array are rejected
                });
            });
        return deferred.promise;
    };

    //
    // Conversations - Users (participants)
    //

    UserData.listConversationsUsers = function() {
        return conversationsUsers;
    };

    UserData.addConversationsUser = function(user) {
        var deferred = $q.defer();
        // If the user does not already exist then add them.
        if (General.findWithAttr(conversationsUsers, '_id', user._id) < 0) {
            conversationsUsers.push(user);
            deferred.resolve(true);
        } else {
            deferred.resolve(false);
        }
        return deferred.promise;
    };

    UserData.updateConversationsUser = function(user) {
        var deferred = $q.defer();
        var index = General.findWithAttr(conversationsUsers, '_id', user._id);
        // if contact found
        if (index >= 0) {
            // Update.
            conversationsUsers[index] = user;
            deferred.resolve(conversationsUsers[index]);
        } else {
            deferred.resolve('conv user not found');
        }
        return deferred.promise;
    };

    UserData.addConversationsUsers = function(user_array) {
        var deferred = $q.defer();
        var promises = [];
        // loop through the user_array array.
        // check if user already exists in conversationsUsers
        // if not look up user and add to conversationsUsers
        promises.push(user_array.map(function(key, array) {
            if (General.findWithAttr(conversationsUsers, '_id', key._id) < 0) {
                promises.push(Users.search_id(key._id)
                    .then(function(res) {
                        if (res.data.error === 'null') {
                            // The user cannot be found. Add them as null.
                            UserData.addConversationsUser({ _id: key._id, user_name: res.data.error });
                        }
                        if (res.data.success) {
                            // User found. add them to conversationsUsers.
                            UserData.addConversationsUser(res.data.success);
                        }
                    })
                    .catch(function(error) {
                        console.log('error: ' + error);
                    }));
            }
        }));

        // All the users have been mapped.
        $q.all(promises).then(function() {
            deferred.resolve();
        }).catch(function(err) {
            // do something when any of the promises in array are rejected
        });
        return deferred.promise;
    };

    UserData.getConversationsUsers = function() {
        var deferred = $q.defer();
        deferred.resolve(conversationsUsers);
        return deferred.promise;
    };

    UserData.getConversationsUser = function(id) {
        var deferred = $q.defer();
        var index = General.findWithAttr(conversationsUsers, '_id', id);
        // If no user found then use UserData.addConversationsUsers to look up the user and add them.
        if (index < 0) {
            var users = [{ _id: id }];
            UserData.addConversationsUsers(users).then(function(result) {
                var index = General.findWithAttr(conversationsUsers, '_id', id);
                deferred.resolve(conversationsUsers[index]);
            });
        } else {
            deferred.resolve(conversationsUsers[index]);
        }
        return deferred.promise;
    };

    UserData.loadConversationsUsers = function() {
        var deferred = $q.defer();
        var promises = [];
        var temp_users = [];
        var result = UserData.getConversations()
            .then(function(res) {
                // Map all conversations.
                promises.push(res.map(function(key, array) {
                    // Map all participants of each conversation. 
                    key.participants.map(function(key2, array) {
                        // Check that this user does not already exist in temp_users or conversationsUsers
                        if (General.findWithAttr(temp_users, '_id', key2._id) < 0 && General.findWithAttr(conversationsUsers, '_id', key2._id) < 0) {
                            // Push this user to temp_users before looking up the user so that this user is not looked up again within this loop.
                            temp_users.push({ _id: key2._id });
                            // Look up user.
                            promises.push(Users.search_id(key2._id)
                                .then(function(res) {
                                    if (res.data.error === 'null') {
                                        // user cannot be found. Add as null user.
                                        UserData.addConversationsUser({ _id: key2._id, user_name: res.data.error });
                                    }
                                    if (res.data.success) {
                                        // Add user
                                        UserData.addConversationsUser(res.data.success);
                                    }
                                })
                                .catch(function(error) {
                                    console.log('error: ' + error);
                                }));
                        }
                    });

                }));
                // All the participants of all conversations have been mapped.
                $q.all(promises).then(function() {
                    // reset the temp_users array.
                    temp_users = [];
                    deferred.resolve(res);
                }).catch(function(err) {
                    // do something when any of the promises in array are rejected
                });
            });
        return deferred.promise;
    };

    //
    // Conversation
    //

    UserData.getCardsModelById = function(id) {
        var deferred = $q.defer();
        var index = General.findWithAttr(cards_model, '_id', id);
        deferred.resolve(cards_model[index]);
        return deferred.promise;
    };

    UserData.addCardsModelById = function(id) {
        var deferred = $q.defer();
        var index = General.findWithAttr(cards_model, '_id', id);
        if (index < 0) {
            // Create
            var temp = { _id: id, data: [] };
            cards_model.push(temp);
            deferred.resolve(cards_model);
        } else {
            // Already Created.
            deferred.resolve(cards_model[index]);
        }
        return deferred.promise;
    };

    UserData.deleteCardsModel = function(id, data) {
        var deferred = $q.defer();
        var index = General.findWithAttr(cards_model, '_id', id);
        var card_index = General.findWithAttr(cards_model[index].data, '_id', data._id);
        cards_model[index].data.splice(card_index, 1);
        deferred.resolve(cards_model);
        return deferred.promise;
    };

    UserData.addCardsModel = function(id, data) {
        var deferred = $q.defer();
        var index = General.findWithAttr(cards_model, '_id', id);
        if (index < 0) {
            // Create
            var temp = { _id: id, data: [data] };
            cards_model.push(temp);
            deferred.resolve(cards_model);
        } else {
            // Add / Update
            var card_index = General.findWithAttr(cards_model[index].data, '_id', data._id);
            if (card_index < 0) {
                // Add
                cards_model[index].data.push(data);
                deferred.resolve(cards_model[index]);
            } else {
                // Update
                cards_model[index].data[card_index] = data;
                deferred.resolve(cards_model[index]);
            }
        }
        return deferred.promise;
    };


    UserData.getConversation = function() {
        var deferred = $q.defer();
        var promises = [];
        cards_model = [];
        var convs = UserData.getConversationsBuild();
        // Map all conversations.
        promises.push(convs.map(function(key, array) {
            promises.push(Conversations.getConversationById(key._id)
                .then(function(result) {
                    var temp = { _id: key._id, data: [] };
                    promises.push(result.data.map(function(key, array) {
                        // Store the original characters of the card.
                        key.original_content = key.content;
                        // Get the user name for the user id
                        // TODO dont repeat if user id already retreived
                        promises.push(UserData.getConversationsUser(key.user)
                            .then(function(res) {
                                // Set the user_name to the retrieved name
                                key.user_name = res.user_name;
                                key.avatar = res.avatar;
                                return;
                            })
                            .catch(function(error) {
                                console.log('error: ' + error);
                            }));
                        temp.data.push(key);
                    }));
                    cards_model.push(temp);
                }));
        }));
        // all conversations have been mapped.
        $q.all(promises).then(function() {
            deferred.resolve();
        }).catch(function(err) {
            // do something when any of the promises in array are rejected
        });
        return deferred.promise;
    };

    //
    // Conversations - Latest cards
    //

    UserData.conversationsLatestCardAdd = function(id, data) {
        var deferred = $q.defer();
        var index = General.findWithAttr(conversationsLatestCard, '_id', id);
        // Add if conversationsLatestCard for with this id doesnt exist. otherwise update
        if (index >= 0) {
            // Update.
            conversationsLatestCard[index].data = data;
            deferred.resolve(conversationsLatestCard);
        } else {
            // Add.
            //data.avatar = 'default';
            var card = { _id: id, data: data };
            conversationsLatestCard.push(card);
            deferred.resolve(conversationsLatestCard);
        }
        return deferred.promise;
    };

    UserData.getLatestCards = function() {
        var deferred = $q.defer();
        deferred.resolve(conversationsLatestCard);
        return deferred.promise;
    };

    UserData.getConversationLatestCardById = function(id) {
        var deferred = $q.defer();
        var index = General.findWithAttr(conversationsLatestCard, '_id', id);
        deferred.resolve(conversationsLatestCard[index]);
        return deferred.promise;
    };

    // Get the latest card posted to each conversation
    // TODO - replace with function to get latest card from loaded conversation?
    UserData.getConversationsLatestCard = function() {
        var deferred = $q.defer();
        var promises = [];
        var result = UserData.getConversations()
            .then(function(res) {
                res.map(function(key, array) {
                    // Get the latest card posted to this conversation
                    promises.push(Conversations.getConversationLatestCard(key._id)
                        .then(function(res) {
                            return UserData.conversationsLatestCardAdd(key._id, res.data)
                                .then(function(res) {
                                    //console.log(res);
                                });
                        }));
                });
                // All the conversations have been mapped.
                $q.all(promises).then(function() {
                    deferred.resolve(res);
                }).catch(function(err) {
                    // do something when any of the promises in array are rejected
                });
            });
        return deferred.promise;
    };

    UserData.formatLatestCard = function(data, key) {
        var deferred = $q.defer();
        var promises = [];
        if (data != null) {
            var card_content;
            var sent_content;
            var sender_name;
            var notification_body;
            var participant_pos;
            // Update the updatedAt
            key.updatedAt = data.updatedAt;
            // Get the name of the user which sent the card.
            UserData.getConversationsUser(data.user)
                .then(function(result) {
                    // get the index position of the current user within the participants array
                    var user_pos = General.findWithAttr(key.participants, '_id', UserData.getUser()._id);
                    if (user_pos >= 0) {
                        // get the currently stored unviewed cards for the current user
                        var user_unviewed = key.participants[user_pos].unviewed;
                        // Set the new_messages number.
                        key.new_messages = user_unviewed.length;
                    }
                    // Set the card content.
                    card_content = data.content;
                    // set the name of the user who sent the card
                    if (result != 'null') {
                        sender_name = result.user_name;
                    } else {
                        sender_name = 'null';
                    }
                    // Public conversation
                    if (key.conversation_type == 'public') {
                        // Get the conversation name and add to model.
                        key.name = key.conversation_name;
                        key.avatar = key.conversation_avatar;
                        notification_body = card_content;
                    }
                    // Group conversation. (Two or more)
                    if (key.conversation_name != '') {
                        // Get the conversation name and add to model.
                        key.name = key.conversation_name;
                        key.avatar = key.conversation_avatar;
                        notification_body = sender_name + ': ' + card_content;
                    }
                    // Two user conversation (not a group)
                    if (key.conversation_name == '') {
                        // Get the position of the current user
                        if (user_pos === 0) {
                            participant_pos = 1;
                        } else {
                            participant_pos = 0;
                        }
                        // Find the other user
                        UserData.getConversationsUser(key.participants[participant_pos]._id)
                            .then(function(result) {
                                var avatar = "default";
                                // set the other user name as the name of the conversation.
                                if (result) {
                                    key.name = result.user_name;
                                    avatar = result.avatar;
                                }
                                key.avatar = avatar;
                            });
                        notification_body = card_content;
                    }
                    sent_content = FormatHTML.prepSentContent(notification_body, sent_content_length);
                    key.latest_card = sent_content;
                    deferred.resolve(key);
                });
        } else {
            // Empty conversation. Only empty public converations are listed.
            // Public conversation
            if (key.conversation_type == 'public' || key.conversation_name != '') {
                // Get the conversation name and add to model.
                key.name = key.conversation_name;
                // Get the conversation avatar and add to model.
                key.avatar = key.conversation_avatar;
            }
            deferred.resolve(key);
        }
        return deferred.promise;
    };

    UserData.getConversationsBuild = function() {
        var conversations_model_display = [];
        // Check for empty conversations before returning.
        conversations_model.map(function(key, index) {
            if ((key.latest_card == " " && key.conversation_type != "public" && key.conversation_name == "") || (key.latest_card == undefined && key.participants.length == 2)) {
                // empty
            } else {
                conversations_model_display.push(conversations_model[index]);
            }
        });
        return conversations_model_display;
    };

    UserData.buildConversations = function() {
        //console.log('build');
        conversations_model = [];
        var deferred = $q.defer();
        var promises = [];
        // Find the conversations for current user
        UserData.getConversations()
            .then(function(res) {
                var conversations_raw = res;
                conversations_raw.map(function(key, array) {
                    // Get the latest card posted to this conversation
                    promises.push(UserData.getConversationLatestCardById(key._id)
                        .then(function(res) {
                            if (res.data != null) {
                                return UserData.formatLatestCard(res.data, key)
                                    .then(function(result) {
                                        // Add this conversation to the conversations model
                                        return conversations_model.push(result);
                                    });
                            } else {
                                // Only empty publc conversations are displayed.
                                key.latest_card = ' ';
                                if (key.conversation_type === 'public' || key.conversation_name != "") {
                                    return UserData.formatLatestCard(res.data, key)
                                        .then(function(result) {
                                            // Add this conversation to the conversations model
                                            return conversations_model.push(result);
                                        });
                                }
                            }
                        }));
                });
                // All the users conversations have been mapped.
                $q.all(promises).then(function() {
                    deferred.resolve(conversations_model);
                }).catch(function(err) {
                    // do something when any of the promises in array are rejected
                });
            });
        return deferred.promise;
    };
    */

    /*
    UserData.loadUserData = function() {
        var self = this;
        isLoading = true;
        var deferred = $q.defer();
        //console.log('GET 1 LU');
        UserData.loadUser().then(function(user) {
            if (user != null) {
                return UserData.setUser(user);
            } else {
                // No user.
                // Set loaded to true.
                $rootScope.loaded = true;
                $rootScope.dataLoading = false;
                isLoading = false;
                $location.path("/api/logout");
                deferred.resolve();
            }
        }).then(function() {
            //console.log('GET 3 LC');
            return UserData.loadConversations();
        }).then(function() {
            //console.log('GET 4 LUC');
            return UserData.loadUserContacts();
        }).then(function() {
            //console.log('GET 4a PIC');
            return UserData.parseImportedContacts();
        }).then(function() {
            //console.log('GET 5 CC');
            return UserData.cleanConversations();
        }).then(function() {
            //console.log('GET LCU 6');
            return UserData.loadConversationsUsers();
        }).then(function() {
            //console.log('GET 7 GCLC');
            return UserData.getConversationsLatestCard();
        }).then(function() {
            //console.log('GET 8 BC');
            return UserData.buildConversations();
        }).then(function() {
            //console.log('GET 8 BC');
            return UserData.getConversation();
        }).then(function() {
            //console.log('GET 9 BC');
            //return UserData.checkFCMToken();
            return UserData.getFCMToken();
        }).then(function() {
            // connect to socket.io via socket service 
            // and request that a unique namespace be created for this user with their user id
            socket.setId(UserData.getUser()._id);
            socket.create();
            // Set loaded to true.
            $rootScope.loaded = true;
            $rootScope.dataLoading = false;
            isLoading = false;
            //console.log('FIN loadUserData');
            deferred.resolve();
        });
        return deferred.promise;
    };
    */


});


cardApp.factory('Profile', function($rootScope, $window) {
    var user;
    var conversation;

    return {
        // User profile.
        getProfile: function() {
            return user;
        },
        setProfile: function(value) {
            user = value;
        },
        // Conversation profile.
        getConvProfile: function() {
            return conversation;
        },
        setConvProfile: function(value) {
            conversation = value;
        },
    };
});

cardApp.factory('viewAnimationsService', function($rootScope) {

    var enterAnimation;

    var getEnterAnimation = function() {
        return enterAnimation;
    };

    var setEnterAnimation = function(animation) {
        enterAnimation = animation;
    };

    var setLeaveAnimation = function(animation) {
        $rootScope.$emit('event:newLeaveAnimation', animation);
    };

    return {
        getEnterAnimation: getEnterAnimation,
        setEnterAnimation: setEnterAnimation,
        setLeaveAnimation: setLeaveAnimation
    };
});