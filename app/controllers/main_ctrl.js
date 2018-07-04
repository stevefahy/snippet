cardApp.controller("MainCtrl", ['$scope', '$window', '$rootScope', 'UserData', function($scope, $window, $rootScope, UserData) {

    $rootScope.dataLoading = false;

    // checks for updates every time the window is focused.
    // There can be a delay if sockets have dropped (network dropped).
    /*
    var ua = navigator.userAgent;
    if (ua.indexOf('AndroidApp') < 0) {
        $window.onfocus = function() {
            UserData.checkDataUpdate();
        };
    }
    */
    
}]);