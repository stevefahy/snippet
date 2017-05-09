cardApp.controller("cardsearchCtrl", ['$scope', 'Cards', '$rootScope', function($scope, Cards, $rootScope) {

    // update from cardcreate_ctrl createCard
    $scope.$on('search', function(event) {
        $scope.searchCard();
    });

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

}]);
