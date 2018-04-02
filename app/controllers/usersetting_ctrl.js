cardApp.controller("usersettingCtrl", ['$scope', '$timeout', 'Format', 'Invites', '$rootScope', '$location', '$http', '$window', '$routeParams', 'Users', function($scope, $timeout, Format, Invites, $rootScope, $location, $http, $window, $routeParams, Users) {


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

$('#'+focused.id).addClass("scroll_latest");
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
            $scope.avatar = result.data.user.avatar;
            if ($scope.avatar == undefined) {
                $scope.avatar = 'default';
            }
            // Hide the preview avatar
            $('.preview').css('left', '-1000px');
            // $('.cropArea').hide();
            //$('.crop_container').css('height', '0px');
            //  $('.crop_container').css('left', '-1000px');
            console.log('here');


        }
    });

    $scope.saveChanges = function() {
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

                    // Save the new contact to the to the inviter array of contacts
                    /*var updateuser = new User($scope.currentFullUser);
                    updateuser.save(function(err, user) {
                        if (err) {
                            res.send(err);
                        } else {}
                    });*/

                    /*
                               Users.search_id(key.user)
                                            .then(function(res) {
                                                */
                    /*
                                        var newUser = new User();
                                        newUser._id = new mongoose.Types.ObjectId();
                                        //newUser.contacts = ''; Empty
                                        newUser.first_login = true;
                                        newUser.user_name = profile.displayName;
                                        if (!profile._json.image.isDefault) {
                                            newUser.avatar = (profile.photos[0].value || '');
                                        } else {
                                            newUser.avatar = 'default';
                                        }
                                        newUser.google.id = profile.id;
                                        newUser.google.token = token;
                                        newUser.google.name = profile.displayName;
                                        newUser.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                                        newUser.save(function(err) {
                                            if (err) {
                                                return done(err);
                                            }
                                            return done(null, newUser);
                                        });
                                        */


                });
            });
    };

    $scope.triggerClick = function() {
        console.log('click');
        //angular.element(document.querySelector('#fileInput')).on('click'
        $('#fileInput').trigger('click');

    };

    function urltoFile(url, filename, mimeType) {
        return (fetch(url)
            .then(function(res) { return res.arrayBuffer(); })
            .then(function(buf) { return new File([buf], filename, { type: mimeType }); })
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