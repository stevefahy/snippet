cardApp.controller("cardCtrl", ['$scope', 'Cards', 'replaceTags', '$rootScope', 'Format', '$window', function($scope, Cards, replaceTags, $rootScope, Format, $window) {

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

    $window.androidToJS = this.androidToJS;

    androidToJS = function (arg){
        Android.showToast('one ' + arg);
    };

    this.androidToJS = function (arg){
        Android.showToast('two: ' + arg);
    };

    // update from cardcreate_ctrl createCard
    $scope.$on('cards', function(event, data) {
        $scope.cards = data;
    });

    // Function called from core.js by dynamically added input type=checkbox.
    // It rewrites the HTML to save the checkbox state.
    checkBoxChanged = function(checkbox){
        if(checkbox.checked){
            checkbox.setAttribute("checked", "true");
        } else {
            checkbox.removeAttribute("checked");
        }

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
