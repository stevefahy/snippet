cardApp.controller("testCtrl", ['Profile', '$scope', '$rootScope', '$location', '$http', function(Profile, $scope, $rootScope, $location, $http) {

    console.log('testctrl');

    // Animation
    $scope.pageClass = 'page-conversation';

    $scope.changePath = function(path) {
        $location.path(path);
    };

}]);