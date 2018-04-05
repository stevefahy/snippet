cardApp.controller("usersettingCtrl", ['$scope', '$timeout', 'Format', 'Invites', '$rootScope', '$location', '$http', '$window', '$routeParams', 'Users', 'Profile', 'Conversations', function($scope, $timeout, Format, Invites, $rootScope, $location, $http, $window, $routeParams, Users, Profile, Conversations) {


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
        console.log(focused);
        console.log(focused.id);

        $('#' + focused.id).addClass("scroll_latest");
        console.log(focused);
        /*
        if (focused.id != 'cecard_create') {
            $('.create_container').hide();
        }*/
        $('.footer').hide();
        /*
        $('#placeholderDiv').css('bottom', '-1px');
        */
        // Paste div that will be scrolled into view if necessary and the deleted.
        //$scope.pasteHtmlAtCaret("<span class='scroll_latest_footer' id='scroll_latest_footer'></span>");
        // Scroll into view if necessary
        Format.scrollLatest('scroll_latest');
    };

    showFooter = function() {
        $('.footer').show();
        /*
        $('.create_container').show();
        $('#placeholderDiv').css('bottom', '59px');
        */
    };





    $scope.myImage = '';
    $scope.myImageName = '';
    $scope.myCroppedImage = '';

    var mySavedImage = '';
    var saved_user_name = '';

    $window.androidToJS = this.androidToJS;
    $scope.prepareImage = Format.prepareImage;

    $scope.setting_change = true;

    $scope.crop_container_visible = false;



    //$('.imgcrop').css('display', 'none'); 

    $('.imgcrop').animate({
        opacity: 0
    }, 100, function() {
        // Animation complete.
    });

    resetAnimation = function() {
        $('.user_details').animate({
            //left:0,
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

    $scope.imgcropLoaded = function() {
        console.log('img loaed');



        console.log($('.crop_container').height());

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








        //$('.imgcrop').animate({height: 200}, "1000");

    };

    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            //console.log(result.data.user);
            $scope.currentFullUser = result.data.user;
            $scope.currentUser = result.data.user.google.name;
            // If user name set
            if (result.data.user.user_name != undefined) {
                $scope.user_name = result.data.user.user_name;
            } else {
                $scope.user_name = result.data.user.google.name;
            }
            $scope.login_name = result.data.user.google.name;
            $scope.login_email = result.data.user.google.email;
            $scope.avatar = result.data.user.avatar  + '?' + (new Date()).getTime();
            if ($scope.avatar == undefined) {
                $scope.avatar = 'default';
            }
            // Hide the preview avatar
            $('.preview').css('left', '-1000px');
            // $('.cropArea').hide();
            //$('.crop_container').css('height', '0px');
            //  $('.crop_container').css('left', '-1000px');
            //console.log('here');
            saved_user_name = $scope.user_name;


        }
    });

    // TOD) - only save changes if change made.
    // Update Public conv avatar for this user
    $scope.saveChanges = function() {
        var saved = false;
        console.log('saved: ' + saved);
        var profile = {};
        //profile.avatar = $scope.avatar;
        //profile.user_name = $scope.user_name;
        //console.log('$scope.myCroppedImage: ' + $scope.myCroppedImage);
        //console.log('$scope.myImage: ' + $scope.myImage);
        //console.log('mySavedImage: ' + mySavedImage);
        if ($scope.myImage != '' && mySavedImage != $scope.myCroppedImage) {
            mySavedImage = $scope.myCroppedImage;
            saved = true;
            console.log('save new image');
            urltoFile($scope.myCroppedImage, $scope.myImageName, 'image/jpeg')
                .then(function(file) {
                    console.log('file');
                    console.log(file);
                    Format.prepareImage([file], function(result) {
                        console.log(result);
                        console.log('name?');
                        console.log(result.file);
                        //$scope.avatar = result.file;
                        //changeAvatar();
                        //var av = 'fileuploads/images/' + result.file;
                        profile.avatar = 'fileuploads/images/' + result.file;
                        profile.user_name = $scope.user_name;
                        $scope.avatar = profile.avatar;
                        $rootScope.$broadcast('PROFILE_CHANGE', profile);
                        $scope.currentFullUser.avatar = 'fileuploads/images/' + result.file;
                        $scope.currentFullUser.user_name = $scope.user_name;
                        //console.log($scope.currentFullUser);
                        saveProfile(profile);

                    });
                });
        }

        if ($scope.user_name != saved_user_name && saved != true) {
            saved_user_name = $scope.user_name;
            save_changes = true;
            console.log('new name: ' + $scope.user_name);
            profile.user_name = $scope.user_name;
            profile.avatar = $scope.avatar;
            $rootScope.$broadcast('PROFILE_CHANGE', profile);
            $scope.currentFullUser.avatar = $scope.avatar + '?' + (new Date()).getTime();
            $scope.currentFullUser.user_name = $scope.user_name;
            saveProfile(profile);
        }

        //if(save_changes == true){
        //   $rootScope.$broadcast('PROFILE_CHANGE', profile);
        //}
    };

    saveProfile = function(profile) {
        var pms = { 'id': $scope.currentFullUser._id, 'user': $scope.currentFullUser };
        // call the create function from our service (returns a promise object)
        Users.update_user(pms)
            .then(function(data) {
                console.log(data);
                Profile.setProfile(profile);
                //$rootScope.$broadcast('search');
            })
            .catch(function(error) {
                console.log('error: ' + error);
            });

        Conversations.find_user_public_conversation_by_id($scope.currentFullUser._id)
            .then(function(result) {
                console.log(result.data);
                //var avatar_obj = {};
                //avatar_obj.avatar = profile.avatar;
                var obj = { 'id': result.data._id, 'avatar': profile.avatar };
                Conversations.updateAvatar(obj)
                    .then(function(result) {
                        console.log(result);
                    })
                    .catch(function(error) {
                        console.log('error: ' + error);
                    });
            })
            .catch(function(error) {
                console.log('error: ' + error);
            });


        // Conversations.removeViewed(conversation_id, currentUser, card_id)
        //updateAvatar: function(conv_id, avatar) {

    };



    /*
    if($scope.myCroppedImage != ''){
    urltoFile($scope.myCroppedImage, $scope.myImageName, 'image/jpeg')
        .then(function(file) {
            Format.prepareImage([file], function(result) {
                console.log(result);
                //$scope.avatar = result.file;
                //changeAvatar();
                var av = 'fileuploads/images/' + result.file;
                var profile = {};
                profile.avatar = av;
                profile.user_name = $scope.user_name;

                $rootScope.$broadcast('PROFILE_CHANGE', profile);

                //user.contacts = current_contacts;
                $scope.currentFullUser.avatar = av;
                $scope.currentFullUser.user_name = $scope.user_name;
                console.log($scope.currentFullUser);


                var pms = { 'id': $scope.currentFullUser._id, 'user': $scope.currentFullUser };
                // call the create function from our service (returns a promise object)
                Users.update_user(pms)
                    .then(function(data) {
                        console.log(data);
                        //$rootScope.$broadcast('search');
                    })
                    .catch(function(error) {
                        console.log('error: ' + error);
                    });

            });
        });
    }
    */


    $scope.triggerClick = function() {
        console.log('click');
        //angular.element(document.querySelector('#fileInput')).on('click'
        $('#fileInput').trigger('click');

    };

    function urltoFile(url, filename, mimeType) {
        console.log('urltoFile');
        console.log(url + ' : ' + filename + ' : ' + mimeType);
        return (fetch(url)
            .then(function(res) { 
                console.log(res);
                return res.arrayBuffer(); 
            })
            .then(function(buf) { 
                console.log(buf);
                //return new File([buf], filename, { type: mimeType }); 

                
                var blob = new Blob([buf],{type : mimeType});
                blob.name = filename;
                return blob;
                
            })
        );
    }

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

    androidToJS = function(data) {
        var file = data.file;
        $scope.myImageName = data.file;
        var reader = new FileReader();
        reader.onload = function(evt) {
            $scope.$apply(function($scope) {
                $scope.myImage = evt.target.result;
            });
            $('.original').hide();
            $('.preview').css('left', '0px');
            //$('.cropArea').css('position', 'relative');
            //$('.cropArea').css('left', '-100px');
            //$('.cropArea').show();
            $scope.crop_container_visible = true;
            $('.user_details').css('top', '-15px');
            //$('.crop_container').css('height', '200px');
            //$('.crop_container').css('left', '0px');


        };

        loadImage(file, function(result) {
            reader.readAsDataURL(result);
        });

    };

    var handleFileClick = function(evt) {
        if (ua === 'AndroidApp') {
            Android.choosePhoto();
            console.log($('.crop_container').height());
            if ($('.crop_container').height() == 0) {
                $('.user_details').css('left', '-1000px');
                $('.crop_container').css('height', '0px');
            }
            //resetAnimation();
        }
    };

    var handleFileSelect = function(evt) {

        //resetAnimation();
        if ($('.crop_container').height() == 0) {
            $('.original').hide();
            $('.preview').css('left', '0px');

            $('.user_details').css('left', '-1000px');
        }

        var file = evt.currentTarget.files[0];
        $scope.myImageName = file.name;
        var reader = new FileReader();
        reader.onload = function(evt) {
            $scope.$apply(function($scope) {
                $scope.myImage = evt.target.result;
                console.log('loaded');
                $scope.crop_container_visible = true;
                $('.user_details').css('top', '-20px');
            });


            //$('.crop_container').css('height', '200px');
            // $('.crop_container').css('left', '0px');
        };
        reader.readAsDataURL(file);
    };

    angular.element(document.querySelector('#fileInput')).on('change', handleFileSelect);
    angular.element(document.querySelector('#fileInput')).on('click', handleFileClick);

}]);