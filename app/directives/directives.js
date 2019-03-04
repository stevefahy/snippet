//
// DIRECTIVES
//
//

// contenteditable directive
//

cardApp.directive("contenteditable", function() {
    return {
        require: "ngModel",
        link: function(scope, element, attrs, ngModel) {
            function read() {
                ngModel.$setViewValue(element.html());
            }
            ngModel.$render = function() {
                element.html(ngModel.$viewValue || "");
            };
            element.bind("blur keyup change", function(event) {
                // WARNING added - if (!scope.$$phase) { 31/01/18
                if (!scope.$$phase) {
                    scope.$apply(read);
                }
            });
        }
    };
});


cardApp.directive('momentTime', ['$interval', '$filter', function($interval, $filter) {

    function link(scope, element, attrs) {
        var format,
            timeoutId;
        momentFilter = $filter('momentFilter');

        function updateTime() {
            element.text((new Date(), momentFilter(format)));
        }

        scope.$watch(attrs.momentTime, function(value) {
            format = value;
            updateTime();
        });

        element.on('$destroy', function() {
            $interval.cancel(timeoutId);
        });

        // start the UI update process; save the timeoutId for canceling
        timeoutId = $interval(function() {
            updateTime(); // update DOM
        }, 10000);
    }

    return {
        link: link
    };
}]);


cardApp.directive('momentTimeConv', ['$interval', '$filter', function($interval, $filter) {

    function link(scope, element, attrs) {
        var format,
            timeoutId;
        momentFilterConv = $filter('momentFilterConv');

        function updateTime() {
            element.text((new Date(), momentFilterConv(format)));
        }

        scope.$watch(attrs.momentTimeConv, function(value) {
            format = value;
            updateTime();
        });

        element.on('$destroy', function() {
            $interval.cancel(timeoutId);
        });

        // start the UI update process; save the timeoutId for canceling
        timeoutId = $interval(function() {
            updateTime(); // update DOM
        }, 10000);
    }

    return {
        link: link
    };
}]);


cardApp.directive('onFinishRender', function($timeout, $rootScope) {
    return {
        restrict: 'A',
        link: function(scope, element, attr) {
            //console.log(scope.$index);
            //console.log(element);
            //console.log(attr.onFinishRender);
            //console.log('onFinishRender: ' + $rootScope.top_down);

            // ngRepeatFinishedTemp
            if (!$rootScope.deleting_card && ($rootScope.top_down && scope.$last === true) || !$rootScope.deleting_card && !$rootScope.top_down && scope.$first === true) {
                $timeout(function() {
                    if (attr.onFinishRender == 'ngRepeatFinishedTemp') {
                        $rootScope.$broadcast("ngRepeatFinishedTemp", { temp: "some value" });
                    } else {
                        $rootScope.$broadcast("ngRepeatFinished", { temp: "some value" });
                    }

                });
            }
        }
    };
});


cardApp.directive('viewAnimations', function(viewAnimationsService, $rootScope) {
    return {
        restrict: 'A',
        link: function(scope, element) {

            var previousEnter, previousLeave;

            var enterAnimation = viewAnimationsService.getEnterAnimation();
            if (enterAnimation) {
                if (previousEnter) element.removeClass(previousEnter);
                previousEnter = enterAnimation;
                element.addClass(enterAnimation);
            }

            $rootScope.$on('event:newLeaveAnimation', function(event, leaveAnimation) {
                if (previousLeave) element.removeClass(previousLeave);
                previousLeave = leaveAnimation;
                element.addClass(leaveAnimation);
            });
        }
    };
});


cardApp.directive("scrollToTopWhen", function($timeout) {
    return {
        link: function(scope, element, attrs) {
            scope.$on(attrs.scrollToTopWhen, function(event, data) {
                $timeout(function() {
                    console.log('scrollToTopWhen');
                    if (data == 'top') {
                        angular.element(element)[0].scrollTop = 0;
                    } else {
                        angular.element(element)[0].scrollTop = angular.element(element)[0].scrollHeight;
                    }

                }, 100);
            });
        }
    };
});

/*
cardApp.directive("scrollTrigger", function() {
    return {
        scope: {
            callback: '=scrollTrigger'
        },
        link: function(scope, element, attrs) {
            var offset = parseInt(attrs.threshold) || 0;
            var container = angular.element(element);
            container.bind("scroll mousewheel touchstart", function(evt) {
                if (container[0].scrollTop <= (0 + offset)) {
                    scope.callback('top');
                }
                if (container[0].offsetHeight + container[0].scrollTop >= (container[0].scrollHeight - offset)) {
                    scope.callback('bottom');
                }
            });
        }
    };
});
*/

