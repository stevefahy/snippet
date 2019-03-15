cardApp.controller("debugCtrl", ['$scope', '$rootScope', function($scope, $rootScope) {

    $scope.debug = false;
    $rootScope.debug = false;

    $scope.changeDebug = function() {
        $scope.debug = !$scope.debug;
        $rootScope.debug = !$rootScope.debug;
    };

    $scope.pause = function() {
        // Mobile disconnect
        disconnect_socket();
    };

    $scope.resume = function() {
        // Mobile reconnect
        reconnect_socket();
    };

}]);