cardApp.controller("socketCtrl", ['$http', 'socket', function($http, socket) {
//cardApp.controller("socketCtrl", ['$scope', 'Cards', 'replaceTags', '$rootScope', '$http', 'Format', 'Edit', '$window', '$routeParams', '$location', '$timeout', 'socket', function($scope, Cards, replaceTags, $rootScope, $http, Format, Edit, $window, $routeParams, $location, $timeout, socket) {

    // Get the current users details
    // TOD make global?
    $http.get("/api/user_data").then(function(result) {
        console.log('connect?');
        if (result.data.user) {
            // connect to socket.io via socket service 
            // and request that a unique namespace be created for this user with their user id
            socket.setId(result.data.user._id);
            socket.connect(socket.getId());
            // after login check that socket connection has been 
            console.log('connected');
        }
    });

}]);