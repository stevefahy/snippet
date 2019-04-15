var cardApp = angular.module("cardApp", ['ngSanitize', 'ngRoute', 'angularMoment', 'ngAnimate', 'ngImgCrop', 'ngCookies', 'angular-jwt', 'rzModule']);

//
// ROUTES
//

cardApp.config(function($routeProvider, $locationProvider, $httpProvider) {
    $routeProvider
        .when('/', {
            templateUrl: '/views/conversation.html',
            controller: 'conversationCtrl'
        })
        .when("/s/:snip", {
            templateUrl: '/views/card.html',
            controller: 'cardCtrl'
        })
        .when("/:username", {
            templateUrl: '/views/conversation.html',
            controller: 'conversationCtrl'
        })
        .when("/c/contacts", {
            templateUrl: '/views/contacts.html',
            controller: 'contactsCtrl'
        })
        // callback from importing google contacts.
        .when("/c/contacts/import", {
            templateUrl: '/views/contacts.html',
            controller: 'contactsCtrl',
            menuItem: 'import',
            reloadOnSearch: false
        })
        .when("/chat/conversations", {
            templateUrl: '/views/conversations.html',
            controller: 'conversationsCtrl'
        })
        .when("/chat/conversation/:id", {
            templateUrl: '/views/conversation.html',
            controller: 'conversationCtrl'
        })
        .when("/chat/user_public_conversation/:username", {
            templateUrl: '/views/conversation.html',
            controller: 'conversationCtrl'
        })
        .when("/api/join/:code", {
            templateUrl: '/views/join.html',
            controller: 'joinCtrl'
        })
        .when("/api/user_setting", {
            templateUrl: '/views/user_setting.html',
            controller: 'usersettingCtrl'
        })
        .when("/api/group_info/:id", {
            templateUrl: '/views/group.html',
            controller: 'groupCtrl'
        })
        .when("/api/logout", {
            templateUrl: '/views/login.html',
            controller: 'loginCtrl'
        })
        .when("/api/login", {
            templateUrl: '/views/login.html',
            controller: 'loginCtrl'
        })
        .when("/auth/callback", {
            templateUrl: '/views/authcallback.html',
            controller: 'authcallbackCtrl'
        })
        .otherwise({
            redirectTo: '/'
        });
    // use the HTML5 History API
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false,
        rewriteLinks: false
    });

});

//
// CONFIG
//

// Add the access token to every request to the server.
cardApp.config(['$httpProvider', function($httpProvider) {
    var interceptor = [
        '$q',
        '$rootScope',
        'principal',
        function($q, $rootScope, principal) {
            var service = {
                // run this function before making requests
                'request': function(config) {
                    //Add your header to the request here
                    if (principal.token != undefined) {
                        config.headers['x-access-token'] = principal.token;
                    }
                    return config;
                }
            };
            return service;
        }
    ];
    $httpProvider.interceptors.push(interceptor);
}]);


//
// DETECT NETWORK STATUS
//

cardApp.run(function($window, $rootScope) {
    $rootScope.online = navigator.onLine;
    $window.addEventListener("offline", function() {
        $rootScope.$apply(function() {
            $rootScope.online = false;
        });
    }, false);

    $window.addEventListener("online", function() {
        $rootScope.$apply(function() {
            $rootScope.online = true;
        });
    }, false);
});


cardApp.animation('.first_load', ['$animateCss', function($animateCss) {
    return {
        enter: function(element, done) {
            //element.css('display', 'none');
            /*$(element).fadeIn(1000, function() {
              console.log('anim done');
              $(element).removeClass('first_load');
              done();
            });
            */
            element.css('top', '-150px');
            $(element).animate({ top: 0 }, 300, function() {
                // Animation complete.
                $(element).removeClass('first_load');
                console.log('anim done');

            });


            return $animateCss(element, {
                event: 'enter',
                structural: true,
                from: { top: -150 },
                to: { top: 0 }
            });

        },
        leave: function(element, done) {
            $(element).fadeOut(1000, function() {
                done();
            });
        },
        move: function(element, done) {
            element.css('display', 'none');
            $(element).slideDown(500, function() {
                done();
            });
        }
    };
}]);


/*
cardApp.animation('.first_load', ['$animateCss', function($animateCss) {
  return {
    enter: function(element,done) {
       // this will trigger `.slide.ng-enter` and `.slide.ng-enter-active`.
      return $animateCss(element, {
        event: 'enter',
        structural: true,
        addClass: 'steve'
      });
    }
  };
}]);
*/