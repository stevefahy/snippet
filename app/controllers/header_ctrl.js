cardApp.controller("headerCtrl", ['$scope', 'Cards', '$rootScope', '$location', '$http', 'socket', 'Database', function($scope, Cards, $rootScope, $location, $http, socket, Database) {

    this.$onInit = function() {

    };

    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            console.log(result.data);
            $scope.currentUserName = result.data.user.google.name;
            //if (result.data.user.avatar != 'default') {
            $scope.avatar = result.data.user.avatar;
            if ($scope.avatar == undefined) {
                $scope.avatar = 'default';
            }
        } else {
            //$scope.avatar = "/assets/images/default_photo.jpg";
            $scope.avatar = "default";
        }
    });

    $scope.changePath = function(path) {
        console.log('change: ' + path);
        $location.path(path);
    };



}]);