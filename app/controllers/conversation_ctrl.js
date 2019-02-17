cardApp.controller("conversationCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', '$q', '$filter', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'Users', '$routeParams', '$timeout', 'moment', 'socket', 'Database', 'General', 'Profile', 'principal', 'UserData', 'Cropp', '$compile', 'ImageAdjustment', 'Keyboard', function($scope, $rootScope, $location, $http, $window, $q, $filter, Cards, replaceTags, Format, Edit, Conversations, Users, $routeParams, $timeout, moment, socket, Database, General, Profile, principal, UserData, Cropp, $compile, ImageAdjustment, Keyboard) {

    //var initialized = false;

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

    var UP_PERCENT = 10;
    var DOWN_PERCENT = 90;

    var UP_TOP = 5;
    var BOTTOM_END = 99;

    var INIT_NUM_TO_LOAD = 30;
    var NUM_TO_LOAD = 30;
    var NUM_UPDATE_DISPLAY = 20;
    var NUM_UPDATE_DISPLAY_INIT = 30;

    var MAX_TEMP = 30;

    var REMOVE_BOTTOM = 10;

    //var MAX_DISPLAY = 30;

    var MAX_OUT_BOUNDS = 10;

    var INIT_NUM_TO_DISPLAY = 5000;
    //var NUM_TO_DISPLAY = INIT_NUM_TO_DISPLAY;

    //var NEXT_LOAD = 20;

    $rootScope.loading_cards = false;

    $scope.feed = false;
    $scope.top_down = false;
    $rootScope.top_down = false;

    var first_load = true;
    var watching_scroll = false;

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

    Keyboard.keyBoardListenStart();

    // Use the urls id param from the route to load the conversation.
    var id = $routeParams.id;
    // Use the urls username param from the route to load the conversation.
    var username = $routeParams.username;

    var img_count;
    var img_loaded;
    var scroll_direction;

    $scope.removed_cards_top = [];
    $scope.removed_cards_bottom = [];

    // DEBUGGING

    $scope.$watch('cards.length', function(newStatus) {
        //console.log(newStatus);
        $rootScope.cards_length = newStatus;
        upDateObservers();

    });

    $scope.$watch('cards_temp.length', function(newStatus) {
        $rootScope.cards_temp_length = newStatus;

    });

    $scope.$watch('removed_cards_top.length', function(newStatus) {
        $rootScope.removed_cards_top_length = newStatus;
    });

    $scope.$watch('removed_cards_bottom.length', function(newStatus) {
        $rootScope.removed_cards_bottom_length = newStatus;
    });

    $scope.$watch('scrollingdisabled', function(newStatus) {
        console.log('scrollingdisabled: ' + newStatus);
        $rootScope.scrollingdisabled_watch = newStatus;
    });

    $scope.$watch('cards', function(newStatus) {
        
    });

    $scope.$watch('online', function(newStatus) {
        $rootScope.online = newStatus;
    });

    



    // Find the conversation id.
    getConversationId = function() {
        var deferred = $q.defer();
        // Use the id from $routeParams.id if it exists. The conversation may have been loaded by username.
        if (id != undefined) {
            Conversations.setConversationId(id);
            // LDB
            Conversations.find_conversation_id(id)
                .then(function(res) {
                    Conversations.setConversationType(res.conversation_type);
                    deferred.resolve(res);
                });
        } else if (username != undefined) {
            // Public. Use the username from $routeParams.username to load that users Public conversation.
            // LDB
            Conversations.find_user_public_conversation_id(username)
                .then(function(res) {
                    // check if this is a valid username
                    if (res.error) {
                        $location.path("/api/login");
                    } else {
                        Conversations.setConversationId(res._id);
                        Conversations.setConversationType(res.conversation_type);
                        deferred.resolve(res);
                    }
                })
                .catch(function(error) {
                    console.log(error);
                });
        } else {
            // No id or username - Feed.
            Conversations.setConversationType('feed');
            deferred.resolve({ conversation: 'feed' });
        }
        return deferred.promise;
    };

    // card_create.html is added to the conversation if $scope.isMember=true.
    checkPermit = function(conv) {
        var result = false;
        // Logged in
        if (principal.isValid()) {
            if (Conversations.getConversationType() == 'public') {
                if (conv.admin.includes(UserData.getUser()._id)) {
                    result = true;
                } else {
                    $scope.no_footer = true;
                }
            } else {
                var pos = General.findWithAttr(conv.participants, '_id', UserData.getUser()._id);
                if (pos >= 0) {
                    result = true;
                }
            }
        }
        return result;
    };

    var temp_working = false;
    tempToCards = function() {
        var deferred = $q.defer();
        if ($scope.cards_temp.length > 0 && !temp_working) {
            temp_working = true;
            var amount = NUM_UPDATE_DISPLAY;
            if ($scope.cards.length == 0) {
                amount = NUM_UPDATE_DISPLAY_INIT;
            }

            content_adjust = true;

            $scope.cards = $scope.cards.concat($scope.cards_temp);
            $scope.cards_temp = [];
            temp_working = false;
            deferred.resolve();
        } else {
            //console.log('no more cards_temp');
            temp_working = false;
            deferred.resolve();
        }
        return deferred.promise;
    };




    addMoreTop = function() {
        $scope.scrollingdisabled = true;
        unRemoveCardsTop()
            .then(function(result) {
                console.log(result);
                if (result == 0 && !$scope.top_down) {
                    console.log('temp0');
                    tempToCards()
                        .then(function(result) {
                            console.log('result');
                            //$scope.scrollingdisabled = false;
                            if (!$scope.$$phase) {
                                console.log('apply 2');
                                $scope.$apply();
                            }
                            $timeout(function() {
                                removeCardsBottom()
                                    .then(function(result) {
                                        console.log(result);
                                        $timeout(function() {
                                            $scope.scrollingdisabled = false;
                                        }, 500);
                                    });
                            }, 100);
                        });
                } else {
                    $timeout(function() {
                        removeCardsBottom()
                            .then(function(result) {
                                console.log(result);
                                $timeout(function() {
                                    $scope.scrollingdisabled = false;
                                }, 500);
                            });
                    }, 100);
                }
            });
    };

    addMoreBottom = function() {
        $scope.scrollingdisabled = true;
        unRemoveCardsBottom()
            .then(function(result) {
                console.log(result);

                //$scope.scrollingdisabled = false;
                console.log($scope.top_down);
                if (result == 0 && $scope.top_down) {
                    console.log('temp1');
                    tempToCards()
                        .then(function(result) {
                            console.log('result');
                            //$scope.scrollingdisabled = false;
                            if (!$scope.$$phase) {
                                console.log('apply 2');
                                $scope.$apply();
                            }
                            $timeout(function() {
                                removeCardsTop()
                                    .then(function(result) {
                                        console.log(result);
                                        $timeout(function() {
                                            $scope.scrollingdisabled = false;
                                        }, 0);
                                    });
                            }, 100);
                        });
                } else {
                    $timeout(function() {
                        removeCardsTop()
                            .then(function(result) {
                                console.log(result);
                                $timeout(function() {
                                    $scope.scrollingdisabled = false;
                                }, 0);
                            });
                    }, 100);
                    //$scope.scrollingdisabled = false; 
                }


            });
    };

    // as long as it continues to be invoked, it will not be triggered
    function debounce(func, interval) {
        var timeout;
        return function() {
            var context = this,
                args = arguments;
            var later = function() {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, interval || 200);
        };
    }

    // as long as it continues to be invoked, raise on every interval
    function throttle(func, interval) {
        var timeout;
        return function() {
            var context = this,
                args = arguments;
            var later = function() {
                timeout = false;
            };
            if (!timeout) {

                if (!$scope.scrollingdisabled) {

                    func.apply(context, args);
                    timeout = true;
                    timeout = setTimeout(later, interval);

                } else {
                    clearTimeout(timeout);
                }

            }
        };
    }

    $scope.scrollingdisabled = false;
    var last_scrolled;
    $scope.fired_up = false;
    $scope.fired_down = false;
    var dir;
    var last_dir;
    var first_scroll = true;

    var myHeavyFunction = throttle(function() {
        var currentScroll = $(this).scrollTop();
        var maxScroll = this.scrollHeight - this.clientHeight;
        var scrolled = (currentScroll / maxScroll) * 100;
        console.log(scrolled + ' : ' + last_scrolled);

        var scroll_distance;

        if (scrolled < last_scrolled) {
            dir = 1;

            //console.log('up: ' + scrolled + ' : ' + last_scrolled);
        } else if (scrolled > last_scrolled) {
            dir = 0;
            scroll_distance = scrolled - last_scrolled;
            //console.log('down: ' + scrolled + ' : ' + last_scrolled);
        } else if (scrolled == last_scrolled) {
            console.log('DONT FIRE');
            dir = 2;
        }

        //} else {
        //    dir = 2;
        //}



        last_dir = dir;
        last_scrolled = scrolled;

        if (!$scope.scrollingdisabled && !content_adjust) {
            if (dir == 1 && scrolled <= UP_PERCENT) {
                if (!$scope.scrollingdisabled && !temp_working) {
                    console.log('FIRE UP!!!');
                    //unbindScroll();
                    addMoreTop();
                }
            }
        }

        if (!$scope.scrollingdisabled && !content_adjust) {
            if (dir == 0 && scrolled >= DOWN_PERCENT) {
                if (!$scope.scrollingdisabled && !temp_working) {
                    console.log('FIRE DOWN!!!');
                    //unbindScroll();
                    addMoreBottom();
                }
            }
        }
    }, 5);


    function wheelEvent(e) {

        if (content_adjust) {
            rebindScroll();

        }

        var currentScroll = $(this).scrollTop();
        var maxScroll = this.scrollHeight - this.clientHeight;
        var scrolled2 = (currentScroll / maxScroll) * 100;
        //console.log(scrolled);
        if (scrolled2 < UP_TOP && !no_more_records) {
            //$('.content_cnv').scrollTop(last_scroll);
            //e.preventDefault();
            //overflow-y: overlay
            //$('.content_cnv').addClass('disabled');
            $('.content_cnv').scrollTop(maxScroll / 6);
            //$('.content_cnv').removeClass('disabled');
        }

        if (scrolled2 >= BOTTOM_END && $scope.removed_cards_bottom.length != 0) {
            console.log('bottom: ' + $scope.removed_cards_bottom.length);
            //$('.content_cnv').scrollTop(maxScroll / 2);
        }
        //var last_scroll = scrolled2;
    }

    rebindScroll = function() {
        console.log('scrollingdisabled: ' + $scope.scrollingdisabled);
        unbindScroll();
        //$timeout(function() {
        content_adjust = false;
        bindScroll();

        //}, 100);
    };

    bindScroll = function() {
        watching_scroll = true;
        var currentScroll = $('.content_cnv').scrollTop();
        var maxScroll = $('.content_cnv')[0].scrollHeight;
        var scrolled = (currentScroll / maxScroll) * 100;
        last_scrolled = scrolled;
        $scope.scrollingdisabled = false;
        console.log('bind last_scrolled: ' + last_scrolled);

        $('.content_cnv').bind('scroll', myHeavyFunction);
        //$('.content_cnv').bind('scroll', wheelEvent);
    };

    //bindScroll();

    unbindScroll = function() {
        console.log('unbind last_scrolled: ' + last_scrolled);
        $('.content_cnv').unbind('scroll', myHeavyFunction);
        //$('.content_cnv').unbind('scroll', wheelEvent);
    };

    $('.content_cnv').bind('scroll', wheelEvent);

    //$( "#foo" ).unbind( "click", handler );


    /*
        addMoreBottom = function() {
            //$scope.scrollingdisabled = true;

            unRemoveCardsBottom()
                .then(function(result) {
                    if (result == 0 && $scope.top_down) {
                        tempToCards()
                            .then(function(result) {});
                    } else {
                        //$scope.scrollingdisabled = false;
                    }
                });


        };
        */

    $scope.follow = function(card) {
        // Find the public conversation for the selected user.
        // LDB
        Conversations.find_user_public_conversation_by_id(card.user)
            .then(function(result) {
                if (result.conversation_type == 'public') {
                    // If following then unfollow
                    var conversation_id = result._id;
                    var pms = { 'id': conversation_id, 'user': UserData.getUser()._id };
                    if (card.following) {
                        // Update the Conversation in the DB.
                        // LDB
                        Conversations.deleteFollower(pms)
                            .then(function(conversation) {
                                // Update the User in the DB.
                                // LDB
                                Users.unfollow_conversation(conversation._id)
                                    .then(function(user) {
                                        UserData.setUser(user);
                                        $scope.currentUser = UserData.getUser();
                                        removeUserCards(conversation_id);
                                        updateFollowingIcons($scope.cards);
                                    });
                            });
                    } else {
                        // If not following then follow. Update the Conversation in the DB.
                        // LDB
                        Conversations.addFollower(pms)
                            .then(function(conversation) {
                                // Update the User in the DB.
                                // LDB
                                Users.follow_conversation(conversation._id)
                                    .then(function(user) {
                                        UserData.setUser(user);
                                        $scope.currentUser = UserData.getUser();
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
                ImageAdjustment.setSharpen(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), ImageAdjustment.getTarget(), ImageAdjustment.getSource(), $scope.adjust.sharpen);
            }
        }
    };




    $scope.$on('$destroy', function() {
        //leaving controller.
        Cropp.destroyCrop();
        $('.image_adjust_on').remove();
        NUM_TO_LOAD = INIT_NUM_TO_LOAD;
        $rootScope.top_down = false;
        Conversations.setConversationId('');
        Conversations.setConversationType('');
        resetObserver_queue();
    });

    checkNext = function() {
        console.log('checkNext');
        console.log('loading_cards: ' + $rootScope.loading_cards);
        console.log('loading_cards_offscreen: ' + $rootScope.loading_cards_offscreen);

        console.log('scrollingdisabled: ' + $scope.scrollingdisabled);
        var id = Conversations.getConversationId();
        if (Conversations.getConversationType() == 'feed') {
            getFollowing();
        } else if (Conversations.getConversationType() == 'private') {
            console.log($scope.cards_temp.length + ' : ' + MAX_TEMP);
            if ($scope.cards_temp.length < MAX_TEMP) {
                // if going up
                console.log(first_load);
                console.log(dir + ' : ' + $scope.removed_cards_top + ' : ' + $scope.removed_cards_bottom);
                /*
                if(first_load){
getCards(id, 'cache'); 
                }else if(dir == 0 && $scope.removed_cards_top == 0){
                   getCards(id, 'cache'); 
                } else if(dir == 1 && $scope.removed_cards_bottom == 0){
                    getCards(id, 'cache'); 
                }
                */
                getCards(id, 'cache');
            }

        } else if (Conversations.getConversationType() == 'public') {
            getPublicCards(i, d);
        }
    };

    getCardAmount = function() {
        console.log('getCardAmount');
        var amount;
        var allElements = document.querySelectorAll('.content_cnv .card_temp');
        $('.content_cnv .vis').last().addClass('removeCards');
        var last_index;
        for (var i = 0, len = allElements.length; i < len; i++) {
            console.log($(allElements[i]).attr('id') + ' : ' + $(allElements[i]).attr('class'));
            if ($(allElements[i]).hasClass('removeCards')) {
                $(allElements[i]).removeClass('removeCards');
                last_index = i;
                break;
            }
        }
        /*
        amount = allElements.length - (last_index + MAX_OUT_BOUNDS);
        if($scope.cards.length > NUM_TO_LOAD){
            amount = (($scope.cards.length - amount) < NUM_TO_LOAD ) ? ($scope.cards.length - NUM_TO_LOAD): (amount);
        } else {
            amount = 0;
        }
        */
        // 60 , 47 ,15
        // 47, 29, 15
        // 60 , 45 ,15
        var remainder = allElements.length - last_index;
        console.log('allElements.length: ' + allElements.length + ', last_index: ' + last_index + ', MAX_OUT_BOUNDS: ' + MAX_OUT_BOUNDS);
        amount = remainder <= MAX_OUT_BOUNDS ? remainder - MAX_OUT_BOUNDS : remainder - MAX_OUT_BOUNDS;
        console.log('amount: ' + amount);
        // check less than zero
        amount = amount < 0 ? 0 : amount;


        return amount;
    };

    getCardAmountTop = function() {
        console.log('getCardAmountTop');
        var amount;
        var allElements = document.querySelectorAll('.content_cnv .card_temp');
        $('.content_cnv .vis').first().addClass('removeCards');
        var last_index;
        for (var i = 0, len = allElements.length; i < len; i++) {
            //console.log($(allElements[i]).attr('id') + ' : ' + $(allElements[i]).attr('class'));
            if ($(allElements[i]).hasClass('removeCards')) {
                $(allElements[i]).removeClass('removeCards');
                //console.log('first');
                console.log($(allElements[i]));
                last_index = i - 1; // 0 based.
                break;
            }
        }
        console.log('allElements.length: ' + allElements.length + ', last_index: ' + last_index + ', MAX_OUT_BOUNDS: ' + MAX_OUT_BOUNDS);
        //amount = allElements.length - (last_index + MAX_OUT_BOUNDS);
        // 60 , 17 ,15
        // 15 ,2 , 15
        // 60, 15 ,15
        amount = last_index <= MAX_OUT_BOUNDS ? 0 : last_index - MAX_OUT_BOUNDS;
        console.log('amount: ' + amount);
        //amount > 0 && $scope.cards.length > (amount + NUM_TO_LOAD)
        //amount = 10;
        //var voteable = (age < 18) ? "Too young":"Old enough";
        // cards 35 amount 10 numtoload 30
        // 35 - 10 = 25
        // 35 - 30 = 5

        // check less than zero
        amount = amount < 0 ? 0 : amount;

        /*
        if($scope.cards.length > NUM_TO_LOAD){
            amount = (($scope.cards.length - amount) < NUM_TO_LOAD ) ? ($scope.cards.length - NUM_TO_LOAD): (amount);
        } else {
            amount = 0;
        }
        */

        return amount;
    };

    var content_adjust = false;

    unRemoveCardsTop = function() {
        console.log('unRemoveCardsTop?');
        var deferred = $q.defer();
        //console.log(removed_cards);
        var removed_length = $scope.removed_cards_top.length;
        //var amount = getCardAmount();
        var amount = NUM_UPDATE_DISPLAY;

        if (removed_length < amount) {
            amount = removed_length;
        }
        //if (removed_length > 0 && amount > 0) {
        if (removed_length > 0) {
            console.log('unRemoveCardsTop!: ' + removed_length);

            $scope.removed_cards_top = $filter('orderBy')($scope.removed_cards_top, 'updatedAt', true);

            //var last_card = $scope.removed_cards_top[$scope.removed_cards_top.length - amount];
            //var last_card = $scope.removed_cards_top.length - amount;

            //var spliced = $scope.removed_cards_top.splice(last_card, amount);
            console.log(JSON.stringify($scope.cards));
            console.log(JSON.stringify($scope.removed_cards_bottom));
            console.log(JSON.stringify($scope.removed_cards_top));
            var first_card = $scope.removed_cards_top[0];
            console.log(JSON.stringify(first_card));

            var spliced = $scope.removed_cards_top.splice(0, amount);

            content_adjust = true;

            console.log($scope.removed_cards_top);
            console.log(spliced);


            spliced.map(function(key, array) {
                $scope.cards.push(key);
            });
            //$scope.scrollingdisabled = false;
            deferred.resolve(removed_length);
        } else {
            //console.log('none removed');
            deferred.resolve(0);
        }
        return deferred.promise;
    };

    unRemoveCardsBottom = function() {
        var deferred = $q.defer();
        //console.log(removed_cards);
        var removed_length = $scope.removed_cards_bottom.length;
        //var amount = getCardAmount();
        amount = NUM_UPDATE_DISPLAY;
        if (removed_length > 0 && amount > 0) {
            console.log('unRemoveCardsBottom');

            $scope.removed_cards_bottom = $filter('orderBy')($scope.removed_cards_bottom, 'updatedAt');

            console.log(JSON.stringify($scope.removed_cards_bottom[0]));

            //var last_card = $scope.removed_cards_bottom[$scope.removed_cards_bottom.length - amount];
            var last_card = $scope.removed_cards_bottom[0];

            //var spliced = $scope.removed_cards_bottom.splice(last_card, amount);
            var spliced = $scope.removed_cards_bottom.splice(0, amount);

            content_adjust = true;

            spliced.map(function(key, array) {
                $scope.cards.push(key);
            });

            //$scope.scrollingdisabled = false;
            deferred.resolve(amount);
        } else {
            //console.log('none removed');
            deferred.resolve(0);
        }
        return deferred.promise;
    };

    /*
        unRemoveCardsBottom = function() {
            var deferred = $q.defer();
            //console.log(removed_cards);
            var removed_length = $scope.removed_cards_bottom.length;
            //var amount = getCardAmount();
            var amount = 0;
            console.log(amount);
            if (removed_length > 0 && amount > 0) {
                console.log('unRemoveCardsBottom');
                var last_card = $scope.removed_cards_bottom[$scope.removed_cards_bottom.length - amount];
                var spliced = $scope.removed_cards_bottom.splice(last_card, amount);
                spliced.map(function(key, array) {
                    $scope.cards.push(key);
                });
                //$scope.scrollingdisabled = false;
                deferred.resolve(amount);
            } else {
                //console.log('none removed');
                deferred.resolve(0);
            }
            return deferred.promise;
        };
        */
    /*
        removeCardsTop = function() {
            var amount = INIT_NUM_TO_LOAD * 2;
            //if ($scope.cards.length > INIT_NUM_TO_LOAD * 4) {
            console.log('removeCardsTop');
            //var last_card = sort_card[sort_card.length - 1].updatedAt;
            var last_card = $scope.cards[$scope.cards.length - amount];
            //console.log(last_card);
            removed_cards_top_temp = $scope.cards.splice(last_card, amount);
            removed_cards_top_temp.map(function(key, array) {
                $scope.removed_cards_top.push(key);
            });
        };
        */

    removeCardsTop = function() {
        console.log('removeCardsTop?');
        var deferred = $q.defer();
        var amount = getCardAmountTop();
        console.log(amount);
        if (amount > 0) {
            //if (amount > 0 && $scope.cards.length > (amount + NUM_TO_LOAD)) {
            //if ($scope.cards.length > INIT_NUM_TO_LOAD * 4) {
            console.log('removeCardsTop!: ' + amount);
            //var last_card = sort_card[sort_card.length - 1].updatedAt;
            //var last_card = $scope.cards[$scope.cards.length - amount];

            content_adjust = true;

            $scope.cards = $filter('orderBy')($scope.cards, 'updatedAt');

            console.log(JSON.stringify($scope.cards[0]));
            var removed_cards_top_temp = $scope.cards.splice(0, amount);
            console.log(removed_cards_top_temp);
            $scope.removed_cards_top = $scope.removed_cards_top.concat(removed_cards_top_temp);
            deferred.resolve(amount);
        } else {
            console.log('dont removeCardsTop: ' + amount);
            deferred.resolve(amount);
        }
        return deferred.promise;
    };

    removeCardsBottom = function() {
        console.log('removeCardsBottom');
        var deferred = $q.defer();
        var amount = getCardAmount();
        if (amount > 0) {
            //if ($scope.cards.length > INIT_NUM_TO_LOAD * 4) {
            console.log('removeCardsBottom: ' + amount);
            //var last_card = sort_card[sort_card.length - 1].updatedAt;

            $scope.cards = $filter('orderBy')($scope.cards, 'updatedAt', true);
            console.log(JSON .stringify($scope.cards));
            var last_card = $scope.cards[$scope.cards.length - amount];
            console.log(JSON .stringify(last_card));

            content_adjust = true;

            //var removed_cards_bottom_temp = $scope.cards.splice(last_card, amount);
            var removed_cards_bottom_temp = $scope.cards.splice(0, amount);
            $scope.removed_cards_bottom = $scope.removed_cards_bottom.concat(removed_cards_bottom_temp);
            deferred.resolve(amount);
        } else {
            console.log('dont removeCardsBottom: ' + amount);
            deferred.resolve(amount);
        }
        return deferred.promise;
    };

    //$scope.fully_loaded = false;
    /*
    checkImagesLoaded = function(location) {
        //console.log(img_count + ' == ' + img_loaded);
        if (img_count == img_loaded || img_count == 0) {
            console.log('all images loaded: ' + location);

            // Check if first load.
            if ($scope.cards.length == 0) {
                console.log('temp2');
                tempToCards();
            }
            // Check if first load of content_cnv

            if (location == 'content_cnv' && $scope.cards.length > 0) {
                console.log('first_load: ' + first_load);

                if (first_load) {
                    //console.log('ITEMS FIRED');
                    //$scope.$broadcast("items_changed", scroll_direction);

                }

                //first_load = false;
                //addObservers();
                //intObservers();
            }

            if (location == 'content_cnv') {
                //$scope.$broadcast("items_changed", scroll_direction);
                $rootScope.loading_cards = false;

                //$scope.fully_loaded = true;
                //addObservers();
                //$scope.scrollingdisabled = false;
                checkNext();
                // Remove cards
                //removeCardsTop();
            }

            if (location == 'load_off_screen') {
                //$scope.$broadcast("items_changed", scroll_direction);
                $rootScope.loading_cards_offscreen = false;
                //$scope.scrollingdisabled = false;
                checkNext();
            }


        }
    };
    */
    upDateObservers = function() {
        $timeout(function() {
            resetObserver_queue();
            intObservers();
            for (var i = 0, len = $scope.cards.length; i < len; i++) {
                createObserver($scope.cards[i]._id);
            }
        },100);
    };


    imagesLoaded = function(location) {
        console.log(location);
        //console.log(img_count + ' == ' + img_loaded);
        //if (img_count == img_loaded || img_count == 0) {
        console.log('all images loaded: ' + location);

        // Check if first load.
        if ($scope.cards.length == 0) {
            console.log('temp3');
            tempToCards();
        }
        // Check if first load of content_cnv

        if (location == 'content_cnv' && $scope.cards.length > 0) {
            console.log('first_load: ' + first_load);

            if (first_load) {
                console.log('ITEMS FIRED');
                $scope.$broadcast("items_changed", scroll_direction);
                $timeout(function() {
                    bindScroll();
                }, 500);
            }

            first_load = false;
            //addObservers();
            //intObservers();
        }

        if (location == 'content_cnv') {
            //$scope.$broadcast("items_changed", scroll_direction);
            $rootScope.loading_cards = false;

            //upDateObservers();


            //$scope.fully_loaded = true;
            //addObservers();
            //$scope.scrollingdisabled = false;
            checkNext();
            // Remove cards
            //removeCardsTop();
        }

        if (location == 'load_off_screen') {
            //$scope.$broadcast("items_changed", scroll_direction);
            $rootScope.loading_cards_offscreen = false;
            //$scope.scrollingdisabled = false;
            checkNext();
        }


        //}
    };

    var store = {};
    checkImages = function(location) {

        console.log(location);

        store[location] = {};

        //store[location] = location;

        //store.location = location;
        store[location].location = location;
        store[location].img_loaded = 0;
        store[location].img_count = $('.' + location + ' img').length;
        console.log(store[location]);
        if (store[location].img_count > 0) {
            $('.' + location).find('img').each(function() {
                if (this.complete) {
                    // this image already loaded
                    //console.log('already loaded');
                    //var store = location + '_obj';

                    store[location].img_loaded++;
                    //checkImagesLoaded(location);
                    if (store[location].img_count == store[location].img_loaded || store[location].img_count == 0) {
                        imagesLoaded(store[location].location);
                    }
                } else {
                    $(this).on('load', function() {
                        //var store = location + '_obj';
                        // image now loaded
                        //console.log('finally loaded');
                        store[location].img_loaded++;
                        //checkImagesLoaded(location);
                        if (store[location].img_count == store[location].img_loaded || store[location].img_count == 0) {
                            imagesLoaded(store[location].location);
                        }
                    });
                }
            });
        } else {
            //checkImagesLoaded(location);
            imagesLoaded(location);
        }

    };



    $scope.$on('ngRepeatFinishedTemp', function(ngRepeatFinishedEvent) {
        console.log('ngRepeatFinishedTemp');
        checkImages('load_off_screen');
    });

    $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
        console.log('ngRepeatFinished');
        dir = 2;
        checkImages('content_cnv');

        //$rootScope.pageLoading = false;
        //$scope.scrollingdisabled = false;
        /*
        var id = Conversations.getConversationId();
        if (Conversations.getConversationType() == 'feed') {
            getFollowing();
        } else if (Conversations.getConversationType() == 'private') {
            getCards(id);
        } else if (Conversations.getConversationType() == 'public') {
            getPublicCards(id);
        }
        */

        if ($('.cropper-container').length > 0) {
            $('.cropper-container').remove();
            $('.cropper-hidden').removeClass('cropper-hidden');
        }
    });

    $scope.$on('rzSliderRender', function(event, data) {
        $scope.addSlider(data);
    });

    addCard = function(card) {
        // Get the user for this card
        var users = UserData.getContacts();
        var user_pos = General.findWithAttr(users, '_id', card.user);
        var user = users[user_pos];
        // Store the original characters of the card.
        card.original_content = card.content;
        // Get the user name for the user id
        card.user_name = user.user_name;
        card.avatar = user.avatar;
        $scope.cards.push(card);
    };

    deleteCard = function(id) {
        var card_pos = General.findWithAttr($scope.cards, '_id', id);
        if (card_pos >= 0) {
            $rootScope.deleting_card = true;
            $scope.cards.splice(card_pos, 1);
            $rootScope.deleting_card = false;
        }
    };

    updateCard = function(card) {
        // Check the existece of the card across all arrays.
        var card_arrays = [$scope.cards, $scope.cards_temp, $scope.removed_cards_bottom, $scope.removed_cards_top];
        var card_pos;
        var found_pos = -1;
        var arr;
        for (var i = 0, len = card_arrays.length; i < len; i++) {
            card_pos = General.findWithAttr(card_arrays[i], '_id', card._id);
             if (card_pos >= 0) {
                arr = i;
                found_pos = card_pos;
                break;
             }
        }
        //var card_pos = General.findWithAttr($scope.cards, '_id', card._id);
        console.log(arr + ' : ' + found_pos);
        if (found_pos >= 0) {
            card_arrays[arr][found_pos].original_content = card.content;
            card_arrays[arr][found_pos].content = card.content;
            card_arrays[arr][found_pos].updatedAt = card.updatedAt;
        }
    };

    updateFollowingIcons = function(newValue) {
        var deferred = $q.defer();
        var promises = [];
        if (newValue != undefined) {
            // Find all Users first.
            var userList = [];
            var userListObjects = [];
            newValue.map(function(key, array) {
                if (!userList.includes(key.user)) {
                    userList.push(key.user);
                }
            });
            userList.map(function(key, array) {
                // Find the public conversation for this user.
                // LDB
                var prom = Conversations.find_user_public_conversation_by_id(key)
                    .then(function(result) {
                        var user_obj = { user_id: key, conversation: result };
                        userListObjects.push(user_obj);
                    });
                promises.push(prom);
            });
        }
        // All following icons have been mapped.
        $q.all(promises).then(function() {
            newValue.map(function(key, array) {
                // Find the public conversation for this user.
                var user_pos = General.findWithAttr(userListObjects, 'user_id', key.user);
                var public_conv_id = userListObjects[user_pos].conversation._id;
                if ($scope.currentUser.following.indexOf(public_conv_id) >= 0) {
                    // The user is following this user.
                    key.following = true;
                } else {
                    // The user is not following this user.
                    key.following = false;
                }
            });
            deferred.resolve();
        });
        return deferred.promise;
    };

    removeUserCards = function(conversation_id) {
        // Reomve cards
        var i = $scope.cards.length;
        while (i--) {
            if ($scope.cards[i].conversationId == conversation_id) {
                $scope.cards.splice(i, 1);
            }
        }
    };

    getFollowingUpdate = function() {
        if (!$rootScope.loading_cards) {
            $scope.cards_temp = [];
            $rootScope.loading_cards = true;
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
            var prom1 = Conversations.updateFeed(val)
                .then(function(res) {
                    if (res.data.cards.length > 0) {
                        res.data.cards.map(function(key, array) {
                            // Ckeck that this card does not already exist in scope.cards
                            if (General.findWithAttr($scope.cards, '_id', key._id) < 0) {
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
                }).catch(function(error) {
                    console.log(error);
                });
            promises.push(prom1);
            // All the users contacts have been mapped.
            $q.all(promises).then(function() {
                $scope.cards_temp.map(function(key, array) {
                    $scope.cards.push(key);
                });
                //$rootScope.loading_cards = false;
            });
            return deferred.promise;
        }
    };

    // TODO - If not following anyone suggest follow?
    getFollowing = function() {
        if (!$rootScope.loading_cards) {
            $scope.cards_temp = [];
            $rootScope.loading_cards = true;
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
            var prom1 = Conversations.getFeed(val)
                .then(function(res) {
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
                        $rootScope.pageLoading = false;
                    }
                });
            promises.push(prom1);
            // All the users contacts have been mapped.
            $q.all(promises).then(function() {
                $scope.cards_temp.map(function(key, array) {
                    $scope.cards.push(key);
                });
                //$rootScope.loading_cards = false;
                //scroll_direction = "top";
            });
            return deferred.promise;
        }
    };

    updateCardsUser = function(arr, user, user_name, avatar) {
        array = $scope[arr];
        if (array.length > 0) {
            array.map(function(key, array) {
                if (key.user == user) {
                    key.user_name = user_name;
                    key.avatar = avatar;
                }
            });
        }
    };

    /*
    getCardsUpdate = function(id) {
        var deferred = $q.defer();
        var promises = [];
        if (!$rootScope.loading_cards) {
            $scope.cards_temp = [];
            $rootScope.loading_cards = true;
            var last_card;
            var operand;
            if ($scope.cards.length > 0) {
                var sort_card = $filter('orderBy')($scope.cards, 'updatedAt');
                last_card = sort_card[sort_card.length - 1].updatedAt;
                operand = '$gt';
            } else {
                last_card = General.getISODate();
                operand = '$lt';
            }
            var val = { id: id, amount: NUM_TO_LOAD, last_card: last_card, operand: operand };
            var prom1 = Conversations.getConversationCards(val)
                .then(function(res) {
                    if (res.data.length > 0) {
                        res.data.map(function(key, array) {
                            // Only add this card if it does not already exist (message recieved and socket reconnect can overlap)
                            if (General.findWithAttr($scope.cards, '_id', key._id) < 0) {
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
                            }
                        });
                    } else {
                        // console.log('NO MORE RECORDS');
                    }
                })
                .catch(function(error) {
                    $rootScope.loading_cards = true;
                    console.log(error);
                });
            promises.push(prom1);
            // All the cards have been mapped.
            $q.all(promises).then(function() {
                $scope.cards_temp.map(function(key, array) {
                    $scope.cards.push(key);
                });
                var sort_card = $filter('orderBy')($scope.cards, 'updatedAt');
                last_card = sort_card[sort_card.length - 1];
                UserData.conversationsLatestCardAdd(id, last_card);
                $rootScope.loading_cards = false;
                deferred.resolve();
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    };
    */

    updateCards = function(arr) {
        console.log($scope.top_down);
        if (!$scope.top_down) {
            if ($scope.removed_cards_bottom.length > 0) {
                $scope.cards = $scope.cards.concat(arr, $scope.removed_cards_bottom);
                $scope.removed_cards_bottom = [];
                $scope.$broadcast("items_changed", 'bottom');
            } else {
                $scope.cards = $scope.cards.concat(arr);
                $scope.$broadcast("items_changed", 'bottom');
            }
        }

    };

    getCardsUpdate = function(id, destination) {
        var deferred = $q.defer();
        var promises = [];

        var cards_new = [];
        // $('.content_cnv').bind('scroll', myHeavyFunction);
        //$('.content_cnv').bind('scroll', wheelEvent);
        //$( "#foo" ).unbind( "click", handler );
        //unbindScroll();

        //first_load = true;
        //$rootScope.scrollingdisabled = true;
        //$scope.cards = [];
        //$scope.cards_temp = [];
        //$scope.removed_cards_bottom = [];
        //$scope.removed_cards_top = [];

        console.log('getCardsUpdate: ' + destination + ' : ' + $rootScope.loading_cards + ', ' + $rootScope.loading_cards_offscreen);
        //if (!$rootScope.loading_cards && !$rootScope.loading_cards_offscreen) {
        if ((destination == 'cards' && !$rootScope.loading_cards) || (destination == 'cache' && !$rootScope.loading_cards_offscreen)) {
            //$scope.cards_temp = [];
            if (destination == 'cards') {
                $rootScope.loading_cards = true;
            } else if (destination == 'cache') {
                $rootScope.loading_cards_offscreen = true;
            }

            $rootScope.loading_cards = true;


            var last_card;
            var operand;
            var load_amount;
            if (destination == 'cards') {

                if ($scope.cards.length > 0) {
                    var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                    var sort_card = $filter('orderBy')(all_cards, 'updatedAt');
                    //var sort_card = $filter('orderBy')($scope.cards_temp, 'updatedAt');
                    last_card = sort_card[sort_card.length - 1].updatedAt;
                    //last_card = $scope.cards[0].updatedAt;
                    operand = '$gt';
                    load_amount = NUM_TO_LOAD;
                } else {
                    load_amount = INIT_NUM_TO_LOAD;
                    last_card = General.getISODate();
                    operand = '$lt';
                }

                /*
                load_amount = INIT_NUM_TO_LOAD;
                last_card = General.getISODate();
                operand = '$lt';
                */
            } else if (destination == 'cache') {
                if ($scope.cards_temp.length > 0) {
                    //var sort_card = $filter('orderBy')($scope.cards_temp, 'updatedAt');
                    var sort_card = $filter('orderBy')($scope.cards_temp, 'updatedAt');

                    //var sort_card = $scope.cards_temp;

                    last_card = sort_card[0].updatedAt;
                    //last_card = $scope.cards[0].updatedAt;
                    operand = '$lt';
                    load_amount = NUM_TO_LOAD;
                } else {
                    var sort_card = $filter('orderBy')($scope.cards, 'updatedAt');
                    last_card = sort_card[0].updatedAt;
                    //load_amount = INIT_NUM_TO_LOAD;
                    load_amount = NUM_TO_LOAD;
                    //last_card = General.getISODate();
                    operand = '$lt';
                }
            }

            var val = { id: id, amount: load_amount, last_card: last_card, operand: operand };
            console.log(val);
            var prom1 = Conversations.getConversationCards(val)
                .then(function(res) {
                    console.log(res);
                    if (res.data.length > 0) {
                        // Unbind scroll and empty arrays.
                        //unbindScroll();
                        //$scope.removed_cards_bottom = [];
                        //$scope.removed_cards_top = [];
                        //$scope.cards = [];

                        var users = UserData.getContacts();
                        var user;
                        for (var i = 0, len = res.data.length; i < len; i++) {
                            var key = res.data[i];
                            var user_pos = General.findWithAttr(users, '_id', key.user);
                            // Get the user for this card
                            if (user_pos < 0) {
                                //Users.search_id(key.user)
                                //   .then(function(res) {
                                //    });
                            } else {
                                user = users[user_pos];
                                // Store the original characters of the card.
                                key.original_content = key.content;
                                // Get the user name for the user id
                                key.user_name = user.user_name;
                                key.avatar = user.avatar;
                                // Only add the card if it does not already exist.
                                //var check_exists = General.findWithAttr($scope.cards, '_id', key._id);
                                //if (check_exists < 0) {
                                //    console.log('adding');
                                //    console.log(key);
                                //content_adjust = true;
                                //$scope.cards.push(key);
                                cards_new.push(key);
                                //}

                            }
                        }
                    } else {
                        console.log('NO MORE RECORDS');
                        $rootScope.loading_cards = false;
                        $rootScope.loading_cards_offscreen = false;
                        no_more_records = true;
                    }
                })
                .catch(function(error) {
                    console.log(error);
                });
            promises.push(prom1);
            // All the cards have been mapped.
            $q.all(promises).then(function() {
                console.log($scope.cards_temp);
                $rootScope.loading_cards = false;
                if (!no_more_records) {
                    //$scope.$broadcast("items_changed", 'bottom');
                    //checkNext();
                }

                //$scope.cards_temp.map(function(key, array) {
                // console.log(key);
                //$scope.cards.push(key);
                // if (!$scope.$$phase) {
                //   console.log('apply');
                // $scope.$apply();
                //}

                //});

                console.log('getCards fin');


                deferred.resolve(cards_new);
            });

        } else {
            // Wait for loading to finish.
            deferred.resolve();
        }
        return deferred.promise;
    };


    $scope.cards_temp = [];
    $rootScope.loading_cards_offscreen = false;
    var no_more_records = false;


    getCards = function(id, destination) {
        console.log('getCards: ' + destination + ' : ' + $rootScope.loading_cards + ', ' + $rootScope.loading_cards_offscreen);
        //if (!$rootScope.loading_cards && !$rootScope.loading_cards_offscreen) {
        if ((destination == 'cards' && !$rootScope.loading_cards) || (destination == 'cache' && !$rootScope.loading_cards_offscreen)) {
            //$scope.cards_temp = [];
            if (destination == 'cards') {
                $rootScope.loading_cards = true;
            } else if (destination == 'cache') {
                $rootScope.loading_cards_offscreen = true;
            }

            //$rootScope.loading_cards = true;

            var deferred = $q.defer();
            var promises = [];
            var last_card;
            var operand;
            var load_amount;

            var load_cards = true;

            if (destination == 'cards') {
                if ($scope.cards.length > 0) {
                    var sort_card = $filter('orderBy')($scope.cards, 'updatedAt');
                    //var sort_card = $filter('orderBy')($scope.cards_temp, 'updatedAt');
                    last_card = sort_card[0].updatedAt;
                    //last_card = $scope.cards[0].updatedAt;
                    operand = '$lt';
                    load_amount = NUM_TO_LOAD;
                } else {
                    load_amount = INIT_NUM_TO_LOAD;
                    last_card = General.getISODate();
                    operand = '$lt';
                }
            } else if (destination == 'cache') {

                // Check if top_down
                if ($scope.top_down) {

                } else {
                    console.log('load more up');
                }

                if ($scope.cards_temp.length > 0) {

                    // Only get newer than temp but check removed cards



                    //var sort_card = $filter('orderBy')($scope.cards_temp, 'updatedAt');
                    var sort_card = $filter('orderBy')($scope.cards_temp, 'updatedAt');

                    //var sort_card = $scope.cards_temp;

                    last_card = sort_card[0].updatedAt;
                    //last_card = $scope.cards[0].updatedAt;
                    operand = '$lt';
                    load_amount = NUM_TO_LOAD;
                } else {
                    // load up
                    /*
                    if (!$scope.top_down && $scope.removed_cards_top.length > 0) {

                        var sort_card_top = $filter('orderBy')($scope.removed_cards_top, 'updatedAt');
                        console.log(sort_card_top[0].updatedAt);
                        // sort_card[sort_card.length - 1].updatedAt;
                        console.log(sort_card_top[sort_card_top.length-1].updatedAt);
                        load_cards = false;
                    }
                    */
                    if ($scope.removed_cards_top.length > 0) {
                        load_cards = false;
                    }

                    var sort_card = $filter('orderBy')($scope.cards, 'updatedAt');
                    last_card = sort_card[0].updatedAt;
                    //load_amount = INIT_NUM_TO_LOAD;
                    load_amount = NUM_TO_LOAD;
                    //last_card = General.getISODate();
                    operand = '$lt';
                }
            }
            if (load_cards) {
                var val = { id: id, amount: load_amount, last_card: last_card, operand: operand };
                console.log(val);
                var prom1 = Conversations.getConversationCards(val)
                    .then(function(res) {
                        console.log(res);
                        if (res.data.length > 0) {

                            var t0 = performance.now();

                            var users = UserData.getContacts();

                            var user;

                            for (var i = 0, len = res.data.length; i < len; i++) {

                                var key = res.data[i];

                                var user_pos = General.findWithAttr(users, '_id', key.user);
                                // Get the user for this card

                                if (user_pos < 0) {
                                    //Users.search_id(key.user)
                                    //   .then(function(res) {
                                    //    });
                                } else {
                                    user = users[user_pos];
                                    // Store the original characters of the card.
                                    key.original_content = key.content;
                                    // Get the user name for the user id
                                    key.user_name = user.user_name;
                                    key.avatar = user.avatar;
                                    $scope.cards_temp.push(key);
                                }
                            }
                        } else {
                            console.log('NO MORE RECORDS');
                            $rootScope.loading_cards = false;
                            $rootScope.loading_cards_offscreen = false;
                            no_more_records = true;
                        }
                    })
                    .catch(function(error) {
                        console.log(error);
                    });
                promises.push(prom1);
                // All the cards have been mapped.
                $q.all(promises).then(function() {
                    console.log($scope.cards_temp);
                    //$scope.cards_temp.map(function(key, array) {
                    // console.log(key);
                    //$scope.cards.push(key);
                    // if (!$scope.$$phase) {
                    //   console.log('apply');
                    // $scope.$apply();
                    //}

                    //});

                    console.log('getCards fin');


                    deferred.resolve();
                });
            }
            return deferred.promise;
        } else {
            // Wait for loading to finish.
        }
    };


    /*
        $scope.card_added = false;
        $scope.cardCreated = function() {
            //console.log('cardCreated');
            $scope.card_added = true;
        };
        */

    getPublicCards = function(id) {
        if (!$rootScope.loading_cards) {
            $scope.cards_temp = [];
            $rootScope.loading_cards = true;
            var deferred = $q.defer();
            var promises = [];
            var last_card;
            var operand;
            if ($scope.cards.length > 0) {
                var sort_card = $filter('orderBy')($scope.cards, 'updatedAt');
                last_card = sort_card[0].updatedAt;
                operand = '$lt';
            } else {
                last_card = General.getISODate();
                operand = '$lt';
            }
            var val = { id: id, amount: NUM_TO_LOAD, last_card: last_card, operand: operand };
            promises.push(Conversations.getPublicConversationCards(val)
                .then(function(res) {
                    if (res.data.length > 0) {
                        promises.push(res.data.map(function(key, array) {
                            // Get the user for this card
                            var users = UserData.getContacts();
                            var user;
                            var user_pos = General.findWithAttr(users, '_id', key.user);
                            if (user_pos < 0) {
                                var prom3 = Users.search_public_id(key.user)
                                    .then(function(res) {
                                        if (res.data) {
                                            user = res.data.success;
                                        } else {
                                            user = res;
                                        }
                                        // Get the user name for the user id
                                        key.user_name = user.user_name;
                                        key.avatar = user.avatar;
                                        // Store the original characters of the card.
                                        key.original_content = key.content;
                                        $scope.cards_temp.push(key);
                                    });
                                promises.push(prom3);
                            } else {
                                user = users[user_pos];
                                // Get the user name for the user id
                                key.user_name = user.user_name;
                                key.avatar = user.avatar;
                                // Store the original characters of the card.
                                key.original_content = key.content;
                                $scope.cards_temp.push(key);
                            }
                        }));
                    } else {
                        // console.log('NO MORE RECORDS');
                    }
                    // All the cards have been mapped.
                    $q.all(promises).then(function() {
                        $scope.cards_temp.map(function(key, array) {
                            $scope.cards.push(key);
                        });
                        //$rootScope.loading_cards = false;
                        deferred.resolve();
                    });
                }));
            return deferred.promise;
        }
    };

    getPublicCardsUpdate = function(id) {
        var deferred = $q.defer();
        var promises = [];
        if (!$rootScope.loading_cards) {
            $scope.cards_temp = [];
            $rootScope.loading_cards = true;
            var last_card;
            var operand;
            if ($scope.cards.length > 0) {
                var sort_card = $filter('orderBy')($scope.cards, 'updatedAt');
                last_card = sort_card[sort_card.length - 1].updatedAt;
                operand = '$gt';
            } else {
                last_card = General.getISODate();
                operand = '$lt';
            }
            var val = { id: id, amount: NUM_TO_LOAD, last_card: last_card, operand: operand };
            promises.push(Conversations.getPublicConversationCards(val)
                .then(function(res) {
                    if (res.data.length > 0) {
                        promises.push(res.data.map(function(key, array) {
                            // Get the user for this card
                            var users = UserData.getContacts();
                            var user;
                            var user_pos = General.findWithAttr(users, '_id', key.user);
                            if (user_pos < 0) {
                                var prom3 = Users.search_public_id(key.user)
                                    .then(function(res) {
                                        if (res.data) {
                                            user = res.data.success;
                                        } else {
                                            user = res;
                                        }
                                        // Get the user name for the user id
                                        key.user_name = user.user_name;
                                        key.avatar = user.avatar;
                                        // Store the original characters of the card.
                                        key.original_content = key.content;
                                        $scope.cards_temp.push(key);
                                    });
                                promises.push(prom3);
                            } else {
                                user = users[user_pos];
                                // Get the user name for the user id
                                key.user_name = user.user_name;
                                key.avatar = user.avatar;
                                // Store the original characters of the card.
                                key.original_content = key.content;
                                $scope.cards_temp.push(key);
                            }
                        }));
                    } else {
                        // console.log('NO MORE RECORDS');
                    }
                    // All the cards have been mapped.
                    $q.all(promises).then(function() {
                        $scope.cards_temp.map(function(key, array) {
                            $scope.cards.push(key);
                        });
                        var sort_card = $filter('orderBy')($scope.cards, 'updatedAt');
                        last_card = sort_card[sort_card.length - 1];
                        UserData.conversationsLatestCardAdd(id, last_card);
                        //$rootScope.loading_cards = false;
                        deferred.resolve();
                    });
                }));
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
        // LDB
        Conversations.find_user_public_conversation_by_id(UserData.getUser()._id).then(function(result) {
            // Set the conversation id so that it can be retrieved by cardcreate_ctrl
            if (result._id != undefined) {
                // TODO STORE THE CONVERSATION
                Conversations.setConversationId(result._id);
                getFollowing();
            }
        });
    };

    setConversationProfile = function(id) {
        var profile = {};
        // LDB
        Conversations.find_conversation_id(id).then(function(res) {
            if (res.conversation_type == 'public') {
                // $scope.conv_type used for Header
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
                var user = UserData.getContact(res.participants[participant_pos]._id);
                var avatar = "default";
                // set the other user name as the name of the conversation.
                if (user != undefined) {
                    profile.user_name = user.user_name;
                    avatar = user.avatar;
                }
                profile.avatar = avatar;
                Profile.setConvProfile(profile);
                $rootScope.$broadcast('PROFILE_SET');
            }
        });
    };

    loadConversation = function() {
        var id = Conversations.getConversationId();
        if (Conversations.getConversationType() != 'public') {
            // Clear conversation viewed
            updateConversationViewed(id);
        }
        // Set the conversation profile
        setConversationProfile(id);
        getCards(id, 'cards').then(function(result) {
            if (result == undefined) {
                $rootScope.pageLoading = false;

            }
            //scroll_direction = "bottom";
            //$scope.$broadcast("items_changed", 'bottom');
        });
    };

    loadPublicConversation = function() {
        var id = Conversations.getConversationId();
        // Set the conversation profile
        setConversationProfile(id);
        if (!$scope.isMember || !principal.isValid()) {
            $scope.no_footer = true;
        }
        getPublicCards(id).then(function(result) {
            if (result == undefined) {
                $rootScope.pageLoading = false;
            }
            //$scope.$broadcast("items_changed", 'top');
            //scroll_direction = "top";

        });
    };

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
                // Public
                // LDB
                Conversations.find_user_public_conversation_id(username)
                    .then(function(res) {
                        // check if this is a valid username
                        if (res.error) {
                            $location.path("/api/login");
                        } else {
                            callback(res._id);
                        }
                    })
                    .catch(function(error) {
                        console.log(error);
                    });
            }
        } else {
            // TODO - no longer needed?
            // Check if this is a public conversation.
            Conversations.find_public_conversation_id(id)
                .then(function(result) {
                    if (result != null && result.conversation_type == 'public') {
                        getPublicConversation(id, result);
                    } else {
                        // private.
                        callback(id);
                    }
                });
        }
    };


    // TODO - no longer needed?
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

    // clear the participants unviewed array by conversation id
    updateConversationViewed = function(id) {
        UserData.updateConversationViewed(id);
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


    // START - find the conversation id
    getConversationId()
        .then(function(res) {
            //$scope.scrollingdisabled = true;
            if (Conversations.getConversationType() == 'feed') {
                $scope.feed = true;
                $scope.top_down = true;
                $rootScope.top_down = true;
                //$scope.total_to_display = INIT_NUM_TO_DISPLAY;
                $scope.isMember = true;
                scroll_direction = "top";
            } else if (Conversations.getConversationType() == 'public') {
                $scope.top_down = true;
                $rootScope.top_down = true;
                //$scope.total_to_display = INIT_NUM_TO_DISPLAY;
                $scope.isMember = checkPermit(res);
                scroll_direction = "top";
            } else if (Conversations.getConversationType() == 'private') {
                //$scope.total_to_display = -INIT_NUM_TO_DISPLAY;
                $scope.isMember = checkPermit(res);
                scroll_direction = "bottom";
                $scope.top_down = false;
                $rootScope.top_down = false;
            }
            // Load the public feed, public conversation or private conversation.
            if (principal.isValid()) {
                // Logged in
                UserData.checkUser().then(function(result) {
                    $scope.currentUser = UserData.getUser();
                    if (Conversations.getConversationType() == 'feed') {
                        // Display the users feed.
                        loadFeed();
                    } else if (Conversations.getConversationType() == 'public') {
                        loadPublicConversation();
                    } else if (Conversations.getConversationType() == 'private') {
                        // Logged in.Load the conversation for the first time.
                        loadConversation();
                    }
                });
            } else {
                $rootScope.dataLoading = false;
                // Not logged in
                if (Conversations.getConversationType() == 'public') {
                    // Public route (Does not need to be logged in).
                    loadPublicConversation();
                } else {
                    $location.path("/api/login/");
                }
            }
        });
}]);