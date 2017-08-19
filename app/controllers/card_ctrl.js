cardApp.controller("cardCtrl", ['$scope', 'Cards', 'replaceTags', '$rootScope', 'Format', '$window', 'fileUpload', function($scope, Cards, replaceTags, $rootScope, Format, $window, fileUpload) {

    $scope.getFocus = Format.getFocus;
    $scope.contentChanged = Format.contentChanged;
    $scope.checkKey = Format.checkKey;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    $scope.choosePhoto = Format.choosePhoto;
    $scope.setFilePath = Format.setFilePath;
    $scope.setFileUri = Format.setFileUri;
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

    $scope.uploadFile = function() {
        var file = this.myFile;
        console.log('file is ' + file);
        console.dir(file);
        //var uploadUrl = "/fileUpload";
        //var uploadUrl = "http://138.68.171.144/upload";
        var uploadUrl = "http://www.snipbee.com/upload";
        fileUpload.uploadFileToUrl(file, uploadUrl);
    };

    // UPLOAD ==================================================================
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
        /*
        Cards.upload(id)
            .success(function(data) {
                //$rootScope.$broadcast('search');
            });
            */
    };

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