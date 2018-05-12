cardApp.controller("usersettingCtrl", ['$scope', '$timeout', 'Format', 'Invites', '$rootScope', '$location', '$http', '$window', '$routeParams', 'Users', 'Profile', 'Conversations', 'General', function($scope, $timeout, Format, Invites, $rootScope, $location, $http, $window, $routeParams, Users, Profile, Conversations, General) {

    $scope.myImage = '';
    $scope.myCroppedImage = '';
    var myImageName = '';
    var mySavedImage = '';
    var saved_user_name = '';
    $window.androidToJS = this.androidToJS;
    $scope.prepareImage = Format.prepareImage;
    $scope.setting_change = true;

    General.keyBoardListenStart();

    $('.imgcrop').animate({
        opacity: 0
    }, 100, function() {
        // Animation complete.
    });

    // Detect device user agent 
    var ua = navigator.userAgent;

    if (ua.indexOf('AndroidApp') >= 0) {
        $('.content_cnv').addClass('content_cnv_android');
    }

    // TODO - make service?
    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            $scope.currentFullUser = result.data.user;
            $scope.user_name = result.data.user.user_name;
            $scope.login_name = result.data.user.google.name;
            $scope.login_email = result.data.user.google.email;
            $scope.avatar = result.data.user.avatar;
            if ($scope.avatar == undefined) {
                $scope.avatar = 'default';
            }
            // Hide the preview avatar
            $('.preview').css('left', '-1000px');
            saved_user_name = $scope.user_name;
        }
    });

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
        if ($('.crop_container').height() == 0) {
            $('.crop_container').css('height', '200px');
            $('.crop_container').css('left', '0px');
            $timeout(function() {
                $('.user_details').animate({
                    opacity: 0
                }, 100, function() {
                    // Animation complete.
                    $('.user_details').animate({
                        opacity: 0,
                        //left: 0
                    }, 0, function() {
                        // Animation complete.
                        $('.user_details').animate({
                            opacity: 0,
                            left: 0
                        }, 1000, function() {
                            // Animation complete.
                            $('.user_details').animate({
                                //left:0,
                                opacity: 1
                            }, 1000, function() {
                                // Animation complete.
                            });
                        });
                    });
                });
                $('.crop_container').animate({
                    height: 0
                }, 100, function() {
                    // Animation complete.
                    $('.crop_container').animate({
                        height: 0
                    }, 0, function() {
                        // Animation complete.
                        $('.crop_container').animate({
                            height: 200,
                        }, 1000, function() {
                            // Animation complete.
                        });
                    });
                });
                $('.imgcrop').animate({
                    opacity: 0,
                }, 100, function() {
                    // Animation complete.
                    $('.imgcrop').animate({
                        opacity: 1,
                        height: 0
                    }, 1, function() {
                        // Animation complete.
                        $('.imgcrop').animate({
                            height: 200
                        }, 1000, function() {
                            // Animation complete.
                        });
                    });
                });
            }, 100);
        }
    };

    saveProfile = function(profile) {
        var pms = { 'id': $scope.currentFullUser._id, 'user': $scope.currentFullUser };
        // Update this users details.
        Users.update_user(pms)
            .then(function(data) {
                // Update the Profile service.
                Profile.setProfile(profile);
            })
            .catch(function(error) {
                console.log('error: ' + error);
            });
        // Find this users public conversation by id.
        Conversations.find_user_public_conversation_by_id($scope.currentFullUser._id)
            .then(function(result) {
                // Update the avatar for the public conversation.
                var obj = { 'id': result.data._id, 'avatar': profile.avatar };
                Conversations.updateAvatar(obj)
                    .then(function(result) {
                        //console.log(result);
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
    androidToJS = function(data) {
        var file = data.file;
        myImageName = data.file;
        var reader = new FileReader();
        reader.onload = function(evt) {
            $scope.$apply(function($scope) {
                $scope.myImage = evt.target.result;
            });
            $('.original').hide();
            $('.preview').css('left', '0px');
            $('.user_details').css('top', '-15px');
        };
        loadImage(file, function(result) {
            reader.readAsDataURL(result);
        });
    };

    // Android
    var handleFileClick = function(evt) {
        if (ua.indexOf('AndroidApp') >= 0) {
            Android.choosePhoto();
            if ($('.crop_container').height() == 0) {
                $('.user_details').css('left', '-1000px');
                $('.crop_container').css('height', '0px');
            }
        }
    };

    // Web
    var handleFileSelect = function(evt) {
        if ($('.crop_container').height() == 0) {
            $('.original').hide();
            $('.preview').css('left', '0px');
            $('.user_details').css('left', '-1000px');
        }
        var file = evt.currentTarget.files[0];
        myImageName = file.name;
        var reader = new FileReader();
        reader.onload = function(evt) {
            $scope.$apply(function($scope) {
                $scope.myImage = evt.target.result;
                $('.user_details').css('top', '-20px');
            });
        };
        reader.readAsDataURL(file);
    };
    // Web
    angular.element(document.querySelector('#fileInput')).on('change', handleFileSelect);
    // Android
    angular.element(document.querySelector('#fileInput')).on('click', handleFileClick);
}]);