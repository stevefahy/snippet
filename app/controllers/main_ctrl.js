cardApp.controller("MainCtrl", ['$scope', '$window', '$rootScope', 'UserData', 'socket', 'principal', function($scope, $window, $rootScope, UserData, socket, principal) {

    //$rootScope.dataLoading = false;

    // Broadcast by socket after it has reconnected. Check for updates.
    $scope.$on('SOCKET_RECONNECT', function(event) {
        console.log('SOCKET_RECONNECT');
        UserData.checkDataUpdate();
    });

}]);