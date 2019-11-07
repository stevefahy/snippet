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
        follow_conversation: function(id) {
            var deferred = $q.defer();
            $http.post('api/users/follow_conversation/' + id)
                .then(function(response) {
                    LocalDB.updateUser(response.data);
                    deferred.resolve(response.data);
                });
            return deferred.promise;
        },
        unfollow_conversation: function(id) {
            var deferred = $q.defer();
            $http.post('api/users/unfollow_conversation/' + id)
                .then(function(response) {
                    LocalDB.updateUser(response.data);
                    deferred.resolve(response.data);
                });
            return deferred.promise;
        },
        search_id: function(id) {
            var deferred = $q.defer();
            LocalDB.getUser(id)
                .then(function(response) {
                    if (response.found) {
                        deferred.resolve(response);
                    } else {
                        /*
        getConversationLatestCard: function(id) {
            return $http.get('/chat/get_conversation_latest_card/' + id);
        },
                        */
                        $http.get('api/users/search_id/' + id)
                            //$http.post('api/users/search_id/' + id)
                            .then(function(response) {
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
                    if (response.found) {
                        deferred.resolve(response.data);
                    } else {
                        $http.post('api/users/search_public_id/' + id)
                            .then(function(response) {
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
        // Adds the user id to the current users list of contacts.
        add_contact: function(id) {
            return $http.post('api/users/add_contact/' + id);
        },
        update_user: function(user) {
            var deferred = $q.defer();
            var theurl = 'api/users/update_user/' + user.id;
            $http.put(theurl, user)
                .then(function(response) {
                    LocalDB.updateUser(response.data);
                    deferred.resolve(response);
                });
            return deferred.promise;
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

    return {
        create: function(conversation_data) {
            var deferred = $q.defer();
            $http.post('chat/conversation', conversation_data)
                .then(function(response) {
                    LocalDB.addConversation(response.data);
                    deferred.resolve(response);
                });
            return deferred.promise;
        },
        // Find all conversations for the current user.
        find: function() {
            return $http.get('chat/conversation')
                .then(function(response) {
                    for (var i in response.data) {
                        LocalDB.updateConversation(response.data[i]);
                    }
                    return response;
                });
        },
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
            var deferred = $q.defer();
            var theurl = 'chat/update_conversation/' + conversation.id;
            $http.put(theurl, conversation)
                .then(function(response) {
                    LocalDB.updateConversation(response.data);
                    deferred.resolve(response.data);
                });
            return deferred.promise;
        },
        updateViewed: function(id, card_id) {
            var deferred = $q.defer();
            //$http.put('chat/conversation_viewed/' + id + '/' + card_id)
            $http.get('chat/conversation_viewed/' + id + '/' + card_id)
                .then(function(response) {
                    LocalDB.updateConversation(response.data);
                    deferred.resolve(response.data);
                });
            return deferred.promise;
        },
        clearViewed: function(id, user_id) {
            var deferred = $q.defer();
            $http.put('chat/conversation_viewed_clear/' + id + '/' + user_id)
                .then(function(response) {
                    LocalDB.updateConversation(response.data);
                    deferred.resolve(response.data);
                });
            return deferred.promise;
        },
        removeViewed: function(conv_id, user_id, card_id) {
            var deferred = $q.defer();
            $http.put('chat/conversation_viewed_remove/' + conv_id + '/' + user_id + '/' + card_id)
                .then(function(response) {
                    LocalDB.updateConversation(response.data);
                    deferred.resolve(response.data);
                });
            return deferred.promise;
        },
        updateAvatar: function(obj) {
            var deferred = $q.defer();
            var theurl = 'chat/conversation_avatar/' + obj.id;
            $http.put(theurl, obj)
                .then(function(response) {
                    LocalDB.updateConversation(response.data);
                    deferred.resolve(response.data);
                });
            return deferred.promise;
        },
        find_conversation_id: function(id) {
            var deferred = $q.defer();
            LocalDB.getConversationById(id)
                .then(function(response) {
                    console.log(response);
                    if (response.found) {
                        deferred.resolve(response.data);
                    } else {
                        $http.get('/chat/conversation_id/' + id)
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
                                if (response.data != null) {
                                    LocalDB.addConversation(response.data);
                                }
                                deferred.resolve(response.data);
                            });
                    }
                });
            return deferred.promise;
        },
        find_user_public_conversation_id: function(username) {
            var deferred = $q.defer();
            LocalDB.getConversationByUserName(username)
                .then(function(response) {
                    if (response.found) {
                        deferred.resolve(response.data);
                    } else {
                        $http.get('chat/user_public_conversation_id/' + username)
                            .then(function(response) {
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
                                LocalDB.addConversation(response.data);
                                deferred.resolve(response.data);
                            });
                    }
                });
            return deferred.promise;
        },
        find_private_conversation_by_participants: function(participants) {
            var deferred = $q.defer();
            var theurl = '/chat/user_private_conversation_by_participants';
            $http.put(theurl, participants)
                .then(function(response) {
                    if (response.data.length > 0) {
                        LocalDB.addConversation(response.data[0]);
                    }
                    deferred.resolve(response.data[0]);
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
            type_property = value;
        },
        getConversationLatestCard: function(id) {
            return $http.get('/chat/get_conversation_latest_card/' + id);
        },
        getFeed: function(val) {
            console.log('val: ' + JSON.stringify(val));
            var theurl = '/chat/get_feed/' + val.ids;
            //return $http.post(theurl, val);
            
            val.ids = JSON.stringify(val.ids);
            var config = {
                 params: val
            };
            return $http.get(theurl, config);
            
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

    notifyConversationCreated = function(msg) {
        //console.log('notify_conversation_created, conv id: ' + msg.conversation_id + ', participants: ' + msg.participants + ', admin: ' + msg.admin);
        $rootScope.$broadcast('PRIVATE_CONVERSATION_CREATED', msg);
    };

    notifyPrivateCreated = function(msg) {
        //console.log('notify_private_created, conv id: ' + msg.conversation_id + ' card_id: ' + msg.card_id + ', participants: ' + msg.participants);
        $rootScope.$broadcast('PRIVATE_NOTIFICATION_CREATED', msg);
    };

    notifyPrivateUpdated = function(msg) {
        //console.log('notify_private_updated, conv id: ' + msg.conversation_id + ' card_id: ' + msg.card_id + ', participants: ' + msg.participants + ', viewed_users: ' + msg.viewed_users);
        $rootScope.$broadcast('PRIVATE_NOTIFICATION_UPDATED', msg);
    };

    notifyPrivateDeleted = function(msg) {
        //console.log('notify_private_deleted, conv id: ' + msg.conversation_id + ' card_id: ' + msg.card_id + ', participants: ' + msg.participants);
        $rootScope.$broadcast('PRIVATE_NOTIFICATION_DELETED', msg);
    };

    notifyPublicCreated = function(msg) {
        //console.log('notify_public_created, conv id: ' + msg.conversation_id + ' card_id: ' + msg.card_id + ', followers: ' + msg.followers);
        $rootScope.$broadcast('PUBLIC_NOTIFICATION_CREATED', msg);
    };

    notifyPublicDeleted = function(msg) {
        //console.log('notify_users_deleted, conv id: ' + msg.conversation_id + ' , card id: ' + msg.card_id + ', participants: ' + msg.followers);
        $rootScope.$broadcast('PUBLIC_NOTIFICATION_DELETED', msg);
    };

    notifyPublicUpdated = function(msg) {
        //console.log('notify_users_updated, conv id: ' + msg.conversation_id + ' , card id: ' + msg.card_id + ', participants: ' + msg.followers);
        $rootScope.$broadcast('PUBLIC_NOTIFICATION_UPDATED', msg);
    };

    updateData = function(msg) {
        //console.log('update_data: ' + msg.update_values + ', user: ' + msg.user);
        $rootScope.$broadcast('UPDATE_DATA', msg);
    };

    updateContact = function(msg) {
        //console.log('update_contact: ' + msg.update_values + ', user: ' + msg.user);
        $rootScope.$broadcast('UPDATE_CONTACT', msg);
    };

    recreateConnection = function() {
        var connection = socket_n.connect();
        var checkConnection = $interval(function() {
            if (connection.connected) {
                //console.log("Made connection");
                $rootScope.$broadcast('SOCKET_RECONNECT');
                $interval.cancel(checkConnection);
            }
        }, 500, 10);
    };

    connectNamespace = function(id, factory) {
        // Connected, request unique namespace to be created
        socket_m.emit('create_ns', id);
        // create the unique namespace on the client
        socket_n = io('/' + id, { transports: ['websocket'] });

        $rootScope.socket_n = socket_n;

        socket_n.once('connect', function() {
            //console.log('CLIENT NS connect: ' + socket_n.id);
        });
        // server confirming that the namespace has been created
        socket_n.on('joined_ns', function(id) {
            //console.log('CLIENT joined_ns: ' + socket_n.id);
        });
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
        // server notifying users by namespace of contact update
        socket_n.on('update_contact', updateContact);
        // namespace disconnected by server
        socket_n.on('disconnect', function(reason) {
            //console.log('CLIENT NS disconnected by server: ' + reason);
        });
        socket_n.on('connect_error', function(error) {
            //console.log('CLIENT NS connect_error: ' + error);
        });
        socket_n.on('connect_timeout', function() {
            //console.log('CLIENT NS connect_timeout');
        });
        socket_n.on('reconnect', function(attempt) {
            //console.log('CLIENT NS reconnect: ' + attempt);
        });
        socket_n.on('reconnecting', function(attempt) {
            //console.log('CLIENT NS reconnecting: ' + attempt);
        });
        socket_n.on('reconnect_attempt', function() {
            //console.log('CLIENT NS reconnect_attempt');
        });
        socket_n.on('reconnect_error', function(error) {
            //console.log('CLIENT NS reconnect_error: ' + error);
        });
        socket_n.on('reconnect_failed', function() {
            //console.log('CLIENT NS reconnect_failed');
            factory.disconnect();
            factory.create();
        });
        socket_n.on('ping', function() {
            //console.log('ping');
        });
        socket_n.on('pong', function(ms) {
            //console.log('pong: ' + ms);
        });
        socket_n.on('SERVER_CONNECTION', function(id) {
            //console.log('CLIENT NS SERVER_CONNECTION: ' + id);
        });
    };

    return {
        create: function() {
            socket_m = io({
                transports: ['websocket']
            });

            $rootScope.socket_m = socket_m;

            var socket_factory = this;

            socket_m.once('connect', function() {
                //console.log("connected from the client side");
                connectNamespace(socket_factory.getId(), socket_factory);
            });

            socket_m.on('reconnect', function() {
                //console.log("reconnected from the client side");
                this.once('connect', function() {
                    //console.log("connect from the client side!");
                    // Connected, request unique namespace to be created
                    socket_m.emit('create_ns', socket_factory.getId());
                    // Re-establish connection with the namespace.
                    // Wait before checking the re connect with the namespace.
                    setTimeout(recreateConnection, 500);
                });
            });

            socket_m.on('connection', function() {
                //console.log('M CLIENT NS connection');
            });
            socket_m.on('disconnect', function(reason) {
                //console.log('M CLIENT NS disconnected by server: ' + reason);
            });
            socket_m.on('connect_error', function(error) {
                //console.log('M CLIENT NS connect_error: ' + error);
            });
            socket_m.on('connect_timeout', function() {
                //console.log('M CLIENT NS connect_timeout');
            });
            socket_m.on('reconnect', function(attempt) {
                //console.log('M CLIENT NS reconnect: ' + attempt);
            });
            socket_m.on('reconnecting', function(attempt) {
                //console.log('M CLIENT NS reconnecting: ' + attempt);
            });
            socket_m.on('reconnect_attempt', function() {
                //console.log('M CLIENT NS reconnect_attempt');
            });
            socket_m.on('reconnect_error', function(error) {
                //console.log('M CLIENT NS reconnect_error: ' + error);
            });
            socket_m.on('reconnect_failed', function() {
                //console.log('M CLIENT NS reconnect_failed');
                socket_factory.disconnect();
                socket_factory.create();
            });
            socket_m.on('ping', function() {
                //console.log('ping');
            });
            socket_m.on('pong', function(ms) {
                //console.log('pong: ' + ms);
            });
            socket_m.on('SERVER_CONNECTION', function(id) {
                //console.log('M CLIENT NS SERVER_CONNECTION: ' + id);
            });
        },
        connect: connectNamespace,
        disconnect: function() {
            //console.log('disconnect');
            socket_n.disconnect();
            socket_m.disconnect();
        },
        getId: function() {
            return property;
        },
        setId: function(value) {
            property = value;
        },
        recreate: function(value) {
            //console.log('recreate');
            var sox = this;
            if (!socket_m.connected) {
                //console.log('socket_m not connected');
                socket_m.connect();
                socket_m.once('connect', function() {
                    //console.log("connected from the client side");
                    socket_m.emit('create_ns', sox.getId());
                    socket_n.connect();
                });
            } else if (!socket_n.connected) {
                //console.log('socket_m connected but socket_n not');
                socket_m.emit('create_ns', sox.getId());
                socket_n.connect();
            } else {
                //console.log('socket_m & socket_n connected');
            }
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

//cardApp.factory('UserData', function($rootScope, $route, $timeout, $window, $http, $cookies, $location, jwtHelper, $q, principal, Users, Conversations, FormatHTML, General, socket, $filter, LocalDB) {
cardApp.factory('UserData', function($rootScope, $route, $timeout, $window, $http, $cookies, $location, jwtHelper, $q, principal, Users, Conversations, General, socket, $filter, LocalDB) {
    var self = this;
    var user;
    var contacts = [];
    var conversations;
    var conversationsLatestCard = [];
    var conversationsUsers = [];
    var sent_content_length = 200;

    // TODO - move these to main?
    var UserData = { isAuthenticated: false, isLoaded: false, isLoading: false };
    $rootScope.loaded = false;
    $rootScope.dataLoading = true;
    var isLoading = false;
    var update_inprogress = false;
    var ua = navigator.userAgent;
    $window.androidToken = this.androidToken;
    $window.androidTokenUpdated = this.androidTokenUpdated;

    androidTokenUpdated = function() {
        UserData.getFCMToken();
    };

    UserData.updateUsers = function(data, user, users) {
        socket.emit('data_change', { sender_id: socket.getId(), update: data, user: user, users: users });
    };

    UserData.updateUserContact = function(data, user, users) {
        socket.emit('contact_change', { sender_id: socket.getId(), update: data, user: user, users: users });
    };

    setNotificationData = function(data, user) {
        // get notifcation data and check if this needs to be updated or added
        Users.update_notification(data)
            .then(function(res) {
                //Notification update. Notify this users contacts of the change.
                UserData.updateUsers(res.data, user._id, user.contacts);
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
        var result;
        var user_pos = General.findWithAttr(contacts, '_id', id);
        if (user_pos >= 0) {
            result = contacts[user_pos];
        } else {
            result = 'Unknown';
        }
        return result;
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
                deferred.resolve(result);
            });
        };

        var user_contacts = UserData.getUser().contacts;
        // Add current user to contact list
        user_contacts.push(UserData.getUser()._id);
        promises.push(user_contacts.map(function(key, array) {
            // Search for each user in the contacts list by id
            // LDB
            promises.push(Users.search_id(key)
                .then(function(res) {
                    if (res.data.success) {
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
        var deferred = $q.defer();
        var conv_pos = General.findWithAttr(conversations, '_id', id);
        conversations[conv_pos].participants = viewed_users;
        deferred.resolve(conversations[conv_pos]);
        return deferred.promise;
    };

    UserData.loadConversations = function() {
        var deferred = $q.defer();
        Conversations.find().then(function(result) {
            conversations = result.data;
            deferred.resolve(conversations);
        });
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
                                        // user cannot be found.
                                    }
                                    if (res.data.success) {
                                        // Add user
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
                }).catch(function(error) {
                    console.log('error: ' + error);
                });
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
            var card = { _id: id, data: data };
            conversationsLatestCard.push(card);
            deferred.resolve(conversationsLatestCard);
        }
        return deferred.promise;
    };

    UserData.conversationsAdd = function(conv) {
        var deferred = $q.defer();
        // Only add if the conversation does not already exist otherwise update.
        var index = General.findWithAttr(conversations, '_id', conv._id);
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
                                .then(function(res) {});
                        }));
                });
                // All the conversations have been mapped.
                $q.all(promises).then(function() {
                    deferred.resolve(res);
                }).catch(function(err) {
                    console.log('error: ' + err);
                });
            });
        return deferred.promise;
    };

    UserData.updateConversationViewed = function(id) {
        // Update the DB
        var user_id = UserData.getUser()._id;
        Conversations.clearViewed(id, user_id)
            .then(function(res) {
                var conv_pos = General.findWithAttr(conversations, '_id', id);
                var participant_pos = General.arrayObjectIndexOf(conversations[conv_pos].participants, user_id, '_id');
                conversations[conv_pos].participants[participant_pos].unviewed = [];
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
            //console.log('GET 2 getFCMToken');
            return UserData.getFCMToken();
        }).then(function() {
            //console.log('GET 3 loadUserContacts');
            return UserData.loadUserContacts();
        }).then(function() {
            //console.log('GET 4 loadConversations');
            return UserData.loadConversations();
        }).then(function() {
            //console.log('GET 5 loadConversationsUsers');
            // Adds the conversations users to the "contacts"
            return UserData.loadConversationsUsers();
        }).then(function() {
            //console.log('GET 6 getConversationsLatestCard');
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

    //
    // Profile
    //

    UserData.updatePublicProfile = function(profile) {
        var deferred = $q.defer();
        UserData.findPublicConversation(UserData.getUser()._id)
            .then(function(res) {
                res.avatar = profile.avatar;
                res.conversation_avatar = profile.avatar;
                res.conversation_name = profile.user_name;
                UserData.conversationsAdd(res);
                deferred.resolve(res);
            });
        return deferred.promise;
    };

    UserData.findPublicConversation = function() {
        var deferred = $q.defer();
        var index = General.findWithAttr(conversations, 'conversation_type', 'public');
        deferred.resolve(conversations[index]);
        return deferred.promise;
    };

    return UserData;

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