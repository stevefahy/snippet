cardApp.controller("indexCtrl", ['$scope', 'Cards', 'replaceTags', '$rootScope', '$http', 'Format', 'Edit', '$window', '$routeParams', '$location', 'socket', function($scope, Cards, replaceTags, $rootScope, $http, Format, Edit, $window, $routeParams, $location, socket) {

    // Get the current users details
    $http.get("/api/user_data").then(function(result) {
        //console.log(result.data);
        if (result.data.user) {
            $scope.currentUser = result.data.user.google.name;
            // connect to socket.io via socket service 
            // and request that a unique namespace be created for this user with their user id
            socket.setId(result.data.user._id);
            socket.connect(result.data.user._id);
        }
    });

    $scope.ping = function() {
        console.log('ping');
        socket.emit('send_ping');
    };

    $scope.ping_display = 'wait';
    // Broadcast by socket service when a new card has been posted by another user to this user
    $scope.$on('PING', function(event, msg) {
        //// nsp.emit('return_ping', {sockets:  Object.keys(io.sockets.sockets), nsps: Object.keys(io.nsps)});
        console.log('PING sockets: ' + msg.sockets + ', nsps: ' + msg.nsps);
        $scope.ping_display = 'PING sockets: ' + msg.sockets + ', nsps: ' + msg.nsps;
    });

}]);