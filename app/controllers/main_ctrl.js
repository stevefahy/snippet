cardApp.controller("MainCtrl", ['$scope', '$window', '$rootScope', '$timeout', '$location', 'UserData', 'socket', 'principal', 'viewAnimationsService', 'Conversations', 'Cards', '$q', 'Profile', 'Users', 'General', '$animate', '$templateRequest', '$sce', function($scope, $window, $rootScope, $timeout, $location, UserData, socket, principal, viewAnimationsService, Conversations, Cards, $q, Profile, Users, General, $animate, $templateRequest, $sce) {

    $window.networkChange = this.networkChange;
    $window.onResume = this.onResume;
    $window.onRestart = this.onRestart;
    $window.restoreState = this.restoreState;

    $window.notificationReceived = this.notificationReceived;
    $window.mobileNotification = this.mobileNotification;

    $window.onStop = this.onStop;
    $window.onStart = this.onStart;

    $scope.debug = false;

    $scope.show_alert = false;

    var ua = navigator.userAgent;

    $rootScope.deleting_card = false;

    var last_network_status = true;
    var endalert = false;
    var addingalert = false;

    var DEVICE_TYPE;
    var DEVICE_OS;

    // variable which stores whether the mobile app is currently running in the foreground.
    var mobile_active = false;

    if (ua.indexOf('AndroidApp') >= 0) {
        DEVICE_TYPE = 'mobile';
        DEVICE_OS = 'android';
    } else {
        DEVICE_TYPE = 'non-mobile';
    }

    // Intersection Observer

    intersectionCallback = function(entries, observer) {
        entries.forEach(entry => {
            var elem = entry.target;
            if (entry.isIntersecting) {
                $(elem).addClass('vis');
            }
            if (!entry.isIntersecting) {
                $(elem).removeClass('vis');
            }
        });
    };

    var observer;
    var observer_queue = [];
    var observers = [];

    resetObserver_queue = function() {
        observers = [];
        observer_queue = [];
    };

    createObserver = function(id) {
        $('.content_cnv #card' + id).ready(function() {
            var target = document.querySelector('.content_cnv #card_' + id);
            var newObserver = new IntersectionObserver(intersectionCallback, $scope.observerOptions);
            observers.push(newObserver);
            newObserver.observe(target);
        });
    };

    intObservers = function() {
        $('.content_cnv').ready(function() {
            observers = [];
            let thresholdSets = [
                []
            ];
            for (let i = 0; i <= 1.0; i += 0.01) {
                thresholdSets[0].push(i);
            }
            $scope.observerOptions = {
                root: document.querySelector('.content_cnv.content_cnv_conv'),
                rootMargin: '0px',
                threshold: 1.0
            };
            $scope.observerOptions.threshold = thresholdSets[0];
        });
    };

    // Update User for current user and all this users conversation participants. 
    updateUserData = function(id, contact) {
        var conv_type = Conversations.getConversationType();
        if (id == UserData.getUser()._id) {
            // Current User (may have updated on another device).
            UserData.setUser(contact);
            var profile = {};
            profile.avatar = 'default';
            profile.user_name = UserData.getUser().user_name;
            if (UserData.getUser().avatar != undefined) {
                profile.avatar = UserData.getUser().avatar;
            }
            // Store the profile.
            Profile.setProfile(profile);
            $rootScope.$broadcast('PROFILE_SET');
        }

        UserData.addContact(contact);

        UserData.loadConversations()
            .then(function(result) {
                if ($location.url() == '/chat/conversations') {
                    // Reload the conversations to show the update.
                    loadConversations();
                } else if (conv_type == 'public' || conv_type == 'private' || conv_type == 'feed') {
                    // Update the cards with new user data.
                    updateCardsUser('cards', id, contact.user_name, contact.avatar);
                    updateCardsUser('cards_temp', id, contact.user_name, contact.avatar);
                    // Update the profile.
                    setConversationProfile(Conversations.getConversationId());
                }
            });
    };

    // Watch the online status.
    $scope.$watch('online', function(newStatus) {
        if (navigator.serviceWorker.controller && newStatus) {
            navigator.serviceWorker.controller.postMessage("replayRequests");
        }
        if (!last_network_status && newStatus) {
            if ('serviceWorker' in navigator) {
                $rootScope.sync_finished = false;
            } else {
                $rootScope.sync_finished = true;
            }
            // Connection restored.
            reconnect_socket();
        }
        if (!newStatus) {
            // Connection lost.
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
        //Conversation.find_user_public_conversation_by_id
        Conversations.find_public_conversation_id(data).then(function(result) {
            if (result.conversation_type == 'public') {
                $location.path("/");
            } else {
                $timeout(function() {
                    $location.path("/chat/conversation/" + data);
                });
            }
        });
    };

    notificationReceived = function() {
        $timeout(function() {
            if (mobile_active == false) {
                checkDataUpdate(true);
            }
        });
    };

    // Android activity lifecycle states.
    restoreState = function() {};

    onPause = function() {
        mobile_active = false;
        // Mobile disconnect
        disconnect_socket();
    };

    onStop = function() {
        mobile_active = false;
    };

    onRestart = function() {};

    onStart = function() {};

    onResume = function() {
        mobile_active = true;
        // Mobile reconnect
        reconnect_socket();
    };

    networkChange = function(status) {
        if (status == "connected") {
            $timeout(function() {
                reconnect_socket();
            });
        } else if (status == "disconnected") {}
    };

    checkLoadingCards = function() {
        var deferred = $q.defer();
        if ($rootScope.loading_cards) {
            //console.log('already loading...wait');
            var unbind = $rootScope.$watch('loading_cards', function(n) {
                if (!n) {
                    //console.log('loaded...proceed');
                    // Stop watching.
                    unbind();
                    deferred.resolve(true);
                }
            });
        } else {
            //console.log('not loading...proceed');
            deferred.resolve(true);
        }
        return deferred.promise;
    };

    runUpdate = function() {
        if ($scope.online) {
            var id = Conversations.getConversationId();
            // update all required models (could be new conversations, multiple cards across conversations, new users or user data - Userdata first load re call?)
            if (Conversations.getConversationType() == 'feed') {
                getFollowingUpdate()
                    .then(function(result) {
                        if (result.length > 0) {
                            addCards(result);
                            // Update Conversations
                            for (var i = 0, len = result.length; i < len; i++) {
                                UserData.conversationsLatestCardAdd(msg.conversation_id, result[i]);
                            }
                        }
                    });

            } else if (Conversations.getConversationType() == 'private') {
                getCardsUpdate(id)
                    .then(function(result) {
                        if (result.length > 0) {
                            addCards(result);
                            // Update Conversations
                            for (var i = 0, len = result.length; i < len; i++) {
                                UserData.conversationsLatestCardAdd(id, result[i]);
                            }
                        }
                    });
            } else if (Conversations.getConversationType() == 'public') {
                getPublicCardsUpdate(id).then(function(result) {
                    if (result.length > 0) {
                        addCards(result);
                        // Update Conversations
                        for (var i = 0, len = result.length; i < len; i++) {
                            UserData.conversationsLatestCardAdd(msg.conversation_id, result[i]);
                        }
                    }
                });
            }
        }
    };

    checkDataUpdate = function(queue) {
        var unbind_1 = $rootScope.$watch('sync_finished', function(n) {
            if (n) {
                // queue this request
                if (queue) {
                    checkLoadingCards()
                        .then(function(result) {
                            runUpdate();
                        })
                        .catch(function(error) {
                            //console.log(error);
                        });
                } else if (!$rootScope.loading_cards) {
                    // only run this request if not already running.
                    runUpdate();
                }
                unbind_1();
            }
        });
    };

    function alertAddEnd() {
        $(".alert_anim_on").off('animationend', alertAddEnd);
        addingalert = false;
        if (endalert) {
            removeAlert();
        }
    }

    function alertRemoveEnd() {
        endalert = false;
        $(".alert_anim_off").off('animationend', alertRemoveEnd);
        $(".alert_container").removeClass('alert_anim_off');
        $(".alert_container").remove();
    }

    addAlert = function() {
        if (!addingalert) {
            var alert = $sce.getTrustedResourceUrl('/views/alert.html');
            $templateRequest(alert).then(function(template) {
                var eb = $('.main').prepend(template);
                addingalert = true;
                $timeout(function() {
                    $(".alert_container").addClass('alert_anim_on');
                    $(".alert_anim_on").on("animationend", alertAddEnd);
                }, 100);
            });
        }
    }

    function removeAlert() {
        if (!addingalert) {
            $(".alert_container").addClass('alert_anim_off');
            $(".alert_anim_off").on('animationend', alertRemoveEnd);
        }
    }

    if ('serviceWorker' in navigator) {
        // Handler for messages coming from the service worker
        navigator.serviceWorker.addEventListener('message', function(event) {

            if (event.data.message == "sync_started") {
                $rootScope.sync_finished = false;
            }

            if (event.data.message == "all_requests_updated") {
                endalert = true;
                removeAlert();
                // Update local card ids
                if (event.data.all_requests.posted.length > 0) {
                    updateCardIds(event.data.all_requests.posted);
                }
                // Update local images
                if (event.data.all_requests.images.length > 0) {
                    updateImages(event.data.all_requests.images)
                }
                // Update posted and updated cards
                if (event.data.all_requests.posted.length > 0 || event.data.all_requests.updated.length > 0 || event.data.all_requests.deleted.length > 0) {
                    sendRequested(event.data.all_requests.posted, event.data.all_requests.updated, event.data.all_requests.deleted);
                }

                $rootScope.sync_finished = true;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }

            }
            if (event.data.message == "request_updating") {
                addAlert();
            }
        });
    }

    // Broadcast by socket after it has reconnected. Check for updates.
    $scope.$on('SOCKET_RECONNECT', function(event) {
        //console.log('SOCKET_RECONNECT');
        checkDataUpdate(true);
    });

    updateConversations = function() {
        UserData.loadConversations()
            .then(function(res) {
                UserData.loadConversationsUsers()
                    .then(function(res) {
                        UserData.getConversationsLatestCard()
                            .then(function(res) {
                                if ($location.url() == '/chat/conversations') {
                                    loadConversations();
                                }
                            });
                    });
            });
    };

    // NOTIFICATION for private conversation.
    $rootScope.$on('PRIVATE_CONVERSATION_CREATED', function(event, msg) {
        //console.log('PRIVATE_CONVERSATION_CREATED');
        // TODO - Show message to user that they have been added to a conversation.
        if (msg.admin != UserData.getUser()._id) {
            // Add the admin (creator of the conversation to contacts)
            Users.add_contact(msg.admin)
                .then(function(res) {
                    updateConversations();
                });
        } else {
            updateConversations();
        }
    });

    // NOTIFICATION for public conversation.
    $rootScope.$on('PUBLIC_NOTIFICATION_CREATED', function(event, msg) {
        //console.log('PUBLIC_NOTIFICATION_CREATED');
        var id = Conversations.getConversationId();
        // only update the conversation if the user is currently in that conversation
        if (id === msg.conversation_id && Conversations.getConversationType() != 'feed') {
            getPublicCardsUpdate(id).then(function(result) {
                if (result.length > 0) {
                    addCards(result);
                    // Update Conversations
                    for (var i = 0, len = result.length; i < len; i++) {
                        UserData.conversationsLatestCardAdd(msg.conversation_id, result[i]);
                    }
                }
            });
        } else if (Conversations.getConversationType() == 'feed') {
            getFollowingUpdate()
                .then(function(result) {
                    if (result.length > 0) {
                        addCards(result);
                        // Update Conversations
                        for (var i = 0, len = result.length; i < len; i++) {
                            UserData.conversationsLatestCardAdd(msg.conversation_id, result[i]);
                        }
                    }
                });
        }
    });

    // NOTIFICATION for private conversation.
    $rootScope.$on('PRIVATE_NOTIFICATION_CREATED', function(event, msg) {
        //console.log('PRIVATE_NOTIFICATION_CREATED');
        UserData.addConversationViewed(msg.conversation_id, msg.viewed_users);
        var id = Conversations.getConversationId();
        // only update the conversation if the user is currently in that conversation
        if (id === msg.conversation_id) {
            updateConversationViewed(id);
            getCardsUpdate(id)
                .then(function(result) {
                    if (result.length > 0) {
                        addCards(result);
                        // Update Conversations
                        for (var i = 0, len = result.length; i < len; i++) {
                            UserData.conversationsLatestCardAdd(msg.conversation_id, result[i]);
                        }
                    }
                });
        } else {
            //Conversations.getConversationLatestCard(msg.conversation_id)
            // Get the updated card (not necessarily the latest card).
            Cards.getCard(msg.card_id)
                .then(function(res) {
                    UserData.conversationsLatestCardAdd(msg.conversation_id, res.data);
                    if ($location.url() == '/chat/conversations') {
                        loadConversations();
                    }
                })
                .catch(function(error) {
                    //console.log(error);
                });
        }
    });

    // NOTIFICATION for private conversation.
    $rootScope.$on('PRIVATE_NOTIFICATION_UPDATED', function(event, msg) {
        //console.log('PRIVATE_NOTIFICATION_UPDATED');
        UserData.addConversationViewed(msg.conversation_id, msg.viewed_users);
        var id = Conversations.getConversationId();
        // Get the updated card (not necessarily the latest card).
        Cards.getCard(msg.card_id)
            .then(function(res) {
                // If this user was the sender, then update their viewed user array
                if (res.data.user == UserData.getUser()._id) {
                    var current_user_index = General.findIncludesAttr(msg.viewed_users, '_id', UserData.getUser()._id);
                    if (current_user_index >= 0) {
                        msg.viewed_users[current_user_index].unviewed = [];
                    }
                    updateConversationViewed(msg.conversation_id);
                }
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

    // NOTIFICATION for public conversation.
    $rootScope.$on('PUBLIC_NOTIFICATION_UPDATED', function(event, msg) {
        //console.log('PUBLIC_NOTIFICATION_UPDATED');
        var id = Conversations.getConversationId();
        var followed = UserData.getUser().following;
        if ((Conversations.getConversationType() == 'feed' && followed.indexOf(msg.conversation_id) >= 0) || (msg.conversation_id == Conversations.getConversationId())) {
            // Get the updated card (not necessarily the latest card).
            Cards.getCard(msg.card_id)
                .then(function(result) {
                    updateCard(result.data);
                    // Update Conversations
                    // TODO Check that this is the latest
                    UserData.conversationsLatestCardAdd(msg.conversation_id, result.data);
                });
        }
    });

    // NOTIFICATION for private conversation.
    $rootScope.$on('PRIVATE_NOTIFICATION_DELETED', function(event, msg) {
        //console.log('PRIVATE_NOTIFICATION_DELETED');
        UserData.addConversationViewed(msg.conversation_id, msg.viewed_users);
        var id = Conversations.getConversationId();
        // Get the updated card (not necessarily the latest card).
        Cards.getCard(msg.card_id)
            .then(function(res) {
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

    // NOTIFICATION for private conversation.
    $rootScope.$on('PUBLIC_NOTIFICATION_DELETED', function(event, msg) {
        //console.log('PUBLIC_NOTIFICATION_DELETED');
        var id = Conversations.getConversationId();
        var followed = UserData.getUser().following;
        if (Conversations.getConversationType() == 'feed' && followed.indexOf(msg.conversation_id) >= 0) {
            deleteCard(msg.card_id);
        } else if (msg.conversation_id == id) {
            deleteCard(msg.card_id);
        }
        // Get the updated card (not necessarily the latest card).
        Cards.getCard(msg.card_id)
            .then(function(res) {
                UserData.conversationsLatestCardAdd(msg.conversation_id, res.data);
            });
    });

    $scope.$on('UPDATE_CONTACT', function(event, msg) {
        //console.log('UPDATE_CONTACT');
        var id = msg.update_values._id;
        updateUserData(id, msg.update_values);
    });

    // Broadcast by socket service when (notification) data needs to be updated.
    $scope.$on('UPDATE_DATA', function(event, msg) {
        UserData.addContact(msg.update_values)
            .then(function(result) {});
    });

    //
    // ROUTE ANIMATION
    //

    var from;
    var to;

    $rootScope.$on('$routeChangeSuccess', function(event, next, prev) {
        if (prev != undefined) {
            $rootScope.prev_route = prev.$$route.originalPath;
        }
    });

    $scope.$on('$routeChangeStart', function($event, next, current) {
        to = next.$$route.originalPath;
        if (current != undefined) {
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
        } else if (from == '/chat/conversation/:id' && to == '/c/contacts') {
            //console.log('FROM /chat/conversation/:id TO /c/contacts');
            viewAnimationsService.setLeaveAnimation('page-anim z7000');
            viewAnimationsService.setEnterAnimation('page-static z6000');
        } else if (from == '/api/group_info/:id' && to == '/chat/conversation/:id') {
            //console.log('FROM /api/group_info/:id TO /chat/conversation/:id');
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z7000');
        } else if (from == '/chat/conversations' && to == '/c/contacts') {
            //console.log('FROM /chat/conversations TO /c/contacts');
            viewAnimationsService.setLeaveAnimation('page-static z5000');
            viewAnimationsService.setEnterAnimation('page-anim z7000');
        } else if (from == '/c/contacts' && to == '/chat/conversations') {
            //console.log('FROM /c/contacts TO /chat/conversations');
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z7000');
            $('#page-system').removeClass("page-static");
            $('#page-system').addClass("page-anim");
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