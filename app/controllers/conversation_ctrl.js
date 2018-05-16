cardApp.controller("conversationCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'Users', '$routeParams', '$timeout', 'moment', 'socket', 'Database', 'General', 'Profile', function($scope, $rootScope, $location, $http, $window, Cards, replaceTags, Format, Edit, Conversations, Users, $routeParams, $timeout, moment, socket, Database, General, Profile) {

    //this.$onInit = function() {
    $scope.getFocus = Format.getFocus;
    $scope.getBlur = Format.getBlur;
    $scope.contentChanged = Format.contentChanged;
    $scope.checkKey = Format.checkKey;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    $scope.uploadFile = Format.uploadFile;
    $scope.myFunction = Edit.myFunction;
    $scope.dropDownToggle = Edit.dropDownToggle;
    $scope.pasteHtmlAtCaret = Format.pasteHtmlAtCaret;
    $scope.checkCursor = Format.checkCursor;
    $scope.isMember = false;
    //};

    General.keyBoardListenStart();

    // Use the urls id param from the route to load the conversation.
    var id = $routeParams.id;
    console.log('initial id: ' + id);
    // Use the urls username param from the route to load the conversation.
    var username = $routeParams.username;

    // Detect device user agent 
    var ua = navigator.userAgent;

    // Add custom class for Android scrollbar
    if (ua.indexOf('AndroidApp') >= 0) {
        $('.content_cnv').addClass('content_cnv_android');
    }

    // Broadcast by cardcreate_ctrl and conversation_ctrl when the window regains focus
    $scope.$on('CONV_CHECK', function() {
        var id = Conversations.getConversationId();
        getConversationUpdate(id);
    });

    // Broadcast by socket service when a  card has been created, updated or deleted by another user to this user
    $scope.$on('NOTIFICATION', function(event, msg) {
        console.log('NOTIFICATION');
        var id = Conversations.getConversationId();
        // only update the conversation if the user is currently in that conversation
        if (id === msg.conversation_id) {
            getConversationUpdate(msg.conversation_id);
        }
    });

    // Broadcast by Database createCard service when a new card has been created
    $scope.$on('CARD_CREATED', function(event, data) {
        updateConversation(data);
    });

    // Broadcast by Database updateCard service when a card has been updated.
    $scope.$on('CARD_UPDATED', function(event, data) {
        var card_pos = General.findWithAttr($scope.cards, '_id', data._id);
        if (card_pos >= 0) {
            $scope.cards[card_pos].updatedAt = data.updatedAt;
            $scope.cards[card_pos].original_content = $scope.cards[card_pos].content;
        }
    });

    // Broadcast by Database deleteCard service when a card has been deleted.
    $scope.$on('CARD_DELETED', function(event, card_id) {
        // find the position of the deleted card within the cards array.
        var deleted_card_pos = General.findWithAttr($scope.cards, '_id', card_id);
        // if the card is found then remove it.
        if (deleted_card_pos >= 0) {
            $scope.cards.splice(deleted_card_pos, 1);
        }
    });

    // TODO - change to global?
    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            $scope.currentUser = result.data.user;
        }
        // Start watching onfocus and onblur, then load the conversation for the first time.
        watchFocus();
    });

    // DELETE ==================================================================
    $scope.deleteCard = function(card_id, conversation_id) {
        Database.deleteCard(card_id, conversation_id, $scope.currentUser);
    };

    // Called as each card is loaded.
    // Disable checkboxes if the contenteditable is set to false.
    $scope.disableCheckboxes = function(id) {
        $timeout(function() {
            var el = document.getElementById('ce' + id);
            if ($(el).attr('contenteditable') == 'false') {
                $(el).find('input[type=checkbox]').attr('disabled', 'disabled');
            }
        }, 0);
    };

    function comparer(otherArray) {
        return function(current) {
            return otherArray.filter(function(other) {
                return other.content == current.content;
            }).length == 0;
        };
    }

    function comparerDeleted(otherArray) {
        return function(current) {
            return otherArray.filter(function(other) {
                return other._id == current._id;
            }).length == 0;
        };
    }

    findDifference = function(new_cards, old_cards, type) {
        var onlyInA;
        if (type == 'updated') {
            onlyInA = new_cards.filter(comparer(old_cards));
        } else if (type == 'deleted') {
            onlyInA = new_cards.filter(comparerDeleted(old_cards));
        }
        return onlyInA;
    };

    setFocus = function() {
        console.log('SF');
        $timeout(function() {
            findConversationId();
        });
    };

    $scope.$on('$destroy', function() {
        // clean up stuff
        console.log('BYE');
        $window.onfocus = null;
    });

    // start watching onfocus and onblur
    watchFocus = function() {
        // only check focus on web version
        if (ua.indexOf('AndroidApp') < 0) {
            $window.onfocus = function() {
                this.setFocus();
            };
            $window.onblur = function() {
                //console.log('blur');
            };
            //$window.focus();
            setFocus();
        } else {
            setFocus();
        }
    };

    // Scroll to the bottom of the list
    scrollToBottom = function(speed) {
        $timeout(function() {
            var bottom = $('.content_cnv')[0].scrollHeight;
            $('.content_cnv').animate({
                scrollTop: bottom
            }, speed, function() {});
        }, 200);
    };

    // TODO - make service (also in card_create.js)
    // Function called from core.js by dynamically added input type=checkbox.
    // It rewrites the HTML to save the checkbox state.
    checkBoxChanged = function(checkbox) {
        if (checkbox.checked) {
            checkbox.setAttribute("checked", "true");
        } else {
            checkbox.removeAttribute("checked");
        }
        // Firefox bug - when contenteditable = true a checkbox cannot be selected
        // Fix - create a span around the checkbox with a contenteditable = false
        // Get the span around the checkbox.
        var node = $(checkbox).closest('#checkbox_edit');
        // Temporarily change the id
        $(node).attr("id", "checkbox_current");
        // Get the node of the temp id.
        node = document.getElementById('checkbox_current');
        // Set focus back to the card so that getBlur and getFocus function to update the card.
        var range = document.createRange();
        range.setStartAfter(node);
        var sel = window.getSelection();
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        // Reset the id
        node.setAttribute('id', 'checkbox_edit');
    };

    checkBoxMouseover = function(checkbox) {
        // Fix for Firefox
        // Get the initial contenteditable value for this card.
        var card = $(checkbox).closest(".ce");
        var initial_state = $(card).attr('contenteditable');
        // If Firefox
        if (ua.toLowerCase().indexOf('firefox') > -1) {
            var span = $(checkbox).closest("#checkbox_edit");
            // If this is a editable card.
            if (initial_state == 'true') {
                // temp set editable to false so that it can be checked on Firefox.
                $(span).attr('contenteditable', 'false');
            } else {
                // set editable to true so that it cannot be checked as this is not an editable card.
                $(span).attr('contenteditable', 'true');
            }
        }
    };

    checkBoxMouseout = function(checkbox) {
        // Fix for Firefox
        // Reset the edit value to its default true
        if (ua.toLowerCase().indexOf('firefox') > -1) {
            var span = $(checkbox).closest("#checkbox_edit");
            $(span).attr('contenteditable', 'true');
        }
    };

    // Find the conversation id.
    findConversationId = function() {
        // Use the id from $routeParams.id if it exists. 
        // The conversation may have been loaded by username.
        if (id === undefined) {
            // Use the username from $routeParams.username to load that users Public conversation.
            if (username != undefined) {
                Conversations.find_user_public_conversation_id(username)
                    .then(function(res) {
                        console.log(res);
                        // check if this is a valid username
                        if (res.data.error) {
                            console.log('error: ' + res.data.error);
                            $location.path("/api/login");
                        } else {
                            var profile = {};
                            profile.user_name = res.data.conversation_name;
                            profile.avatar = res.data.conversation_avatar;
                            Profile.setProfile(profile);
                            $rootScope.$broadcast('PROFILE_SET');
                            // get the public conversation id for this username
                            var public_id = res.data._id;
                            // Set the conversation id so that it can be retrieved by cardcreate_ctrl
                            Conversations.setConversationId(public_id);
                            // Check the users permission for this conversation. (logged in and participant)
                            checkPermission(public_id, function(result) {
                                $scope.isMember = result;
                                getPublicConversation(public_id, res.data.conversation_name, 500);
                            });
                        }
                    })
                    .catch(function(error) {
                        console.log(error);
                    });
            }
        } else {
            console.log(id);
            Conversations.setConversationId(id);
            // Check the users permission for this conversation. (logged in and participant)
            checkPermission(id, function(result) {
                $scope.isMember = result;
                if (result) {
                    getConversation(id, 500);
                } else {
                    $location.path("/api/login");
                }
            });
        }
    };

    // Called by Android to get the conversation id.
    getConversationId = function() {
        if (ua.indexOf('AndroidApp') >= 0) {
            var id = Conversations.getConversationId();
            Android.conversationId(id);
        }
    };

    // Check the users permission for this conversation. (logged in and participant)
    // If the user is logged in and a participant of the conversation the $scope.isMember=true.
    // card_create.html is added to the conversation if $scope.isMember=true.
    checkPermission = function(conversation_id, callback) {
        console.log('CP?');
        // If looged in
        if ($scope.currentUser) {
            // Find the conversation by id.
            Conversations.find_conversation_id(conversation_id)
                .then(function(res) {
                    console.log(res);
                    // Find the current user in the conversation participants array.
                    var user_pos = General.findWithAttr(res.data.participants, '_id', $scope.currentUser._id);
                    if (user_pos >= 0) {
                        // user found in the participants array.
                        callback(true);
                    } else {
                        // user not found in the participants array.
                        callback(false);
                    }
                });
        } else {
            // not logged in.
            callback(false);
        }
    };


    getPublicConversation = function(id, name, speed) {
        Conversations.getPublicConversationById(id)
            .then(function(result) {
                console.log(result);
                $scope.cards = result.data;
                // Clear the cards unviewed arrary for this participant of this conversation.
                //updateConversationViewed(id);
                // Map relevant data to the loaded cards.
                if ($scope.cards.length > 0) {
                    $scope.cards.map(function(key, array) {
                        console.log(key);
                        // Store the original characters of the card.
                        key.original_content = key.content;


                        // Get the user name for the user id
                        key.user_name = name;


                        // TODO dont repeat if user id already retreived
                        /*
                        Users.search_id(key.user)
                            .then(function(res) {
                                console.log(res);
                                if (res.data.error === 'null') {
                                    // user cannot be found
                                }

                                if (res.data.success) {
                                    // Set the user_name to the retrieved name
                                    key.user_name = res.data.success.user_name;
                                    var profile = {};
                                    if (res.data.success.user_name == undefined) {
                                        profile.user_name = res.data.success.google.name;
                                    } else {
                                        profile.user_name = res.data.success.user_name;
                                    }
                                    if (res.data.success.avatar == undefined) {
                                        profile.avatar = 'default';
                                    } else {
                                        profile.avatar = res.data.success.avatar;
                                    }
                                    // Store the profile.
                                    console.log(profile);
                                    Profile.setProfile(profile);
                                    $rootScope.$broadcast('PROFILE_SET');
                                }
                            })
                            .catch(function(error) {
        console.log('error: ' + error);
    });
                            */
                    });
                }
                // Scroll to the bottom of the list
                $timeout(function() {
                    scrollToBottom(1);
                }, speed);
            })
            .catch(function(error) {
                console.log('error: ' + error);
            });
    };


    // Get the conversation by id
    getConversation = function(id, speed) {
        Conversations.getConversationById(id)
            .then(function(result) {
                $scope.cards = result.data;
                // Clear the cards unviewed arrary for this participant of this conversation.
                updateConversationViewed(id);
                // Map relevant data to the loaded cards.
                $scope.cards.map(function(key, array) {
                    // Store the original characters of the card.
                    key.original_content = key.content;
                    // Get the user name for the user id
                    // TODO dont repeat if user id already retreived
                    Users.search_id(key.user)
                        .then(function(res) {
                            if (res.data.error === 'null') {
                                // user cannot be found
                            }
                            if (res.data.success) {
                                // Set the user_name to the retrieved name
                                key.user_name = res.data.success.user_name;
                            }
                        })
                        .catch(function(error) {
                            console.log('error: ' + error);
                        });
                });
                // Scroll to the bottom of the list
                $timeout(function() {
                    scrollToBottom(1);
                }, speed);
            });
    };

    // clear the participants unviewed array by conversation id
    updateConversationViewed = function(id) {
        // If the user is logged in and a participant of the conversation the $scope.isMember=true.
        if ($scope.isMember) {
            Conversations.clearViewed(id, $scope.currentUser._id)
                .then(function(res) {
                    //console.log(res.data);
                });
        }
    };

    // called by NOTIFICATION broadcast when another user has updated this conversation
    getConversationUpdate = function(id) {
        // get all cards for a conversation by conversation id
        Conversations.getConversationById(id)
            .then(function(result) {
                // get the number of cards in the existing conversation
                var conversation_length = $scope.cards.length;
                // Check for new cards.
                // find only the new cards which have been posted
                var updates = result.data.slice(conversation_length, result.data.length);
                if (conversation_length < result.data.length) {
                    // update the conversation with the new cards
                    updates.map(function(key) {
                        updateConversation(key);
                    });
                }
                // Check for updated cards
                var updated = findDifference(result.data, $scope.cards, 'updated');
                // If there is a difference between cards content update that card 
                // TODO Can there be more then one updated card?
                if (updated.length > 0) {
                    // Find the card postion within the cards array.
                    var card_pos = General.findWithAttr($scope.cards, '_id', updated[0]._id);
                    // If the card is found then update it.
                    if (card_pos >= 0) {
                        $scope.cards[card_pos].content = updated[0].content;
                        $scope.cards[card_pos].updatedAt = updated[0].updatedAt;
                    }
                    // Clear the cards unviewed arrary for this participant of this conversation.
                    updateConversationViewed(id);
                }
                // Check for deleted cards
                if ($scope.cards.length > result.data.length) {
                    var deleted = findDifference($scope.cards, result.data, 'deleted');
                    // TODO Can there be more then one deleted card?
                    // If there are deleted cards.
                    if (deleted.length > 0) {
                        // Find the card postion within the cards array.
                        var deleted_card_pos = General.findWithAttr($scope.cards, '_id', deleted[0]._id);
                        //If the card is found then delete it.
                        if (deleted_card_pos >= 0) {
                            $scope.cards.splice(deleted_card_pos, 1);
                        }
                    }
                }
            });
    };

    // update the conversation with the new card data
    updateConversation = function(data) {
        // Get the user name for the user id
        // TODO dont repeat if user id already retreived
        Users.search_id(data.user)
            .then(function(res) {
                if (res.error === 'null') {
                    // user cannot be found
                }
                if (res.data.success) {
                    // Set the user_name to the retrieved name
                    data.user_name = res.data.success.user_name;
                }
            })
            .catch(function(error) {
                console.log('error: ' + error);
            });
        // Update the cards model
        $scope.cards.push(data);
        // Map relevant data to the loaded cards.
        $scope.cards.map(function(key, array) {
            // Store the new original characters of the card.
            key.original_content = key.content;
        });
        // Clear the cards unviewed arrary for this participant of this conversation.
        updateConversationViewed(data.conversationId);
        // scroll if necessary
        $timeout(function() {
            scrollToBottom(1000);
        }, 200);
    };

}]);