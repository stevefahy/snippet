cardApp.controller("cardcreateCtrl", ['$scope', '$rootScope', '$location', '$http', 'Cards', 'replaceTags', 'Format', 'Edit', function($scope, $rootScope, $location, $http, Cards, replaceTags, Format, Edit) {

    $scope.getFocus = Format.getFocus;
    $scope.contentChanged = Format.contentChanged;
    $scope.checkKey = Format.checkKey;
    $scope.handlePaste = Format.handlePaste;

    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    $scope.uploadFile = Format.uploadFile;

    $scope.myFunction = Edit.myFunction;

    $scope.card_create = {
        _id: 'card_create',
        //title: '',
        content: '',
        user: '',
        //lang: 'en'
    };

    // Get the current users details
    $http.get("/api/user_data").then(function(result) {
        //console.log('result: ' + JSON.stringify(result.data));
        $scope.currentUser = result.data.user;
        $scope.card_create.user = $scope.currentUser.google.name;
    });

    // CREATE ==================================================================
    $scope.createCard = function(id, card_create) {
        $scope.card_create.content = replaceTags.replace($scope.card_create.content);
        $scope.card_create.content = Format.setMediaSize(id, card_create);
        Cards.create($scope.card_create)
            .then(function(response) {
                // redirect to root to display created card by id
                $location.path("/s/" + response.data._id);
            });
    };

}]);