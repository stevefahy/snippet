cardApp.controller("profileCtrl", ['$http', '$rootScope', 'Profile', function($http, $rootScope, Profile) {
    // Get the current users details
    console.log('profilectrl');
    
    $http.get("/api/user_data").then(function(result) {
        console.log('GET RESULT');
        console.log(result.data.user);
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

/*
            $rootScope.$watch('profile', function() {
                console.log('profile changed');
            }, true);
            */

        }
    });

}]);