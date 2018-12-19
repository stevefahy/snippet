cardApp.controller("conversationCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', '$q', '$filter', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'Users', '$routeParams', '$timeout', 'moment', 'socket', 'Database', 'General', 'Profile', 'principal', 'UserData', 'Cropp', '$compile', 'ImageAdjustment', function($scope, $rootScope, $location, $http, $window, $q, $filter, Cards, replaceTags, Format, Edit, Conversations, Users, $routeParams, $timeout, moment, socket, Database, General, Profile, principal, UserData, Cropp, $compile, ImageAdjustment) {

    openCrop = Cropp.openCrop;
    setCrop = Cropp.setCrop;
    editImage = Cropp.editImage;
    closeEdit = Cropp.closeEdit;
    filterImage = Cropp.filterImage;
    closeFilters = Cropp.closeFilters;
    filterClick = Cropp.filterClick;
    settingsImage = Cropp.settingsImage;
    adjustImage = Cropp.adjustImage;

    // Detect device user agent 
    var ua = navigator.userAgent;

    var INIT_NUM_TO_LOAD = 20;
    var NUM_TO_LOAD = INIT_NUM_TO_LOAD;

    var INIT_NUM_TO_DISPLAY = 5;
    var NUM_TO_DISPLAY = INIT_NUM_TO_DISPLAY;

    var loading_cards = false;

    $scope.feed = false;

    $rootScope.pageLoading = true;
    $rootScope.last_win_width;

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
    $scope.cards = [];

    // Use the urls id param from the route to load the conversation.
    var id = $routeParams.id;
    // Use the urls username param from the route to load the conversation.
    var username = $routeParams.username;

    General.keyBoardListenStart();

    $scope.inifiniteScroll = function() {
        if ($scope.total_to_display != undefined && $scope.cards != undefined) {
            var id = Conversations.getConversationId();
            var td = $scope.total_to_display;
            if (!$scope.feed) {
                td *= -1;
            }
            if (td >= ($scope.cards.length / 2)) {
                if ($scope.feed) {
                    $scope.total_to_display += NUM_TO_LOAD;
                } else {
                    $scope.total_to_display -= NUM_TO_LOAD;
                }
            }
            if (td < $scope.cards.length) {
                if ($scope.feed) {
                    $scope.total_to_display += NUM_TO_DISPLAY;
                } else {
                    $scope.total_to_display -= NUM_TO_DISPLAY;
                }
            } else {
                if ($scope.feed) {
                    $scope.total_to_display += NUM_TO_LOAD;
                } else {
                    $scope.total_to_display -= NUM_TO_LOAD;
                }
            }
        }
    };

    $scope.follow = function(card) {
        // Find the public conversation for this user.
        Conversations.find_user_public_conversation_by_id(card.user)
            .then(function(result) {
                console.log(result);
                if (result.data.conversation_type == 'public') {
                    // If following then unfollow
                    var pms = { 'id': result.data._id, 'user': UserData.getUser()._id };
                    if (card.following) {
                        // Update conversation in DB.
                        Conversations.deleteFollower(pms)
                            .then(function(result) {
                                Users.unfollow_conversation(result.data._id)
                                    .then(function(result) {
                                        UserData.setUser(result.data);
                                        $scope.currentUser = UserData.getUser();
                                        console.log('2');
                                        updateFollowingIcons($scope.cards)
                                            .then(function(result) {
                                                // Remove this users cards from the feed.
                                                displayFollowing();
                                            });
                                    });
                            });
                    } else {
                        // If not following then follow.
                        // Updateconversation in DB.
                        Conversations.addFollower(pms)
                            .then(function(result) {
                                Users.follow_conversation(result.data._id)
                                    .then(function(result) {
                                        UserData.setUser(result.data);
                                        $scope.currentUser = UserData.getUser();
                                        console.log('3');
                                        updateFollowingIcons($scope.cards);
                                    });
                            });
                    }
                }
            });
    };

    $scope.addSlider = function(data) {
        if (data.last_position != undefined) {
            $scope.adjust.sharpen = data.last_position;
        } else {
            $scope.adjust.sharpen = 0;
        }
        var $el = $('<rzslider rz-slider-model="adjust.sharpen" rz-slider-options="adjust.options"></rzslider>').appendTo('#adjust_' + data.id + ' .image_adjust_sharpen');
        $compile($el)($scope);
    };

    $scope.adjust = {
        sharpen: 0,
        options: {
            floor: 0,
            ceil: 20,
            step: 0.1,
            precision: 1,
            id: 'slider-id',
            onStart: function(sharpen) {
                //console.log('on start ' + $scope.adjust.sharpen);
            },
            onChange: function(id) {
                //console.log('on change ' + $scope.adjust.sharpen);
            },
            onEnd: function(id) {
                //console.log('on end ' + $scope.adjust.sharpen);
                ImageAdjustment.setSharpen(ImageAdjustment.getImageId(), ImageAdjustment.getTarget(), ImageAdjustment.getSource(), $scope.adjust.sharpen);
            }
        }
    };

    $scope.$on('$destroy', function() {
        //leaving controller.
        Cropp.destroyCrop();
        $('.image_adjust_on').remove();
        NUM_TO_LOAD = INIT_NUM_TO_LOAD;
    });

    $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
        $rootScope.pageLoading = false;
        var id = Conversations.getConversationId();
        if ($scope.feed) {
            getFollowing();
        } else {
            getCards(id);
        }
        if ($('.cropper-container').length > 0) {
            $('.cropper-container').remove();
            $('.cropper-hidden').removeClass('cropper-hidden');
        }
    });

    $scope.$on('rzSliderRender', function(event, data) {
        $scope.addSlider(data);
    });


    // New
    $scope.$on('SOCKET_RECONNECT', function(event) {
        console.log('SOCKET_RECONNECT');
        //UserData.checkDataUpdate();
        updateFollowing();
    });

    // Broadcast by UserData after it has processed the notification. (card has been created, updated or deleted by another user to this user).
    $scope.$on('CONV_NOTIFICATION', function(event, msg) {
        // only update the conversation if the user is currently in that conversation
        if (id === msg.conversation_id) {
            updateConversationViewed(id);
        }
    });

    $scope.$on('CONV_MODEL_NOTIFICATION', function(event, msg) {
        updateConversation(msg);
        console.log('4');
        updateFollowingIcons($scope.cards);
    });

    // Broadcast by Database createCard service when a new card has been created by this user.
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

    $rootScope.$on('PUBLIC_NOTIFICATION', function(event, msg) {
        if ($location.url() == '/') {
            displayFollowing();
        }
    });

    updateFollowingIcons = function(newValue) {
        /*
        var deferred = $q.defer();
        var promises = [];
        if (newValue != undefined) {
            newValue.map(function(key, array) {
                // Find the public conversation for this user.
                var prom1 = Conversations.find_user_public_conversation_by_id(key.user)
                    .then(function(result) {
                        console.log(result);
                        if ($scope.currentUser.following.indexOf(result.data._id) >= 0) {
                            // The user is following this user.
                            key.following = true;
                        } else {
                            // The user is not following this user.
                            key.following = false;
                        }
                    });
                promises.push(prom1);
            });
        }
        // All following icons have been mapped.
        $q.all(promises).then(function() {
            deferred.resolve();
        });
        return deferred.promise;
        */
    };

    updateCards = function(new_cards) {
        // Delete old cards
        var i = $scope.cards.length;
        while (i--) {
            var card_pos = General.findWithAttr(new_cards, '_id', $scope.cards[i]._id);
            if (card_pos < 0) {
                $scope.cards.splice(i, 1);
            }
        }
        // Add or update new cards
        new_cards.map(function(key, array) {
            var card_pos = General.findWithAttr($scope.cards, '_id', key._id);
            if (card_pos < 0) {
                // Add 
                $scope.cards.push(key);
            } else {
                // Update
                $scope.cards[card_pos] = key;
            }
        });
    };

    displayFollowing = function() {
        var deferred = $q.defer();
        var promises = [];
        var temp_cards = [];
        var followed = UserData.getUser().following;
        followed.map(function(key, array) {
            var prom1 = Conversations.find_public_conversation_id(key)
                .then(function(result) {
                    return Conversations.getPublicConversationById(key)
                        .then(function(res) {
                            res.data.map(function(key, array) {
                                // Store the original characters of the card.
                                key.original_content = result.data.content;
                                // Get the user name for the user id
                                key.user_name = result.data.conversation_name;
                                key.avatar = result.data.conversation_avatar;
                                key.following = true;
                                temp_cards.push(key);
                            });
                            return temp_cards;
                        });
                });
            promises.push(prom1);
        });
        // All the users contacts have been mapped.
        $q.all(promises).then(function() {
            updateCards(temp_cards);
        });
        return deferred.promise;
    };

    updateFollowing = function() {
        if (!loading_cards) {
            $scope.cards_temp = [];
            loading_cards = true;
            var deferred = $q.defer();
            var promises = [];
            var followed = UserData.getUser().following;
            var last_card;
            if ($scope.cards.length > 0) {
                var sort_card = $filter('orderBy')($scope.cards, 'updatedAt');
                // newest card
                last_card = sort_card[sort_card.length - 1].updatedAt; 
            } 
            var val = { ids: followed, amount: NUM_TO_LOAD, last_card: last_card };
            console.log(val);
            console.log($scope.cards);
            var prom1 = Conversations.getFeed(val)
                .then(function(res) {
                    console.log(res);
                    if (res.data.cards.length > 0) {
                        res.data.cards.map(function(key, array) {

                            // Ckeck that this card does not already exist in scope.cards
                            if(General.findWithAttr($scope.cards, '_id', key._id) < 0){

                            // Get the conversation for this card
                            var conversation_pos = General.nestedArrayIndexOfValue(res.data.conversations, 'admin', key.user);
                            var conversation = res.data.conversations[conversation_pos];
                            // Store the original characters of the card.
                            key.original_content = key.content;
                            // Get the user name for the user id
                            key.user_name = conversation.conversation_name;
                            key.avatar = conversation.conversation_avatar;
                            key.following = true;
                            // Load any images offScreen
                            $scope.cards_temp.push(key);

                            }

                        });
                    } else {
                        //console.log('NO MORE RECORDS');
                    }
                });
            promises.push(prom1);
            // All the users contacts have been mapped.
            $q.all(promises).then(function() {
                $scope.cards_temp.map(function(key, array) {
                    $scope.cards.push(key);
                });
                loading_cards = false;
            });
            return deferred.promise;
        }
    };

    // TODO - If not following anyone suggest follow?
    getFollowing = function() {
        if (!loading_cards) {
            $scope.cards_temp = [];
            loading_cards = true;
            var deferred = $q.defer();
            var promises = [];
            var followed = UserData.getUser().following;
            var last_card;
            if ($scope.cards.length > 0) {
                var sort_card = $filter('orderBy')($scope.cards, 'updatedAt');
                last_card = sort_card[0].updatedAt;
            } else {
                last_card = General.getISODate();
            }
            var val = { ids: followed, amount: NUM_TO_LOAD, last_card: last_card };
            console.log(val);
            var prom1 = Conversations.getFeed(val)
                .then(function(res) {
                    console.log(res);
                    if (res.data.cards.length > 0) {
                        res.data.cards.map(function(key, array) {
                            // Get the conversation for this card
                            var conversation_pos = General.nestedArrayIndexOfValue(res.data.conversations, 'admin', key.user);
                            var conversation = res.data.conversations[conversation_pos];
                            // Store the original characters of the card.
                            key.original_content = key.content;
                            // Get the user name for the user id
                            key.user_name = conversation.conversation_name;
                            key.avatar = conversation.conversation_avatar;
                            key.following = true;
                            // Load any images offScreen
                            $scope.cards_temp.push(key);
                        });
                    } else {
                        //console.log('NO MORE RECORDS');
                    }
                });
            promises.push(prom1);
            // All the users contacts have been mapped.
            $q.all(promises).then(function() {
                $scope.cards_temp.map(function(key, array) {
                    $scope.cards.push(key);
                });
                loading_cards = false;
            });
            return deferred.promise;
        }
    };

    getCards = function(id) {
        if (!loading_cards) {
            $scope.cards_temp = [];
            loading_cards = true;
            var deferred = $q.defer();
            var promises = [];
            var last_card;
            if ($scope.cards.length > 0) {
                var sort_card = $filter('orderBy')($scope.cards, 'updatedAt');
                last_card = sort_card[0].updatedAt;
            } else {
                last_card = General.getISODate();
            }
            var val = { id: id, amount: NUM_TO_LOAD, last_card: last_card };
            var prom1 = Conversations.getConversationCards(val)
                .then(function(res) {
                    if (res.data.length > 0) {
                        res.data.map(function(key, array) {
                            // Get the user for this card
                            var users = UserData.getContacts();
                            var user_pos = General.findWithAttr(users, '_id', key.user);
                            var user = users[user_pos];
                            // Store the original characters of the card.
                            key.original_content = key.content;
                            // Get the user name for the user id
                            key.user_name = user.user_name;
                            key.avatar = user.avatar;
                            $scope.cards_temp.push(key);
                        });
                    } else {
                        // console.log('NO MORE RECORDS');
                    }
                });
            promises.push(prom1);
            // All the cards have been mapped.
            $q.all(promises).then(function() {
                $scope.cards_temp.map(function(key, array) {
                    $scope.cards.push(key);
                });
                loading_cards = false;
                deferred.resolve();
            });
            return deferred.promise;
        }
    };

    loadFeed = function() {
        // Set the users profile
        var profile = {};
        profile.user_name = UserData.getUser().user_name;
        profile.avatar = UserData.getUser().avatar;
        Profile.setProfile(profile);
        $rootScope.$broadcast('PROFILE_SET');
        $scope.isMember = true;
        // Load the users public conversation
        console.log(UserData.getUser()._id);
        Conversations.find_user_public_conversation_by_id(UserData.getUser()._id).then(function(result) {
            // Set the conversation id so that it can be retrieved by cardcreate_ctrl
            console.log(result);
            if (result.data._id != undefined) {
                Conversations.setConversationId(result.data._id);
                getFollowing();
            }
        });
    };

    setConversationProfile = function(id) {
        var profile = {};
        Conversations.find_conversation_id(id).then(function(res) {
            res = res.data;
            if (res.conversation_type == 'public') {
                //  $scope.conv_type used for Header
                $scope.conv_type = 'public';
                profile.user_name = res.conversation_name;
                profile.avatar = res.conversation_avatar;
                Profile.setConvProfile(profile);
                $rootScope.$broadcast('PROFILE_SET');
            }
            // Group conversation. (Two or more)
            if (res.conversation_name != '') {
                $scope.conv_type = 'group';
                profile.user_name = res.conversation_name;
                profile.avatar = res.conversation_avatar;
                Profile.setConvProfile(profile);
                $rootScope.$broadcast('PROFILE_SET');
            }
            // Two user conversation (not a group)
            if (res.conversation_name == '') {
                $scope.conv_type = 'two';
                // get the index position of the current user within the participants array
                var user_pos = General.findWithAttr(res.participants, '_id', $scope.currentUser._id);
                // Get the position of the current user
                participant_pos = 1 - user_pos;
                // Find the other user
                UserData.getConversationsUser(res.participants[participant_pos]._id)
                    .then(function(result) {
                        var avatar = "default";
                        // set the other user name as the name of the conversation.
                        if (result) {
                            profile.user_name = result.user_name;
                            avatar = result.avatar;
                        }
                        profile.avatar = avatar;
                        Profile.setConvProfile(profile);
                        $rootScope.$broadcast('PROFILE_SET');
                    });
            }
        });
    };

    loadConversation = function() {
        // Get the conversation id (could be using a username)
        $timeout(function() {
            findConversationId(function(result) {
                var id = result;
                // Set the conversation id so that it can be retrieved by cardcreate_ctrl
                Conversations.setConversationId(id);
                // Set the conversation profile
                setConversationProfile(id);
                // Check the users permission for this conversation. (logged in and participant)
                checkPermission(id, function(result) {
                    $scope.isMember = result;
                    if (result) {
                        getCards(id).then(function(result) {
                            $scope.$broadcast("items_changed", 'bottom');
                        });
                    } else {
                        $location.path("/api/login");
                    }
                });
            });
        });
    };

    if (principal.isValid()) {
        UserData.checkUser().then(function(result) {
            $scope.currentUser = UserData.getUser();
            if ($location.url() == '/') {
                $scope.feed = true;
                $scope.total_to_display = INIT_NUM_TO_DISPLAY;
                $('.content_cnv')
                // Display the users feed.
                loadFeed();
            } else {
                $scope.total_to_display = -INIT_NUM_TO_LOAD;
                // Logged in.Load the conversation for the first time.
                loadConversation();
            }
        });
    } else {
        if ($location.url() != '/') {
            // Public route (Does not need to be logged in).
            loadConversation();
        } else {
            $location.path("/api/login/");
        }

    }

    $scope.changePathGroup = function() {
        $location.path("/api/group_info/" + Conversations.getConversationId());
    };

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

    // TODO - check if compatible with General version.
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
    findConversationId = function(callback) {
        // Use the id from $routeParams.id if it exists. 
        // The conversation may have been loaded by username.
        if (id === undefined) {
            // Use the username from $routeParams.username to load that users Public conversation.
            if (username != undefined) {
                //
                // Public
                //
                Conversations.find_user_public_conversation_id(username)
                    .then(function(res) {
                        // check if this is a valid username
                        if (res.data.error) {
                            $location.path("/api/login");
                        } else {
                            callback(res.data._id);
                        }
                    })
                    .catch(function(error) {
                        console.log(error);
                    });
            }
        } else {
            // Check if this is a public conversation.
            Conversations.find_public_conversation_id(id)
                .then(function(result) {
                    if (result.data != null && result.data.conversation_type == 'public') {
                        getPublicConversation(id, result.data);
                        // Check the users permission for this conversation. (logged in and participant)
                        checkPermission(id, function(result) {
                            $scope.isMember = result;
                        });
                    } else {
                        // private.
                        callback(id);
                    }
                });
        }
    };

    // Check the users permission for this conversation. (logged in and participant)
    // If the user is logged in and a participant of the conversation the $scope.isMember=true.
    // card_create.html is added to the conversation if $scope.isMember=true.
    checkPermission = function(conversation_id, callback) {
        // If looged in
        if ($scope.currentUser) {
            UserData.getConversationModelById(conversation_id)
                .then(function(res) {
                    if (res) {
                        // Find the current user in the conversation participants array.
                        var user_pos = General.findWithAttr(res.participants, '_id', UserData.getUser()._id);
                        if (user_pos >= 0) {
                            // user found in the participants array.
                            callback(true);
                        } else {
                            // user not found in the participants array.
                            callback(false);
                        }
                    } else {
                        // empty conversation
                        UserData.getConversations()
                            .then(function(res) {
                                // Find the conversation in the conversations.
                                var conv_pos = General.findWithAttr(res, '_id', conversation_id);
                                // Find the current user in the conversation participants array.
                                var user_pos = General.findWithAttr(res[conv_pos].participants, '_id', UserData.getUser()._id);
                                if (user_pos >= 0) {
                                    // user found in the participants array.
                                    // Add this conversation to the local model.
                                    UserData.addConversationModel(res[conv_pos])
                                        .then(function(result) {
                                            // If this is the first card in a new conversation then create the cards model for this conversation.
                                            UserData.addCardsModelById(res[conv_pos]._id)
                                                .then(function(res) {
                                                    //console.log(res);
                                                });
                                        });
                                    callback(true);
                                } else {
                                    // user not found in the participants array.
                                    callback(false);
                                }
                            });
                    }
                });
        } else {
            // not logged in.
            callback(false);
        }
    };

    getPublicConversation = function(id, conv) {
        var profile = {};
        Conversations.getPublicConversationById(id)
            .then(function(result) {
                //console.log('GEt PUBLIC');
                $scope.cards = result.data;
                // Map relevant data to the loaded cards.
                if ($scope.cards.length > 0) {
                    $scope.cards.map(function(key, array) {
                        // Store the original characters of the card.
                        key.original_content = key.content;
                        // Get the user name for the user id
                        key.user_name = conv.conversation_name;
                        key.avatar = conv.conversation_avatar;
                        profile.user_name = conv.conversation_name;
                        profile.avatar = conv.conversation_avatar;
                        Profile.setConvProfile(profile);
                        $rootScope.$broadcast('PROFILE_SET');
                    });
                } else {
                    $rootScope.pageLoading = false;
                }
            })
            .catch(function(error) {
                console.log('error: ' + error);
            });

    };

    // clear the participants unviewed array by conversation id
    updateConversationViewed = function(id) {
        UserData.updateConversationViewed(id);
    };

    // update the conversation with the new card data
    updateConversation = function(data) {
        // Get the user name for the user id
        // TODO dont repeat if user id already retreived
        UserData.getConversationsUser(data.user)
            .then(function(res) {
                // Set the user_name to the retrieved name
                data.user_name = res.user_name;
                data.avatar = res.avatar;
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
        console.log('1');
        updateFollowingIcons($scope.cards);

        var dir;
        if ($scope.feed) {
            dir = 'top';
        } else {
            dir = 'bottom';
        }

        $scope.$broadcast("items_changed", dir);
    };

    adjustCropped = function() {
        if (!$rootScope.crop_on) {
            var win_width = $(window).width();
            if ($rootScope.last_win_width != win_width) {
                last_win_width = win_width;
                $(".cropped").each(function(index, value) {
                    var stored = $(value).attr('cbd-data');
                    var stored_image = $(value).attr('image-data');
                    stored_image = JSON.parse(stored_image);
                    if (stored) {
                        stored = JSON.parse(stored);
                        if (stored_image.naturalWidth < win_width) {
                            $(value).parent().css("height", stored_image.height);
                            $(value).parent().css("width", stored_image.naturalWidth);
                            var zoom = stored_image.naturalWidth / (stored.right - stored.left);
                            $(value).css("zoom", zoom);
                        } else {
                            var zoom = win_width / (stored.right - stored.left);
                            $(value).css("zoom", zoom);
                            var height = (stored.bottom - stored.top) * zoom;
                            $(value).parent().css("height", height);
                        }
                    }
                });
            }
        }
    };

    $scope.inviewoptions = { offset: [100, 0, 100, 0] };

    $scope.lineInView = function(data, id) {
        if (data) {
            $('#ce' + id).removeClass('outview');
        } else {
            $('#ce' + id).addClass('outview');
        }
    };

}]);