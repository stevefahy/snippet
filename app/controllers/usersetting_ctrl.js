cardApp.controller("usersettingCtrl", ['$scope', '$timeout', 'Format', 'Invites', '$rootScope', '$location', '$http', '$window', '$routeParams', function($scope, $timeout, Format, Invites, $rootScope, $location, $http, $window, $routeParams) {


    var ua = navigator.userAgent;

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

    $scope.imgcropLoaded = function() {
        console.log('img loaed');
        //$('.imgcrop').css('height', '200px');
        //$('.imgcrop').addClass("transition_3");
        //$('.imgcrop').css('height', '200px');
        //$('.imgcrop').css('height', '100px');

        /*
         $( "#book" ).animate({
    opacity: 0.25,
    left: "+=50",
    height: "toggle"
  }, 5000, function() {
    // Animation complete.
  });
  */

        // $('.imgcrop').animate({height: 0}, "1");
        // $('.imgcrop').animate({height: 200}, "1000");


        $timeout(function() {


            $('.user_details').animate({
                opacity: 0
            }, 100, function() {
                // Animation complete.
                $('.user_details').animate({
                    opacity: 1,
                    left: 0
                }, 0, function() {
                    // Animation complete.
                    $('.user_details').animate({
                        //opacity: 1,
                    }, 1000, function() {
                        // Animation complete.
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








        //$('.imgcrop').animate({height: 200}, "1000");

    };

    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            //console.log(result.data.user);
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
                    //console.log(result);
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
            $('.crop_container').css('height', '200px');
            $('.crop_container').css('left', '0px');


        };

        loadImage(file, function(result) {
            reader.readAsDataURL(result);
        });

    };

    var handleFileClick = function(evt) {
        if (ua === 'AndroidApp') {
            Android.choosePhoto();
        }
    };

    var handleFileSelect = function(evt) {



        $('.original').hide();
        $('.preview').css('left', '0px');

        $('.user_details').css('left', '-1000px');

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