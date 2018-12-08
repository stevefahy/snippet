cardApp.controller("conversationCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', '$q', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'Users', '$routeParams', '$timeout', 'moment', 'socket', 'Database', 'General', 'Profile', 'principal', 'UserData', 'Cropp', '$compile', 'ImageAdjustment', function($scope, $rootScope, $location, $http, $window, $q, Cards, replaceTags, Format, Edit, Conversations, Users, $routeParams, $timeout, moment, socket, Database, General, Profile, principal, UserData, Cropp, $compile, ImageAdjustment) {

    openCrop = Cropp.openCrop;
    setCrop = Cropp.setCrop;
    editImage = Cropp.editImage;
    closeEdit = Cropp.closeEdit;
    filterImage = Cropp.filterImage;
    closeFilters = Cropp.closeFilters;
    filterClick = Cropp.filterClick;
    settingsImage = Cropp.settingsImage;
    adjustImage = Cropp.adjustImage;

    var win_width = $(window).width();
    console.log(win_width);

    var paused = false;
    var scrolling = false;

    var NUM_TO_LOAD = 3;

    //var stored_image = $(value).attr('image-data');
    //$("#image_" + image_id).attr('image-data', JSON.stringify(stored_image_data));

    $(document).ready(function() {
        // Handler for .ready() called.
        console.log('doc ready');
    });

    disableScroll = function() {
        //$('.content_cnv').css('overflowY', 'hidden');
        //$('.content_cnv').css('overflowY', 'hidden');
        //position: fixed; overflow-y:scroll
    };

    enableScroll = function() {
        $('.content_cnv').css('overflowY', 'unset');
    };

    $rootScope.card_loading = false;

var anchor_card;
var direction;
var scroll_pos;
    //console.log(header_height);
    $scope.scrollEventCallback = function(edge) {
        console.log('SCROLL EDGE: ' + edge + ' : ' + paused);
        //console.log(paused);
        //console.log($scope.cards.length);
        if ($scope.feed && edge == 'bottom' && !paused && !scrolling) {

            //paused = true;
            //scrolling = true;

            //disableScroll();

            if ($scope.totalDisplayed < $scope.cards.length) {
                direction = 'bottom';

                paused = true;
                scrolling = true;

                var bottommost_card = $(".content_cnv #conversation_card:last-child").children().find('.ce').attr('id');
                //console.log(bottommost_card);
                //var bottom_full_card = $('#' + bottommost_card).parents().find('#conversation_card');
                var bottom_full_card = $('#' + bottommost_card).closest('#conversation_card');
                console.log(bottom_full_card);
                anchor_card = bottom_full_card;
                $scope.totalDisplayed += NUM_TO_LOAD;

/*
                $timeout(function() {
                $('.content_cnv').scrollTop(bottom_full_card[0].offsetTop - $('.header').height());
                }, 100);

                $timeout(function() {
                    console.log(bottom_full_card[0].offsetTop);
                    //$('.content_cnv').animate({ scrollTop: bottom_full_card[0].offsetTop - $('.header').height() }, "fast");
                    //$('.content_cnv').scrollTop(bottom_full_card[0].offsetTop - $('.header').height());
                    //paused = false;
                    scrolling = false;
                    //enableScroll();
                }, 500);
                */




            }
            console.log('feed bottom: ' + $scope.totalDisplayed + ' of ' + $scope.cards.length + ' : ' + $scope.glued);
        }
        if (!$scope.feed && edge == 'top' && !paused && !scrolling) {


            if ($scope.totalDisplayed * -1 < $scope.cards.length) {
direction = 'top';
                $rootScope.card_loading = true;

                paused = true;
                scrolling = true;
                //disableScroll();

                var topmost_card = $(".content_cnv #conversation_card:first-child").children().find('.ce').attr('id');
                //var top_full_card = $('#' + topmost_card).parents().find('#conversation_card');
                var top_full_card = $('#' + topmost_card).closest('#conversation_card');
                //anchor_card = top_full_card;
                anchor_card = topmost_card;
                console.log(anchor_card);
                console.log(topmost_card);
                disableScroll();
                //scroll_pos = top_full_card[0].offsetTop - $('.header').height();
                //console.log(scroll_pos);
                $timeout(function() {
                $scope.totalDisplayed -= NUM_TO_LOAD;
});
/*
                $timeout(function() {
                    $('.content_cnv').scrollTop(top_full_card[0].offsetTop - $('.header').height());
                }, 100);

                $timeout(function() {
                    scrolling = false;
                }, 500);
                */

            }
            console.log('feed top: ' + $scope.totalDisplayed + ' of ' + $scope.cards.length + ' : ' + $scope.glued);
        }
    };

    $scope.follow = function(card) {
        // Find the public conversation for this user.
        Conversations.find_user_public_conversation_by_id(card.user)
            .then(function(result) {
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
                                        updateFollowingIcons($scope.cards)
                                            .then(function(result) {
                                                // Remove this users cards from the feed.
                                                displayFollowing();
                                            });
                                    });
                            });
                    } else {
                        // If not following then follow
                        // Updateconversation in DB.
                        Conversations.addFollower(pms)
                            .then(function(result) {
                                Users.follow_conversation(result.data._id)
                                    .then(function(result) {
                                        UserData.setUser(result.data);
                                        $scope.currentUser = UserData.getUser();
                                        updateFollowingIcons($scope.cards);
                                    });
                            });
                    }
                }
            });
    };

    // Set the following icons on first load.
    $scope.$watch('cards', function(newValue, oldValue) {
        console.log('new cards');
        console.log(newValue);
        if (newValue != undefined) {

            //updateFollowingIcons(newValue);

            newValue.map(function(key, array) {
                key.loaded = true;
            });
            
        }
    });

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
        $scope.glued = true;
    });

    $scope.$on('getCards', function(event, data) {});


    // Detect device user agent 
    var ua = navigator.userAgent;

    // Enable scroll indicator if mobile.
    //$scope.scroll_indicator_options = { disable: !$rootScope.is_mobile };
    //$scope.scroll_indicator_options = {disable:false};

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
    //$scope.totalDisplayed = 6;
    $scope.following = false;
    $scope.feed = false;
    $scope.glued = true;

    // Use the urls id param from the route to load the conversation.
    var id = $routeParams.id;
    // Use the urls username param from the route to load the conversation.
    var username = $routeParams.username;

    //$('#page-system').addClass("page-conversation-static");

    /*
            $rootScope.$on('$routeChangeSuccess', function(event, next, prev) {
            //console.log(prev.$$route.originalPath);
            $rootScope.prev_route = prev.$$route.originalPath;
            console.log($rootScope.prev_route);
        });
        

            $rootScope.prev_route = '/';
            */

    //$rootScope.prev_route = $location.path();

    // Default navigation
    if ($rootScope.animate_pages) {
        console.log('ENTER');
        // Loading conversation directly should not animate.
        //viewAnimationsService.setEnterAnimation('page-conversation');
    }
    //viewAnimationsService.setLeaveAnimation('page-conversation-static');
    console.log($rootScope.nav);
    if ($rootScope.nav) {
        if ($rootScope.nav.from == 'group') {
            //viewAnimationsService.setEnterAnimation('page-conversation-static');
            //viewAnimationsService.setLeaveAnimation('page-group');
        } else if ($rootScope.nav.from == 'group-direct') {
            //viewAnimationsService.setEnterAnimation('page-conversation-static');
            //viewAnimationsService.setLeaveAnimation('page-group-direct');
        } else if ($rootScope.nav.from == 'contacts') {
            /*
            $('#page-system').removeClass("page-contacts");
            $('#page-system').addClass("page-contacts-static");

            viewAnimationsService.setEnterAnimation('page-conversation-top');
            viewAnimationsService.setLeaveAnimation('page-contacts-static');
        */
        } else if ($rootScope.nav.from == 'us') {
            //$rootScope.nav = { from: 'us', to: 'contacts' };
            //viewAnimationsService.setEnterAnimation('page-conversation-static');
            //viewAnimationsService.setLeaveAnimation('page-user_setting');
        } else if ($rootScope.nav.from == 'convs') {
            //console.log('convs to conv');


            //viewAnimationsService.setEnterAnimation('page-conversation-top');
            //viewAnimationsService.setLeaveAnimation('page-conversation-static');

        } else if ($rootScope.nav.from == 'conv' && $rootScope.nav.to == 'feed') {
            //console.log('conv to feed');

            /*
           $('#page-system').removeClass("page-conversations-static");
           $('#page-system').addClass("page-conversations");
           viewAnimationsService.setEnterAnimation('page-conversation-static');
           viewAnimationsService.setLeaveAnimation('page-conversations');
        */
        } else {
            //$rootScope.nav = { from: 'conv', to: 'convs' };
        }
    } else {
        //$rootScope.nav = { from: 'conv', to: 'convs' };
    }

    // Load the rest of the cards if page loaded directly without animation.
    if (!$rootScope.animate_pages) {
        //$scope.totalDisplayed = -1000;
    }

    // variable to turn on animation of view chage. Loading conversation directly should not animate.
    //$rootScope.animate_pages = true;

    General.keyBoardListenStart();

    $scope.$on('rzSliderRender', function(event, data) {
        $scope.addSlider(data);
    });

    // Broadcast by UserData after it has processed the notification. (card has been created, updated or deleted by another user to this user).
    $scope.$on('CONV_NOTIFICATION', function(event, msg) {
        // only update the conversation if the user is currently in that conversation
        if (id === msg.conversation_id) {
            updateConversationViewed(id);
        }
    });

    $scope.$on('CONV_MODEL_NOTIFICATION', function(event, msg) {
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
        var deferred = $q.defer();
        var promises = [];
        if (newValue != undefined) {
            newValue.map(function(key, array) {
                // Find the public conversation for this user.
                var prom1 = Conversations.find_user_public_conversation_by_id(key.user)
                    .then(function(result) {
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

    var NUM_CARDS_TO_LOAD = 6;
    // TODO - If not following anyone suggest follow?
    getFollowing = function() {

        var cards_loaded = 0;

        var deferred = $q.defer();
        var promises = [];
        $scope.cards = [];
        $scope.cards_temp = [];
        var followed = UserData.getUser().following;
        followed.map(function(key, array) {
            var prom1 = Conversations.find_public_conversation_id(key)
                .then(function(result) {
                    if (result.data != null) {
                        Conversations.getPublicConversationById(key)
                            .then(function(res) {
                                res.data.map(function(key, array) {
                                    // Store the original characters of the card.
                                    key.original_content = result.data.content;
                                    // Get the user name for the user id
                                    key.user_name = result.data.conversation_name;
                                    key.avatar = result.data.conversation_avatar;
                                    key.following = true;
                                    //$scope.cards.push(key);
                                    $scope.cards_temp.push(key);
                                });
                            });
                    }
                });
            promises.push(prom1);
        });
        // All the users contacts have been mapped.
        $q.all(promises).then(function() {
            console.log('getFollowing finished');
            //$scope.cards.reverse();
            // Set the feed value to true to reverse the cards order.
            //$scope.feed = true;
            //$scope.glued = false;
            $scope.cards = $scope.cards_temp;

            // Scroll
            //$rootScope.$broadcast('cards', data);
            //$scope.$broadcast("items_changed", $scope.feed);
            console.log($scope.feed);
            $scope.$broadcast("items_changed", 'top');
        });
        return deferred.promise;
    };

    getCards = function() {
        $timeout(function() {
            findConversationId(function(result) {
                UserData.getCardsModelById(result)
                    .then(function(result) {
                        if (result != undefined) {
                            $scope.cards = result.data;

                            console.log($scope.feed);
                            $scope.$broadcast("items_changed", 'bottom');
                        }
                    });
            });
        });
    };

    loadFeed = function() {
        // Set the users profile
        var profile = {};
        profile.user_name = UserData.getUser().user_name;
        profile.avatar = UserData.getUser().avatar;
        Profile.setProfile(profile);
        $rootScope.$broadcast('PROFILE_SET');
        $scope.isMember = true;
        Conversations.find_user_public_conversation_by_id(UserData.getUser()._id).then(function(result) {
            console.log(result);
            // Set the conversation id so that it can be retrieved by cardcreate_ctrl
            Conversations.setConversationId(result.data._id);
            getFollowing();
        });
    };

    if (principal.isValid()) {
        UserData.checkUser().then(function(result) {
            $scope.currentUser = UserData.getUser();
            if ($location.url() == '/') {
                $scope.feed = true;
                $scope.totalDisplayed = 6;
                $scope.glued = false;
                $('.content_cnv')
                // Display the users feed.
                loadFeed();
            } else {
                $scope.totalDisplayed = -6;
                // Logged in.Load the conversation for the first time.
                getCards();
            }
        });
    } else {
        if ($location.url() != '/') {
            // Public route (Does not need to be logged in).
            getCards();
        } else {
            $location.path("/api/login/");
        }

    }

    $scope.changePathGroup = function() {
        //$rootScope.nav = { from: 'conv', to: 'group' };
        //viewAnimationsService.setLeaveAnimation('page page-conversation');
        //viewAnimationsService.setEnterAnimation('page page-group');
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
                                getPublicConversation(public_id, res.data);
                                callback(public_id);
                            });
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
                        Conversations.setConversationId(id);
                        // Check the users permission for this conversation. (logged in and participant)
                        checkPermission(id, function(result) {
                            $scope.isMember = result;
                            if (result) {
                                getConversation(id);
                            } else {
                                $location.path("/api/login");
                            }
                            callback(id);
                        });
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

    // Get the conversation by id
    getConversation = function(id) {
        var profile = {};
        UserData.getConversationModelById(id)
            .then(function(res) {
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

        UserData.getCardsModelById(id)
            .then(function(result) {
                if (result != undefined) {
                    $scope.cards = result.data;
                    if (result.data.length == 0) {
                        $rootScope.pageLoading = false;
                    }
                    // Clear the cards unviewed array for this participant of this conversation.
                    updateConversationViewed(id);
                } else {
                    $scope.cards = [];
                    $rootScope.pageLoading = false;
                }
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

        updateFollowingIcons($scope.cards);

        //
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

    deleteTemp = function(id) {
        console.log('DELETE TEMP: ' + id);
        $('#cropper_' + id).css('height', 'unset');
    };

 $scope.$on('$viewContentLoaded', function(){
    //Here your view content is fully loaded !!
    console.log('viewContentLoaded');
  });

    $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
        console.log('ngRepeatFinished');
        $rootScope.pageLoading = false;
/*
        $('.resize-drag').each(function() {
            //console.log($(this));
            // Check if parent is a cropper_cont and remove temp css height!
            //console.log($(this).parent());
            if ($(this).parent().attr('class').indexOf('cropper_cont') >= 0) {
                var ratio_temp = $(this).parent().attr('image-original');

                if (ratio_temp != undefined) {
                    ratio_temp = JSON.parse(ratio_temp);
                    //console.log(ratio_temp.nat_ratio);
                    var nh = win_width * ratio_temp.nat_ratio;
                    //console.log(nh);
                    $(this).parent().css('height', nh + 'px');
                    var id = $(this).attr('id');
                    id = id.substring(6, id.length);
                    //console.log(id);
                    $(this).attr('onload', 'deleteTemp("' + id + '")');
                }
            }
        });
*/

//$('.content_cnv').scrollTop(bottom_full_card[0].offsetTop - $('.header').height());
                        $timeout(function() {
                            if(anchor_card != undefined){
                            $rootScope.pageLoading = true;
                            var top_full_card = $('#' + anchor_card).closest('#conversation_card');
                            console.log(top_full_card[0].offsetTop - $('.header').height());
                    //$('.content_cnv').scrollTop(top_full_card[0].offsetTop - $('.header').height());
              var val = top_full_card[0].offsetTop - $('.header').height();
              $('.content_cnv').animate({ scrollTop: val }, 0, function() {
    // Animation complete.
    console.log('anim complete');
    scrolling = false;
         paused = false;
         $rootScope.pageLoading = false;

  });
          }

              /*
               $('html, body').animate({
    scrollTop: 2000
  }, 2000);
  */
               //scrolling = false;
                   // paused = false;

/*
            jQuery('html, body').animate({
                  scrollTop:  jQuery('#' + page).position().top
                }); 
                */

                });
//$('.content_cnv').scrollTop(scroll_pos);
                //$timeout(function() {

               // }, 500);

        

        // Put this into above?
        /*
        $('.cropper_cont').each(function() {
            console.log($(this).attr('image-original'));
            var nat_r = $(this).attr('image-original');
            if (nat_r != undefined) {
                nat_r = JSON.parse(nat_r);
                console.log(nat_r);
                if (nat_r.nat_ratio != undefined) {
                    console.log(nat_r.nat_ratio);
                    var nh = win_width * nat_r.nat_ratio;
                    console.log(nh);
                    $(this).css('height', nh + 'px');
                }
            }
        });
        */

        if ($('.cropper-container').length > 0) {
            $('.cropper-container').remove();
            $('.cropper-hidden').removeClass('cropper-hidden');
        }
    });

    tempE = function() {
        $(".cropper_cont").each(function(index, value) {
            $(this).attr('height', $(this).find("img").height());
        });
    };

    tempD = function() {
        $(".cropper_cont").each(function(index, value) {
            value._ce = $(this).parent().attr('contenteditable');
            $(this).parent().attr('contenteditable', 'false');
            value._onclick = value.onclick;
            value.onclick = function() { return false; };
        });
    };

    // Listen for the end of the view transition.
    $(".page").on("animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend", function(e) {
        if (e.originalEvent.animationName == "slide-in") {
            $timeout(function() {
                $scope.$apply(function() {
                    console.log('load 1000');
                    // Load the rest of the cards.
                    //$scope.totalDisplayed = -1000;
                }, 0);
            });
        }
    });

}]);