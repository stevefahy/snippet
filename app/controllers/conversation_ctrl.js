cardApp.controller("conversationCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'Users', '$routeParams', '$timeout', 'moment', 'socket', function($scope, $rootScope, $location, $http, $window, Cards, replaceTags, Format, Edit, Conversations, Users, $routeParams, $timeout, moment, socket) {

    $scope.getFocus = Format.getFocus;
    $scope.contentChanged = Format.contentChanged;
    $scope.checkKey = Format.checkKey;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    $scope.uploadFile = Format.uploadFile;
    $scope.myFunction = Edit.myFunction;

    $scope.dropDownToggle = Edit.dropDownToggle;

    //$scope.sendConvId = Format.sendConvId;

    var conversation_length = 0;
    $scope.isMember = false;

    // Detect soft keyboard on Android
    var is_landscape = false;
    var initial_height = window.innerHeight;
    var initial_width = window.innerWidth;
    var portrait_height;
    var landscape_height;
    //var footer_visible = true;
    console.log('1 initial_height: ' + initial_height + ', initial_width: ' + initial_width);

    // If the initial height is less than the screen height (status bar etc..)
    // then adjust the initial width to take into account this difference
    if (initial_height < screen.height) {
        initial_width = initial_width - (screen.height - initial_height);
    }

    if (initial_height > initial_width) {
        //portrait
        // If the initial height is less than the screen height (status bar etc..)
        // then adjust the initial width to take into account this difference
        //if (initial_height < screen.height) {
        //    initial_width = initial_width - (screen.height - initial_height);
        //}
        //console.log('2 initial_height: ' + initial_height + ', initial_width: ' + initial_width);
        portrait_height = initial_height;
        landscape_height = initial_width;
    } else {
        // landscape
        // If the initial height is less than the screen height (status bar etc..)
        // then adjust the initial width to take into account this difference
        //if (initial_height < screen.height) {
        //    initial_width = initial_width - (screen.height - initial_height);
        //}
        //console.log('2 initial_height: ' + initial_height + ', initial_width: ' + initial_width);

        landscape_height = initial_height;
        portrait_height = initial_width;
    }

    /* Android */
    if (ua !== 'AndroidApp') {
        window.addEventListener("resize", function() {

            is_landscape = (screen.height < screen.width);

            console.log(screen.height + ' : ' + screen.width + ', landscape_height: ' + landscape_height + ', portrait_height: ' + portrait_height);
            console.log('window.innerHeight: ' + window.innerHeight + ',window.innerWidth: ' + window.innerWidth);
            console.log('window.outerHeight: ' + window.outerHeight + ',window.outerWidth: ' + window.outerWidth);

            if (is_landscape) {
                if (window.innerHeight < landscape_height) {
                    hideFooter();
                } else {
                    showFooter();
                }
            } else {
                if (window.innerHeight < portrait_height) {
                    hideFooter();
                } else {
                    showFooter();
                }
            }
        }, false);
    }

    hideFooter = function() {
        $('.footer').animate({ height: 0 }, 0);
        //footer_visible = false;
    };

    showFooter = function() {
        $('.footer').animate({ height: 50 }, 0);
        //footer_visible = true;
    };



    setFocus = function() {
        $timeout(function() {
            //var element = $window.document.getElementById('cecard_create');
            //if (element) {
            //element.focus();
            console.log('conv focus');

            loadConversation(function(result) {
                $rootScope.$broadcast('CONV_CHECK');
            });

            //}
        });
    };

    var ua = navigator.userAgent;
    // only check focus on web version
    if (ua !== 'AndroidApp') {
        $window.onfocus = function() {
            console.log('focus');
            this.setFocus();
        };
        $window.onblur = function() {
            console.log('blur');
        };
        $window.focus();
        setFocus();
    }

    // Function called from core.js by dynamically added input type=checkbox.
    // It rewrites the HTML to save the checkbox state.
    checkBoxChanged = function(checkbox) {
        if (checkbox.checked) {
            checkbox.setAttribute("checked", "true");
        } else {
            checkbox.removeAttribute("checked");
        }

    };

    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            console.log($scope.currentUser);
            $scope.currentUser = result.data.user;
        }
        console.log($scope.currentUser);
        loadConversation();
    });

    // Get the FCM details
    $http.get("/api/fcm_data").then(function(result) {
        fcm = result.data.fcm;
    });

    // Check the current users permissions for this conversation

    checkPermission = function(conversation_id) {
        console.log('checkPermission: ' + conversation_id);
        console.log($scope.currentUser);
        if ($scope.currentUser) {
            console.log($scope.currentUser);
            Conversations.find_conversation_id(conversation_id)
                .then(function(res) {
                    var user_pos = findWithAttr(res.data.participants, '_id', $scope.currentUser._id);
                    console.log(user_pos);
                    if (user_pos >= 0) {
                        $scope.isMember = true;
                    } else {
                        $scope.isMember = false;
                    }
                });
        } else {
            return false;
        }
    };



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
    loadConversation = function(callback) {
        if (id === undefined) {
            // Use the username to load that users public conversation
            if ($routeParams.username != undefined) {
                username = $routeParams.username;
                console.log(username);
                Conversations.find_user_public_conversation_id(username)
                    .then(function(res) {
                        // check if this is a valid username
                        if (res.data.error) {
                            console.log('error: ' + res.data.error);
                        } else {
                            // get the public conversation id for this username
                            id = res.data._id;
                            console.log(id);
                            // Set the conversation id so that it can be retrieved by cardcreate_ctrl
                            Conversations.setConversationId(id);
                            getConversation(id, 500);
                            $scope.isMember = checkPermission(id);
                            console.log($scope.isMember);
                            //callback();
                        }
                    });
            }
        } else {
            Conversations.setConversationId(id);
            getConversation(id, 500);
            $scope.isMember = checkPermission(id);
            console.log($scope.isMember);
            //callback();
        }
    };
    //console.log(id);

    // find the array index of an object value
    function findWithAttr(array, attr, value) {
        for (var i = 0; i < array.length; i += 1) {
            console.log(array[i][attr] + ' : ' + value);
            if (array[i][attr] === value) {
                return i;
            }
        }
        return -1;
    }

    // update the conversation viewed number by conversation id if it is more than the stored number
    updateConversationViewed = function(id, number) {
        // if logged in
        if ($scope.isMember) {
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

    getConversationId = function() {
        console.log('Conversations.getConversationId(): ' + Conversations.getConversationId());
        //return Conversations.getConversationId();
        if (ua == 'AndroidApp') {
            Android.conversationId(id);
        }


    };

    // called by NOTIFICATION broadcast when another user has updated this conversation
    getConversationUpdate = function(id) {
        // get all cards for a conversation by conversation id
        $http.get("/chat/get_conversation/" + id).then(function(result) {
            console.log(result);
            // find only the new cards which have been posted
            var updates = result.data.slice(conversation_length, result.data.length);
            if (conversation_length < result.data.length) {
                // update the conversation with the new cards
                updates.map(function(key) {
                    updateConversation(key);
                });
            }
            // update existing cards
            //console.log('updated: ' + result.data);
            //console.log('cards: ' + $scope.cards);

            // Check for updated cards
            var updated = findDifference(result.data, $scope.cards);
            console.log(updated);
            // If there is a difference between cards content update that card 
            if (updated.length > 0) {
                console.log($scope.cards);
                var card_pos = findWithAttr($scope.cards, '_id', updated[0]._id);
                console.log('card_pos: ' + card_pos);
                console.log($scope.cards[card_pos]);
                if (card_pos >= 0) {
                    $scope.cards[card_pos].content = updated[0].content;
                    $scope.cards[card_pos].updatedAt = updated[0].updatedAt;
                }
            }


            // Check for deleted cards
            if ($scope.cards.length > result.data.length) {
                var deleted = findDifference($scope.cards, result.data);
                console.log(deleted);

                if (deleted.length > 0) {
                    var deleted_card_pos = findWithAttr($scope.cards, '_id', deleted[0]._id);
                    //$scope.cards[deleted_card_pos].content = updated[0].content; 
                    console.log(deleted_card_pos);
                    if (deleted_card_pos >= 0) {
                        $scope.cards.splice(deleted_card_pos, 1);
                    }
                }
            }


        });
    };

    function comparer(otherArray) {
        return function(current) {
            return otherArray.filter(function(other) {
                return other.content == current.content;
                //return other.value == current.value && other.display == current.display
            }).length == 0;
        };
    }

    findDifference = function(new_cards, old_cards) {
        console.log(new_cards);
        var onlyInA = new_cards.filter(comparer(old_cards));
        //var onlyInB = old_cards.filter(comparer(new_cards));

        //console.log(onlyInA);
        //console.log(onlyInB);
        //return result = onlyInA.concat(onlyInB);
        return onlyInA;

        //console.log('result: ' + JSON.stringify(result));
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
        console.log('NOTIFICATION notify_users, conv id: ' + msg.conversation_id + ', participants: ' + msg.participants);
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


                // Update the Conversation updateAt time.
                Conversations.updateTime(id)
                    .then(function(response) {
                        // socket.io emit the card posted to the server
                        socket.emit('card_posted', { sender_id: socket.getId(), conversation_id: response.data._id, participants: response.data.participants });
                        // Send notifications
                        // Set the FCM data for the request
                        var data = {
                            "to": "",
                            "notification": {
                                "title": "",
                                "body": ""
                            },
                            "data": {
                                "url": ""
                            }
                        };
                        var headers = {
                            'Authorization': 'key=' + fcm.firebaseserverkey,
                            'Content-Type': 'application/json'
                        };
                        var options = {
                            uri: 'https://fcm.googleapis.com/fcm/send',
                            method: 'POST',
                            headers: headers,
                            json: data
                        };
                        for (var i in response.data.participants) {
                            // dont emit to the user which sent the card
                            if (response.data.participants[i]._id !== $scope.currentUser._id) {
                                // Find the other user(s)
                                findUser(response.data.participants[i]._id, function(result) {
                                    // get the participants notification key
                                    // get the message title and body
                                    if (result.notification_key !== undefined) {
                                        data.to = result.notification_key;
                                        data.notification.title = $scope.card_create.user;
                                        data.notification.body = sent_content;
                                        // get the conversation id
                                        data.data.url = response.data._id;
                                        Users.send_notification(options);
                                    }
                                });
                            }
                        }
                    });

            });
    };

    // UPDATE ==================================================================
    $scope.updateCard = function(card_id, card) {
        console.log('update card: ' + card);
        card.content = Format.setMediaSize(card_id, card);
        setTimeout(function() {
            $scope.$apply(function() {
                card.content = replaceTags.replace(card.content);
                card.content = replaceTags.removeDeleteId(card.content);
                var pms = { 'id': card_id, 'card': card };
                // call the create function from our service (returns a promise object)
                Cards.update(pms)
                    .success(function(data) {
                        console.log('updated: ' + data);
                        // notify conversation_ctrl that the conversation has been updated
                        //$rootScope.$broadcast('CONV_CHECK', id);
                        //$rootScope.$broadcast('search');
                        var card_pos = findWithAttr($scope.cards, '_id', data._id);
                        console.log('card_pos: ' + card_pos);
                        console.log($scope.cards[card_pos]);
                        console.log('data.updatedAt: ' + data.updatedAt);
                        if (card_pos >= 0) {
                            //$scope.cards[card_pos].content = updated[0].content;
                            $scope.cards[card_pos].updatedAt = data.updatedAt;
                        }


                        // Update the Conversation updateAt time.
                        console.log('update conv time: ' + id);
                        Conversations.updateTime(id)
                            .then(function(response) {
                                // socket.io emit the card posted to the server
                                socket.emit('card_posted', { sender_id: socket.getId(), conversation_id: response.data._id, participants: response.data.participants });
                                // Send notifications
                                // Set the FCM data for the request
                                var data = {
                                    "to": "",
                                    "notification": {
                                        "title": "",
                                        "body": ""
                                    },
                                    "data": {
                                        "url": ""
                                    }
                                };
                                var headers = {
                                    'Authorization': 'key=' + fcm.firebaseserverkey,
                                    'Content-Type': 'application/json'
                                };
                                var options = {
                                    uri: 'https://fcm.googleapis.com/fcm/send',
                                    method: 'POST',
                                    headers: headers,
                                    json: data
                                };
                                for (var i in response.data.participants) {
                                    // dont emit to the user which sent the card
                                    if (response.data.participants[i]._id !== $scope.currentUser._id) {
                                        // Find the other user(s)
                                        findUser(response.data.participants[i]._id, function(result) {
                                            // get the participants notification key
                                            // get the message title and body
                                            if (result.notification_key !== undefined) {
                                                data.to = result.notification_key;
                                                data.notification.title = $scope.card_create.user;
                                                data.notification.body = sent_content;
                                                // get the conversation id
                                                data.data.url = response.data._id;
                                                Users.send_notification(options);
                                            }
                                        });
                                    }
                                }
                            });





                    })
                    .error(function(error) {});
            });
        }, 1000);
    };

}]);