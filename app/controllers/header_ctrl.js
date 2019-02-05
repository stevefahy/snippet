cardApp.controller("headerCtrl", ['Profile', 'Conversations', '$scope', '$rootScope', '$location', '$http', '$window', 'Cropp', function(Profile, Conversations, $scope, $rootScope, $location, $http, $window, Cropp) {

    $scope.no_back = false;

    // Directly load public route. Disbale back button.

    if ($location.path().indexOf('/chat/') < 0 && $rootScope.prev_route == undefined && !$scope.isMember) {
        $scope.no_back = true;
    }

    displayProfile = function() {
        var user;
        // Routes where User profile should be displayed.
        if ($location.path().indexOf('/api/') < 0) {
            if ($location.path().indexOf('/chat/conversation/') < 0) {
                user = Profile.getProfile();
                if (user == undefined) {
                    // Public usernae route
                    user = Profile.getConvProfile();
                }
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

    $scope.goBack = function() {
        if ($location.path() == '/c/contacts') {
            // Resets contacts
            $scope.pageAnimationStart();
        }
        if ($rootScope.prev_route == '/chat/conversation/:id') {
            $location.path('/chat/conversations');
        } else if ($rootScope.prev_route != undefined && $rootScope.prev_route.indexOf('api') < 0) {
            $location.path($rootScope.prev_route);
        } else {
            $location.path('/chat/conversations');
        }
    };

    $scope.changePath = function(path) {
        Cropp.destroyCrop();
        $location.path(path);
    };

    $scope.changePathConversation = function() {
        var id = Conversations.getConversationId();
        $location.path('chat/conversation/' + id);
    };

    $scope.changePathContacts = function(path) {
        $location.path(path);
    };

}]);