cardApp.controller("headerCtrl", ['Profile', '$scope', 'Cards', '$rootScope', '$location', '$http', 'socket', 'Database', function(Profile, $scope, Cards, $rootScope, $location, $http, socket, Database) {

    //var profile_set = false;

    displayProfile = function() {
        var user;
        // Also public ?
        if($location.path().indexOf('/api/') < 0){
        if ($location.path().indexOf('/chat/conversation/') < 0) {
            user = Profile.getProfile();
            console.log(user);
            $scope.avatar = user.avatar  + '?' + (new Date()).getTime();
            $scope.conversation_name = user.user_name;
        } else {
            // Conversation 
            user = Profile.getConvProfile();
            console.log(user);
            $scope.avatar = user.avatar  + '?' + (new Date()).getTime();
            $scope.conversation_name = user.user_name;
        }
    }
    };


    this.$onInit = function() {
        // If header ctrl loads after Profile
        console.log('header init');
        //console.log('profile_set: ' + profile_set);
        //console.log(Profile.getProfile());
        //if(Profile.getProfile() == undefined){
            displayProfile();
        //}
        //console.log(user);
        //console.log($location.path());

    };

    // If header ctrl loads before Profile
    $scope.$on('PROFILE_SET', function(event, data) {
        console.log('PROFILE_SET');
        var user = Profile.getProfile();
        //console.log(user);
        displayProfile();
        //$scope.avatar = user.avatar;
        //$scope.conversation_name = user.user_name;
    });



    $scope.$on('PROFILE_CHANGE', function(event, data) {
        console.log('PROFILE_CHANGE: ' + data.avatar + ' : ' + data.user_name);
        //if ($scope.avatar != data.avatar) {
           // $scope.avatar = data.avatar;
        //}
        //if ($scope.conversation_name != data.user_name) {
          //  $scope.conversation_name = data.user_name;
        //}
        //$scope.avatar = '';
        if (!$scope.$$phase) {
            $scope.$apply(function($scope) {
                //$scope.myImage = evt.target.result;
                $scope.avatar = data.avatar + '?' + (new Date()).getTime();
                $scope.user_name = data.user_name;
            });
        }
        
    });

    $http.get("/api/user_data").then(function(result) {
        /*
                if (result.data.user) {
                    if (result.data.user.user_name == undefined) {
                        $scope.currentUserName = result.data.user.google.name;
                    } else {
                        $scope.currentUserName = result.data.user.user_name;
                    }
                    $scope.avatar = result.data.user.avatar;
                    if ($scope.avatar == undefined) {
                        $scope.avatar = 'default';
                    }
                } else {
                    $scope.avatar = "default";
                }

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
        */
    });

    $scope.changePath = function(path) {
        console.log('change: ' + path);
        $location.path(path);
    };



}]);