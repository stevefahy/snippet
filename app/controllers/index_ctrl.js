cardApp.controller("indexCtrl", ['$scope', 'Cards', 'replaceTags', '$rootScope', '$http', 'Format', 'Edit', '$window', '$routeParams', '$location', function($scope, Cards, replaceTags, $rootScope, $http, Format, Edit, $window, $routeParams, $location) {

    // Get the current users details
    $http.get("/api/user_data").then(function(result) {
        //console.log('result: ' + JSON.stringify(result.data));
        if (result.data.user) {
            $scope.currentUser = result.data.user.google.name;
            //loadUserData();
        }// else {
          //  $scope.currentUser = "Not logged in";
        //}
        //$scope.card_create.user = $scope.currentUser.google.name;
    });

}]);