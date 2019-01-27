cardApp.controller("MainCtrl", ['$scope', '$window', '$rootScope', '$timeout', '$location', 'UserData', 'socket', 'principal', 'viewAnimationsService', 'Conversations', 'Cards', '$q', function($scope, $window, $rootScope, $timeout, $location, UserData, socket, principal, viewAnimationsService, Conversations, Cards, $q) {

    $window.networkChange = this.networkChange;
    $window.onResume = this.onResume;
    $window.onRestart = this.onRestart;
    $window.restoreState = this.restoreState;

    $window.notificationReceived = this.notificationReceived;
    $window.mobileNotification = this.mobileNotification;

    $window.onStop = this.onStop;
    $window.onStart = this.onStart;

    var ua = navigator.userAgent;

    var DEVICE_TYPE;
    var DEVICE_OS;
    // variable which stores whether the mobile app is currently running in the foreground.
    var mobile_active = false;

    console.log(ua);
    if (ua.indexOf('AndroidApp') >= 0) {
        DEVICE_TYPE = 'mobile';
        DEVICE_OS = 'android';
    } else {
        DEVICE_TYPE = 'non-mobile';
        //DEVICE_OS = 'android';
    }
    console.log(DEVICE_TYPE);

    if (DEVICE_TYPE == 'mobile') {

    }





    /*
        $window.onDestroy = this.onDestroy();
        $window.onCreate = this.onCreate();
        
        */

    $rootScope.deleting_card = false;

    var last_network_status = true;

    $scope.$watch('online', function(newStatus) {
        console.log('NETWORK: ' + newStatus);
        console.log(last_network_status + ' : ' + newStatus);
        if (!last_network_status && newStatus) {
            console.log('BACK');
            //checkDataUpdate();

            //onResume();
            reconnect_socket();
        }
        if (!newStatus) {
            console.log('network turned off');
            //onPause();
            disconnect_socket();
        }
        last_network_status = newStatus;

    });

    disconnect_socket = function() {
        socket.disconnect();
    };

    reconnect_socket = function() {
        checkDataUpdate(false);
        socket.recreate();
    };

    // ANDROID CALLED FUNCTIONS

    mobileNotification = function(data) {
        /*
        $timeout(function() {
            console.log('mobile_active: ' + mobile_active);
            //reconnect_socket();
            if (mobile_active == false) {
                checkDataUpdate(true);
            }
        });
        */
        $timeout(function() {
            $location.path("/chat/conversation/" + data);
        });
    };

    notificationReceived = function() {
        $timeout(function() {
        console.log('notificationReceived');
        console.log('mobile_active: ' + mobile_active);
        //reconnect_socket();
        if (mobile_active == false) {
            checkDataUpdate(true);
        }
    });
    };

    restoreState = function() {
        console.log('restoreState');
    };

    onPause = function() {
        mobile_active = false;
        console.log('onPause');
        //socket.disconnect();

        // Mobile disconnect
        //disconnect_socket();
    };

    onStop = function() {
        mobile_active = false;
        console.log('onStop');
    };

    onRestart = function() {
        console.log('onRestart');
        //reconnect_socket();
    };

    onStart = function() {
        console.log('onStart');
        //reconnect_socket();
    };

    onResume = function() {
        mobile_active = true;
        console.log('onResume');
        //socket.connect();
        //socket.setId(UserData.getUser()._id);
        // socket.create();


        //socket.recreate();
        //checkDataUpdate();

        // Mobile reconnect
        //reconnect_socket();
    };



    networkChange = function(status) {
        if (status == "connected") {
            $timeout(function() {
                console.log('connected');
                //checkDataUpdate();
                reconnect_socket();
            });
        } else if (status == "disconnected") {
            console.log('disconnected');
        }
    };

    //

    checkLoadingCards = function() {
        var deferred = $q.defer();
        console.log($rootScope.loading_cards);
        if ($rootScope.loading_cards) {
            console.log('already loading...wait');
            var unbind = $rootScope.$watch('loading_cards', function(n) {
                console.log($rootScope.loading_cards);
                console.log(n);
                if (!n) {
                    console.log('loaded...proceed');
                    // loaded!
                    unbind();
                    deferred.resolve(true);
                }
            });
        } else {
            console.log('not loading...proceed');
            // loaded!
            deferred.resolve(true);
        }
        return deferred.promise;
    };

    runUpdate = function() {
        console.log('runUpdate');
        //$rootScope.loading_cards = false;
        var id = Conversations.getConversationId();
        console.log(Conversations.getConversationType());
        // TODO - needs to cover all routes conversations, conversation other conversation, group contacts etc.
        // update all required models (could be new conversations, multiple cards across conversations, new users or user data - Userdata first load re call?)
        if (Conversations.getConversationType() == 'feed') {
            getFollowingUpdate();
        } else if (Conversations.getConversationType() == 'private') {
            //getCardsUpdate(id);
            getCardsUpdate(id).then(function(result) {
                    //console.log(result);
                    $scope.$broadcast("items_changed", 'bottom');
                })
                .catch(function(error) {
                    $rootScope.loading_cards = false;
                    console.log(error);
                });
        } else if (Conversations.getConversationType() == 'public') {
            getPublicCardsUpdate(id);
        }
    };

    checkDataUpdate = function(queue) {
        console.log('checkDataUpdate, queue: ' + queue);
        console.log($rootScope.loading_cards);
        // queue this request
        if (queue) {
            checkLoadingCards()
                .then(function(result) {
                    console.log(result);
                    runUpdate();

                })
                .catch(function(error) {
                    console.log(error);
                });
        } else if (!$rootScope.loading_cards) {
            // only run this request if not already running.
            runUpdate();
        }
    };

    // Broadcast by socket after it has reconnected. Check for updates.
    $scope.$on('SOCKET_RECONNECT', function(event) {
        console.log('SOCKET_RECONNECT');
        checkDataUpdate(true);
    });


    // NOTIFICATION for private conversation.
    $rootScope.$on('PRIVATE_CONVERSATION_CREATED', function(event, msg) {
        console.log('PRIVATE_CONVERSATION_CREATED');
        // TODO - Show message to user that they have been added to a conversation.
        console.log(msg);
        UserData.loadConversations()
            .then(function(res) {
                console.log(res);
                UserData.getConversationsLatestCard()
                    .then(function(res) {
                        console.log(res);
                        console.log($location.url());
                        if ($location.url() == '/chat/conversations') {
                            loadConversations();
                        }
                    });
            });

    });

    // NOTIFICATION for private conversation.
    $rootScope.$on('PRIVATE_NOTIFICATION_CREATED', function(event, msg) {
        console.log('PRIVATE_NOTIFICATION_CREATED');
        console.log(msg);
        UserData.addConversationViewed(msg.conversation_id, msg.viewed_users);
        var id = Conversations.getConversationId();
        // only update the conversation if the user is currently in that conversation
        console.log(id);
        if (id === msg.conversation_id) {
            updateConversationViewed(id);
            getCardsUpdate(id).then(function(result) {
                    console.log(result);
                    $scope.$broadcast("items_changed", 'bottom');
                })
                .catch(function(error) {
                    console.log(error);
                });
        } else {
            Conversations.getConversationLatestCard(msg.conversation_id)
                .then(function(res) {
                    console.log(res);
                    UserData.conversationsLatestCardAdd(msg.conversation_id, res.data);
                    if ($location.url() == '/chat/conversations') {
                        loadConversations();
                    }
                })
                .catch(function(error) {
                    console.log(error);
                });
        }
    });


    // NOTIFICATION for private conversation.
    $rootScope.$on('PRIVATE_NOTIFICATION_UPDATED', function(event, msg) {
        console.log('PRIVATE_NOTIFICATION_UPDATED');
        console.log(msg);
        UserData.addConversationViewed(msg.conversation_id, msg.viewed_users);
        var id = Conversations.getConversationId();
        console.log(id);
        Conversations.getConversationLatestCard(msg.conversation_id)
            .then(function(res) {
                console.log(res);
                UserData.conversationsLatestCardAdd(msg.conversation_id, res.data);
                if (id == msg.conversation_id) {
                    updateConversationViewed(id);
                    updateCard(res.data);
                }
                if ($location.url() == '/chat/conversations') {
                    loadConversations();
                }
            });
    });

    // NOTIFICATION for private conversation.
    $rootScope.$on('PRIVATE_NOTIFICATION_DELETED', function(event, msg) {
        console.log('PRIVATE_NOTIFICATION_DELETED');
        console.log(msg);
        UserData.addConversationViewed(msg.conversation_id, msg.viewed_users);
        var id = Conversations.getConversationId();
        console.log(id);
        Conversations.getConversationLatestCard(msg.conversation_id)
            .then(function(res) {
                console.log(res);
                UserData.conversationsLatestCardAdd(msg.conversation_id, res.data);
                if (id == msg.conversation_id) {
                    updateConversationViewed(id);
                    deleteCard(msg.card_id);
                }
                if ($location.url() == '/chat/conversations') {
                    loadConversations();
                }
            });
    });

    // NOTIFICATION for public conversation.
    $rootScope.$on('PUBLIC_NOTIFICATION_CREATED', function(event, msg) {
        console.log('PUBLIC_NOTIFICATION_CREATED');
        console.log(msg);
        var id = Conversations.getConversationId();
        console.log(Conversations.getConversationType());
        // only update the conversation if the user is currently in that conversation
        if (id === msg.conversation_id) {
            //updateConversationViewed(id);
            getPublicCardsUpdate(id).then(function(result) {
                $scope.$broadcast("items_changed", 'top');
            });
        } else if (Conversations.getConversationType() == 'feed') {
            getFollowingUpdate().then(function(result) {
                $scope.$broadcast("items_changed", 'top');
            });
        }
    });

    // NOTIFICATION for private conversation.
    $rootScope.$on('PUBLIC_NOTIFICATION_DELETED', function(event, msg) {
        console.log('PUBLIC_NOTIFICATION_DELETED');

        var id = Conversations.getConversationId();
        var followed = UserData.getUser().following;
        if (Conversations.getConversationType() == 'feed' && followed.indexOf(msg.conversation_id) >= 0) {
            deleteCard(msg.card_id);
        } else if (msg.conversation_id == id) {
            deleteCard(msg.card_id);
        }

    });

    // NOTIFICATION for private conversation.
    $rootScope.$on('PUBLIC_NOTIFICATION_UPDATED', function(event, msg) {
        console.log('PUBLIC_NOTIFICATION_UPDATED');
        var id = Conversations.getConversationId();
        var followed = UserData.getUser().following;
        if ((Conversations.getConversationType() == 'feed' && followed.indexOf(msg.conversation_id) >= 0) || (msg.conversation_id == Conversations.getConversationId())) {
            Conversations.getConversationLatestCard(msg.conversation_id)
                .then(function(res) {
                    console.log(res);
                    updateCard(res.data);
                });
        }
    });

    // Broadcast by socket service when data needs to be updated.
    $scope.$on('UPDATE_DATA', function(event, msg) {
        UserData.updateContact(msg.update_values)
            .then(function(result) {
                //console.log(result);
            });
        UserData.updateConversationsUser(msg.update_values)
            .then(function(result) {
                //console.log(result);
            });
    });

    //
    // ROUTE ANIMATION
    //

    var from;
    var to;

    $rootScope.$on('$routeChangeSuccess', function(event, next, prev) {
        if (prev != undefined) {
            //console.log(prev.$$route.originalPath);
            $rootScope.prev_route = prev.$$route.originalPath;
        }
    });

    $scope.$on('$routeChangeStart', function($event, next, current) {

        to = next.$$route.originalPath;

        if (current != undefined) {
            //console.log('current: ' + current.$$route.originalPath);
            from = current.$$route.originalPath;
            // Not a directly loaded page.
            $rootScope.animate_pages = true;
        }

        if (from == '/' && to == '/chat/conversations') {
            //console.log('FROM / TO /chat/conversations');
            $('#page-system').removeClass("page-static");
            $('#page-system').addClass("page-anim");
            viewAnimationsService.setEnterAnimation('page-anim z6000');
            viewAnimationsService.setLeaveAnimation('page-static z5000');
        } else if (from == '/chat/conversations' && to == '/') {
            //console.log('FROM /chat/conversations TO /');
            $('#page-system').removeClass("page-static");
            $('#page-system').addClass("page-anim");
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z6000');
        } else if (from == '/chat/conversations' && to == '/chat/conversation/:id') {
            //console.log('FROM /chat/conversations TO /chat/conversation/:id');
            viewAnimationsService.setEnterAnimation('page-anim z9000');
            viewAnimationsService.setLeaveAnimation('page-static z5000');
        } else if (from == '/chat/conversation/:id' && to == '/chat/conversations') {
            //console.log('FROM /chat/conversation/:id TO /chat/conversations');
            $('#page-system').removeClass("page-static");
            $('#page-system').addClass("page-anim");
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z9000');
        } else if (from == '/chat/conversation/:id' && to == '/api/group_info/:id') {
            //console.log('FROM /chat/conversation/:id TO /api/group_info/:id');
            $('#page-system').removeClass("z9000");
            viewAnimationsService.setEnterAnimation('page-anim z6000');
            viewAnimationsService.setLeaveAnimation('page-static z5000');
        } else if (from == '/api/group_info/:id' && to == '/chat/conversation/:id') {
            //console.log('FROM /api/group_info/:id TO /chat/conversation/:id');
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z7000');
        } else if (from == '/chat/conversations' && to == '/c/contacts') {
            //console.log('FROM /chat/conversations TO /c/contacts');
            viewAnimationsService.setLeaveAnimation('page-static z5000');
            viewAnimationsService.setEnterAnimation('page-anim z7000');
        } else if (from == '/c/contacts' && to == '/chat/conversations') {
            console.log('FROM /c/contacts TO /chat/conversations');
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z7000');
            $scope.animating = false;
        } else if (from == '/' && to == '/c/contacts') {
            //console.log('FROM / TO /c/contacts');
            viewAnimationsService.setEnterAnimation('page-anim z7000');
            viewAnimationsService.setLeaveAnimation('page-static z5000');
        } else if (from == '/c/contacts' && to == '/') {
            //console.log('FROM /c/contacts TO /');
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z9000');
        } else if (from == '/c/contacts' && to == '/chat/conversation/:id') {
            //console.log('FROM /c/contacts TO /chat/conversation/:id');
            viewAnimationsService.setEnterAnimation('page-anim z9000');
            viewAnimationsService.setLeaveAnimation('page-static z7000');
        } else if (from == '/' && to == '/api/user_setting') {
            //console.log('FROM / TO /api/user_setting');
            viewAnimationsService.setEnterAnimation('page-anim z9000');
            viewAnimationsService.setLeaveAnimation('page-static z5000');
        } else if (from == '/api/user_setting' && to == '/') {
            //console.log('FROM /api/user_setting TO /');
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z9000');
        } else if (from == '/chat/conversations' && to == '/api/user_setting') {
            //console.log('FROM /chat/conversations TO /api/user_setting');
            viewAnimationsService.setEnterAnimation('page-anim z9000');
            viewAnimationsService.setLeaveAnimation('page-static z5000');
        } else if (from == '/api/user_setting' && to == '/chat/conversations') {
            //console.log('FROM /api/user_setting TO /chat/conversations');
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z9000');
        } else if (from == '/chat/conversations' && to == '/:username') {
            //console.log('FROM /chat/conversations TO /:username');
            viewAnimationsService.setEnterAnimation('page-anim z9000');
            viewAnimationsService.setLeaveAnimation('page-static z5000');
        } else if (from == '/:username' && to == '/chat/conversations') {
            //console.log('FROM /:username TO /chat/conversations');
            $('#page-system').removeClass("page-static");
            $('#page-system').addClass("page-anim");
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z9000');
        }

    });

}]);