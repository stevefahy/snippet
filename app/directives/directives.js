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
                //element.html(ngModel.$viewValue || "");
                element.html(ngModel.$modelValue || "");
                
            };
            element.bind("blur keyup change", function(event) {
                // WARNING added - if (!scope.$$phase) { 31/01/18
                if (!scope.$$phase) {
                    //scope.$apply(read);
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
        }, 100000);
    }
    return {
        link: link
    };
}]);

cardApp.directive('onFinishRender', function($timeout, $rootScope) {
    return {
        restrict: 'A',
        link: function(scope, element, attr) {
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
                            element.append("<div class=\"card_temp\" id=\"card_" + card._id + "\">" + card.content + "</div><img id= \"delete_image\" src=\"/assets/images/bee_65.png\" onload=\"domUpdated()\">");
                        } else {
                            element.append("<div class=\"card_temp\" id=\"card_" + card._id + "\">" + card.content + "</div>");
                        }
                    });
                }
            }, true);
            $compile(element.contents())(scope);
        }
    };
});