// scrollIndicator directive
/*
cardApp.directive('scrollIndicator', ['$window', '$document', '$timeout', '$compile', '$rootScope', function($window, $document, $timeout, $compile, $rootScope) {
    var defaults = {
        delay: 100,
        start_delay: 1000,
        init_scroll_delay: 3000,
        scroll_delay: 1000,
        thumb_min_height: 3,
        element_id: 'scroll_indicator_scroll',
        progress_container_class: 'progress-container',
        progress_bar_class: 'progress-bar',
        progress_thumb_id: 'progress-thumb',
        disable: 'false'
    };
    return {
        restrict: 'A',
        scope: {
            scrollIndicator: '='
        },
        link: function($scope, element, attrs) {
            var options = angular.extend({}, defaults, $scope.scrollIndicator);
            if (options.disable !== true) {
                var wrapperParentElement = element.parent()[0];
                var wrapperDomElement = element;
                element.attr('id', options.element_id);
                // create progress-container
                var progressContainer = angular.element($window.document.createElement('div'));
                progressContainer.addClass(options.progress_container_class);
                // create progress-bar
                var progressBar = angular.element('<div id="' + options.progress_thumb_id + '"></div>');
                progressBar.addClass(options.progress_bar_class);
                // Add the progress-bar to the progress-container
                progressContainer.append(progressBar);
                // Attach to the DOM
                wrapperParentElement.insertBefore(progressContainer[0], wrapperParentElement.children[0]);
                var scrollpromise;
                // hide the scroll thumb initially
                $(progressBar[0]).css('visibility', 'hidden');
                // set the delay val to the init_scroll_delay initially.
                var delay_val = options.init_scroll_delay;
                //Methods
                var values = {},
                    assignValues = function() {
                        // Position of scroll indicator 
                        var content_position = $(wrapperDomElement).position();
                        var content_height = $(wrapperDomElement).height();
                        // Top
                        $('.' + options.progress_container_class).css({ top: content_position.top });
                        // Height
                        $('.' + options.progress_container_class).css({ height: content_height });
                        //
                        values.content_div_height = $('#' + options.element_id).height();
                        values.content_height = element[0].scrollHeight;
                        if (values.content_height > values.content_div_height) {
                            values.height = element[0].scrollHeight - element[0].clientHeight;
                            values.scroll_thumb_height = (100 / (((values.content_height / values.content_div_height) * 100) / 100));
                            // Check for minimum height.
                            var thumb_height = options.thumb_min_height;
                            if (values.scroll_thumb_height > options.thumb_min_height) {
                                thumb_height = values.scroll_thumb_height;
                            }
                            // Set the progress thumb height.
                            $(progressBar[0]).css('height', thumb_height + "%");
                            // Set scrolled max value.
                            values.scrolled_max = 100 - thumb_height;
                            // set the intial scroll position
                            $timeout(function() {
                                $(progressBar[0]).css('visibility', 'visible');
                                // bind scroll
                                wrapperDomElement.bind('scroll', doScroll);
                                doScroll();
                            }, options.start_delay);
                        }
                    };
                // bind resize
                angular.element($window).bind('resize', function() { $timeout(assignValues, options.delay); });
                //
                // listen for directive div resize
                $scope.$watchGroup([getElementHeight, getElementScrollHeight], function(newValues, oldValues, scope) {
                    assignValues();
                });

                function getElementHeight() {
                    return element[0].clientHeight;
                }

                function getElementScrollHeight() {
                    return element[0].scrollHeight;
                }

                $timeout(assignValues, options.delay);

                $scope.$on('$destroy', function() {
                    $timeout.cancel(scrollpromise);
                    $(progressBar[0]).css('visibility', 'hidden');
                    $(progressBar[0]).removeClass('fade_out');
                    $(progressBar[0]).removeClass('fade_in');
                    wrapperDomElement.unbind('scroll');
                    angular.element($window).unbind('resize', assignValues);
                });

                doScroll = function() {
                    $(progressBar[0]).removeClass('fade_out');
                    $(progressBar[0]).addClass('fade_in');
                    // Cancel timeout to check for scroll stop
                    $timeout.cancel(scrollpromise);
                    // Start timeout to check for scroll stop
                    scrollpromise = $timeout(function() {
                        //console.log('scrolling stopped');
                        delay_val = options.scroll_delay;
                        $(progressBar[0]).removeClass('fade_in');
                        $(progressBar[0]).addClass('fade_out');
                    }, delay_val);
                    // Calculate scroll
                    var winScroll = document.getElementById(options.element_id).scrollTop;
                    var scrolled = (winScroll / (values.height) * 100);
                    scrolled = (scrolled * values.scrolled_max) / 100;
                    document.getElementById(options.progress_thumb_id).style.top = scrolled + "%";
                };
            }
        }
    };
}]);
*/


