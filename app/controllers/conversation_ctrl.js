cardApp.controller("conversationCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'Users', '$routeParams', '$timeout', 'moment', function($scope, $rootScope, $location, $http, $window, Cards, replaceTags, Format, Edit, Conversations, Users, $routeParams, $timeout, moment) {

    $scope.getFocus = Format.getFocus;
    $scope.contentChanged = Format.contentChanged;
    $scope.checkKey = Format.checkKey;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    $scope.uploadFile = Format.uploadFile;
    $scope.myFunction = Edit.myFunction;

    $scope.dropDownToggle = Edit.dropDownToggle;

    var conversation_length = 0;

    // Get the conversation by id
    getConversation = function(id, speed) {
        $http.get("/chat/get_conversation/" + id).then(function(result) {
            $scope.cards = result.data;
            conversation_length = $scope.cards.length;
            updateConversationViewed(id, conversation_length);
            // Get the user name for the user id
            // TODO dont repeat if user id already retreived
            $scope.cards.map(function(key, array) {
                Users.search_id(key.user)
                    .success(function(res) {
                        if (res.error === 'null') {
                            // user cannot be found
                        }
                        if (res.success) {
                            // Set the user_name to the retrieved name
                            key.user_name = res.success.google.name;
                        }
                    })
                    .error(function(error) {});
            });
            // Scroll to the bootom of the list
            $timeout(function() {
                scrollToBottom(1);
            }, speed);

        });
    };

    // Use the url / id to load the conversation
    var id = $routeParams.id;
    if (id === undefined) {
        // Use the username to load that users public conversation
        if ($routeParams.username != undefined) {
            username = $routeParams.username;
            Conversations.find_user_public_conversation_id(username)
                .then(function(res) {
                    // check if this is a valid username
                    if (res.data.error) {
                        //console.log('error: ' + res.data.error);
                    } else {
                        // get the public conversation id for this username
                        id = res.data._id;
                        // Set the conversation id so that it can be retrieved by cardcreate_ctrl
                        Conversations.setConversationId(id);
                        getConversation(id, 500);
                    }
                });
        }
    } else {
        Conversations.setConversationId(id);
        getConversation(id, 500);
    }

    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            $scope.currentUser = result.data.user;
        }
    });

    // find the array index of an object value
    function findWithAttr(array, attr, value) {
        for (var i = 0; i < array.length; i += 1) {
            if (array[i][attr] === value) {
                return i;
            }
        }
        return -1;
    }

    // update the conversation viewed number by conversation id if it is more than the stored number
    updateConversationViewed = function(id, number) {
        // if logged in
        if ($scope.currentUser) {
            Conversations.find_conversation_id(id)
                .then(function(res) {
                    var user_pos = findWithAttr(res.data.participants, '_id', $scope.currentUser._id);
                    // check that the current number is greater thsn the stored number
                    if (number > res.data.participants[user_pos].viewed) {
                        // update the viewed number by conversation id, current user id with the number
                        Conversations.updateViewed(id, $scope.currentUser._id, number)
                            .then(function(res) {
                                //console.log(res.data);
                            });
                    }
                });
        }
    };

    // called by NOTIFICATION broadcast when another user has updated this conversation
    getConversationUpdate = function(id) {
        // get all cards for a conversation by conversation id
        $http.get("/chat/get_conversation/" + id).then(function(result) {
            // find only the new cards which have been posted
            var updates = result.data.slice(conversation_length, result.data.length);
            if (conversation_length < result.data.length) {
                // update the conversation with the new cards
                updates.map(function(key) {
                    updateConversation(key);
                });
            }
        });
    };

    // Scroll to the bottom of the list
    scrollToBottom = function(speed) {
        $('html, body').animate({
            scrollTop: $('#bottom').offset().top
        }, speed, function() {});
    };

    // Broadcast by cardcreate_ctrl when a new card has been created
    $scope.$on('CONV_UPDATED', function(event, data) {
        updateConversation(data);
    });

    // Broadcast by cardcreate_ctrl when the window regains focus
    $scope.$on('CONV_CHECK', function() {
        getConversationUpdate(id);
    });

    // update the conversation with the new card data
    updateConversation = function(data) {
        // Get the user name for the user id
        // TODO dont repeat if user id already retreived
        Users.search_id(data.user)
            .success(function(res) {
                if (res.error === 'null') {
                    // user cannot be found
                }
                if (res.success) {
                    // Set the user_name to the retrieved name
                    data.user_name = res.success.google.name;
                }
            })
            .error(function(error) {});
        // Update the cards model
        $scope.cards.push(data);
        // pudate the number of cards in this conversation
        conversation_length = $scope.cards.length;
        // update the conversation viewed number for this user in this conversation
        updateConversationViewed(data.conversationId, conversation_length);
        // scroll if necessary
        $timeout(function() {
            scrollToBottom(1000);
        }, 200);
    };

    // Broadcast by socket service when a new card has been posted by another user to this user
    $scope.$on('NOTIFICATION', function(event, msg) {
        //console.log('NOTIFICATION notify_users, conv id: ' + msg.conversation_id + ', participants: ' + msg.participants);
        // only update the conversation if the user is currently in that conversation
        if (id === msg.conversation_id) {
            getConversationUpdate(msg.conversation_id);
        }
    });

    // DELETE ==================================================================
    $scope.deleteCard = function(card_id) {
        Cards.delete(card_id)
            .success(function(data) {
                //$rootScope.$broadcast('search');
                getConversation(id, 500);
            });
    };

    // UPDATE ==================================================================
    $scope.updateCard = function(id, card) {
        card.content = Format.setMediaSize(id, card);
        setTimeout(function() {
            $scope.$apply(function() {
                card.content = replaceTags.replace(card.content);
                card.content = replaceTags.removeDeleteId(card.content);
                var pms = { 'id': id, 'card': card };
                // call the create function from our service (returns a promise object)
                Cards.update(pms)
                    .success(function(data) {
                        $rootScope.$broadcast('search');
                    })
                    .error(function(error) {});
            });
        }, 1000);
    };

}]);