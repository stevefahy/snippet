cardApp.controller("authcallbackCtrl", ['$rootScope', '$route', '$location', '$http', 'principal', 'socket', 'Profile', 'UserData', function($rootScope, $route, $location, $http, principal, socket, Profile, UserData) {
    console.log('authcallbackCtrl');
    var paramValue = $route.current.$$route.redirect;

    console.log(paramValue);

    console.log(principal.isAuthenticated);
    console.log(principal.isValid());
    console.log(principal.isAuthenticated);

    //principal.getToken().then(function(result) {
    //console.log(result);

    if (principal.isValid()) {

//console.log(UserData.checkUser());
        //UserData.loadUser().then(function(result) {
        UserData.checkUser().then(function(result) {
            console.log(result);

            //UserData.setUser(result);

            // connect to socket.io via socket service 
            // and request that a unique namespace be created for this user with their user id
            socket.setId(result._id);
            socket.connect(socket.getId());


            // Get Profile once.
            var profile = {};
            if (result.user_name == undefined) {
                profile.user_name = result.google.name;
            } else {
                profile.user_name = result.user_name;
            }
            if (result.avatar == undefined) {
                profile.avatar = 'default';
            } else {
                profile.avatar = result.avatar;
            }
            // Store the profile.
            Profile.setProfile(profile);
            console.log('PROFILE_SET');
            $rootScope.$broadcast('PROFILE_SET');


            UserData.setUser(result);



            //if (paramValue == 'normal') {
            console.log('redirect: ' + paramValue);
            $location.path(paramValue);
            //}

        });

    } else {
        $location.path('/api/login');
    }


}]);