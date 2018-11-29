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
/*
    $rootScope.$on('$routeChangeSuccess', function(event, next, prev) {
        //console.log(prev.$$route.originalPath);
        $rootScope.prev_route = prev.$$route.originalPath;
        console.log($rootScope.prev_route);
    });
    */


    $scope.changePath = function(path) {
        //console.log(path);
        //console.log($location.path());
        //console.log($rootScope.prev_route);
        
/*
        if (path == '/c/contacts' && $rootScope.prev_route == '/chat/conversations') {
            $rootScope.nav = { from: 'convs', to: 'conv' };
        } else if(path == '/c/contacts' && $rootScope.prev_route == '/'){
            console.log('conv to contct');
            $rootScope.nav = { from: 'conv', to: 'contact' };
        } else if(path == '/chat/conversations' && $rootScope.prev_route == '/'){
            console.log('conv to convs');
            $('.page-conversation').css('z-index', 0);
            //$rootScope.nav = { from: 'convs', to: 'conv' };
            $rootScope.nav = { from: 'feed', to: 'convs' };
        } else if(path == '/'){
            console.log('convs to feed');
            $('.page-conversation').css('z-index', 0);
            //$rootScope.nav = { from: 'convs', to: 'conv' };
            $rootScope.nav = { from: 'conv', to: 'feed' };
        }
$rootScope.prev_route = $location.path();
*/
        $location.path(path);

    };

    $scope.logOut = function() {
        // close socket.io connection and delete namespace
        //socket.delete();
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