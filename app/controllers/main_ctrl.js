cardApp.controller("MainCtrl", ['$scope', '$window', '$rootScope', '$timeout', 'UserData', 'socket', 'principal', function($scope, $window, $rootScope, $timeout, UserData, socket, principal) {

    var ua = navigator.userAgent;

    //$rootScope.is_mobile = false;

    if (ua.indexOf('AndroidApp') >= 0) {
        //$rootScope.is_mobile = true;
    }

    // Broadcast by socket after it has reconnected. Check for updates.
    $scope.$on('SOCKET_RECONNECT', function(event) {
        console.log('SOCKET_RECONNECT');
        UserData.checkDataUpdate();
    });


    // Broadcast by socket service when data needs to be updated.
    $scope.$on('UPDATE_DATA', function(event, msg) {
        UserData.updateContact(msg.update_values)
            .then(function(result) {
                console.log(result);
            });
        UserData.updateConversationsUser(msg.update_values)
            .then(function(result) {
                console.log(result);
            });
    });

}]);