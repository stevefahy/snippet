cardApp.controller("indexCtrl", ['$scope', 'Cards', 'replaceTags', '$rootScope', '$http', 'Format', 'Edit', '$window', '$routeParams', '$location', '$timeout', 'socket', function($scope, Cards, replaceTags, $rootScope, $http, Format, Edit, $window, $routeParams, $location, $timeout, socket) {

    var ua = navigator.userAgent;

    // Get the current users details
    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            $scope.currentUser = result.data.user.google.name;
            // connect to socket.io via socket service 
            // and request that a unique namespace be created for this user with their user id
            socket.setId(result.data.user._id);
            socket.connect(socket.getId());

            // Request the unique FCM token from the Android app
            if (ua === 'AndroidApp') {
                console.log('sendDetails');
                //var token = Android.sendDetails(result.data.user._id);
                //console.log('token: ' + token);
                // TODO create device group
                // check if device group exists
                // if not create it
                // check if this token is part of the device group (store in mongo)

                //if(data.id != undefined && data.refreshedToken != undefined){
                // get notifcation data and check if this needs to be updated or added
                // cant get it until the user is logged in
                //Users.get_notification();
                //}
                //console.log('Format.refreshedToken: ' + Format.refreshedToken);

            }
        }
    });

}]);