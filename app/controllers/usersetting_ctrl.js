cardApp.controller("usersettingCtrl", ['$scope', '$timeout', 'Format', 'Invites', '$rootScope', '$location', '$http', '$window', '$routeParams', 'Users', 'Profile', 'Conversations', function($scope, $timeout, Format, Invites, $rootScope, $location, $http, $window, $routeParams, Users, Profile, Conversations) {

    $scope.myImage = '';
    $scope.myCroppedImage = '';
    var myImageName = '';
    var mySavedImage = '';
    var saved_user_name = '';
    $window.androidToJS = this.androidToJS;
    $scope.prepareImage = Format.prepareImage;
    $scope.setting_change = true;

    $('.imgcrop').animate({
        opacity: 0
    }, 100, function() {
        // Animation complete.
    });

    // TODO  - MAke this a service?
    // Detect device user agent 
    var ua = navigator.userAgent;
    // Detect soft keyboard on Android
    var is_landscape = false;
    var initial_height = window.innerHeight;
    var initial_width = window.innerWidth;
    var portrait_height;
    var landscape_height;

    // If the initial height is less than the screen height (status bar etc..)
    // then adjust the initial width to take into account this difference
    if (initial_height < screen.height) {
        initial_width = initial_width - (screen.height - initial_height);
    }
    if (initial_height > initial_width) {
        //portrait
        portrait_height = initial_height;
        landscape_height = initial_width;
    } else {
        // landscape
        landscape_height = initial_height;
        portrait_height = initial_width;
    }

    // Add custom class for Android scrollbar
    if (ua == 'AndroidApp') {
        $('.content_cnv').addClass('content_cnv_android');
    }

    // Android only
    if (ua == 'AndroidApp') {
        window.addEventListener("resize", function() {
            is_landscape = (screen.height < screen.width);
            if (is_landscape) {
                if (window.innerHeight < landscape_height) {
                    hideFooter();
                } else {
                    showFooter();
                }
            } else {
                if (window.innerHeight < portrait_height) {
                    hideFooter();
                } else {
                    showFooter();
                }
            }
        }, false);
    }

    hideFooter = function() {
        var focused = document.activeElement;
        $('#' + focused.id).addClass("scroll_latest");
        $('.footer').hide();
        // Scroll into view if necessary
        Format.scrollLatest('scroll_latest');
    };

    showFooter = function() {
        $('.footer').show();
    };

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

    /*
    resetAnimation = function() {
        $('.user_details').animate({
            opacity: 0,
            left: -1000
        }, 100, function() {
            // Animation complete.
        });

        $('.crop_container').animate({
            height: 0,
        }, 100, function() {
            // Animation complete.
        });

        $('.imgcrop').animate({
            opacity: 0,
            height: 0
        }, 1000, function() {
            // Animation complete.
        });
    };
    */

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
            myImageName = 'img_' + getDate() + '_' + (new Date()).getTime() + '.jpg';
            urltoFile($scope.myCroppedImage, myImageName, 'image/jpeg')
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

    // TODO - make service
    getDate = function() {
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth() + 1;
        var yyyy = today.getFullYear();
        if (dd < 10) {
            dd = '0' + dd;
        }
        if (mm < 10) {
            mm = '0' + mm;
        }
        var date = yyyy + mm + dd;
        return date;
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

    // Transform the cropped image to a blob.
    function urltoFile(url, filename, mimeType) {
        return (fetch(url)
            .then(function(res) {
                return res.arrayBuffer();
            })
            .then(function(buf) {
                var blob = new Blob([buf], { type: mimeType });
                blob.name = filename;
                return blob;
            })
        );
    }

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
        if (ua === 'AndroidApp') {
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