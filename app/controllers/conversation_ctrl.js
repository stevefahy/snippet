cardApp.controller("conversationCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'Users', '$routeParams', '$timeout', 'moment', 'socket', 'Database', 'General', 'Profile', 'principal', 'UserData', '$animate', 'viewAnimationsService', function($scope, $rootScope, $location, $http, $window, Cards, replaceTags, Format, Edit, Conversations, Users, $routeParams, $timeout, moment, socket, Database, General, Profile, principal, UserData, $animate, viewAnimationsService) {

    $rootScope.pageLoading = true;

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
    $scope.totalDisplayed = -6;

    $scope.options = {};

    // Use the urls id param from the route to load the conversation.
    var id = $routeParams.id;
    // Use the urls username param from the route to load the conversation.
    var username = $routeParams.username;

    // Detect device user agent 
    var ua = navigator.userAgent;
    /*
        $(function(){
        $('.scroll-body').slimScroll({
            height: '100%',
            start: 'bottom',
            alwaysVisible: true
        });
    });
    */


    // Default navigation
    viewAnimationsService.setEnterAnimation('page-conversation');
    viewAnimationsService.setLeaveAnimation('page-conversation-static');

    if ($rootScope.nav) {
        if ($rootScope.nav.from == 'group') {
            viewAnimationsService.setEnterAnimation('page-conversation-static');
            viewAnimationsService.setLeaveAnimation('page-group');
        } else if ($rootScope.nav.from == 'contacts') {
            $rootScope.nav = { from: 'conv', to: 'contacts' };
            viewAnimationsService.setEnterAnimation('page-conversation');
            viewAnimationsService.setLeaveAnimation('page-contacts-static');
        } else {
            $rootScope.nav = { from: 'conv', to: 'convs' };
        }
    } else {
        $rootScope.nav = { from: 'conv', to: 'convs' };
    }

    // Loading conversation directly should not animate.
    $animate.enabled($rootScope.animate_pages);

    // Load the rest of the cards if page loaded directly without animation.
    if(!$rootScope.animate_pages){
        $scope.totalDisplayed = -1000;
    }

    General.keyBoardListenStart();

    // Add custom class for Android scrollbar
    if (ua.indexOf('AndroidApp') >= 0) {
        //$('.content_cnv').addClass('content_cnv_android');
    }

    // Broadcast by UserData after it has processed the notification. (card has been created, updated or deleted by another user to this user).
    $scope.$on('CONV_NOTIFICATION', function(event, msg) {
        // only update the conversation if the user is currently in that conversation
        if (id === msg.conversation_id) {
            updateConversationViewed(id);
        }
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

    getCards = function() {
        $timeout(function() {
            findConversationId(function(result) {
                UserData.getCardsModelById(result)
                    .then(function(result) {
                        if (result != undefined) {
                            $scope.cards = result.data;
                        }
                    });
            });
        });
    };

    if (principal.isValid()) {
        UserData.checkUser().then(function(result) {
            $scope.currentUser = UserData.getUser();
            // Logged in.Load the conversation for the first time.
            getCards();
        });
    } else {
        // Public route (Does not need to be logged in).
        getCards();
    }

    $scope.changePathGroup = function() {
        $rootScope.nav = { from: 'conv', to: 'group' };
        viewAnimationsService.setLeaveAnimation('page page-conversation');
        viewAnimationsService.setEnterAnimation('page page-group');
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

    // TODO - check if compatibel with General version.
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
                                getPublicConversation(public_id, res.data.conversation_name);
                                callback(public_id);
                            });
                        }
                    })
                    .catch(function(error) {
                        console.log(error);
                    });
            }
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

    getPublicConversation = function(id, name) {
        Conversations.getPublicConversationById(id)
            .then(function(result) {
                $scope.cards = result.data;
                // Map relevant data to the loaded cards.
                if ($scope.cards.length > 0) {
                    $scope.cards.map(function(key, array) {
                        // Store the original characters of the card.
                        key.original_content = key.content;
                        // Get the user name for the user id
                        key.user_name = name;
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
    };

    $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
        $rootScope.pageLoading = false;

        //var myDiv = $('.content_cnv');
        // console.log(myDiv);
        /*
        $timeout(function() {
            console.log('scroll');
            console.log($('.content_cnv').offset().top);
            var amt = 85;
            $('.content_cnv').scrollTop(amt);
            console.log($('.content_cnv').offset().top);
            
        }, 2000);
        */
    });

    // Listen for the end of the view transition.
    /*
    $(".page").on("animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend", function(e) {
        if (e.originalEvent.animationName == "slide-in") {
            $timeout(function() {
                $scope.$apply(function() {
                    // Load the rest of the cards.
                    $scope.totalDisplayed = -1000;
                }, 0);
            });
        }
    });
    */

}]);