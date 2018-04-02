cardApp.controller("headerCtrl", ['$scope', 'Cards', '$rootScope', '$location', '$http', 'socket', 'Database', function($scope, Cards, $rootScope, $location, $http, socket, Database) {

    this.$onInit = function() {

    };

    $scope.$on('PROFILE_CHANGE', function(event, data) {
        console.log('avatar: ' + data);

        $scope.$apply(function($scope) {
            //$scope.myImage = evt.target.result;
            $scope.avatar = data.avatar;
            $scope.user_name = data.user_name;
        });
    });

    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
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