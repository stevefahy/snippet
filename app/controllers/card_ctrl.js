cardApp.controller("cardCtrl", ['$scope', 'Cards', 'replaceTags', '$rootScope', 'Format', '$window', function($scope, Cards, replaceTags, $rootScope, Format, $window) {

    $scope.getFocus = Format.getFocus;
    $scope.contentChanged = Format.contentChanged;
    $scope.checkKey = Format.checkKey;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    //$scope.choosePhoto = Format.choosePhoto;
    //$scope.setFilePath = Format.setFilePath;
    //$scope.setFileUri = Format.setFileUri;
    //$scope.androidToJS = Format.androidToJS;

    /*
    $window.androidToJS = this.androidToJS;
    androidToJS = function (arg){
         $('#test').html('androidToJS 3');
        Android.showToast('one ' + arg);
    };
    */

    /*
    this.androidToJS = function (arg){
         $('#test').html('androidToJS 4');
        Android.showToast('two: ' + arg);
    };
    */

    // update from cardcreate_ctrl createCard
    $scope.$on('cards', function(event, data) {
        $scope.cards = data;
    });

    // Function called from core.js by dynamically added input type=checkbox.
    // It rewrites the HTML to save the checkbox state.
    checkBoxChanged = function(checkbox) {
        if (checkbox.checked) {
            checkbox.setAttribute("checked", "true");
        } else {
            checkbox.removeAttribute("checked");
        }

    };
    $scope.uploadFile = function() {
        console.log('upload pressed');
        $('#upload-input').click();
        $('.progress-bar').text('0%');
        $('.progress-bar').width('0%');


        $('#upload-input').on('change', function() {

            var files = $(this).get(0).files;

            if (files.length > 0) {
                // create a FormData object which will be sent as the data payload in the
                // AJAX request
                var formData = new FormData();

                // loop through all the selected files and add them to the formData object
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];

                    // add the files to formData object for the data payload
                    formData.append('uploads[]', file, file.name);
                }
                //Cards.upload();
                $.ajax({
                    url: '/upload',
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function(data) {
                        console.log('upload successful!\n' + data);
                    },
                    xhr: function() {
                        // create an XMLHttpRequest
                        var xhr = new XMLHttpRequest();

                        // listen to the 'progress' event
                        xhr.upload.addEventListener('progress', function(evt) {

                            if (evt.lengthComputable) {
                                // calculate the percentage of upload completed
                                var percentComplete = evt.loaded / evt.total;
                                percentComplete = parseInt(percentComplete * 100);

                                // update the Bootstrap progress bar with the new percentage
                                $('.progress-bar').text(percentComplete + '%');
                                $('.progress-bar').width(percentComplete + '%');

                                // once the upload reaches 100%, set the progress bar text to done
                                if (percentComplete === 100) {
                                    $('.progress-bar').html('Done');
                                }

                            }

                        }, false);

                        return xhr;
                    }
                });

            }
        });
    };
    /*
        $scope.searchCard = function() {
            // validate the formData to make sure that something is there
            if ($scope.input !== undefined) {
                // call the create function from our service (returns a promise object)
                Cards.search($scope.input)
                    .success(function(data) {
                        // update card_ctrl $scope.cards
                        $rootScope.$broadcast('cards', data);
                    });
            }
        };
        */
    /*
        $scope.uploadFile = function() {
            var file = this.myFile;
            console.log('file is ' + file);
            console.dir(file);
            //var uploadUrl = "/fileUpload";
            //var uploadUrl = "http://138.68.171.144/tmp";
            var uploadUrl = "http://138.68.171.144/upload";
            //var uploadUrl = "/tmp";
            fileUpload.uploadFileToUrl(file, uploadUrl);
        };
        */

    // UPLOAD ==================================================================
    /*
    $scope.uploadPhoto = function(input) {
        console.log('0: ' + input);
        console.log('01: ' + $scope.input);

        if (input !== undefined) {
            console.log('1');
            // call the create function from our service (returns a promise object)
            Cards.upload(input)
                .success(function(data) {
                    console.log('success');
                    // update card_ctrl $scope.cards
                    //$rootScope.$broadcast('cards', data);
                });
        }

    };
    */
    // DELETE ==================================================================
    $scope.deleteCard = function(id) {
        Cards.delete(id)
            .success(function(data) {
                $rootScope.$broadcast('search');
            });
    };

    // UPDATE ==================================================================
    $scope.updateCard = function(id, card) {
        card.content = replaceTags.replace(card.content);
        card.content = replaceTags.removeDeleteId(card.content);
        var pms = { 'id': id, 'card': card };
        // validate the text to make sure that something is there
        // if text is empty, nothing will happen
        //if (card.title !== undefined) {
        // call the create function from our service (returns a promise object)
        Cards.update(pms)
            .success(function(data) {
                $rootScope.$broadcast('search');
            });
        // }
    };

}]);