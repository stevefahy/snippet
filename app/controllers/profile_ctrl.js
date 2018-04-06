cardApp.controller("profileCtrl", ['$http', '$rootScope', 'Profile', function($http, $rootScope, Profile) {
    // Get the current users details
    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            // Get Profile once.
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
            // Store the profile.
            Profile.setProfile(profile);
            $rootScope.$broadcast('PROFILE_SET');
        }
    });

}]);