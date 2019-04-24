//cardApp.controller("conversationCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', '$q', '$filter', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'Users', '$routeParams', '$timeout', 'moment', 'socket', 'Database', 'General', 'Profile', 'principal', 'UserData', 'ImageEdit', '$compile', 'ImageAdjustment', 'Keyboard', 'Scroll', '$animate', '$mdCompiler', function($scope, $rootScope, $location, $http, $window, $q, $filter, Cards, replaceTags, Format, Edit, Conversations, Users, $routeParams, $timeout, moment, socket, Database, General, Profile, principal, UserData, ImageEdit, $compile, ImageAdjustment, Keyboard, Scroll, $animate, $mdCompiler) {
cardApp.controller("conversationCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', '$q', '$filter', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'Users', '$routeParams', '$timeout', 'moment', 'socket', 'Database', 'General', 'Profile', 'principal', 'UserData', 'ImageEdit', '$compile', 'ImageAdjustment', 'Keyboard', 'Scroll', '$animate', function($scope, $rootScope, $location, $http, $window, $q, $filter, Cards, replaceTags, Format, Edit, Conversations, Users, $routeParams, $timeout, moment, socket, Database, General, Profile, principal, UserData, ImageEdit, $compile, ImageAdjustment, Keyboard, Scroll, $animate) {
    openCrop = ImageEdit.openCrop;
    editImage = ImageEdit.editImage;
    closeEdit = ImageEdit.closeEdit;
    filterImage = ImageEdit.filterImage;
    closeFilters = ImageEdit.closeFilters;
    filterClick = ImageEdit.filterClick;
    adjustImage = ImageEdit.adjustImage;
    cancelCrop = ImageEdit.cancelCrop;
    makeCrop = ImageEdit.makeCrop;
    openRotate = ImageEdit.openRotate;

    $scope.sliderRotateChange = ImageEdit.sliderRotateChange;

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
    $scope.test_card = [];

    $scope.$on('$destroy', function() {
        //leaving controller.
        //
        // Reset image editing to false
        ImageAdjustment.setImageEditing(false);
        $('.image_adjust_on').remove();
        $rootScope.top_down = false;
        Conversations.setConversationId('');
        Conversations.setConversationType('');
        resetObserver_queue();
        unbindScroll();
        $scope.cards = [];
        first_load = false;
    });

    // Detect device user agent 
    var ua = navigator.userAgent;

    // SCROLLING

    // Percent from top and bottom after which a check for more cards is executed.
    var UP_PERCENT = 20; //10
    var DOWN_PERCENT = 80; // 90
    // Percent from top and bottom after which a check to move the scroll position and check for mre cards is executed.
    var TOP_END = 0;
    var BOTTOM_END = 100;
    // Numbers of cards to load or display.
    var INIT_NUM_TO_LOAD = 50;
    var NUM_TO_LOAD = 20;
    var NUM_UPDATE_DISPLAY = 10;
    var NUM_UPDATE_DISPLAY_INIT = 30;
    // Minimum number of $scope.cards_temp to keep loaded.
    var MIN_TEMP = 40;
    // The maximum number of cards to keep out of bounds.
    var MAX_OUT_BOUNDS = 10;

    // SCROLL INDICATOR

    var SCROLL_THUMB_MIN = 5;

    $rootScope.pageLoading = true;
    $rootScope.loading_cards = false;
    $scope.feed = false;
    $scope.top_down = false;
    $rootScope.top_down = false;
    $rootScope.last_win_width;
    $rootScope.loading_cards_offscreen = false;

    $scope.isMember = false;
    $scope.cards = [];
    $scope.removed_cards_top = [];
    $scope.removed_cards_bottom = [];
    $scope.cards_temp = [];

    var first_load = true;
    var scroll_direction;
    var last_scrolled;
    var dir;
    var store = {};
    var image_check_counter = 0;
    var scroll_updating = false;
    var programmatic_scroll = false;
    var last_card_stored;

    // SCROLL INDICATOR
    var pb;
    var cdh;
    var currentScroll;
    var maxScroll;
    var ch;
    var mobile = false;
    var time_1;
    var time_2;

    if (ua.indexOf('AndroidApp') >= 0) {
        mobile = true;
    }

    Keyboard.keyBoardListenStart();

    // Use the urls id param from the route to load the conversation.
    var id = $routeParams.id;
    // Use the urls username param from the route to load the conversation.
    var username = $routeParams.username;

    // DEBUGGING
    $rootScope.$watch('debug', function(newStatus) {
        var unbinddb1;
        var unbinddb2;
        var unbinddb3;
        if (newStatus) {
            unbinddb1 = $scope.$watch('cards_temp.length', function(newStatus) {
                $rootScope.cards_temp_length = newStatus;
            });
            unbinddb2 = $scope.$watch('removed_cards_top.length', function(newStatus) {
                $rootScope.removed_cards_top_length = newStatus;
            });
            unbinddb3 = $scope.$watch('removed_cards_bottom.length', function(newStatus) {
                $rootScope.removed_cards_bottom_length = newStatus;
            });
        } else {
            $rootScope.cards_temp_length = 'NA';
            $rootScope.removed_cards_top_length = 'NA';
            $rootScope.removed_cards_bottom_length = 'NA';
            if (unbinddb1 != undefined) {
                unbinddb1();
                unbinddb2();
                unbinddb3();
            }
        }
    });

    // When cropper image has been changed save the card.
    saveCard = function(id) {
        var deferred = $q.defer();
        // Find the card to be saved by id.
        var pos = General.findWithAttr($scope.cards, '_id', id);
        if (pos >= 0) {
            var card = $scope.cards[pos];
            // Update the card.
            Format.updateCard(id, card, $scope.currentUser).then(function() {
                Scroll.enable('.content_cnv');
                ImageAdjustment.setImageAdjusted(false);
                deferred.resolve();
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    };

    // When an image is uploaded.
    $scope.$on('imageUpload', function(event, data) {
        scroll_updating = true;
    });
    // When an image is pasted
    $scope.$on('imagePasted', function(event, data) {
        $timeout(function() {
            scroll_updating = false;
        }, 500);
    });

    $scope.$on('window_resize', function() {
        setUpScrollBar();
    });

    $scope.$on('ngRepeatFinishedTemp', function(ngRepeatFinishedEvent) {
        image_check_counter++;
        checkImages('load_off_screen', image_check_counter);
    });

    $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
        dir = 2;
        image_check_counter++;
        checkImages('content_cnv', image_check_counter);
        if ($('.cropper-container').length > 0) {
            $('.cropper-container').remove();
            $('.cropper-hidden').removeClass('cropper-hidden');
        }
    });

    $scope.$on('rzSliderRender', function(event, data) {
        addSlider(data);
    });

    // SCROLLING

    upDateObservers = function() {
        resetObserver_queue();
        intObservers();
        for (var i = 0, len = $scope.cards.length; i < len; i++) {
            //createObserver($scope.cards[i]._id);
            //disableCheckboxes($scope.cards[i]._id);
            //
            // If a new card has been posted.
            //
            // TODO - If not at top or bottom add dialogue to notify user of new post
            // but only scroll to the card if the user chooses. Requires change to updateCards also.
            if ($scope.cards[i].new_card) {
                var card_id = $scope.cards[i]._id;
                // Get the height of the new card.
                $scope.test_card.content = $scope.cards[i].content;
                $timeout(function() {
                    if ($scope.top_down) {
                        var cur_s = $(".content_cnv").scrollTop();
                        if (cur_s == 0) {
                            unbindScroll();
                            Scroll.disable('.content_cnv');
                            // If at top - animate the card into position.
                            var new_h = Number($('.test_card').outerHeight(true).toFixed(2));
                            $(".first_load_anim").css('margin-top', new_h * -1);
                            $(".first_load_anim").addClass('will_transform');
                            $(".first_load_anim").removeClass('zero_height');
                            $(".first_load_anim").addClass('animate_down');
                            $(".first_load_anim").on('webkitAnimationEnd oAnimationEnd animationend ', cardAnimEnd);
                        } else {
                            // not top
                            unbindScroll();
                            $(".first_load_anim").removeClass('zero_height');
                            // Animate the card into position
                            $(".content_cnv").animate({
                                scrollTop: 0
                            }, 800, "easeOutQuad", function() {
                                // Animation complete.
                                var pos = General.findWithAttr($scope.cards, '_id', card_id);
                                if (pos >= 0) {
                                    delete $scope.cards[pos].new_card;
                                    createObserver($scope.cards[pos]._id);
                                    disableCheckboxes($scope.cards[pos]._id);
                                }
                                bindScroll();
                            });
                        }
                    } else {
                        // If at top 
                        unbindScroll();
                        $(".first_load_anim").removeClass('zero_height');
                        var max_s = $(".content_cnv")[0].scrollHeight - $(".content_cnv")[0].clientHeight;
                        $(".content_cnv").animate({
                            scrollTop: max_s
                        }, 800, "easeOutQuad", function() {
                            // Animation complete.
                            var pos = General.findWithAttr($scope.cards, '_id', card_id);
                            if (pos >= 0) {
                                delete $scope.cards[pos].new_card;
                                createObserver($scope.cards[pos]._id);
                                disableCheckboxes($scope.cards[pos]._id);
                            }
                            bindScroll();
                        });
                    }
                });
            } else {
                createObserver($scope.cards[i]._id);
                disableCheckboxes($scope.cards[i]._id);
            }
        }
    };

    $scope.$watch('cards.length', function(newStatus) {
        // Debugging
        $rootScope.cards_length = newStatus;
        $timeout(function() {
            upDateObservers();
        }, 100);
        if (maxScroll > 0) {
            setUpScrollBar();
        }
    });

    // doRepeat Directive finished loading onscreen
    domUpdated = function() {
        $('#delete_image').remove();
        $rootScope.$broadcast("ngRepeatFinishedTemp", { temp: "some value" });
    };

    var updateScrollBar = function() {
        var sth = (100 / (((ch / cdh) * 100) / 100));
        if (sth < SCROLL_THUMB_MIN) {
            sth = SCROLL_THUMB_MIN;
        }
        // Set the progress thumb height.
        $(pb).css('height', sth + "%");
        var sm = 100 - sth;
        var s = (currentScroll / (maxScroll) * 100);
        s = (s * sm) / 100;
        // Set the progress thumb position.
        pb.style.top = s + "%";
    };

    var checkScrolling = function() {
        /*
        var last_scrolled;
        var currentScroll = $(".content_cnv").scrollTop();
        var maxScroll = $(".content_cnv")[0].scrollHeight - $(".content_cnv")[0].clientHeight;
        var scrolled = (currentScroll / maxScroll) * 100;
        $timeout.cancel(time_1);
        $timeout.cancel(time_2);
        if (scrolled != TOP_END && scrolled != BOTTOM_END) {
            time_1 = $timeout(function() {
                var currentScroll = $(".content_cnv").scrollTop();
                var maxScroll = $(".content_cnv")[0].scrollHeight - $(".content_cnv")[0].clientHeight;
                last_scrolled = (currentScroll / maxScroll) * 100;
                time_2 = $timeout(function() {
                    var currentScroll = $(".content_cnv").scrollTop();
                    var maxScroll = $(".content_cnv")[0].scrollHeight - $(".content_cnv")[0].clientHeight;
                    var scrollednew = (currentScroll / maxScroll) * 100;
                    if (last_scrolled == scrollednew) {
                        var change;
                        if (dir == 0) {
                            //down
                            change = currentScroll + 200;
                        } else if (dir == 1) {
                            //up
                            change = currentScroll - 200;
                        }
                        $(".content_cnv").animate({
                            scrollTop: change
                        }, 500);
                    }
                }, 200);
            }, 200);
        }
        */
    };

    var scrollFunction = function() {
        ch = this.scrollHeight;
        currentScroll = $(this).scrollTop();
        maxScroll = this.scrollHeight - this.clientHeight;
        var scrolled = (currentScroll / maxScroll) * 100;
        if (scrolled < last_scrolled) {
            // Up
            dir = 1;
        } else if (scrolled > last_scrolled) {
            // Down
            dir = 0;
        } else if (scrolled == last_scrolled) {
            // No change. Dont fire.
            dir = 2;
        }
        if (mobile) {
            updateScrollBar();
        }
        if (!scroll_updating) {
            if (dir == 1 && scrolled <= UP_PERCENT) {
                //console.log('FIRE UP!');
                addMoreTop()
                    .then(function(result) {
                        //console.log('AMT END');
                        scroll_updating = false;
                        checkScrolling();
                    });
            }
            if (dir == 0 && scrolled >= DOWN_PERCENT) {
                //console.log('FIRE DOWN!');
                addMoreBottom()
                    .then(function(result) {
                        //console.log('AMB END');
                        scroll_updating = false;
                        checkScrolling();
                    });
            }
        }
        last_scrolled = scrolled;
    };

    setUpScrollBar = function() {
        if (mobile) {
            $('.progress-container').css('top', $('.content_cnv').offset().top);
            $('.progress-container').css('height', $('.content_cnv').height());
            pb = document.getElementById('progress-thumb');
            $(pb).css('height', SCROLL_THUMB_MIN + "%");
            cdh = $('.content_cnv').height();
            ch = $('.content_cnv')[0].scrollHeight;
            currentScroll = $('.content_cnv').scrollTop();
            maxScroll = $('.content_cnv')[0].scrollHeight - $('.content_cnv')[0].clientHeight;
            if (maxScroll > 0) {
                $('.progress-container').addClass('active');
                $('#progress-thumb').removeClass('fade_in');
                $('#progress-thumb').addClass('fade_in');
                updateScrollBar();
            }
        }
    };

    bindScroll = function() {
        setUpScrollBar();
        $('.content_cnv')[0].addEventListener('scroll', scrollFunction, { passive: true }, { once: true });
    };

    unbindScroll = function() {
        $('.content_cnv')[0].removeEventListener('scroll', scrollFunction, { passive: true }, { once: true });
        $('.progress-container').removeClass('active');
    };

    // UPDATING CARDS

    tempToCards = function() {
        var deferred = $q.defer();
        scroll_updating = true;
        if ($scope.cards_temp.length > 0) {
            var amount = NUM_UPDATE_DISPLAY;
            var cards_to_move;
            if ($scope.cards.length == 0) {
                amount = NUM_UPDATE_DISPLAY_INIT;
            }
            cards_to_move = $scope.cards_temp.splice(0, amount);
            for (var i = 0, len = cards_to_move.length; i < len; i++) {
                $scope.cards.push(cards_to_move[i]);
            }
            // Check if more temp cards need to be loaded.
            checkNext();
            deferred.resolve(true);
        } else {
            deferred.resolve(false);
        }
        return deferred.promise;
    };

    addMoreTop = function() {
        var deferred = $q.defer();
        scroll_updating = true;
        unRemoveCardsTop()
            .then(function(result) {
                if (result == 0 && !$scope.top_down) {
                    tempToCards()
                        .then(function(result) {
                            removeCardsBottom()
                                .then(function(result) {
                                    deferred.resolve();
                                });
                        });
                } else {
                    removeCardsBottom()
                        .then(function(result) {
                            deferred.resolve();
                        });
                }
            });
        return deferred.promise;
    };

    addMoreBottom = function() {
        var deferred = $q.defer();
        scroll_updating = true;
        unRemoveCardsBottom()
            .then(function(result) {
                if (result == 0 && $scope.top_down) {
                    tempToCards()
                        .then(function(result) {
                            removeCardsTop()
                                .then(function(result) {
                                    deferred.resolve();
                                });
                        });
                } else {
                    removeCardsTop()
                        .then(function(result) {
                            deferred.resolve();
                        });
                }
            });
        return deferred.promise;
    };

    checkNext = function() {
        var id = Conversations.getConversationId();
        if (Conversations.getConversationType() == 'feed') {
            if ($scope.cards_temp.length < MIN_TEMP) {
                getFollowing();
            }
        } else if (Conversations.getConversationType() == 'private') {
            if ($scope.cards_temp.length < MIN_TEMP) {
                getCards(id);
            }
        } else if (Conversations.getConversationType() == 'public') {
            if ($scope.cards_temp.length < MIN_TEMP) {
                getPublicCards(id);
            }
        }
    };

    getCardAmountBottom = function() {
        var amount = 0;
        var allElements = document.querySelectorAll('.content_cnv .card_temp');
        $('.content_cnv .vis').last().addClass('removeCards');
        var last_index;
        for (var len = allElements.length, i = allElements.length; i > 0; i--) {
            if ($(allElements[i]).hasClass('removeCards')) {
                $(allElements[i]).removeClass('removeCards');
                last_index = i + 1;
                break;
            }
        }
        if (last_index != undefined) {
            var remainder = allElements.length - last_index;
            amount = remainder <= MAX_OUT_BOUNDS ? remainder - MAX_OUT_BOUNDS : remainder - MAX_OUT_BOUNDS;
            // check less than zero
            amount = amount < 0 ? 0 : amount;
            // check for undefined
            amount = amount != undefined ? amount : 0;
        }
        return amount;
    };

    getCardAmountTop = function() {
        var amount = 0;
        var allElements = document.querySelectorAll('.content_cnv .card_temp');
        $('.content_cnv .vis').first().addClass('removeCards');
        var last_index;
        for (var i = 0, len = allElements.length; i < len; i++) {
            if ($(allElements[i]).hasClass('removeCards')) {
                $(allElements[i]).removeClass('removeCards');
                last_index = i;
                break;
            }
        }
        if (last_index != undefined) {
            amount = last_index <= MAX_OUT_BOUNDS ? 0 : last_index - MAX_OUT_BOUNDS;
        }
        // check less than zero
        amount = amount < 0 ? 0 : amount;
        // check for undefined
        amount = amount != undefined ? amount : 0;
        return amount;
    };

    unRemoveCardsTop = function() {
        var deferred = $q.defer();
        var removed_length = $scope.removed_cards_top.length;
        var amount = NUM_UPDATE_DISPLAY;
        if (removed_length < amount) {
            amount = removed_length;
        }
        if (removed_length > 0) {
            if (!$scope.top_down) {
                $scope.removed_cards_top = $filter('orderBy')($scope.removed_cards_top, 'updatedAt', true);
            } else {
                $scope.removed_cards_top = $filter('orderBy')($scope.removed_cards_top, 'updatedAt');
            }
            var spliced = $scope.removed_cards_top.splice(0, amount);
            for (var i = 0, len = spliced.length; i < len; i++) {
                $scope.cards.push(spliced[i]);
            }
            deferred.resolve(removed_length);
        } else {
            deferred.resolve(0);
        }
        return deferred.promise;
    };

    unRemoveCardsBottom = function() {
        var deferred = $q.defer();
        var removed_length = $scope.removed_cards_bottom.length;
        amount = NUM_UPDATE_DISPLAY;
        if (removed_length < amount) {
            amount = removed_length;
        }
        if (amount > 0) {
            if (!$scope.top_down) {
                $scope.removed_cards_bottom = $filter('orderBy')($scope.removed_cards_bottom, 'updatedAt');
            } else {
                $scope.removed_cards_bottom = $filter('orderBy')($scope.removed_cards_bottom, 'updatedAt', true);
            }
            var spliced = $scope.removed_cards_bottom.splice(0, amount);
            for (var i = 0, len = spliced.length; i < len; i++) {
                $scope.cards.push(spliced[i]);
            }
            deferred.resolve(removed_length);
        } else {
            deferred.resolve(0);
        }
        return deferred.promise;
    };

    removeCardsTop = function() {
        var deferred = $q.defer();
        var amount = getCardAmountTop();
        if (amount > 0) {
            if (!$scope.top_down) {
                $scope.cards = $filter('orderBy')($scope.cards, 'updatedAt');
            } else {
                $scope.cards = $filter('orderBy')($scope.cards, 'updatedAt', true);
            }
            var removed_cards_top_temp = $scope.cards.splice(0, amount);
            for (var i = 0, len = removed_cards_top_temp.length; i < len; i++) {
                $scope.removed_cards_top.push(removed_cards_top_temp[i]);
            }
            deferred.resolve(amount);
        } else {
            deferred.resolve(amount);
        }
        return deferred.promise;
    };

    removeCardsBottom = function() {
        var deferred = $q.defer();
        var amount = getCardAmountBottom();
        if (amount > 0) {
            if (!$scope.top_down) {
                $scope.cards = $filter('orderBy')($scope.cards, 'updatedAt', true);
            } else {
                $scope.cards = $filter('orderBy')($scope.cards, 'updatedAt');
            }
            var removed_cards_bottom_temp = $scope.cards.splice(0, amount);
            for (var i = 0, len = removed_cards_bottom_temp.length; i < len; i++) {
                $scope.removed_cards_bottom.push(removed_cards_bottom_temp[i]);
            }
            deferred.resolve(amount);
        } else {
            deferred.resolve(amount);
        }
        return deferred.promise;
    };

    // LOADING CHECK

    imagesLoaded = function(obj) {
        // Check if first load.
        if ($scope.cards.length == 0) {
            tempToCards()
                .then(function(res) {
                    scroll_updating = false;
                });
        }
        // Check if first load of content_cnv
        if (obj.location == 'content_cnv' && $scope.cards.length > 0) {
            if (first_load) {
                programmatic_scroll = true;
                $scope.$broadcast("items_changed", scroll_direction);
                $rootScope.pageLoading = false;
                // Wait for the page transition animation to end before applying scroll.
                $timeout(function() {
                    bindScroll();
                }, 1000);
            }
            first_load = false;
        }
        if (obj.location == 'content_cnv') {
            $rootScope.loading_cards = false;
            obj = null;
        } else if (obj.location == 'load_off_screen') {
            $rootScope.loading_cards_offscreen = false;
            obj = null;
            checkNext();
        }
    };

    checkImages = function(location, counter) {
        var loc = location + '_' + counter;
        store[loc] = {};
        store[loc].id = counter;
        store[loc].location = location;
        store[loc].img_loaded = 0;
        store[loc].img_count = $('.' + location + ' img').length;
        if (store[loc].img_count > 0) {
            $('.' + location).find('img').each(function() {
                if (this.complete) {
                    store[loc].img_loaded++;
                    if (store[loc].img_count == store[loc].img_loaded || store[loc].img_count == 0) {
                        imagesLoaded(store[loc]);
                    }
                } else {
                    $(this).on('load', function() {
                        store[loc].img_loaded++;
                        if (store[loc].img_count == store[loc].img_loaded || store[loc].img_count == 0) {
                            imagesLoaded(store[loc]);
                        }
                    });
                }
            });
        } else {
            imagesLoaded(store[loc]);
        }
    };

    //
    // Conversations
    //

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

    addMSlider = function($el, parent_container, id, data) {
        console.log(data.last_position);
        $rootScope.slider_settings[data.type].amount = data.last_position;
        /*
        if (data.last_position != undefined) {
            $rootScope.sliderRotate.rotate = data.last_position;
        } else {
            $rootScope.sliderRotate.rotate = 0;
        }
        */
        //$rootScope.slider_settings.sharpen.amount
        var t = $compile($el)($scope);
        var s = $(t).insertAfter('.' + parent_container + ' #cropper_' + id);
        s.addClass('active');
        s.removeClass('hide');

        //$compile(s)($scope);
    };

/*
    var addSlider = function(data) {
        if (data.last_position != undefined) {
            $scope.adjust.sharpen = data.last_position;
        } else {
            $scope.adjust.sharpen = 0;
        }
        var $el = $('<rzslider rz-slider-model="adjust.sharpen" rz-slider-options="adjust.options"></rzslider>').appendTo('#adjust_' + data.id + ' .image_adjust_sharpen');
        $compile($el)($scope);
    };
    */

    /*
        $scope.sliderRotate = {
            rotate: 0,
            options: {
                floor: 0,
                ceil: 45,
                step: 0.1,
                precision: 1,
                id: 'slider-idt',
                onStart: function(sharpen) {
                    //console.log('on start ' + $scope.adjust.sharpen);
                },
                onChange: function(id) {
                    console.log('on change ' + $scope.sliderRotate.rotate);
                },
                onEnd: function(id) {
                    //console.log('on end ' + $scope.adjust.sharpen);
                    ImageAdjustment.setImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'rotate', this.value);
                    ImageAdjustment.setSharpenUpdate(ImageAdjustment.getSource(), ImageAdjustment.getTarget(), ImageAdjustment.getImageAdjustments(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId()));
                }
            }
        };
        */

/*
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
                console.log('on change ' + $scope.adjust.sharpen);
            },
            onEnd: function(id) {
                console.log('on end ' + $scope.adjust.sharpen);
                ImageAdjustment.setImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'sharpen', $scope.adjust.sharpen);
                ImageAdjustment.setSharpenUpdate(ImageAdjustment.getSource(), ImageAdjustment.getTarget(), ImageAdjustment.getImageAdjustments(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId()));
            }
        }
    };
    */

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
        // Check the existence of the card across all arrays.
        var card_arrays = [$scope.cards, $scope.cards_temp, $scope.removed_cards_bottom, $scope.removed_cards_top];
        var found_pos = -1;
        var arr;
        for (var i = 0, len = card_arrays.length; i < len; i++) {
            found_pos = General.findWithAttr(card_arrays[i], '_id', id);
            if (found_pos >= 0) {
                arr = i;
                break;
            }
        }
        if (found_pos >= 0) {
            $rootScope.deleting_card = true;
            $timeout(function() {
                card_arrays[arr].splice(found_pos, 1);
                $scope.$apply();
            });
            $rootScope.deleting_card = false;
        }
    };

    updateCard = function(card) {
        // Check the existece of the card across all arrays.
        var card_arrays = [$scope.cards, $scope.cards_temp, $scope.removed_cards_bottom, $scope.removed_cards_top];
        var found_pos = -1;
        var arr;
        for (var i = 0, len = card_arrays.length; i < len; i++) {
            found_pos = General.findWithAttr(card_arrays[i], '_id', card._id);
            if (found_pos >= 0) {
                arr = i;
                break;
            }
        }
        if (found_pos >= 0) {
            if (card_arrays[arr][found_pos].content != card.content) {
                // Get the card height.
                $scope.test_card.content = card.content;
                // Animate the change onscreen.
                $timeout(function() {
                    var old_h = $('#ce' + card._id).height().toFixed(2);
                    var new_h = $('.test_card .ce').height().toFixed(2);
                    $($('#ce' + card._id))
                        .animate({ opacity: 0 }, 300, function() {
                            // Animation complete.
                            card_arrays[arr][found_pos].original_content = card.content;
                            card_arrays[arr][found_pos].content = card.content;
                            if (new_h != old_h) {
                                $($('#ce' + card._id)).animate({ height: new_h }, 500, function() {
                                    // Animation complete.
                                    if (!$scope.$$phase) {
                                        $scope.$apply();
                                    }
                                    $(this).animate({ opacity: 1 }, 400, function() {
                                        $(this).css('opacity', '');
                                        $(this).css('height', '');
                                    });
                                });
                            } else {
                                if (!$scope.$$phase) {
                                    $scope.$apply();
                                }
                                $(this).animate({ opacity: 1 }, 300, function() {
                                    $(this).css('opacity', '');
                                });
                            }
                        });
                }, 500);
            }
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
        var deferred = $q.defer();
        var promises = [];
        var cards_new = [];
        if (!$rootScope.loading_cards) {
            $rootScope.loading_cards = true;
            var last_card;
            var operand;
            var load_amount;
            var followed = UserData.getUser().following;
            if ($scope.cards.length > 0) {
                var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                var sort_card = $filter('orderBy')(all_cards, 'updatedAt', true);
                last_card = sort_card[0].updatedAt;
                load_amount = NUM_TO_LOAD;
            } else {
                load_amount = NUM_TO_LOAD;
                last_card = General.getISODate();
                operand = '$lt';
            }
            var val = { ids: followed, amount: NUM_TO_LOAD, last_card: last_card };
            var prom1 = Conversations.updateFeed(val)
                .then(function(res) {
                    if (res.data.cards.length > 0) {
                        var users = UserData.getContacts();
                        var user;
                        for (var i = 0, len = res.data.cards.length; i < len; i++) {
                            var key = res.data.cards[i];
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
                                key.following = true;
                                cards_new.push(key);
                            }
                        }
                    } else {
                        $rootScope.loading_cards = false;
                    }
                })
                .catch(function(error) {
                    console.log(error);
                });
            promises.push(prom1);
            // All the cards have been mapped.
            $q.all(promises).then(function() {
                $rootScope.loading_cards = false;
                deferred.resolve(cards_new);
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise;
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

    // TODO - change if adding button to notify user of new card.
    updateCards = function(arr) {
        var all_cards;
        var sort_card;
        var spliced;
        // Set this as a new card (for animating onscreen).
        for (var i = 0, len = arr.length; i < len; i++) {
            arr[i].new_card = true;
        }
        if (!$scope.top_down) {
            if ($scope.removed_cards_bottom.length > 0) {
                all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                sort_card = $filter('orderBy')(all_cards, 'updatedAt', true);
                spliced = sort_card.splice(0, MAX_OUT_BOUNDS);
                $scope.removed_cards_top = sort_card;
                $scope.removed_cards_bottom = [];
                $scope.cards = [];
                $scope.cards_temp = [];
                $scope.cards = $scope.cards.concat(arr, spliced);
                checkNext();
                programmatic_scroll = true;
                $scope.$broadcast("items_changed", 'bottom');
            } else {
                // No cards have been removed due to scrolling.
                for (var i = 0, len = arr.length; i < len; i++) {
                    $scope.cards.push(arr[i]);
                }
            }
        } else {
            if ($scope.removed_cards_top.length > 0) {
                all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                sort_card = $filter('orderBy')(all_cards, 'updatedAt', true);
                spliced = sort_card.splice(0, MAX_OUT_BOUNDS);
                $scope.removed_cards_bottom = sort_card;
                $scope.removed_cards_top = [];
                $scope.cards = [];
                $scope.cards_temp = [];
                $scope.cards = $scope.cards.concat(arr, spliced);
                checkNext();
                programmatic_scroll = true;
                $scope.$broadcast("items_changed", 'top');
            } else {
                // No cards have been removed due to scrolling.
                for (var i = 0, len = arr.length; i < len; i++) {
                    $scope.cards.push(arr[i]);
                }
            }
        }
    };

    getCardsUpdate = function(id) {
        var deferred = $q.defer();
        var promises = [];
        var cards_new = [];
        if (!$rootScope.loading_cards) {
            $rootScope.loading_cards = true;
            var last_card;
            var operand;
            var load_amount;
            if ($scope.cards.length > 0) {
                var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                var sort_card = $filter('orderBy')(all_cards, 'updatedAt');
                last_card = sort_card[sort_card.length - 1].updatedAt;
                operand = '$gt';
                load_amount = NUM_TO_LOAD;
            } else {
                load_amount = INIT_NUM_TO_LOAD;
                last_card = General.getISODate();
                operand = '$lt';
            }
            var val = { id: id, amount: load_amount, last_card: last_card, operand: operand };
            var prom1 = Conversations.getConversationCards(val)
                .then(function(res) {
                    if (res.data.length > 0) {
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
                                cards_new.push(key);
                            }
                        }
                    } else {
                        $rootScope.loading_cards = false;
                    }
                })
                .catch(function(error) {
                    console.log(error);
                });
            promises.push(prom1);
            // All the cards have been mapped.
            $q.all(promises).then(function() {
                $rootScope.loading_cards = false;
                deferred.resolve(cards_new);
            });
        } else {
            // Wait for loading to finish.
            deferred.resolve();
        }
        return deferred.promise;
    };

    // TODO - If not following anyone suggest follow?
    getFollowing = function() {
        var deferred = $q.defer();
        var promises = [];
        if (!$rootScope.loading_cards_offscreen) {
            $rootScope.loading_cards_offscreen = true;
            var followed = UserData.getUser().following;
            var last_card;
            var operand;
            var load_amount;
            var sort_card;
            if ($scope.cards.length > 0) {
                // Only get newer than temp but check removed cards
                var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                sort_card = $filter('orderBy')(all_cards, 'updatedAt');
                last_card = sort_card[0].updatedAt;
                operand = '$lt';
                load_amount = NUM_TO_LOAD;
            } else {
                load_amount = NUM_TO_LOAD;
                last_card = General.getISODate();
                operand = '$lt';
            }
            var val = { ids: followed, amount: load_amount, last_card: last_card, operand: operand };
            if (last_card != last_card_stored) {
                last_card_stored = last_card;
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
                            $rootScope.loading_cards_offscreen = false;
                        }
                    }).catch(function(error) {
                        console.log(error);
                    });
                promises.push(prom1);
                // All the cards have been mapped.
                $q.all(promises).then(function() {
                    deferred.resolve();
                });
            }
        }
        return deferred.promise;
    };

    getCards = function(id) {
        var deferred = $q.defer();
        var promises = [];
        if (!$rootScope.loading_cards_offscreen) {
            $rootScope.loading_cards_offscreen = true;
            var last_card;
            var operand;
            var load_amount;
            var sort_card;
            if ($scope.cards.length > 0) {
                // Only get newer than temp but check removed cards
                var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                sort_card = $filter('orderBy')(all_cards, 'updatedAt');
                last_card = sort_card[0].updatedAt;
                operand = '$lt';
                load_amount = NUM_TO_LOAD;
            } else {
                load_amount = NUM_TO_LOAD;
                last_card = General.getISODate();
                operand = '$lt';
            }
            var val = { id: id, amount: load_amount, last_card: last_card, operand: operand };
            if (last_card != last_card_stored) {
                last_card_stored = last_card;
                var prom1 = Conversations.getConversationCards(val)
                    .then(function(res) {
                        if (res.data.length > 0) {
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
                            $rootScope.pageLoading = false;
                            $rootScope.loading_cards_offscreen = false;
                        }
                    })
                    .catch(function(error) {
                        console.log(error);
                    });
                promises.push(prom1);
                // All the cards have been mapped.
                $q.all(promises).then(function() {
                    deferred.resolve();
                });
            } else {
                deferred.resolve();
            }
        }
        return deferred.promise;
    };

    getPublicCards = function(id) {
        var deferred = $q.defer();
        var promises = [];
        if (!$rootScope.loading_cards_offscreen) {
            $rootScope.loading_cards_offscreen = true;
            var last_card;
            var operand;
            var load_amount;
            var sort_card;
            if ($scope.cards.length > 0) {
                // Only get newer than temp but check removed cards
                var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                sort_card = $filter('orderBy')(all_cards, 'updatedAt');
                last_card = sort_card[0].updatedAt;
                operand = '$lt';
                load_amount = NUM_TO_LOAD;
            } else {
                load_amount = NUM_TO_LOAD;
                last_card = General.getISODate();
                operand = '$lt';
            }
            var val = { id: id, amount: NUM_TO_LOAD, last_card: last_card, operand: operand };
            if (last_card != last_card_stored) {
                last_card_stored = last_card;
                var prom1 = Conversations.getPublicConversationCards(val)
                    .then(function(res) {
                        if (res.data.length > 0) {
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
                            $rootScope.loading_cards_offscreen = false;
                        }
                    })
                    .catch(function(error) {
                        console.log(error);
                    });
                promises.push(prom1);
                // All the cards have been mapped.
                $q.all(promises).then(function() {
                    deferred.resolve();
                });
            } else {
                deferred.resolve();
            }
        }
        return deferred.promise;
    };

    getPublicCardsUpdate = function(id) {
        var deferred = $q.defer();
        var promises = [];
        var cards_new = [];
        if (!$rootScope.loading_cards) {
            $rootScope.loading_cards = true;
            var last_card;
            var operand;
            if ($scope.cards.length > 0) {
                var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                var sort_card = $filter('orderBy')(all_cards, 'updatedAt');
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
                                        cards_new.push(key);
                                    });
                                promises.push(prom3);
                            } else {
                                user = users[user_pos];
                                // Get the user name for the user id
                                key.user_name = user.user_name;
                                key.avatar = user.avatar;
                                // Store the original characters of the card.
                                key.original_content = key.content;
                                cards_new.push(key);
                            }
                        }));
                    } else {
                        deferred.resolve();
                    }
                    // All the cards have been mapped.
                    $q.all(promises).then(function() {
                        var sort_card = $filter('orderBy')($scope.cards, 'updatedAt');
                        last_card = sort_card[sort_card.length - 1];
                        $rootScope.loading_cards = false;
                        deferred.resolve(cards_new);
                    });
                }));
        } else {
            deferred.resolve();
        }
        return deferred.promise;
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
        getCards(id);
    };

    loadPublicConversation = function() {
        var id = Conversations.getConversationId();
        // Set the conversation profile
        setConversationProfile(id);
        if (!$scope.isMember || !principal.isValid()) {
            $scope.no_footer = true;
        }
        getPublicCards(id).then(function(result) {
            $rootScope.pageLoading = false;
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
    var disableCheckboxes = function(id) {
        var el = document.getElementById('ce' + id);
        if ($(el).attr('contenteditable') == 'false') {
            $(el).find('input[type=checkbox]').attr('disabled', 'disabled');
        }
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

    // clear the participants unviewed array by conversation id
    updateConversationViewed = function(id) {
        UserData.updateConversationViewed(id);
    };

    $scope.inviewoptions = { offset: [100, 0, 100, 0] };

    // START - find the conversation id
    getConversationId()
        .then(function(res) {
            if (Conversations.getConversationType() == 'feed') {
                $scope.feed = true;
                $scope.top_down = true;
                $rootScope.top_down = true;
                $scope.isMember = true;
                scroll_direction = "top";
            } else if (Conversations.getConversationType() == 'public') {
                $scope.top_down = true;
                $rootScope.top_down = true;
                $scope.isMember = checkPermit(res);
                scroll_direction = "top";
            } else if (Conversations.getConversationType() == 'private') {
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

    var cardAnimEnd = function() {
        var id = (this.id).substr(5, (this.id).length);
        // remove the animation end listener which called this function.
        $(this).off('webkitAnimationEnd oAnimationEnd animationend ', cardAnimEnd);
        $(this).css('margin-top', '');
        $(this).removeClass('animate_down');
        $(this).removeClass('will_transform');
        $scope.$apply(function($scope) {
            // Delete the new card value.
            var pos = General.findWithAttr($scope.cards, '_id', id);
            if (pos >= 0) {
                delete $scope.cards[pos].new_card;
                createObserver($scope.cards[pos]._id);
                disableCheckboxes($scope.cards[pos]._id);
            }
        });
        bindScroll();
        Scroll.enable('.content_cnv');
    };

}]);