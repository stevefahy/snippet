cardApp.controller("headerCtrl", ['Profile', 'Conversations', '$scope', '$rootScope', '$location', '$http', '$window', 'Cropp', function(Profile, Conversations, $scope, $rootScope, $location, $http, $window, Cropp) {

    displayProfile = function() {
        var user;
        // Routes where User profile should be displayed.
        if ($location.path().indexOf('/api/') < 0) {
            if ($location.path().indexOf('/chat/conversation/') < 0) {
                user = Profile.getProfile();
            } else {
                // Route where Conversation profile should be displayed.
                user = Profile.getConvProfile();
            }
            if (user != undefined) {
                $scope.avatar = user.avatar;
                $scope.conversation_name = user.user_name;
            }
        }
    };

    // If header ctrl loads after Profile
    this.$onInit = function() {
        displayProfile();
    };

    // If header ctrl loads before Profile
    $scope.$on('PROFILE_SET', function(event, data) {
        displayProfile();
    });

    // Broadcast by user_settings when the profile has been updated.
    $scope.$on('PROFILE_CHANGE', function(event, data) {
        if (!$scope.$$phase) {
            $scope.$apply(function($scope) {
                $scope.avatar = data.avatar;
                $scope.user_name = data.user_name;
            });
        }
    });
    /*
    $scope.$on('$locationChangeSuccess',function(evt, absNewUrl, absOldUrl, newState, oldState) {
       console.log('success', evt, absNewUrl, absOldUrl, newState, oldState);
       var prevUrl = absOldUrl.$$route.originalPath;
       console.log(prevUrl);
    });
    */
    /*
        $rootScope.$on('$routeChangeSuccess', function(event, next, prev) {
            console.log(prev.$$route.originalPath);
            $rootScope.prev_route = prev.$$route.originalPath;
        });
        */

    $scope.goBack = function() {
        //$rootScope.animate_pages = true;
        console.log($rootScope.prev_route);
        console.log($location.path());
        /*
          if ($rootScope.prev_route == undefined) {
              $rootScope.prev_route = '/';
              $rootScope.nav = { from: 'us', to: 'page-conversation' };
          } else if ($rootScope.prev_route == '/chat/conversations') {
              //viewAnimationsService.setEnterAnimation('page-user_setting');
              //viewAnimationsService.setLeaveAnimation('page-conversation');
          } else if ($rootScope.prev_route == '/') {
              console.log('gere');
              //viewAnimationsService.setEnterAnimation('');
              //viewAnimationsService.setLeaveAnimation('page-user_setting');
              $rootScope.nav = { from: 'us', to: 'conv' };
          }
          */
        $location.path($rootScope.prev_route);
    };

    $scope.changePath = function(path) {
        // Detect device user agent 
        var ua = navigator.userAgent;
        Cropp.destroyCrop();
        // Add custom class for Android scrollbar
       // if (ua.indexOf('AndroidApp') >= 0) {
            //Android.animationBack();
            
        //} else {
           // console.log(path);
            /*
            if (path == '/api/user_setting') {
                $rootScope.nav = { from: 'conv', to: 'us' };
            } else if (path == '/chat/conversations') {
                $rootScope.nav = { from: 'convs', to: 'conv' };
            }
*/
            
        //}
        $location.path(path);
    };

    $scope.changePathConversation = function() {
        var id = Conversations.getConversationId();
        $location.path('chat/conversation/' + id);
    };

    $scope.changePathContacts = function(path) {
        // Resets contacts
        $scope.pageAnimationStart();


        $location.path(path);
    };

}]);