cardApp.controller("headerCtrl", ['$scope', 'Cards', '$rootScope', '$location', '$http', 'socket', 'Database', function($scope, Cards, $rootScope, $location, $http, socket, Database) {

    this.$onInit = function() {

    };

    $scope.$on('PROFILE_CHANGE', function(event, data) {
        console.log('avatar: ' + data.avatar + ' : ' + data.user_name);
        if ($scope.avatar != data.avatar) {
            $scope.avatar = data.avatar;
        }
        if ($scope.conversation_name != data.user_name) {
            $scope.conversation_name = data.user_name;
        }
        /*
        if (!$scope.$$phase) {
            $scope.$apply(function($scope) {
                //$scope.myImage = evt.target.result;
                $scope.avatar = data.avatar;
                $scope.user_name = data.user_name;
            });
        }
        */
    });

    $http.get("/api/user_data").then(function(result) {

        if (result.data.user) {
            console.log(result.data);

            if (result.data.user.user_name == undefined) {
                $scope.currentUserName = result.data.user.google.name;
            } else {
                $scope.currentUserName = result.data.user.user_name;
            }
            $scope.avatar = result.data.user.avatar;
            if ($scope.avatar == undefined) {
                $scope.avatar = 'default';
            }
        } else {
            $scope.avatar = "default";
        }

    });

    $scope.changePath = function(path) {
        console.log('change: ' + path);
        $location.path(path);
    };



}]);