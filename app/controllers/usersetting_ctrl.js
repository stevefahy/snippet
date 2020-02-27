cardApp.controller("usersettingCtrl", ['$scope', '$timeout', 'Format', 'Invites', '$rootScope', '$location', '$http', '$window', '$routeParams', 'Users', 'Profile', 'Conversations', 'General', 'principal', 'UserData', 'Keyboard', function($scope, $timeout, Format, Invites, $rootScope, $location, $http, $window, $routeParams, Users, Profile, Conversations, General, principal, UserData, Keyboard) {

    $scope.myImage = '';
    $scope.myCroppedImage = '';
    var myImageName = '';
    var mySavedImage = '';
    var saved_user_name = '';
    $window.imageUploaded = this.imageUploaded;
    $scope.prepareImage = Format.prepareImage;
    $scope.setting_change = false;

    Keyboard.keyBoardListenStart();

    // Detect device user agent 
    var ua = navigator.userAgent;

    // Get User details.
    if (principal.isValid()) {
        UserData.checkUser().then(function(result) {
            $scope.currentUser = UserData.getUser();
            $scope.currentFullUser = UserData.getUser();
            $scope.user_name = UserData.getUser().user_name;
            var loaded_user_name = UserData.getUser().user_name;
            $scope.login_name = UserData.getUser().google.name;
            $scope.login_email = UserData.getUser().google.email;
            $scope.avatar = UserData.getUser().avatar;
            if ($scope.avatar == undefined) {
                $scope.avatar = 'default';
            }
            saved_user_name = UserData.getUser().user_name;
            // Listen for the user_name changing.
            $scope.$watch('user_name', function() {
                if ($scope.user_name != saved_user_name) {
                    $scope.setting_change = true;
                } else {
                    $scope.setting_change = false;
                }
            }, true);
        });
    } else {
        $location.path("/api/login");
    }

    // Trigger the file input.
    $scope.triggerClick = function() {
        $('#fileInput').trigger('click');
    };

    // Update Public conv avatar for this user
    $scope.saveChanges = function() {
        var saved = false;
        var profile = {};
        // If the user has changed the avatar.
        if ($scope.myImage != '' && mySavedImage != $scope.myCroppedImage) {
            mySavedImage = $scope.myCroppedImage;
            saved = true;
            myImageName = 'img_' + General.getDate() + '_' + (new Date()).getTime() + '.jpg';
            General.urltoFile($scope.myCroppedImage, myImageName, 'image/jpeg')
                .then(function(file) {
                    Format.prepareImage([file], function(result) {
                        profile.avatar = 'fileuploads/images/' + result.file;
                        profile.user_name = $scope.user_name;
                        $scope.avatar = profile.avatar;
                        // Change the current header.
                        $rootScope.$broadcast('PROFILE_CHANGE', profile);
                        // Set the changes in the model.
                        $scope.currentFullUser.avatar = 'fileuploads/images/' + result.file;
                        $scope.currentFullUser.user_name = $scope.user_name;
                        // Save the updated profile avatar and text.
                        saveProfile(profile);
                    });
                });
        }
        // If the user has only updated the user name.
        if ($scope.user_name != saved_user_name && saved != true) {
            saved_user_name = $scope.user_name;
            save_changes = true;
            profile.user_name = $scope.user_name;
            profile.avatar = $scope.avatar;
            // Change the current header.
            $rootScope.$broadcast('PROFILE_CHANGE', profile);
            // Set the changes in the model.
            $scope.currentFullUser.avatar = $scope.avatar;
            $scope.currentFullUser.user_name = $scope.user_name;
            // Save the updated profile avatar and username.
            saveProfile(profile);
        }
    };

    $scope.imgcropLoaded = function() {
        $scope.image_loaded = true;
        $scope.setting_change = true;
    };

    saveProfile = function(profile) {
        var pms = { 'id': $scope.currentFullUser._id, 'user': $scope.currentFullUser };
        // Update the current user.
        var user = UserData.getUser();
        user.user_name = profile.user_name;
        user.avatar = profile.avatar;
        UserData.setUser(user);
        // Update profile (headers)
        UserData.updatePublicProfile(profile);
        // Update the Profile service.
        Profile.setProfile(profile);
        // Update User for current user and all this users conversation participants.
        updateUserData(UserData.getUser()._id, UserData.getUser());
        // Update the user in the DB & LDB.
        Users.update_user(pms)
            .then(function(data) {})
            .catch(function(error) {
                //console.log('error: ' + error);
            });
        // Find this users public conversation by id.
        // LDB
        Conversations.find_user_public_conversation_by_id($scope.currentFullUser._id)
            .then(function(result) {
                // Update the avatar for the public conversation.
                var obj = { 'id': result._id, 'avatar': profile.avatar };
                // LDB
                Conversations.updateAvatar(obj)
                    .then(function(result) {
                        var contacts_ids = [];
                        var contacts = UserData.getContacts();
                        for (var i in contacts) {
                            contacts_ids.push(contacts[i]._id);
                        }
                        UserData.updateUserContact(UserData.getUser(), UserData.getUser()._id, contacts_ids);
                    })
                    .catch(function(error) {
                        //console.log('error: ' + error);
                    });
            })
            .catch(function(error) {
                //console.log('error: ' + error);
            });
    };

    // Load image returned from Android.
    function loadImage(img, callback) {
        src = 'fileuploads/images/' + img;
        var file = src;
        var xhr = new XMLHttpRequest();
        xhr.onload = function(e) {
            callback(this.response);
        };
        xhr.open('GET', file, true);
        xhr.responseType = 'blob';
        xhr.send();
    }

    // Image returned from Android.
    imageUploaded = function(data) {
        var file = data.file;
        myImageName = data.file;
        var reader = new FileReader();
        reader.onload = function(evt) {
            $scope.$apply(function($scope) {
                $scope.myImage = evt.target.result;
            });
        };
        loadImage(file, function(result) {
            reader.readAsDataURL(result);
        });
    };

    // Android
    var handleFileClick = function(evt) {
        if (ua.indexOf('AndroidApp') >= 0) {
            Android.choosePhoto();
        }
    };

    // Web
    var handleFileSelect = function(evt) {
        var file = evt.currentTarget.files[0];
        myImageName = file.name;
        var reader = new FileReader();
        reader.onload = function(evt) {
            $scope.$apply(function($scope) {
                $scope.myImage = evt.target.result;
            });
        };
        reader.readAsDataURL(file);
    };
    // Web
    angular.element(document.querySelector('#fileInput')).on('change', handleFileSelect);
    // Android
    angular.element(document.querySelector('#fileInput')).on('click', handleFileClick);
}]);