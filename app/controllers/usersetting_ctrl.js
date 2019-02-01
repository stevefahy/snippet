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
    // TODO - still needed?
    if (ua.indexOf('AndroidApp') >= 0) {
        $('.content_cnv').addClass('content_cnv_android');
    }

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
        // TODO - check these - $scope.currentFullUser etc..
        var pms = { 'id': $scope.currentFullUser._id, 'user': $scope.currentFullUser };

        // TODO - need to update all private conversations also.
        // TODO - Boadcast change.
        // TODO - on recieve one function to update all conversations and localDB
        // public conversation.

        // This can be done in user setting and in group info for Users Public conv. 
        // Change group info link for users public conv to link to user setting - NO
        // Want this user to be able to add multiple editors to their public conv
        // They would keep their own user details (nsme, avatar) for their posts
        // but the public conv would have its own group info (name and avatar).
        // Update avatar only conversation_avatar ?

        // Update existing User in DB, user, public conversation avatar (user who is updating)
        // Update profile (headers)
        // Emit change to all this users conversation participants -
        // ** Main **
        // For current user and all this users conversation participants - 
        // Update localDB and UserData
        // Update UserData -  contacts, conversations (including public), conversationsLatestCard, conversationsUsers


        //setUser (current),
        var user = UserData.getUser();
        user.user_name = profile.user_name;
        user.avatar = profile.avatar;
        UserData.setUser(user);


        // Update profile (headers)
        UserData.updatePublicProfile(profile);
        // Update the Profile service.
        Profile.setProfile(profile);



        // ** Main **
        // For current user and all this users conversation participants - 
        // Update localDB and UserData
        // Update UserData - setUser (current), contacts, conversations (including public), conversationsLatestCard, conversationsUsers
        //updateUserData(UserData.getUser()._id, profile);
        updateUserData(UserData.getUser()._id, UserData.getUser());

        // EMIT HERE!
        //UserData.updateUsers(res.data, user._id, user.contacts);
        //getContacts
        //getUser().contacts
        console.log(UserData.getContacts());
        var contacts_ids = [];
        var contacts = UserData.getContacts();
        for(var i in contacts){
            console.log(contacts[i]._id);
             contacts_ids.push(contacts[i]._id);
        }
        UserData.updateUserContact(UserData.getUser(), UserData.getUser()._id, contacts_ids);



        // Update existing User in DB, user, public conversation avatar (user who is updating)
        // Update this users details.
        // DONT LDB
        Users.update_user(pms)
            .then(function(data) {
                // Update the Profile service.
                //Profile.setProfile(profile);
            })
            .catch(function(error) {
                console.log('error: ' + error);
            });
        // Update existing User in DB, user, public conversation avatar (user who is updating)
        // Find this users public conversation by id.
        // DONT LDB - user may have updated?
        Conversations.find_user_public_conversation_by_id($scope.currentFullUser._id)
            .then(function(result) {
                // Update the avatar for the public conversation.
                var obj = { 'id': result._id, 'avatar': profile.avatar };
                Conversations.updateAvatar(obj)
                    .then(function(result) {
                        // Update UserData.
                        // TODO - check

                    })
                    .catch(function(error) {
                        console.log('error: ' + error);
                    });
            })
            .catch(function(error) {
                console.log('error: ' + error);
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