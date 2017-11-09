cardApp.controller("joinCtrl", ['$scope', 'Cards', 'Invites', '$rootScope', '$location', '$http', '$window', '$routeParams', function($scope, Cards, Invites, $rootScope, $location, $http, $window, $routeParams) {

    var code = $routeParams.code;

    if (code !== undefined) {
        Invites.search_id(code)
            .success(function(data) {
                $scope.invites = data;
            });
    }

}]);