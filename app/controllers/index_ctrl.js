cardApp.controller("indexCtrl", ['$scope', 'Cards', 'replaceTags', '$rootScope', '$http', 'Format', 'Edit', '$window', '$routeParams', '$location', function($scope, Cards, replaceTags, $rootScope, $http, Format, Edit, $window, $routeParams, $location) {

    // Get the current users details
    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            $scope.currentUser = result.data.user.google.name;
        }
    });

}]);