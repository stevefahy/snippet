cardApp.controller("headerCtrl", ['Profile', '$scope', '$rootScope', '$location', '$http', function(Profile, $scope, $rootScope, $location, $http) {

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

    $scope.changePath = function(path) {
        $location.path(path);
    };

}]);