cardApp.directive("doScopeRepeat", function($compile, $log, UserData) {
    return {
        restrict: "A",
        replace: true,
        transclude: true,
        scope: {
            doScopeRepeat: '='
        },
        template: '<div ng-transclude="" class="conty"></div>',
        link: function(scope, element, attrs) {
            var currentUser = UserData.getUser();
            scope.$watch('doScopeRepeat', function(newValue, oldValue) {
                if (newValue) {
                    angular.forEach(newValue, function(card, index) {
                        var avatar;
                        if (card.avatar == 'default') {
                            avatar = "/assets/images/default_avatar.jpg";
                        } else {
                            avatar = card.avatar;
                        }
                        var edit = "";
                        var isUser = false;
                        if (card.user == currentUser._id) {
                            edit = "<div class=\"edit\"><div class=\"dropdown\" id=\"cem" + card._id + "\"><div onclick=\"dropDownToggle('cem" + card._id + "')\" class=\"dropbtn\"><i class=\"material-icons\" id=\"mi-more_vert\">&#xE5D4;</i></div> <div id=\"myDropdowncem" + card._id + "\" class=\"dropdown-content\"> <div click=\"deleteCard(" + card._id + "," + card.conversationId + ")\">Delete</div></div></div></div>";
                            isUser = true;
                        }
                        var user_div = "<div id=\"user\">" +
                            "<img  alt=\"\" class=\"card_avatar\" src=\"" + avatar + "\"/>" +
                            "<div class=\"username\">" + card.user_name + "</div>" +
                            edit +
                            "</div>";
                        //var card_inner = "<div class=\"resize-container\" id=\"conversation_part\" ng-init=\"disableCheckboxes(" + card._id + "); cardCreated();\"><form class=\"form-horizontal\">  <div class=\"ce\" id=\"ce" + card._id +"\" contenteditable=\"" + card.user == currentUser._id + "\" editable=\"" + card.user == currentUser._id + "\" ng-change=\"contentChanged(card.content" + "," + "\"ce\"" + card._id + ") ng-keydown=\"checkKey($event, \"ce\"" + card._id + "); ng-paste=\"handlePaste($event)\" ng-focus=\"getFocus(" + card._id + "," + card + "," + currentUser + ")\"; keyListen(\"ce\"" + card._id + "); ng-blur=\"getBlur(" + card._id + "," + card + "," + currentUser + ")\" ng-model=\"" + card.content +"\" ng-model-options=\"{ debounce: 1000 }\">";
                        var footer = "<div class=\"card_footer\"><div class=\"c_footer_o\"><div class=\"card_footer_btns\"><div class=\"cf_btn\"><i class=\"material-icons\">favorite_border</i></div><div class=\"cf_btn\" ng-show=\"" + !isUser + "\" ng-click=\"follow(" + card + ")\"><i class=\"material-icons btn_follow\" ng-class=\"{\"following\":" + card.following + "}\">directions_walk</i></div><div class=\"cf_btn send\"><i class=\"material-icons send\">send</i></div><div class=\"cf_btn\"><i class=\"material-icons edit\" ng-class=\"{\"file_edit\": {{" + isUser + "}}}\">edit</i></div><div moment-time-conv=\"" + card.updatedAt + "\" id=\"time\"></div></div></div><div class=\"likes\">7,255 likes</div></div>";
                        var card_inner = "<div class=\"resize-container\" id=\"conversation_part\" ng-init=\"disableCheckboxes(" + card._id + "); cardCreated();\"><form class=\"form-horizontal\">";
                        var card_inner_2 = "<div class=\"ce\" id=\"ce" + card._id +"\" contenteditable=\"" + isUser + "\" editable=\"" + isUser + "\" ng-change=\"contentChanged(card.content" + "," + "ce" + card._id + ")\" ng-keydown=\"checkKey($event, ce" + card._id + ")\"; ng-paste=\"handlePaste($event)\" ng-focus=\"getFocus(" + card._id + "," + card + "," + currentUser + "); keyListen(ce" + card._id + ");\" ng-blur=\"getBlur(" + card._id + "," + card + "," + currentUser + ")\" ng-model=\"card.content\" ng-model-options=\"{ debounce: 1000 }\">";
                        var card_div = "<div id=\"card_" + card._id + "\" class=\"card_temp\">" + user_div + card_inner + card_inner_2 +  card.content + "</form></div></div>" + footer + "</div>";
                        
                        var last_card = "<img id= \"delete_image\" src=\"/assets/images/bee_65.png\" onload=\"domUpdated()\">";
                        if (index == newValue.length - 1) {
                            //element.append("<div id=\"card_" + card._id + "\">" + card.content + "</div><img id= \"delete_image\" src=\"/assets/images/bee_65.png\" onload=\"domUpdated()\">");
                            element.append(card_div + last_card);
                            //scope.finished += card_div + last_card;
                        } else {
                            element.append(card_div);
                            //scope.finished += card_div;
                        }
                    });
                   // $('.conty').unwrap();
                }
            }, true);
            $compile(element.contents())(scope);
        }
        
    };
});



