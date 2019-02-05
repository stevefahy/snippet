cardApp.controller("debugCtrl", ['$scope', function($scope) {

    $scope.debug = true;

    $scope.pause = function() {
        console.log('pause');
        // Mobile disconnect
        disconnect_socket();
    };

    $scope.resume = function() {
        console.log('resume');
        // Mobile reconnect
        reconnect_socket();
    };

}]);