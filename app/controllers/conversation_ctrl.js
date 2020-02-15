cardApp.controller("conversationCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', '$q', '$filter', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'Users', '$routeParams', '$timeout', 'moment', 'socket', 'Database', 'General', 'Profile', 'principal', 'UserData', 'ImageEdit', '$compile', 'ImageAdjustment', 'Keyboard', 'Scroll', '$animate', 'CropRotate', 'ImageFilters', 'ContentEditable', function($scope, $rootScope, $location, $http, $window, $q, $filter, Cards, replaceTags, Format, Edit, Conversations, Users, $routeParams, $timeout, moment, socket, Database, General, Profile, principal, UserData, ImageEdit, $compile, ImageAdjustment, Keyboard, Scroll, $animate, CropRotate, ImageFilters, ContentEditable) {
    openCropRotate = ImageEdit.openCropRotate;
    editImage = ImageEdit.editImage;
    closeImageEdit = ImageEdit.closeImageEdit;
    openFilters = ImageEdit.openFilters;
    closeFilters = ImageEdit.closeFilters;
    filterClick = ImageFilters.filterClick;
    adjustImage = ImageEdit.adjustImage;
    submitTitle = ImageEdit.submitTitle;
    cancelTitle = ImageEdit.cancelTitle;
    testImage = ImageEdit.testImage;
    addTitle = ImageEdit.addTitle;
    cancelCrop = CropRotate.cancelCrop;
    makeCrop = CropRotate.makeCrop;
    toggleRotateSlider = CropRotate.toggleRotateSlider;
    togglePerspectiveSlider = CropRotate.togglePerspectiveSlider;
    flipImage = CropRotate.flipImage;
    rotateImage = CropRotate.rotateImage;
    sliderRotateChange = CropRotate.sliderRotateChange;
    sliderRotateEnd = CropRotate.sliderRotateEnd;
    sliderperspectiveVChange = CropRotate.sliderperspectiveVChange;
    sliderperspectiveHChange = CropRotate.sliderperspectiveHChange;
    sliderTestChange = ImageEdit.sliderTestChange;

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







    // leaving controller.
    $scope.$on('$destroy', function() {
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
    $rootScope.offlineMode = false;
    $scope.no_cards = true;
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

    //$scope. = .content = "Enter Text here!";

    $scope.image_title = {
        content: 'Enter Text here!',
    };

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

    // Adding cards
    let new_cards = [];

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
            Format.updateCard(id, card, $scope.currentUser).then(function(result) {
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

    // SCROLLING

    newCardAnimComplete = function(card_id) {
        var deferred = $q.defer();
        var pos = General.findWithAttr($scope.cards, '_id', card_id);
        if (pos >= 0) {
            createObserver($scope.cards[pos]._id);
            //disableCheckboxes($scope.cards[pos]._id);
            checkboxesEnabled($scope.cards[pos]._id, false);
        }
        bindScroll();
        deferred.resolve();
        return deferred.promise;
    }

    animateCard = async function(card_id) {
        console.log('animateCard');
        var deferred = $q.defer();
        let speed = 800;
        // Only animate the last added card.
        if (new_cards.length > 0) {
            deferred.resolve();
        } else {
            var max_s;
            if (!$scope.top_down) {
                max_s = $(".content_cnv")[0].scrollHeight - $(".content_cnv")[0].clientHeight;
            } else {
                max_s = 0;
            }
            unbindScroll();
            // Stop the animation if the user scrolls.
            $(".content_cnv").bind("touchstart", function(e) {
                $(".content_cnv").stop(true, false).unbind('touchstart');
                newCardAnimComplete(card_id);
            });
            $(".content_cnv").animate({
                scrollTop: max_s
            }, speed, "easeOutQuad", async function() {
                // Animation complete.
                await newCardAnimComplete(card_id);
                deferred.resolve();
            });
        }
        return deferred.promise;
    }

    addNewCards = async function() {
        if (new_cards.length > 0) {
            let next_card = new_cards.pop();
            $scope.cards.push(next_card);
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        }
    }

    upDateObservers = function() {
        //console.log('upDateObservers');
        resetObserver_queue();
        intObservers();
        for (var i = 0, len = $scope.cards.length; i < len; i++) {


            //
            // If a new card has been posted.
            //
            // TODO - If not at top or bottom add dialogue to notify user of new post
            // but only scroll to the card if the user chooses. Requires change to addCards also.
            if ($scope.cards[i].new_card) {
                if (!$scope.top_down) {
                    delete $scope.cards[i].new_card;
                }
                var card_id = $scope.cards[i]._id;

                $scope.test_card[0] = $scope.cards[i];
                console.log($scope.cards[i]);
                //   $timeout(function() {
                // Get the height of the new card.
                let test = awaitImages('#card_' + card_id).then(async function(result) {
                    // Animate the change onscreen.
                    $timeout(async function() {
                        if ($scope.top_down) {
                            var cur_s = $(".content_cnv").scrollTop();
                            if (cur_s == 0) {
                                // If at top - animate the card into position.
                                unbindScroll();
                                Scroll.disable('.content_cnv');
                                var new_h = Number($('.test_card').outerHeight(true).toFixed(2));
                                console.log(new_h);
                                //$("#card_" + card_id).css('margin-top', new_h * -1);
                                //$("#card_" + card_id).css({'transform' : 'translateY('+ (new_h*-1) +'px)'});
                                //transform: translateY(0);
                                // transform: "translateY(20px)"

                                //$(".content_cnv").css({ 'transform': 'translateY(' + (new_h * -1) + 'px)' });

                                new_h--;
                                //$('.content_cnv').css('--v', '-300px');
                                $('.content_cnv').css('--v', (new_h * -1) + 'px');
                                $(".content_cnv").css('overflow-y', 'visible');
                                $(".content_cnv").css('overflow-x', 'visible');
                                $('.content_cnv').addClass('animate-transform').on('webkitAnimationEnd oAnimationEnd animationend ', cardAnimEnd);


                                //$('.content_cnv').removeClass('animate-transform');
                                $ //("#card_" + card_id).on('webkitAnimationEnd oAnimationEnd animationend ', cardAnimEnd);

                                //});
                                //  JQuery ANimate?
                                /*
                                $(".content_cnv").css({'transform' : 'translateY('+ (new_h*-1) +'px)'});
                                $(".content_cnv").css('overflow-y', 'visible');
                                $(".content_cnv").css('overflow-x', 'visible');
                                */
                                //overflow-y: visible;
                                //transform: translateY(-103px);
                                /*
                                                                $("#card_" + card_id).addClass('will_transform');
                                                                $("#card_" + card_id).removeClass('zero_height');
                                                                $("#card_" + card_id).addClass('animate_down');
                                                                $("#card_" + card_id).on('webkitAnimationEnd oAnimationEnd animationend ', cardAnimEnd);
                                                                */
                                var pos = General.findWithAttr($scope.cards, '_id', card_id);
                                if (pos >= 0) {
                                    delete $scope.cards[pos].new_card;
                                }
                            } else {
                                // not top
                                var pos = General.findWithAttr($scope.cards, '_id', card_id);
                                if (pos >= 0) {
                                    delete $scope.cards[pos].new_card;
                                }
                                await animateCard(card_id);
                                addNewCards();
                            }
                        } else {
                            await animateCard(card_id);
                            addNewCards();
                        }
                    }, 100);
                });
                //});
                //$scope.test_card.content = $scope.cards[i].content;
                // $scope.test_card[0] = $scope.cards[i];
            } else {

                //setCardMin($scope.cards[i]);

                createObserver($scope.cards[i]._id);
                //disableCheckboxes($scope.cards[i]._id);
                checkboxesEnabled($scope.cards[i]._id, false);
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
                    });
            }
            if (dir == 0 && scrolled >= DOWN_PERCENT) {
                //console.log('FIRE DOWN!');
                addMoreBottom()
                    .then(function(result) {
                        //console.log('AMB END');
                        scroll_updating = false;
                    });
            }
        }
        last_scrolled = scrolled;
    };

    setUpScrollBar = function() {
        $('.progress-container').css('top', $('.content_cnv').offset().top);
        $('.progress-container').css('height', $('.content_cnv').height());
        pb = document.getElementById('progress-thumb');
        $(pb).css('height', SCROLL_THUMB_MIN + "%");
        cdh = $('.content_cnv').height();
        ch = $('.content_cnv')[0].scrollHeight;
        currentScroll = $('.content_cnv').scrollTop();
        maxScroll = $('.content_cnv')[0].scrollHeight - $('.content_cnv')[0].clientHeight;
        if (mobile) {
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
            //console.log(JSON.stringify(cards_to_move));
            //console.log(JSON.stringify($scope.cards_temp));
            for (var i = 0, len = cards_to_move.length; i < len; i++) {
                console.log('ADDING: ' + cards_to_move[i]._id);
                
                var exists = General.findWithAttr($scope.cards, '_id', cards_to_move[i]._id);
                console.log(exists);
                if (exists >= 0) {
                    console.log('DUPE!');
                } else {
                    $scope.cards.push(cards_to_move[i]);
                    var exists2 = General.findWithAttr($scope.cards_temp, '_id', cards_to_move[i]._id);
                    if (exists2 >= 0) {
                        console.log('NOT SPLICED!');
                    }
                }
                
//$scope.cards.push(cards_to_move[i]);
            }
            /*   if (!$scope.$$phase) {
                $scope.$apply();
            }*/
            //console.log(JSON.stringify($scope.cards_temp));
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

    imagesLoadedx = function(obj) {
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
                $timeout(function() {
                    $rootScope.pageLoading = false;
                }, 300);
                // Wait for the page transition animation to end before applying scroll.
                $timeout(function() {
                    bindScroll();
                }, 1000);
            }
            first_load = false;
        }
        console.log(obj.location);
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
                        imagesLoadedx(store[loc]);
                    }
                } else {
                    $(this).on('load', function() {
                        store[loc].img_loaded++;
                        if (store[loc].img_count == store[loc].img_loaded || store[loc].img_count == 0) {
                            imagesLoadedx(store[loc]);
                        }
                    });
                    $(this).on('error', function() {
                        store[loc].img_loaded++;
                        if (store[loc].img_count == store[loc].img_loaded || store[loc].img_count == 0) {
                            imagesLoadedx(store[loc]);
                        }
                    });
                }
            });
        } else {
            imagesLoadedx(store[loc]);
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
                    //console.log(error);
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

    addSlider = function($el, parent_container, id, data) {
        $rootScope.slider_settings[data.type].amount = data.last_position;
        var t = $compile($el)($scope);
        var s = $('.slider_container_inner').append(t);
        s.addClass('active');
        $timeout(function() {
            $('.slider_container').addClass('animate');
            var currentHeight = $('.slider_container_inner').outerHeight();
            $('.slider_container').css('height', currentHeight);
            s.removeClass('hide');
        }, 0);
    };

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
        var deferred = $q.defer();
        let previous_card = { content: 'empty' };
        // Check the existence of the card across all arrays.
        var card_arrays = [$scope.cards, $scope.cards_temp, $scope.removed_cards_bottom, $scope.removed_cards_top];
        //let card_arrays = $filter('orderBy')(all_cards, 'updatedAt', true);
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
                let a = card_arrays[arr];
                let sorted = $filter('orderBy')(a, 'updatedAt', true);
                if (sorted.length > 0) {
                    previous_card = sorted[0];
                    delete previous_card.$$hashKey;
                    deferred.resolve(previous_card);
                }
            });
            $rootScope.deleting_card = false;
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    };

    function awaitImages(div) {
        var deferred = $q.defer();

        //$timeout(function() {        
        // Images loaded is zero because we're going to process a new set of images.
        var imagesLoaded = 0;
        // Total images is still the total number of <img> elements on the page.
        //var totalImages = $(div + ' img').length;
        // console.log($('.test_card'));
        //console.log(div);
        //console.log($(div));
        $('.test_card');
        var totalImages = $(div).find('img').length;
        //console.log('totalImages: ' + totalImages);
        //console.log($(div).find('img'));
        if (totalImages == 0) {
            deferred.resolve();
        }
        // Step through each image in the DOM, clone it, attach an onload event
        // listener, then set its source to the source of the original image. When
        // that new image has loaded, fire the imageLoaded() callback.
        //$(div + ' img').each(function(idx, img) {
        $(div).find('img').each(function(idx, img) {
            $('<img>').on('load', imageLoaded).attr('src', $(img).attr('src'));
        });



        // Do exactly as we had before -- increment the loaded count and if all are
        // loaded, call the allImagesLoaded() function.
        function imageLoaded() {
            //console.log('image loaded');
            imagesLoaded++;
            if (imagesLoaded == totalImages) {
                //console.log('imagesLoaded: ' + imagesLoaded);
                allImagesLoaded();
            }
        }

        function allImagesLoaded() {
            deferred.resolve();
        }

        //},1000);
        return deferred.promise;
    }

    replaceAllBlobs = function() {
        $('.container_cnv').find('img').each(function() {
            if ($(this).attr('src').substr(0, 5) == 'blob:') {
                let original_image_name = $(this).attr('original-image-name');
                $(this).removeAttr('original-image-name');
                if (!$(this).attr('id').includes('filtered')) {
                    // Original image
                    $(this).attr('src', IMAGES_URL + original_image_name);
                } else {
                    // Filtered Image
                    $(this).attr('src', IMAGES_URL + original_image_name + '?TEMP_DATE_' + new Date());
                }
            }
            // Original image (adjusted)
            if ($(this).attr('data-src')) {
                if ($(this).attr('data-src').substr(0, 5) == 'blob:') {
                    let original_image_name = $(this).attr('original-image-name');
                    $(this).removeAttr('original-image-name');
                    $(this).attr('data-src', IMAGES_URL + original_image_name);
                }
            }
        });
    }

    // Update to find image in all arrays or create container!
    updateImages = function(images) {
        var deferred = $q.defer();
        replaceAllBlobs();
        deferred.resolve();
        return deferred.promise;
    }

    sendRequested = async function(posted, updated, deleted) {
        var deferred = $q.defer();
        // Send notifications and update viewed (POSTs)
        for (n in posted) {
            const cp = await Database.cardPosted(posted[n].returned, posted[n].method);
        }
        // Send notifications and update viewed (PUTs)
        for (n in updated) {
            const cp = await Database.cardPosted(updated[n].returned, updated[n].method);
        }
        // Send notifications and update viewed (DELETEs)
        for (n in deleted) {
            const cp = await Database.cardPosted(deleted[n].returned, deleted[n].method);
        }
        deferred.resolve();
        return deferred.promise;
    }

    // Update card id from temp to the id returned from the DB.
    updateCardId = function(temp_id, db_id) {
        $('#card_' + temp_id).attr('id', 'card_' + db_id);
        $('#card_' + db_id + ' #ce' + temp_id).attr('id', 'ce' + db_id);
        // Check the existece of the card across all arrays.
        var card_arrays = [$scope.cards, $scope.cards_temp, $scope.removed_cards_bottom, $scope.removed_cards_top];
        var found_pos = -1;
        var arr;
        for (var i = 0, len = card_arrays.length; i < len; i++) {
            found_pos = General.findWithAttr(card_arrays[i], '_id', temp_id);
            if (found_pos >= 0) {
                arr = i;
                break;
            }
        }
        if (found_pos >= 0) {
            card_arrays[arr][found_pos]._id = db_id;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        }
    }

    // Update card ids from temp to the id returned from the DB.
    updateCardIds = function(posted) {
        var deferred = $q.defer();
        posted.forEach(function(element) {
            updateCardId(element.requested._id, element.returned._id);
        });
        deferred.resolve();
        return deferred.promise;
    }

    resizeContent = function(id, card, old_card, div) {
        console.log('resize start: ' + div);
        var deferred = $q.defer();
        //card.old_h = $('#ce' + card._id).height().toFixed(2);
        //card.new_h = $('.test_card .ce').height().toFixed(2);

        card.old_h = $('#card_' + id + ' .' + div).height().toFixed(2);
        card.new_h = $('.test_card .' + div).height().toFixed(2);

        $('#card_' + id + ' .' + div).height(card.old_h);
        $($('#card_' + id + ' .' + div))
            .animate({ opacity: 0 }, 300, function() {

                // Animation complete.

                if (card.new_id != undefined) {
                    old_card._id = card.new_id;
                }
                //old_card.original_content = card.content;
                //old_card.content = card.content;
                old_card.user = card.user;
                old_card.createdAt = card.createdAt;
                old_card.updatedAt = card.updatedAt;

                if (div == 'title_area') {
                    old_card.title_image_text = card.title_image_text;
                    old_card.title_area = card.title_area;
                }

                if (div == 'content_area') {
                    old_card.original_content = card.content;
                    old_card.content = card.content;
                }


                delete old_card.new_card;

                var expanded = true;
                if (div == 'content_area' && old_card.expanded == false) {
                    expanded = false
                }

                console.log(card.new_h + ' : ' + card.old_h);
                if (card.new_h != card.old_h && expanded) {

                    console.log('animate');

                    // $($('#ce' + card._id)).animate({ height: card.new_h }, 500, function() {
                    $($('#card_' + id + ' .' + div)).animate({ height: card.new_h }, 500, function() {
                        // Animation complete.
                        if (!$scope.$$phase) {
                            $scope.$apply();
                        }
                        $(this).animate({ opacity: 1 }, 400, function() {
                            $(this).css('opacity', '');
                            $(this).css('height', '');
                            delete old_card.old_h;
                            delete old_card.new_h;
                            deferred.resolve();
                        });
                    });
                } else {
                    if (!$scope.$$phase) {
                        $scope.$apply();
                    }
                    $(this).animate({ opacity: 1 }, 300, function() {
                        $(this).css('opacity', '');
                        $(this).css('height', '');
                        delete old_card.old_h;
                        delete old_card.new_h;
                        deferred.resolve();
                    });
                }
            });

        return deferred.promise;

    }

    updateCard = function(card) {
        console.log(card);
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

            card = parseCard(card);
            $scope.test_card[0] = card;
            $scope.test_card[0].expanded = true;

            if (!$scope.$$phase) {
                $scope.$apply();
            }
            //console.log(card);
            //console.log(JSON.stringify(card));
            //if (card_arrays[arr][found_pos].content != card.content) {
            // Get the card height.
            //$scope.test_card[0] = card;

            $timeout(function() {
                let test = awaitImages('.test_card').then(function(result) {
                    // Animate the change onscreen.
                    $timeout(async function() {
                        if (card_arrays[arr][found_pos].title_image_text != card.title_image_text || card_arrays[arr][found_pos].title_area != card.title_area) {
                            console.log(card.title_image);
                            if (card.title_image) {
                                card_arrays[arr][found_pos].title_image = true;
                            } else {
                                card_arrays[arr][found_pos].title_image = false;
                            }

                            await resizeContent(card._id, card, card_arrays[arr][found_pos], 'title_area');
                            console.log('resize end title_area');
                            if (!$scope.$$phase) {
                                $scope.$apply();
                            }
                            $scope.$apply();
                        } else {
                            console.log('same title');
                            // Same content
                            card_arrays[arr][found_pos].original_content = card.content;
                            card_arrays[arr][found_pos].createdAt = card.createdAt;
                            card_arrays[arr][found_pos].updatedAt = card.updatedAt;
                            if (!$scope.$$phase) {
                                $scope.$apply();
                            }
                        }
                        console.log(card_arrays[arr][found_pos].content);
                        console.log(card.content);
                        if (card_arrays[arr][found_pos].content != card.content) {
                            await resizeContent(card._id, card, card_arrays[arr][found_pos], 'content_area');
                            console.log('resize end content_area');
                        } else {
                            console.log('same content');
                            // Same content
                            card_arrays[arr][found_pos].original_content = card.content;
                            card_arrays[arr][found_pos].createdAt = card.createdAt;
                            card_arrays[arr][found_pos].updatedAt = card.updatedAt;
                            if (!$scope.$$phase) {
                                $scope.$apply();
                            }
                        }
                        /*
                        //card.old_h = $('#ce' + card._id).height().toFixed(2);
                        //card.new_h = $('.test_card .ce').height().toFixed(2);

                        card.old_h = $('#card_' + card._id + ' .content_area').height().toFixed(2);
                        card.new_h = $('.test_card .content_area').height().toFixed(2);

                        $('#ce' + card._id).height(card.old_h);
                        $($('#ce' + card._id))
                            .animate({ opacity: 0 }, 300, function() {
                                // Animation complete.
                                if (card.new_id != undefined) {
                                    card_arrays[arr][found_pos]._id = card.new_id;
                                }
                                card_arrays[arr][found_pos].original_content = card.content;
                                card_arrays[arr][found_pos].content = card.content;
                                card_arrays[arr][found_pos].user = card.user;
                                card_arrays[arr][found_pos].createdAt = card.createdAt;
                                card_arrays[arr][found_pos].updatedAt = card.updatedAt;

                                card_arrays[arr][found_pos].title_image_text = card.title_image_text;
                                card_arrays[arr][found_pos].title_area = card.title_area;

                                delete card_arrays[arr][found_pos].new_card;



                                console.log(card.new_h + ' : ' + card.old_h);
                                if (card.new_h != card.old_h && card_arrays[arr][found_pos].expanded) {
                                    console.log('animate');

                                    // $($('#ce' + card._id)).animate({ height: card.new_h }, 500, function() {
                                    $($('#card_' + card._id + ' .content_area')).animate({ height: card.new_h }, 500, function() {
                                        // Animation complete.
                                        if (!$scope.$$phase) {
                                            $scope.$apply();
                                        }
                                        $(this).animate({ opacity: 1 }, 400, function() {
                                            $(this).css('opacity', '');
                                            $(this).css('height', '');
                                            delete card_arrays[arr][found_pos].old_h;
                                            delete card_arrays[arr][found_pos].new_h;
                                        });
                                    });
                                } else {
                                    if (!$scope.$$phase) {
                                        $scope.$apply();
                                    }
                                    $(this).animate({ opacity: 1 }, 300, function() {
                                        $(this).css('opacity', '');
                                        $(this).css('height', '');
                                        delete card_arrays[arr][found_pos].old_h;
                                        delete card_arrays[arr][found_pos].new_h;
                                    });
                                }
                            });
                            */
                    }, 1000);
                });
                //$scope.test_card[0] = card;

            });
            //$scope.test_card.content = card.content;
            //$scope.test_card[0] = card_arrays[arr][found_pos];
            //$scope.test_card[0] = card;
            if (!$scope.$$phase) {
                $scope.$apply();
            }

            // } else {
            /*   console.log('same');
                // Same content
                card_arrays[arr][found_pos].original_content = card.content;
                card_arrays[arr][found_pos].createdAt = card.createdAt;
                card_arrays[arr][found_pos].updatedAt = card.updatedAt;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }*/
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
        // Remove cards
        var i = $scope.cards.length;
        while (i--) {
            if ($scope.cards[i].conversationId == conversation_id) {
                $scope.cards.splice(i, 1);
            }
        }
    };

    getFollowingUpdate = function() {
        console.log('gfu');
        var deferred = $q.defer();
        var promises = [];
        var cards_new = [];
        //$rootScope.loading_cards = false;
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
                            //console.log(key);
                            key = parseCard(key);
                            //console.log(key);

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
                    //console.log(error);
                });
            promises.push(prom1);
            // All the cards have been mapped.
            $q.all(promises).then(function() {
                $rootScope.loading_cards = false;
                deferred.resolve(cards_new);
            });
        } else {
            // return empty array
            deferred.resolve(cards_new);
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
    addCards = function(arr) {
        var deferred = $q.defer();
        var promises = [];
        var all_cards;
        var sort_card;
        var spliced;
        let new_cards_temp = [];
        all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
        // Check if card already exists (may have been created by this user offline).
        var i = arr.length;
        //new_cards = [...arr];
        while (i--) {
            let found = all_cards.filter(x => x._id == arr[i]._id);
            // Not found. New Card. Set this as a new card (for animating onscreen).
            if (found.length == 0) {
                arr[i].new_card = true;
            } else {
                // Already exists (may have been added offline).
                let card_data = JSON.parse(JSON.stringify(arr[i]));
                updateCard(card_data);
                // Remove this card from the array of cards to add.
                new_cards_temp.push(card_data);
                arr.splice(i, 1);
            }
        }
        new_cards = [...arr];
        //new_cards = new_cards.concat(new_cards_temp);
        if (!$scope.top_down) {
            if ($scope.removed_cards_bottom.length > 0) {
                sort_card = $filter('orderBy')(all_cards, 'updatedAt', true);
                spliced = sort_card.splice(0, MAX_OUT_BOUNDS);
                $scope.removed_cards_top = sort_card;
                $scope.removed_cards_bottom = [];
                $scope.cards = [];
                $scope.cards_temp = [];
                $scope.cards = $scope.cards.concat(arr, spliced);
                checkNext();
                programmatic_scroll = true;
                //$scope.$broadcast("items_changed", 'bottom');
                deferred.resolve();
            } else {
                // No cards have been removed due to scrolling.
                addNewCards();
                deferred.resolve();
            }
        } else {
            if ($scope.removed_cards_top.length > 0) {
                sort_card = $filter('orderBy')(all_cards, 'updatedAt', true);
                spliced = sort_card.splice(0, MAX_OUT_BOUNDS);
                $scope.removed_cards_bottom = sort_card;
                $scope.removed_cards_top = [];
                $scope.cards = [];
                $scope.cards_temp = [];
                $scope.cards = $scope.cards.concat(arr, spliced);
                checkNext();
                programmatic_scroll = true;
                //$scope.$broadcast("items_changed", 'top');
                deferred.resolve();
            } else {
                // No cards have been removed due to scrolling.
                addNewCards();
                deferred.resolve();
            }
        }
        return deferred.promise;
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
                //last_card = sort_card[sort_card.length - 1]._id;
                last_card = sort_card[0]._id;
                operand = '$gt';
                load_amount = NUM_TO_LOAD;
            } else {
                // TODO - check if still needed.
                load_amount = INIT_NUM_TO_LOAD;
                last_card = '0';
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
                    //console.log(error);
                });
            promises.push(prom1);
            // All the cards have been mapped.
            $q.all(promises).then(function() {
                $rootScope.loading_cards = false;
                deferred.resolve(cards_new);
            });
        } else {
            // Wait for loading to finish.
            deferred.resolve(cards_new);
        }
        return deferred.promise;
    };

    getCardType = function(c) {
        //console.log(c);
        let node = $.parseHTML(c);
        //let html = $(c);
        //console.log(html);
        //console.log(node[0].nodeName);

        //console.log(html.first().attr('class'));

        var card_type = 'card_text';
        if (node[0].nodeName != '#text') {
            card_type = 'card_image';
        }
        return card_type;
    }

    $scope.toggleTheHeight = function(event, id) {
        console.log('TTH: ' + id);

        if (event) {
            event.stopPropagation();
        }

        var tgt = event.target.tagName;
        console.log(tgt);
        if (tgt != "INPUT") {

            var index = General.findWithAttr($scope.cards, '_id', id);
            if (!$scope.cards[index].editing) {

                var oh = $(".content_cnv #card_" + id + " .content_area .ce").outerHeight();
                console.log(oh);

                var msPerHeight = 1.25; //How much ms per height
                var minRange = 400; //minimal animation time
                var maxRange = 1000; //Maximal animation time
                var time = oh * msPerHeight;
                console.log('time1: ' + time);
                time = Math.min(time, maxRange);
                time = Math.max(time, minRange);
                console.log('time2: ' + time);
                //key.expanded = false;

                //$scope.cards[index].expanded = true;

                if ($scope.cards[index].expanded) {
                    oh = 0;
                }
                $scope.cards[index].expanded = !$scope.cards[index].expanded;

                if (!$scope.$$phase) {
                    $scope.$apply();
                }

                /*
                        $('.decide_menu').animate({ "right": "-100vw" }, {
                            duration: 400,
                            easing: "easeOutQuad",
                            complete: function() {
                                //deferred.resolve();
                                $('.decide_menu').removeClass('active');
                            }
                        });
                 */
                /*
                               $(".content_cnv #card_" + id + " .content_area").animate({
                                   height: oh + "px"
                               }, 500, function() {
                                   // Animation complete.
                                   if (oh != 0) {
                                       $(this).height('unset');
                                   }

                               });
                               */

                $(".content_cnv #card_" + id + " .content_area").velocity({ height: oh + "px" }, {
                    duration: time,
                    easing: "easeInOutCubic",
                    complete: function() {
                        // Animation complete.
                        if (oh != 0) {
                            $(this).height('unset');
                        }
                    }
                });

                console.log($scope.cards[index]);


            }

        }

    }

    //$scope.toggleHeight = function(event, id) {
    toggleHeight = function(event, id) {
        if (event) {
            event.stopPropagation();
            //event.preventDefault();
        }
        Edit.closeDropdowns();
        //console.log(id);
        //console.log(event);
        console.log(event.target);
        var tgt = event.target.tagName;



        var index = General.findWithAttr($scope.cards, '_id', id);
        //console.log(index);
        //console.log($scope.cards[index]);

        var is_visible = $('.content_cnv #card_' + id).hasClass("vis");
        console.log($('.content_cnv #card_' + id));
        console.log(is_visible);

        let cd = getCardData(id);
        console.log(cd);

        if (is_visible && tgt != "INPUT") {
            //if ($scope.cards[index].expanded == true && event.target.tagName != "IMG") {
            if ($scope.cards[index].expanded == true) {
                console.log($(".content_cnv #card_" + id + " .resize-container"));
                //$('#card_'  + id + ' .resize-container').removeClass('expanded');
                $scope.cards[index].expanded = false;
                $(".content_cnv #card_" + id + " .resize-container").animate({
                    height: cd.min_height + "px"
                }, 500, function() {
                    // Animation complete.
                });
            } else {
                $scope.cards[index].expanded = true;


                //$('#card_'  + id + ' .resize-container').addClass('expanded');
                $(".content_cnv #card_" + id + " .resize-container").animate({
                    height: cd.full_height + "px"
                }, 500, function() {
                    // Animation complete.
                    console.log($scope.cards[index].expanded);
                });
                console.log($scope.cards[index].expanded);
            }
        }

        console.log($scope.cards[index].expanded);
        if (!$scope.$$phase) {
            $scope.$apply();
        }
        //$('#card_'  + id + ' .resize-container').height('unset');


    }

    getCardData = function(id) {
        var adjustment_data;
        // Custom attribute for storing image adjustments.
        var ia = $('.content_cnv #card_' + id).attr('card-data');
        if (ia != undefined) {
            adjustment_data = JSON.parse(ia);
        }
        return adjustment_data;
    };

    setCardData = function(id, name, value) {
        var ia = getCardData(id);
        if (ia == undefined) {
            ia = {};
        }
        ia[name] = value;
        // Custom attribute for storing image adjustments.
        $('.content_cnv #card_' + id).attr('card-data', JSON.stringify(ia));
    };

    $scope.cancelEdits = function(event) {
        if (event) {
            console.log('stopPropagation');
            event.stopPropagation();
            event.preventDefault();
        }

        var pos = General.findWithAttr($scope.cards, '_id', currently_editing);
        if (pos >= 0) {
            $scope.cards[pos].editing = false;

            console.log($scope.cards[pos].original_content);
            //$scope.cards[pos].content = $scope.cards[pos].original_content;

            if ($scope.cards[pos].content != editing_original) {
                $scope.cards[pos].content = editing_original;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }

                $scope.saveEdits();
            }

            //$('.content_cnv #card_' + currently_editing)

        }

        var image_id = ImageAdjustment.getImageId();

        checkImageEdit(image_id);

        checkImageFilters();

        //$('.content_cnv #card_' + card._id).prop("onclick", null).off("click");
        $('.content_cnv #card_' + currently_editing).attr("onclick", 'toggleHeight(event, \'' + currently_editing + '\')');

        //$('.image_size_menu').addClass('active');
        $('.decide_menu').animate({ "right": "-100vw" }, {
            duration: 400,
            easing: "easeOutQuad",
            complete: function() {
                //deferred.resolve();
                $('.decide_menu').removeClass('active');
            }
        });
    };

    $scope.edit_change = true;

    checkImageEdit = function(image_id) {
        var image_editing = false;

        if ($('#image_adjust_' + image_id).length > 0) {
            image_editing = true;
        }
        console.log(image_editing);
        if (image_editing) {
            ImageEdit.closeImageEdit('e', image_id);
        }

    }

    checkImageFilters = function() {
        var image_filters = false;
        if ($('.filters_active').length > 0) {
            image_filters = true;
        }
        console.log(image_filters);
        if (image_filters) {
            ImageEdit.closeFilters();
        }
    }

    $scope.saveEdits = function(event) {
        console.log('saveEdits');
        if (event) {
            console.log('stopPropagation');
            event.stopPropagation();
            event.preventDefault();
        }

        var image_id = ImageAdjustment.getImageId();

        var card_id = $('.content_cnv #cropper_' + image_id).closest('div.card_temp').attr('id');

        //var image_editing = false;
        //var image_filters = false;
        //console.log($('#image_adjust_' + image_id));

        checkImageEdit(image_id);

        checkImageFilters();

        ImageEdit.updateTitle(card_id);
        //if ($('#image_adjust_' + image_id).length > 0) {
        //    image_editing = true;
        //}

        //console.log(image_editing);
        //if (image_editing) {
        //    ImageEdit.closeImageEdit('e', image_id);
        //}

        //image_filt_div filters_active
        /*
        if ($('.filters_active').length > 0) {
            image_filters = true;
        }
        console.log(image_filters);
        if (image_filters) {
            ImageEdit.closeFilters();
        }
        */


        //ImageEdit.closeFilters();

        for (var i = 0, len = $scope.cards.length; i < len; i++) {
            delete $scope.cards[i].disabled;
        }
        console.log(currently_editing);
        var pos = General.findWithAttr($scope.cards, '_id', currently_editing);
        if (pos >= 0) {
            console.log($scope.cards[pos]);
            $scope.cards[pos].editing = false;
            let card = $scope.cards[pos];

            //disableCheckboxes(card._id);
            checkboxesEnabled($scope.cards[pos]._id, false);

            Format.getBlur(card._id, card, $scope.currentUser);
            //$scope.editing_card = false;

        }
        // $('.content_cnv #card_' + currently_editing).attr("onclick", 'toggleHeight(event, \'' + currently_editing + '\')');



        $('.decide_menu').animate({ "right": "-100vw" }, {
            duration: 400,
            easing: "easeOutQuad",
            complete: function() {
                //deferred.resolve();
                $('.decide_menu').removeClass('active');
            }
        });


    }

    //this.getBlur = function(id, card, currentUser)
    //Format.getBlur

    let currently_editing;
    let editing_original;

    //$scope.editing_card = false;

    $scope.editCard = function(event, card) {
        if (event) {
            console.log('stopPropagation');
            event.stopPropagation();
            event.preventDefault();
        }
        console.log('edit card?');
        if (card.user == $scope.currentUser._id) {
            console.log('edit');
            //$scope.editing_card = true;

            for (var i = 0, len = $scope.cards.length; i < len; i++) {
                $scope.cards[i].disabled = true;
            }

            var pos = General.findWithAttr($scope.cards, '_id', card._id);
            if (pos >= 0) {
                $scope.cards[pos].editing = true;
                $scope.cards[pos].disabled = false;
                currently_editing = $scope.cards[pos]._id;
                editing_original = $scope.cards[pos].original_content;

            }
            console.log($scope.cards[pos]);

            checkboxesEnabled($scope.cards[pos]._id, true);
            //var cropper = $('.content_cnv #cropper_' + card._id);
            //ContentEditable.setContenteditable($(cropper)[0], true);
            //$('.content_cnv #card_' + key._id).attr("onclick", 'toggleHeight(event, \'' + key._id + '\')');
            $('.content_cnv #card_' + card._id).prop("onclick", null).off("click");

            $('.decide_menu').addClass('active');
            //$('.image_size_menu').addClass('active');
            $('.decide_menu').animate({ "right": "0" }, {
                duration: 400,
                easing: "easeOutQuad",
                complete: function() {
                    //deferred.resolve();
                }
            });

        } else {
            console.log('dont edit');
        }
    }

    /*
    setCardMin = function(key) {
        key.active = true;
        //console.log(key.content);
        let node = $.parseHTML(key.content);
        //let html = $(key.content);
        var card_min = {};
        if (node[0].nodeName != '#text') {
            card_min = 'card_image';
            var c = $('.test_card').clone();
            $(".test_container").append(c);
            var d = $(".test_container .test_card").addClass('test_' + key._id);
            $(d).removeClass('test_card');
            $('.test_container .test_' + key._id + ' .ce').append(key.content);

            let test = awaitImages('.test_container .test_' + key._id).then(function(result) {
                //var h = $('.test_container .test_' + key._id).find('.ce').find('img:first').height().toFixed(2);
                var i = $('.test_container .test_' + key._id).find('.ce').find('img:first');

                var ti = $('.test_container .test_' + key._id).find('.ce').find('[title-data').attr('title-data');
                //console.log($('[deleteuserid]'));
                //ti = JSON.parse(ti);
                //console.log(ti);
                if (ti != undefined) {
                    key.title = ti;
                    //console.log(key);
                    if (!$scope.$$phase) {
                        $scope.$apply();
                    }
                }


                //console.log(i);
                if (i.length > 0) {
                    var h = $(i).height().toFixed(2);

                    //console.log(h);
                    var card_h = $('.test_container .test_' + key._id).find('.resize-container').outerHeight().toFixed(2);
                    setCardData(key._id, 'full_height', card_h);
                    setCardData(key._id, 'min_height', h);

                    /// Get title
                    //console.log(i);
                    //var t = ImageEdit.getImageTitle('test_container', key._id);
                    //console.log(t);

                    $('.content_cnv #card_' + key._id + ' .resize-container').height(h);

                    //$(eb).find('.ti').attr("onclick", 'testImage(event, \'' + id + '\')');
                    // toggleHeight($event, card._id)"
                    // ng-click="!card.active || toggleHeight($event, card._id)"
                    $('.content_cnv #card_' + key._id).attr("onclick", 'toggleHeight(event, \'' + key._id + '\')');

                    //$timeout(function() {
                    $('.test_container .test_' + key._id).remove();
                    //}, 500);
                } else {
                    //console.log(i);
                    //$("head").append("<style>#card_" + key._id + " .resize-container { max-height: " + h + "px; }</style>");
                }
            });

        }
    }
    */

    $scope.appliedClass = function(myObj) {
        if (myObj == 'card_text') {
            return "card_text";
        } else {
            return "card_image"; // Or even "", which won't add any additional classes to the element
        }
    }

    var TITLE_CHAR_LIMIT = 200;

    parseCard = function(card) {
        //console.log(card.content);
        let node = $.parseHTML(card.content);
        //console.log(node);

        //let html = $(key.content);
        //var card_min = {};
        //var title_area = "Steve";
        //var content_area = node;
        var content_area = {};
        content_area.title;
        //content_area.content = card.content;
        //result.content_area = card.content;
        //console.log(node[0].nodeName);
        var title_end;
        var tmp = document.createElement("div");
        //var i = 0;

        var title_tmp = document.createElement("div");
        var content_tmp = document.createElement("div");
        var content_found = false;
        card.title_image = false;
        //console.log(node[0].className);
        if (node[0].nodeName == 'DIV' && node[0].className.indexOf('cropper_cont') >= 0) {
            //tmp.appendChild(node[i]);
            console.log('ONE');
            title_tmp.appendChild(node[0]);


            content_found = true;

            //card.title_image = true;
        } else {
            //console.log('TWO');
            title_tmp.appendChild(node[0]);
            //content_found = true;
        }
        var cropper_found = false;
        for (var i = 1, len = node.length; i < len; i++) {
            //while(node[i].nodeName != 'DIV'){
            //console.log(node[i].nodeName);
            //console.log(node[i].outerHTML);

            if ((node[i].outerHTML).indexOf('cropper_cont') >= 0) {
                cropper_found = true;
            }
            //console.log(node[i].className.indexOf('cropper_cont'));
            //if (node[i].nodeName != 'DIV' && content_found == false) {
            /*
                        if (node[i].nodeName == 'DIV') {
                            if (node[i].className != undefined) {
                                if (node[i].className.indexOf('cropper_cont') < 0) {
                                    cropper_found = true;
                                }
                            }

                        }
                        */
            //cropper_found
            if (!cropper_found && !content_found) {
                //console.log('THREE');
                //tmp.appendChild(node[i]);
                title_tmp.appendChild(node[i]);
                //title_found = true;
                //console.log(title_tmp.innerHTML);
                //console.log(title_tmp.textContent);
                //console.log(title_tmp.textContent.length);
                // first index of <br> or character limit.
                if (title_tmp.innerHTML.indexOf('<br>') > 0) {
                    content_found = true;
                }
                if (title_tmp.textContent.length > TITLE_CHAR_LIMIT) {
                    content_found = true;
                }


            } else {
                //console.log('FOUR');
                content_found = true;
                content_tmp.appendChild(node[i]);
                //console.log('BREAK');
                //title_end = i;
                //break;
            }

            //i++;
        }

        //console.log(title_tmp.innerHTML);
        //console.log(title_tmp.textContent)
        // first index of <br> or character limit.
        //if(title_tmp.innerHTML.indexOf('<br>') > 0){

        //}
        //console.log(content_tmp.innerHTML);

        card.content = content_tmp.innerHTML;
        card.title_area = title_tmp.innerHTML;

        tmp.appendChild(node[0]);
        //console.log(tmp.innerHTML);

        if (node[0].nodeName != '#text') {
            //card.title_image = true;

            //console.log(node[0]);
            //console.log($(node[0]).children("img"));
            /*console.log($(node[0]).children("img").children('attributes'));
            for (var i =0; i<$(node[0]).children("img").length; i++){
                var at = $(node[0]).children[i];
                console.log(at);
            }*/

            $(node[0]).children("img").each(function() {
                console.log(this);
                console.log($(this).attr('title-data'));

                if ($(this).attr('title-data')) {
                    if ($(this).attr('title-data').length > 0) {
                        card.title_image_text = $(this).attr('title-data');
                        console.log(card.title_image_text);
                        //card.title_image = true;
                        card.title_image = true;

                        card.animate_title = true;
                        console.log(card.title_image);
                    } else {
                        delete card.title_image_text;
                        card.title_image = false;
                    }
                } else {
                    delete card.title_image_text;
                        card.title_image = false;
                }
            });

            //.attr('title-data');
            //console.log(td);

            if (tmp.innerHTML.includes('title-data')) {
                var index = tmp.innerHTML.indexOf('title-data');
                //console.log(index);
                var td = tmp.innerHTML.substr(index, tmp.innerHTML.length);
                //console.log(td);
            }
        }
        // First node is an image
        //console.log(card.content);
        //console.log(node[0]);
        // Get the image and put it into the title
        //title_area = JSON.stringify(node[0]);

        /* var tmp = document.createElement("div");
         tmp.appendChild(node[0]);
         console.log(tmp.innerHTML);
         */

        //var nt = node[0].nodeValue;
        //console.log(nt);

        //content_area.title = tmp.innerHTML;

        //content_area.title = title_tmp.innerHTML;

        //title_area = tmp.innerHTML;
        //result.title_area = tmp.innerHTML;
        //result.title_area = node[0];
        //// Remove second element child from todoList
        //todoList.children[1].remove();
        //result.content_area = card.content;
        //node[0].remove();
        var tmp2 = document.createElement("div");
        for (var i = 1; i < node.length; i++) {
            tmp2.appendChild(node[i]);
        }
        //tmp2.appendChild(node);
        //console.log(tmp2.innerHTML);


        //content_area.content = tmp2.innerHTML;

        //content_area.content = content_tmp.innerHTML;

        //}

        if (content_area.title != undefined) {
            //card.title_area = content_area.title;

        }

        //card.content = content_area.content;
        card.editing = false;
        card.expanded = false;
        //console.log(title_area);
        //return title_area;

        //return result;

        //return content_area;

        console.log(card);
        return card;
    }

    // TODO - If not following anyone suggest follow?
    getFollowing = function() {
        console.log('gf');
        var deferred = $q.defer();
        var promises = [];
        console.log('loading: ' + $rootScope.loading_cards_offscreen);
        if (!$rootScope.loading_cards_offscreen) {
            $rootScope.loading_cards_offscreen = true;
            var followed = UserData.getUser().following;
            var last_card;
            var operand;
            var sort_card;
            var load_amount = NUM_TO_LOAD;;
            if ($scope.cards.length > 0) {
                // Only get newer than temp but check removed cards
                var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                sort_card = $filter('orderBy')(all_cards, 'updatedAt');
                last_card = sort_card[0]._id;
            } else {
                last_card = '0';
            }
            console.log(last_card + ' : ' + last_card_stored);
            var val = { ids: followed, amount: load_amount, last_card: last_card };
            if (last_card != last_card_stored) {
                last_card_stored = last_card;
                var prom1 = Conversations.getFeed(val)
                    .then(function(res) {
                        console.log('gf loaded');
                        console.log(res);
                        if (res.data.cards.length > 0) {
                            res.data.cards.map(function(key, array) {
                                console.log('got: ' + key._id);
                                //key.card_type = getCardType(key.content);
                                //console.log(key.card_type);
                                //setCardMin(key);
                                //var res =  parseCard(key);
                                //console.log(res.title_area);
                                //result.title_area = "Steve";
                                //result.content_area = node;

                                /*
                                var r = parseCard(key);
                                key.title_area = r.title;
                                key.content = r.content;
                                key.editing = false;
                                key.expanded = false;
                                */

                                key = parseCard(key);
                                //key.title_area = parseCard(key);
                                //key.title_area = JSON.stringify(res.title_area);
                                //key.content = res.content_area;


                                //console.log(key.card_min);
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
                        //console.log(error);
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
            load_amount = NUM_TO_LOAD;
            if ($scope.cards.length > 0) {
                // Only get newer than temp but check removed cards
                var all_cards = $scope.cards.concat($scope.cards_temp, $scope.removed_cards_top, $scope.removed_cards_bottom);
                sort_card = $filter('orderBy')(all_cards, 'updatedAt');
                last_card = sort_card[0]._id;
                operand = '$lt'
            } else {
                last_card = '0';
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
                        //console.log(error);
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
                //last_card = sort_card[0].updatedAt;
                last_card = sort_card[0]._id;
                operand = '$lt';
                load_amount = NUM_TO_LOAD;
            } else {
                load_amount = NUM_TO_LOAD;
                last_card = '0';
                //last_card = General.getISODate();
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
                        //console.log(error);
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
                last_card = sort_card[sort_card.length - 1]._id;
                operand = '$gt';
            } else {
                last_card = '0';
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

        // Force cache for directly loaded conversatiom
        $http.get("/chat/conversation/" + id).then(function(result) {
            //console.log(result);
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
    var checkboxesEnabled = function(id, bool) {
        //console.log('checkboxesEnabled: ' + bool);
        var el = document.getElementById('ce' + id);
        //if ($(el).attr('contenteditable') == 'false') {
        if (bool == false) {
            $(el).find('input[type=checkbox]').attr('disabled', 'disabled');
        } else {
            $(el).find('input[type=checkbox]').removeAttr('disabled');
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

    setUp = function(res) {
        var deferred = $q.defer();
        if (Conversations.getConversationType() == 'feed') {
            $scope.feed = true;
            $scope.top_down = true;
            $rootScope.top_down = true;
            $scope.isMember = true;
            scroll_direction = "top";
            deferred.resolve();
        } else if (Conversations.getConversationType() == 'public') {
            $scope.top_down = true;
            $rootScope.top_down = true;
            $scope.isMember = checkPermit(res);
            scroll_direction = "top";
            deferred.resolve();
        } else if (Conversations.getConversationType() == 'private') {
            $scope.isMember = checkPermit(res);
            scroll_direction = "bottom";
            $scope.top_down = false;
            $rootScope.top_down = false;
            deferred.resolve();
        }
        return deferred.promise;
    }

    // START - find the conversation id
    getConversationId()
        .then(function(res) {
            // Load the public feed, public conversation or private conversation.
            if (principal.isValid()) {
                // Logged in
                UserData.checkUser().then(function(result) {
                    setUp(res).then(function() {
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
                });
            } else {
                $rootScope.dataLoading = false;
                // Not logged in
                if (Conversations.getConversationType() == 'public') {
                    // Public route (Does not need to be logged in).
                    setUp(res).then(function() {
                        loadPublicConversation();
                    })
                } else {
                    $location.path("/api/login/");
                }
            }
        });

    var cardAnimEnd = function() {
        console.log('cardAnimEnd');
        //delete $scope.cards[i].new_card;
        var id = (this.id).substr(5, (this.id).length);
        // remove the animation end listener which called this function.
        $(this).off('webkitAnimationEnd oAnimationEnd animationend ', cardAnimEnd);
        $(this).css('margin-top', '');

        $(this).removeClass('animate-transform');

        $('.content_cnv').css('--v', '');

        /*$('.content_cnv').css('transform', '');
        $('.content_cnv').css('overflow-y', '');
        $('.content_cnv').css('overflow-x', '');*/

        $(".content_cnv").css('overflow-y', '');
        $(".content_cnv").css('overflow-x', '');
        $(".content_cnv").css('overflow', '');


        $(this).removeClass('animate_down');
        $(this).removeClass('will_transform');
        $scope.$apply(function($scope) {
            // Delete the new card value.
            var pos = General.findWithAttr($scope.cards, '_id', id);
            if (pos >= 0) {
                createObserver($scope.cards[pos]._id);
                //disableCheckboxes($scope.cards[pos]._id);
                checkboxesEnabled($scope.cards[pos]._id, false);
            }
        });
        bindScroll();
        Scroll.enable('.content_cnv');
        addNewCards();
    };



}]);