cardApp.directive("doRepeat", function($compile, $log, UserData) {
    return {
        restrict: "A",
        replace: true,
        transclude: true,
        scope: {
            doRepeat: '='
        },
        template: '<div ng-transclude="" class="conty"></div>',
        link: function(scope, element, attrs) {
            scope.$watch('doRepeat', function(newValue, oldValue) {
                if (newValue) {
                    angular.forEach(newValue, function(card, index) {
                        if (index == newValue.length - 1) {
                            element.append("<div id=\"card_" + card._id + "\">" + card.content + "</div><img id= \"delete_image\" src=\"/assets/images/bee_65.png\" onload=\"domUpdated()\">");
                        } else {
                            element.append("<div id=\"card_" + card._id + "\">" + card.content + "</div>");
                        }
                    });
                }
            }, true);
            $compile(element.contents())(scope);
        } 
    };
});

/*
cardApp.directive('doRepeat', function(){
  return {
    transclude : 'element',
    compile : function(element, attr, linker){
      return function($scope, $element, $attr){
        var myLoop = $attr.lkRepeat,
            match = myLoop.match(/^\s*(.+)\s+in\s+(.*?)\s*(\s+track\s+by\s+(.+)\s*)?$/),
            indexString = match[1],
            collectionString = match[2],
            parent = $element.parent(),
            elements = [];

        // $watchCollection is called everytime the collection is modified
        $scope.$watchCollection(collectionString, function(collection){
          var i, block, childScope;

          // check if elements have already been rendered
          if(elements.length > 0){
            // if so remove them from DOM, and destroy their scope
            for (i = 0; i < elements.length; i++) {
              elements[i].el.remove();
              elements[i].scope.$destroy();
            };
            elements = [];
          }

          for (i = 0; i < collection.length; i++) {
            // create a new scope for every element in the collection.
            childScope = $scope.$new();
            // pass the current element of the collection into that scope
            childScope[indexString] = collection[i];

            linker(childScope, function(clone){
              // clone the transcluded element, passing in the new scope.
              parent.append(clone); // add to DOM
              block = {};
              block.el = clone;
              block.scope = childScope;
              elements.push(block);
            });
          };
        });
      }
    }
  }
});
*/
/*
cardApp.directive('doRepeat', function($timeout, $rootScope) {
    return {
        restrict: 'A',
        link: function(scope, element, attr) {
            console.log(scope);
            //console.log(scope.$index);
            //console.log(element);
            console.log(attr.doRepeat);
            console.log(scope[attr.doRepeat]);
            //console.log('onFinishRender: ' + $rootScope.top_down);

        scope.$watch(attr.doRepeat, function(value) {
            //console.log(value);
            //format = value;
            //updateTime();
                        angular.forEach(value, function(value2, index) {
console.log(value2);
                //$log.error(value);
                //element.append("<type type='scope.type['" + index + "]'></type>");
            });
        });

            // ngRepeatFinishedTemp

        }
    };
});
*/