cardApp.controller("cardCtrl", ['$scope', 'Cards', 'replaceTags', '$rootScope', 'Format', function($scope, Cards, replaceTags, $rootScope, Format) {

    $scope.getFocus = Format.getFocus;
    $scope.contentChanged = Format.contentChanged;
    $scope.checkKey = Format.checkKey;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;

    // update from cardcreate_ctrl createCard
    $scope.$on('cards', function(event, data) {
        $scope.cards = data;
    });


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
        if (card.title !== undefined) {
            // call the create function from our service (returns a promise object)
            Cards.update(pms)
                .success(function(data) {
                    $rootScope.$broadcast('search');
                });
        }
    };

}]);
