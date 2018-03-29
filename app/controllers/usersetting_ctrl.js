cardApp.controller("usersettingCtrl", ['$scope', 'Format', 'Invites', '$rootScope', '$location', '$http', '$window', '$routeParams', function($scope, Format, Invites, $rootScope, $location, $http, $window, $routeParams) {

    //$('.preview').hide();
        this.$onInit = function() {
 
    };

      $scope.$on('$viewContentLoaded', function(){
    //Here your view content is fully loaded !!

  });
    

    $scope.prepareImage = Format.prepareImage;

    $http.get("/api/user_data").then(function(result) {

        if (result.data.user) {
            console.log(result.data.user);
            $scope.currentUser = result.data.user.google.name;
            $scope.user_name = result.data.user.user_name;
            //if(result.data.user.avatar != 'default'){
            $scope.avatar = result.data.user.avatar;
            console.log($scope.avatar);
            if($scope.avatar == undefined){
                $scope.avatar = 'default';
            }

            //$('.preview').hide();
             $('.preview').css('left', '-1000px');
            // $('.preview').css('background-color', 'grey');
            //} else {
            //    $scope.avatar = "/assets/images/default_photo.jpg";
            //} 
        }
    });


    $scope.myImage = '';
    $scope.myImageName = '';
    $scope.myCroppedImage = '';

    //$scope.

    var handleFileSelect = function(evt) {
        //$('.preview').css('visibilty', 'visible');
        //$('.preview').removeAttr( "style" );
        $('.original').hide();
         $('.preview').css('left', '0px');
        var file = evt.currentTarget.files[0];
        console.log(file.name);
        $scope.myImageName = file.name;
        var reader = new FileReader();
        reader.onload = function(evt) {
            $scope.$apply(function($scope) {
                $scope.myImage = evt.target.result;
            });
        };
        reader.readAsDataURL(file);
    };
    angular.element(document.querySelector('#fileInput')).on('change', handleFileSelect);


    $scope.saveFile = function() {
        console.log('save');

        //console.log(document.getElementById('fileInput').value);
        //Format.prepareAvatar($scope.myImage);

        //return a promise that resolves with a File instance
        function urltoFile(url, filename, mimeType) {
            return (fetch(url)
                .then(function(res) { return res.arrayBuffer(); })
                .then(function(buf) { return new File([buf], filename, { type: mimeType }); })
            );
        }

        //Usage example:
        urltoFile($scope.myCroppedImage, $scope.myImageName, 'image/jpeg')
            .then(function(file) {
                console.log(file);
                Format.prepareImage([file], function(result) {
                    console.log(result);
                });
                //function(result) {
                //.then(function(res) {
                //return res.arrayBuffer(); 
                // console.log(res);
                //});
            });
    };
    /*
                $('#upload-input').on('change', function() {
                    var files = $(this).get(0).files;
                    if (files.length > 0) {
                        prepareImage(files);
                    }
                    // reset the input value to null so that files of the same name can be uploaded.
                    this.value = null;
                });
                */

}]);