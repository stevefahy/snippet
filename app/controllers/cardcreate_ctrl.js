cardApp.controller("cardcreateCtrl", ['$scope', '$rootScope', 'Cards', 'replaceTags', 'Format', function($scope, $rootScope, Cards, replaceTags, Format) {

    $scope.getFocus = Format.getFocus;
    $scope.contentChanged = Format.contentChanged;
    $scope.checkKey = Format.checkKey;
    $scope.handlePaste = Format.handlePaste;

    $scope.card_create = {
        title: '',
        content: '',
        user: 'steve.fahy',
        lang: 'en'
    };
    // CREATE ==================================================================
    $scope.createCard = function() {
        $scope.card_create.content = replaceTags.replace($scope.card_create.content);
        // validate the formData to make sure that something is there
        if ($scope.card_create.title !== undefined) {
            Cards.create($scope.card_create)
                .success(function(data) {
                    // $rootScope.$broadcast('search');
                });
        }
    };

}]);