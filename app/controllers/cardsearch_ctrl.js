cardApp.controller("cardsearchCtrl", ['$scope', 'Cards', '$rootScope', '$location', function($scope, Cards, $rootScope, $location) {

    $scope.showDiv =  false;

    $scope.search_icon = function(){
        console.log('search icon');

        $scope.showDiv =  !$scope.showDiv;
        $("#search_input").attr("visibility", "visible");
        $("#search_button").attr("visibility", "visible");
    };
/*
    $scope.createCard = function(){
        console.log('create card');
        //<a href="#!red">
       Cards.create_card();
    };
    */

    // update from cardcreate_ctrl createCard
    $scope.$on('search', function(event) {
        $scope.searchCard();
    });

    $scope.searchCard = function() {
        $location.path('/');
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
