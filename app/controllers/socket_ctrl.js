cardApp.controller("socketCtrl", ['$http', 'socket', function($http, socket) {
    // Get the current users details
    // TODO make global?
    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            // connect to socket.io via socket service 
            // and request that a unique namespace be created for this user with their user id
            socket.setId(result.data.user._id);
            socket.connect(socket.getId());
            // after login check that socket connection has been 
        }
    });

}]);