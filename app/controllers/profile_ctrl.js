cardApp.controller("profileCtrl", ['$http', '$rootScope', 'Profile', function($http, $rootScope, Profile) {
    //cardApp.controller("socketCtrl", ['$scope', 'Cards', 'replaceTags', '$rootScope', '$http', 'Format', 'Edit', '$window', '$routeParams', '$location', '$timeout', 'socket', function($scope, Cards, replaceTags, $rootScope, $http, Format, Edit, $window, $routeParams, $location, $timeout, socket) {

    // Get the current users details
    // TOD make global?
    $http.get("/api/user_data").then(function(result) {
        console.log('Get Profile Once');
        if (result.data.user) {
            console.log('profile recieved');
            //console.log(result.data.user);
            var profile = {};
            if (result.data.user.user_name == undefined) {
                profile.user_name = result.data.user.google.name;
            } else {
                profile.user_name = result.data.user.user_name;
            }
            if (result.data.user.avatar == undefined) {
                profile.avatar = 'default';
            } else {
                profile.avatar = result.data.user.avatar;
            }
            Profile.setProfile(profile);
            $rootScope.$broadcast('PROFILE_SET');
        }
    });

}]);