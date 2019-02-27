cardApp.controller("conversationCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', '$q', '$filter', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'Users', '$routeParams', '$timeout', 'moment', 'socket', 'Database', 'General', 'Profile', 'principal', 'UserData', 'Cropp', '$compile', 'ImageAdjustment', 'Keyboard', function($scope, $rootScope, $location, $http, $window, $q, $filter, Cards, replaceTags, Format, Edit, Conversations, Users, $routeParams, $timeout, moment, socket, Database, General, Profile, principal, UserData, Cropp, $compile, ImageAdjustment, Keyboard) {

    openCrop = Cropp.openCrop;
    setCrop = Cropp.setCrop;
    editImage = Cropp.editImage;
    closeEdit = Cropp.closeEdit;
    filterImage = Cropp.filterImage;
    closeFilters = Cropp.closeFilters;
    filterClick = Cropp.filterClick;
    settingsImage = Cropp.settingsImage;
    adjustImage = Cropp.adjustImage;

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

    // Detect device user agent 
    var ua = navigator.userAgent;

    // Scrolling

    // Percent from top and bottom after which a check for more cards is executed.
    var UP_PERCENT = 10;
    var DOWN_PERCENT = 90;
    // Percent from top and bottom after which a check to move the scroll position and check for mre cards is executed.
    var TOP_END = 0;
    var BOTTOM_END = 100;
    // Numbers of cards to load or display.
    var INIT_NUM_TO_LOAD = 50;
    var NUM_TO_LOAD = 20;
    var NUM_UPDATE_DISPLAY = 20; //20
    var NUM_UPDATE_DISPLAY_INIT = 30;
    // Minimum number of $scope.cards_temp to keep loaded.
    var MIN_TEMP = 40;
    // The maximum number of cards to keep out of bounds.
    var MAX_OUT_BOUNDS = 10; //10

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
    $scope.scrollingdisabled = false;

    var first_load = true;
    var scroll_direction;
    var temp_working = false;
    var content_adjust = false;
    var update_adjust = false;
    var last_scrolled;
    var dir;
    var extremity = false;
    var store = {};
    var image_check_counter = 0;
    var no_more_records = false;

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
        var unbinddb4;
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

            unbinddb4 = $scope.$watch('scrollingdisabled', function(newStatus) {
                $rootScope.scrollingdisabled_watch = newStatus;
            });
        } else {
            $rootScope.cards_temp_length = 'NA';
            $rootScope.removed_cards_top_length = 'NA';
            $rootScope.removed_cards_bottom_length = 'NA';
            $rootScope.scrollingdisabled_watch = 'NA';
            if (unbinddb1 != undefined) {
                unbinddb1();
                unbinddb2();
                unbinddb3();
                unbinddb4();
            }
        }
    });


    // When an image is uploaded.
    $scope.$on('imageUpload', function(event, data) {
        unbindScroll();
    });
    // When an image is pasted
    $scope.$on('imagePasted', function(event, data) {
        $timeout(function() {
            rebindScroll();
        }, 500);
    });

    // SCROLLING

    upDateObservers = function() {
        resetObserver_queue();
        intObservers();
        for (var i = 0, len = $scope.cards.length; i < len; i++) {
            createObserver($scope.cards[i]._id);
        }
    };

    $scope.$watch('cards.length', function(newStatus) {
        // Debugging
        $rootScope.cards_length = newStatus;
        $timeout(function() {
            upDateObservers();
        }, 100);

    });


    domUpdated = function() {
        console.log('domUpdated');
        $('#delete_image').remove();
        $timeout(function() {
            $rootScope.$broadcast("ngRepeatFinishedTemp", { temp: "some value" });
        }, 1000);
    };


    // scroll listener throttle.as long as it continues to be invoked, raise on every interval
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

    // scroll listener throttled.
    var myHeavyFunction = throttle(function() {
        //var myHeavyFunction = function() {
        var currentScroll = $(this).scrollTop();
        var maxScroll = this.scrollHeight - this.clientHeight;
        var scrolled = (currentScroll / maxScroll) * 100;
        console.log(scrolled + ' : ' + last_scrolled);
        console.log('last_scrolled: ' + last_scrolled);
        if (scrolled < last_scrolled) {
            dir = 1;
            console.log('up: ' + scrolled + ' : ' + last_scrolled);
        } else if (scrolled > last_scrolled) {
            dir = 0;
            console.log('down: ' + scrolled + ' : ' + last_scrolled);
        } else if (scrolled == last_scrolled) {
            console.log('DONT FIRE');
            dir = 2;
        }

        last_scrolled = scrolled;

        if (!$scope.scrollingdisabled && !content_adjust) {
            if (dir == 1 && scrolled <= UP_PERCENT) {
                if (!$scope.scrollingdisabled && !temp_working) {
                    console.log('FIRE UP!!!');
                    addMoreTop();
                }
            }
        }

        if (!$scope.scrollingdisabled && !content_adjust) {
            if (dir == 0 && scrolled >= DOWN_PERCENT) {
                if (!$scope.scrollingdisabled && !temp_working) {
                    console.log('FIRE DOWN!!!');
                    addMoreBottom();
                }
            }
        }
    }, 1);
    //};

    checkBoundary = function(scrolled2) {

        console.log('scrolled2: ' + scrolled2 + ' == TOP_END ' + TOP_END + ' no_more_records: ' + no_more_records + ' $scope.removed_cards_top.length: ' + $scope.removed_cards_top.length + ' $scope.removed_cards_bottom.length: ' + $scope.removed_cards_bottom.length + ' $scope.cards_temp.length: ' + $scope.cards_temp.length + ' update_adjust: ' + update_adjust);
        if (scrolled2 <= TOP_END && (!no_more_records || $scope.removed_cards_top.length > 0 || $scope.cards_temp.length > 0) && !update_adjust) {
            console.log('TOP!');
            extremity = true;
            $('.content_cnv').unbind('scroll', wheelEvent);
            unbindScroll();
            doTop();
        }

        if (scrolled2 >= BOTTOM_END && (!no_more_records || $scope.removed_cards_bottom.length > 0 || $scope.cards_temp.length > 0) && !update_adjust) {
            console.log('BOTTOM!');
            extremity = true;
            $('.content_cnv').unbind('scroll', wheelEvent);
            unbindScroll();
            doBottom();
        }

        update_adjust = false;
    };

    // scroll listener unthrottled.
    function wheelEvent(e) {

        if (content_adjust) {
            rebindScroll();
        }

        //console.log($scope.top_down);

        var currentScroll = $(this).scrollTop();
        var maxScroll = this.scrollHeight - this.clientHeight;
        var scrolled2 = (currentScroll / maxScroll) * 100;
        if (scrolled2 > 90 || scrolled2 < 10) {
            checkBoundary(scrolled2);
        }


    }

    // scroll binding

    rebindScroll = function() {
        console.log('rebindScroll');
        console.log('scrollingdisabled: ' + $scope.scrollingdisabled);
        unbindScroll();
        content_adjust = false;
        bindScroll();
    };

    bindScroll = function() {
        var currentScroll = $('.content_cnv').scrollTop();
        var maxScroll = $('.content_cnv')[0].scrollHeight - $('.content_cnv')[0].clientHeight;
        var scrolled = (currentScroll / maxScroll) * 100;
        $scope.scrollingdisabled = false;
        console.log('bind last_scrolled: ' + last_scrolled);
        console.log('scrolled: ' + scrolled);

        $('.content_cnv').bind('scroll', myHeavyFunction);
        $('.content_cnv').bind('scroll', wheelEvent);
        // could be top or bottom but not scrolling.
        $timeout(function() {
            var currentScroll = $('.content_cnv').scrollTop();
            var maxScroll = $('.content_cnv')[0].scrollHeight - $('.content_cnv')[0].clientHeight;
            var scrolled = (currentScroll / maxScroll) * 100;
            checkBoundary(scrolled);
        }, 500);
    };

    unbindScroll = function() {
        console.log('unbind last_scrolled: ' + last_scrolled);
        $('.content_cnv').unbind('scroll', myHeavyFunction);
        $('.content_cnv').unbind('scroll', wheelEvent);
    };

    function scrollBack() {
        $timeout(function() {
            rebindScroll();
        }, 500);
    }

    function doTop() {
        console.log('doTop');
        extremity = false;
        $timeout(function() {
            $timeout(function() {
                // scroll slightly so that the scroll bar adjusts when new content loaded.
                $('.content_cnv').scrollTop(1);
                console.log('no_more_records: ' + no_more_records);
                if ($scope.cards_temp.length == 0 && !no_more_records) {
                    var unbindtemp = $scope.$watch('cards_temp.length', function(n) {
                        console.log(n);

                        if (n > 0) {
                            // Stop watching.
                            unbindtemp();
                            $('.content_cnv').scrollTop(20);
                            addMoreTop()
                                .then(function(result) {
                                    scrollBack();
                                });
                        }
                    });
                } else {
                    addMoreTop()
                        .then(function(result) {
                            scrollBack();
                        });
                }
            });
        });
    }

    function doBottom() {
        extremity = false;
        var maxScroll = $('.content_cnv')[0].scrollHeight - $('.content_cnv')[0].clientHeight;
        $timeout(function() {
            $timeout(function() {
                $('.content_cnv').scrollTop(maxScroll - 1);
                console.log('no_more_records: ' + no_more_records);
                if ($scope.cards_temp.length == 0 && !no_more_records) {
                    var unbindtemp = $scope.$watch('cards_temp.length', function(n) {
                        console.log(n);

                        if (n > 0) {
                            // Stop watching.
                            unbindtemp();
                            $('.content_cnv').scrollTop(20);
                            addMoreBottom()
                                .then(function(result) {
                                    scrollBack();
                                });

                        }
                    });
                } else {
                    addMoreBottom()
                        .then(function(result) {
                            scrollBack();
                        });
                }
            });

        });
    }

    // UPDATING CARDS

    tempToCards = function() {
        console.log('tempToCards');
        var deferred = $q.defer();
        // If temp cards are being transfered to cards.
        temp_working = false;

        if ($scope.cards_temp.length > 0 && !temp_working) {
            temp_working = true;
            var amount = NUM_UPDATE_DISPLAY;
            var cards_to_move;
            if ($scope.cards.length == 0) {
                amount = NUM_UPDATE_DISPLAY_INIT;
            }
            // If content is being updated.
            content_adjust = true;
            if (!$scope.top_down) {
                cards_to_move = $scope.cards_temp.splice(0, amount);
            } else {
                cards_to_move = $scope.cards_temp.splice(0, amount);

            }
            console.log(cards_to_move);

            var t0 = performance.now();

            //$scope.cards = $scope.cards.concat(cards_to_move);
            //0.024999957531690598 milliseconds.
            //0.019999919459223747 milliseconds.
            //0.07499998901039362 milliseconds.

            for (var i = 0, len = cards_to_move.length; i < len; i++) {
                $scope.cards.push(cards_to_move[i]);
            }
            //0.014999997802078724 milliseconds.
            //0.020000035874545574 milliseconds.
            //0.05000003147870302 milliseconds.

            var t1 = performance.now();
            console.log("PERFORMANCE: " + (t1 - t0) + " milliseconds.");


            /*
            if (!$scope.$$phase) {
                $scope.$apply();
            }
            */
            temp_working = false;
            // Check if more temp cards need to be loaded.
            checkNext();
            deferred.resolve(true);
        } else {
            console.log('no more cards_temp');
            temp_working = false;
            deferred.resolve(false);
        }
        return deferred.promise;
    };

    addMoreTop = function() {
        var deferred = $q.defer();
        $scope.scrollingdisabled = true;
        unRemoveCardsTop()
            .then(function(result) {
                console.log(result);
                /*
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
                */
                if (result == 0 && !$scope.top_down) {
                    tempToCards()
                        .then(function(result) {
                            /*
                            if (!$scope.$$phase) {
                                $scope.$apply();
                            }
                            */
                            removeCardsBottom()
                                .then(function(result) {
                                    $scope.scrollingdisabled = false;
                                    deferred.resolve();
                                });
                        });
                } else {
                    removeCardsBottom()
                        .then(function(result) {
                            $scope.scrollingdisabled = false;
                            deferred.resolve();
                        });
                }
            });
        return deferred.promise;
    };

    addMoreBottom = function() {
        var deferred = $q.defer();
        $scope.scrollingdisabled = true;
        console.log($scope.top_down);
        unRemoveCardsBottom()
            .then(function(result) {
                console.log(result);
                if (result == 0 && $scope.top_down) {
                    tempToCards()
                        .then(function(result) {
                            /*
                            if (!$scope.$$phase) {
                                $scope.$apply();
                            }
                            */
                            removeCardsTop()
                                .then(function(result) {
                                    $scope.scrollingdisabled = false;
                                    deferred.resolve();
                                });
                        });
                } else {
                    removeCardsTop()
                        .then(function(result) {
                            $scope.scrollingdisabled = false;
                            deferred.resolve();
                        });
                }
            });
        return deferred.promise;
    };

    checkNext = function() {
        console.log('checkNext');
        console.log('loading_cards: ' + $rootScope.loading_cards);
        console.log('loading_cards_offscreen: ' + $rootScope.loading_cards_offscreen);
        console.log('scrollingdisabled: ' + $scope.scrollingdisabled);
        console.log('$scope.cards_temp.length: ' + $scope.cards_temp.length);
        var id = Conversations.getConversationId();
        if (Conversations.getConversationType() == 'feed') {
            if ($scope.cards_temp.length < MIN_TEMP) {
                getFollowing('cache');
            }
        } else if (Conversations.getConversationType() == 'private') {
            console.log($scope.cards_temp.length + ' : ' + MIN_TEMP);
            if ($scope.cards_temp.length < MIN_TEMP) {
                getCards(id, 'cache');
            }
        } else if (Conversations.getConversationType() == 'public') {
            if ($scope.cards_temp.length < MIN_TEMP) {
                getPublicCards(id, 'cache');
            }
        }
    };

    getCardAmountBottom = function() {
        console.log('getCardAmountBottom');
        var amount = 0;
        var allElements = document.querySelectorAll('.content_cnv .card_temp');
        $('.content_cnv .vis').last().addClass('removeCards');
        var last_index;
        for (var i = 0, len = allElements.length; i < len; i++) {
            //console.log($(allElements[i]).attr('id') + ' : ' + $(allElements[i]).attr('class'));
            if ($(allElements[i]).hasClass('removeCards')) {
                $(allElements[i]).removeClass('removeCards');
                last_index = i;
                break;
            }
        }
        if (last_index != undefined) {
            var remainder = allElements.length - last_index;
            console.log('allElements.length: ' + allElements.length + ', last_index: ' + last_index + ', MAX_OUT_BOUNDS: ' + MAX_OUT_BOUNDS);
            amount = remainder <= MAX_OUT_BOUNDS ? remainder - MAX_OUT_BOUNDS : remainder - MAX_OUT_BOUNDS;
            console.log('amount: ' + amount);
            // check less than zero
            amount = amount < 0 ? 0 : amount;
            // check for undefined
            amount = amount != undefined ? amount : 0;
        }
        return amount;
    };

    getCardAmountTop = function() {
        console.log('getCardAmountTop');
        var amount = 0;
        var allElements = document.querySelectorAll('.content_cnv .card_temp');
        $('.content_cnv .vis').first().addClass('removeCards');
        var last_index;
        for (var i = 0, len = allElements.length; i < len; i++) {
            if ($(allElements[i]).hasClass('removeCards')) {
                $(allElements[i]).removeClass('removeCards');
                console.log($(allElements[i]));
                last_index = i - 1; // 0 based.
                break;
            }
        }
        console.log('allElements.length: ' + allElements.length + ', last_index: ' + last_index + ', MAX_OUT_BOUNDS: ' + MAX_OUT_BOUNDS);
        if (last_index != undefined) {
            amount = last_index <= MAX_OUT_BOUNDS ? 0 : last_index - MAX_OUT_BOUNDS;
        }
        console.log('amount: ' + amount);
        // check less than zero
        amount = amount < 0 ? 0 : amount;
        return amount;
    };

    unRemoveCardsTop = function() {
        console.log('unRemoveCardsTop?');
        var deferred = $q.defer();
        var removed_length = $scope.removed_cards_top.length;
        var amount = NUM_UPDATE_DISPLAY;
        if (removed_length < amount) {
            amount = removed_length;
        }
        if (removed_length > 0) {
            console.log('unRemoveCardsTop!: ' + removed_length);
            console.log($scope.top_down);
            console.log(JSON.stringify($scope.removed_cards_top));
            if (!$scope.top_down) {
                $scope.removed_cards_top = $filter('orderBy')($scope.removed_cards_top, 'updatedAt', true);
            } else {
                $scope.removed_cards_top = $filter('orderBy')($scope.removed_cards_top, 'updatedAt');
            }

            //var first_card = $scope.removed_cards_top[0];
            var spliced = $scope.removed_cards_top.splice(0, amount);
            console.log(spliced);
            console.log($scope.removed_cards_top);
            content_adjust = true;

            //$scope.cards = $scope.cards.concat(spliced);

            for (var i = 0, len = spliced.length; i < len; i++) {
                $scope.cards.push(spliced[i]);
            }

            /*if (!$scope.$$phase) {
                $scope.$apply();
            }
            */
            deferred.resolve(removed_length);
        } else {
            //console.log('none removed');
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
            console.log('unRemoveCardsBottom');
            if (!$scope.top_down) {
                $scope.removed_cards_bottom = $filter('orderBy')($scope.removed_cards_bottom, 'updatedAt');
            } else {
                $scope.removed_cards_bottom = $filter('orderBy')($scope.removed_cards_bottom, 'updatedAt', true);
            }
            //var last_card = $scope.removed_cards_bottom[0];
            var spliced = $scope.removed_cards_bottom.splice(0, amount);
            console.log(spliced);
            console.log($scope.removed_cards_bottom);
            content_adjust = true;
            //$scope.cards = $scope.cards.concat(spliced);
            for (var i = 0, len = spliced.length; i < len; i++) {
                $scope.cards.push(spliced[i]);
            }

            deferred.resolve(amount);
        } else {
            deferred.resolve(0);
        }
        return deferred.promise;
    };

    removeCardsTop = function() {
        console.log('removeCardsTop?');
        var deferred = $q.defer();
        var amount = getCardAmountTop();
        console.log(amount);
        if (amount > 0 && !extremity) {
            console.log('removeCardsTop!: ' + amount);
            content_adjust = true;
            if (!$scope.top_down) {
                $scope.cards = $filter('orderBy')($scope.cards, 'updatedAt');
            } else {
                $scope.cards = $filter('orderBy')($scope.cards, 'updatedAt', true);
            }

            var removed_cards_top_temp = $scope.cards.splice(0, amount);
            console.log(removed_cards_top_temp);
            console.log($scope.removed_cards_top);
            //$scope.removed_cards_top = $scope.removed_cards_top.concat(removed_cards_top_temp);

            for (var i = 0, len = removed_cards_top_temp.length; i < len; i++) {
                $scope.removed_cards_top.push(removed_cards_top_temp[i]);
            }

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
        var amount = getCardAmountBottom();
        if (amount > 0) {
            console.log('removeCardsBottom: ' + amount);
            if (!$scope.top_down) {
                $scope.cards = $filter('orderBy')($scope.cards, 'updatedAt', true);
            } else {
                $scope.cards = $filter('orderBy')($scope.cards, 'updatedAt');
            }
            content_adjust = true;
            var removed_cards_bottom_temp = $scope.cards.splice(0, amount);
            console.log(removed_cards_bottom_temp);
            //$scope.removed_cards_bottom = $scope.removed_cards_bottom.concat(removed_cards_bottom_temp);
            for (var i = 0, len = removed_cards_bottom_temp.length; i < len; i++) {
                $scope.removed_cards_bottom.push(removed_cards_bottom_temp[i]);
            }

            deferred.resolve(amount);
        } else {
            console.log('dont removeCardsBottom: ' + amount);
            deferred.resolve(amount);
        }
        return deferred.promise;
    };


    // LOADING CHECK

    imagesLoaded = function(obj) {
        console.log(obj);
        console.log('all images loaded: ' + obj.location + ' : ' + obj.id);
        // Check if first load.
        console.log($scope.cards.length);
        if ($scope.cards.length == 0) {

            tempToCards();
        }
        // Check if first load of content_cnv
        if (obj.location == 'content_cnv' && $scope.cards.length > 0) {
            console.log('first_load: ' + first_load);
            if (first_load) {
                console.log('ITEMS FIRED');
                $scope.$broadcast("items_changed", scroll_direction);
                $timeout(function() {
                    $rootScope.pageLoading = false;
                    bindScroll();
                }, 500);
            }
            first_load = false;
            /*
            if (!$scope.$$phase) {
                $scope.$apply();
            }
            */
        }
        if (obj.location == 'content_cnv') {
            $rootScope.loading_cards = false;
            delete obj;
        }

        if (obj.location == 'load_off_screen') {
            console.log('HERE');
            $rootScope.loading_cards_offscreen = false;
            delete obj;
            checkNext();
        }
    };

    checkImages = function(location, counter) {
        console.log(location);
        var loc = location + '_' + counter;
        store[loc] = {};
        store[loc].id = counter;
        store[loc].location = location;
        store[loc].img_loaded = 0;
        store[loc].img_count = $('.' + location + ' img').length;
        console.log(store[loc]);
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

    $scope.$on('ngRepeatFinishedTemp', function(ngRepeatFinishedEvent) {
        console.log('ngRepeatFinishedTemp');
        image_check_counter++;
        checkImages('load_off_screen', image_check_counter);
    });

    $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
        console.log('ngRepeatFinished');
        dir = 2;
        image_check_counter++;
        checkImages('content_cnv', image_check_counter);
        if ($('.cropper-container').length > 0) {
            $('.cropper-container').remove();
            $('.cropper-hidden').removeClass('cropper-hidden');
        }
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
        // Check the existece of the card across all arrays.
        //var card_pos;
        var card_arrays = [$scope.cards, $scope.cards_temp, $scope.removed_cards_bottom, $scope.removed_cards_top];
        var found_pos = -1;
        var arr;
        for (var i = 0, len = card_arrays.length; i < len; i++) {
            found_pos = General.findWithAttr(card_arrays[i], '_id', id);
            if (found_pos >= 0) {
                arr = i;
                //found_pos = card_pos;
                break;
            }
        }
        if (found_pos >= 0) {
            $rootScope.deleting_card = true;
            card_arrays[arr].splice(found_pos, 1);
            $rootScope.deleting_card = false;
        }

    };

    updateCard = function(card) {
        // Check the existece of the card across all arrays.
        var card_arrays = [$scope.cards, $scope.cards_temp, $scope.removed_cards_bottom, $scope.removed_cards_top];
        var found_pos = -1;
        var arr;
        console.log(card_arrays);
        for (var i = 0, len = card_arrays.length; i < len; i++) {
            console.log(card_arrays[i]);
            found_pos = General.findWithAttr(card_arrays[i], '_id', card._id);
            if (found_pos >= 0) {
                arr = i;
                //found_pos = card_pos;
                break;
            }
        }
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
        var deferred = $q.defer();
        var promises = [];
        var cards_new = [];
        console.log('getFollowingUpdate: ' + $rootScope.loading_cards + ', ' + $rootScope.loading_cards_offscreen);
        if (!$rootScope.loading_cards) {
            $rootScope.loading_cards = true;
            var last_card;
            var operand;
            var load_amount;
            var followed = UserData.getUser().following;
            //if (destination == 'cards') {
            if ($scope.cards.length > 0) {
                var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                //var sort_card = $filter('orderBy')(all_cards, 'updatedAt');
                //last_card = sort_card[sort_card.length - 1].updatedAt;
                var sort_card = $filter('orderBy')(all_cards, 'updatedAt', true);
                last_card = sort_card[0].updatedAt;
                load_amount = NUM_TO_LOAD;
                //} else {
                //    load_amount = INIT_NUM_TO_LOAD;
                //    last_card = General.getISODate();
            } else {
                console.log('first_load');
                load_amount = NUM_TO_LOAD;
                last_card = General.getISODate();
                operand = '$lt';
            }
            //} 
            var val = { ids: followed, amount: NUM_TO_LOAD, last_card: last_card };
            console.log(val);
            var prom1 = Conversations.updateFeed(val)
                .then(function(res) {
                    console.log(res);
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
                        console.log('NO MORE RECORDS');
                        $rootScope.loading_cards = false;
                        //$rootScope.loading_cards_offscreen = false;
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
                console.log('getCards fin');
                deferred.resolve(cards_new);
            });
        } else {
            // Wait for loading to finish.
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

    updateCards = function(arr) {
        console.log($scope.top_down);
        // If content is being updated.
        update_adjust = true;
        //$scope.scrollingdisabled = true;
        if (!$scope.top_down) {
            if ($scope.removed_cards_bottom.length > 0) {
                //$scope.cards = $scope.cards.concat(arr, $scope.removed_cards_bottom);
                //$scope.removed_cards_bottom = [];
                var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                var sort_card = $filter('orderBy')(all_cards, 'updatedAt', true);
                var spliced = sort_card.splice(0, MAX_OUT_BOUNDS);
                console.log(spliced);
                $scope.removed_cards_top = sort_card;


                $scope.removed_cards_bottom = [];
                //$scope.removed_cards_top = [];
                $scope.cards = [];
                $scope.cards_temp = [];
                // If content is being updated.
                //content_adjust = true;

                $scope.cards = $scope.cards.concat(arr, spliced);



                checkNext();

                $scope.$broadcast("items_changed", 'bottom');
            } else {
                $scope.cards = $scope.cards.concat(arr);
                $scope.$broadcast("items_changed", 'bottom');
            }
        } else {
            if ($scope.removed_cards_top.length > 0) {
                var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                var sort_card = $filter('orderBy')(all_cards, 'updatedAt', true);
                var spliced = sort_card.splice(0, MAX_OUT_BOUNDS);
                console.log(spliced);
                $scope.removed_cards_bottom = sort_card;


                $scope.removed_cards_top = [];
                //$scope.removed_cards_top = [];
                $scope.cards = [];
                $scope.cards_temp = [];
                // If content is being updated.
                //content_adjust = true;
                $scope.cards = $scope.cards.concat(arr, spliced);
                checkNext();
                $scope.$broadcast("items_changed", 'top');
            } else {
                $scope.cards = $scope.cards.concat(arr);
                $scope.$broadcast("items_changed", 'top');
            }
        }
    };

    getCardsUpdate = function(id, destination) {
        var deferred = $q.defer();
        var promises = [];
        var cards_new = [];
        console.log('getCardsUpdate: ' + destination + ' : ' + $rootScope.loading_cards + ', ' + $rootScope.loading_cards_offscreen);
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
            console.log(val);
            var prom1 = Conversations.getConversationCards(val)
                .then(function(res) {
                    console.log(res);
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
                        console.log('NO MORE RECORDS');
                        $rootScope.loading_cards = false;
                        //$rootScope.loading_cards_offscreen = false;
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
                console.log('getCards fin');
                deferred.resolve(cards_new);
            });
        } else {
            // Wait for loading to finish.
            deferred.resolve();
        }
        return deferred.promise;
    };
    var last_card_stored;
    // TODO - If not following anyone suggest follow?
    getFollowing = function(destination) {
        var deferred = $q.defer();
        var promises = [];

        console.log('getFollowing : ' + destination + ' : ' + $rootScope.loading_cards + ', ' + $rootScope.loading_cards_offscreen);
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
                console.log(last_card);
                operand = '$lt';
                load_amount = NUM_TO_LOAD;
            } else {
                console.log('first_load');
                load_amount = NUM_TO_LOAD;
                last_card = General.getISODate();
                operand = '$lt';
            }

            var val = { ids: followed, amount: load_amount, last_card: last_card, operand: operand };
            console.log(val);
            if (last_card != last_card_stored) {
                last_card_stored = last_card;
                var prom1 = Conversations.getFeed(val)
                    .then(function(res) {
                        if (res.data.cards.length > 0) {
                            //no_more_records = false;
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
                            //$rootScope.pageLoading = false;
                            console.log('NO MORE RECORDS');
                            $rootScope.loading_cards = false;
                            $rootScope.loading_cards_offscreen = false;
                            no_more_records = true;
                        }
                    }).catch(function(error) {
                        console.log(error);
                    });
                promises.push(prom1);
                // All the users contacts have been mapped.
                $q.all(promises).then(function() {
                    console.log($scope.cards_temp);
                    console.log('getCards fin');
                    /*
                    if (!no_more_records) {
                        $rootScope.$broadcast("ngRepeatFinishedTemp", { temp: "some value" });
                    }
                    */

                    deferred.resolve();
                });
                
            }

        }
         return deferred.promise;
    };

    getCards = function(id, destination) {
        var deferred = $q.defer();
        var promises = [];
        console.log('getCards: ' + destination + ' : ' + $rootScope.loading_cards + ', ' + $rootScope.loading_cards_offscreen);
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
                console.log('first_load');
                load_amount = NUM_TO_LOAD;
                last_card = General.getISODate();
                operand = '$lt';
            }
            var val = { id: id, amount: load_amount, last_card: last_card, operand: operand };
            console.log(val);
            var prom1 = Conversations.getConversationCards(val)
                .then(function(res) {
                    console.log(res);
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
                        console.log('NO MORE RECORDS');
                        $rootScope.pageLoading = false;
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
                console.log('getCards fin');
                deferred.resolve();
            });
            return deferred.promise;
        } else {
            // Wait for loading to finish?
            deferred.resolve();
        }
    };

    getPublicCards = function(id, destination) {
        var deferred = $q.defer();
        var promises = [];
        console.log('getPublicCards: ' + destination + ' : ' + $rootScope.loading_cards + ', ' + $rootScope.loading_cards_offscreen);
        if (!$rootScope.loading_cards_offscreen) {
            $rootScope.loading_cards_offscreen = true;
            var last_card;
            var operand;
            var load_amount;
            var sort_card;
            console.log($scope.cards_temp.length);
            console.log($scope.cards.length);
            if ($scope.cards.length > 0) {
                // Only get newer than temp but check removed cards
                var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                sort_card = $filter('orderBy')(all_cards, 'updatedAt');
                last_card = sort_card[0].updatedAt;
                console.log(last_card);
                operand = '$lt';
                load_amount = NUM_TO_LOAD;
            } else {
                console.log('first_load');
                load_amount = NUM_TO_LOAD;
                last_card = General.getISODate();
                operand = '$lt';
            }
            var val = { id: id, amount: NUM_TO_LOAD, last_card: last_card, operand: operand };
            var prom1 = Conversations.getPublicConversationCards(val)
                .then(function(res) {
                    console.log(res);
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
                console.log('getCards fin');
                deferred.resolve();
            });
            return deferred.promise;
        } else {
            // Wait for loading to finish?
            deferred.resolve();
        }
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
                        // console.log('NO MORE RECORDS');
                    }
                    // All the cards have been mapped.
                    $q.all(promises).then(function() {
                        var sort_card = $filter('orderBy')($scope.cards, 'updatedAt');
                        last_card = sort_card[sort_card.length - 1];
                        //UserData.conversationsLatestCardAdd(id, last_card);
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
                //getFollowing();
                getFollowing('cache');
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
        getCards(id, 'cache').then(function(result) {
            console.log(result);
        });
    };

    loadPublicConversation = function() {
        var id = Conversations.getConversationId();
        // Set the conversation profile
        setConversationProfile(id);
        if (!$scope.isMember || !principal.isValid()) {
            $scope.no_footer = true;
        }
        getPublicCards(id, 'cache').then(function(result) {
            if (result == undefined) {
                $rootScope.pageLoading = false;
            }
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
    /*
        $scope.lineInView = function(data, id) {
            if (data) {
                $('#ce' + id).removeClass('outview');
            } else {
                $('#ce' + id).addClass('outview');
            }
        };
        */


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