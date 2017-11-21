cardApp.controller("indexCtrl", ['$scope', 'Cards', 'replaceTags', '$rootScope', '$http', 'Format', 'Edit', '$window', '$routeParams', '$location', 'socket', function($scope, Cards, replaceTags, $rootScope, $http, Format, Edit, $window, $routeParams, $location, socket) {

     // Get the current users details
    $http.get("/api/user_data").then(function(result) {
        //console.log(result.data);
        if (result.data.user) {
            $scope.currentUser = result.data.user.google.name;
            // connect to socket.io via socket service 
            // and request that a unique namespace be created for this user with their user id
            socket.connect(result.data.user._id);
        }
    });

}]);