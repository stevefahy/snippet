cardApp.controller("footerCtrl", ['$scope', 'Cards', '$rootScope', '$location', '$http', 'socket', 'Database', 'principal', function($scope, Cards, $rootScope, $location, $http, socket, Database, principal) {

    this.$onInit = function() {
        $scope.showDiv = false;
    };

    $scope.search_icon = function() {
        $scope.showDiv = !$scope.showDiv;
        $("#search_input").attr("visibility", "visible");
        $("#search_button").attr("visibility", "visible");
    };

    // update from cardcreate_ctrl createCard
    $scope.$on('search', function(event) {
        $scope.searchCard();
    });

    $scope.changePath = function(path) {
        $location.path(path);
    };

    $scope.logOut = function() {
        // close socket.io connection and delete namespace
        socket.delete();
        // Cancle authentication and remove token cookie.
        principal.logOut();
        $scope.changePath('/api/logout');
    };

    $scope.logIn = function() {
        $scope.changePath('/api/logout');
    };

    $scope.searchCard = function(input) {
        // validate the formData to make sure that something is there
        if ($scope.input !== undefined) {
            // call the create function from our service (returns a promise object)
            Cards.search($scope.input)
                .then(function(res) {
                    // update card_ctrl $scope.cards
                    $rootScope.$broadcast('cards', res.data);
                })
                .catch(function(error) {
                    console.log('error: ' + error);
                });
        }
    };

}]);