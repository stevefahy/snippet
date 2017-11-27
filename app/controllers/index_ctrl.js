cardApp.controller("indexCtrl", ['$scope', 'Cards', 'replaceTags', '$rootScope', '$http', 'Format', 'Edit', '$window', '$routeParams', '$location', '$timeout', 'socket', function($scope, Cards, replaceTags, $rootScope, $http, Format, Edit, $window, $routeParams, $location, $timeout, socket) {

    // Get the current users details
    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            $scope.currentUser = result.data.user.google.name;
            // connect to socket.io via socket service 
            // and request that a unique namespace be created for this user with their user id
            socket.setId(result.data.user._id);
            socket.connect(socket.getId());
        }
    });

}]);