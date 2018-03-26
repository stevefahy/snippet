cardApp.controller("headerCtrl", ['$scope', 'Cards', '$rootScope', '$location', '$http', 'socket', 'Database', function($scope, Cards, $rootScope, $location, $http, socket, Database) {

    this.$onInit = function() {
        
    };

    $scope.changePath = function(path) {
        console.log('change: ' + path);
        $location.path(path);
    };

 

}]);