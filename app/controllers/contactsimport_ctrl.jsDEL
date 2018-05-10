cardApp.controller("contactsimportCtrl", ['$scope', '$route', '$rootScope', '$location', '$http', '$timeout', 'Invites', 'Email', 'Users', 'Conversations', 'Profile', 'General', 'Format', 'Contacts', function($scope, $route, $rootScope, $location, $http, $timeout, Invites, Email, Users, Conversations, Profile, General, Format, Contacts) {

    $scope.pageClass = 'page-contactimport';

    $http.get("/api/user_data").then(function(result) {
        $scope.currentUser = result.data.user;
        $scope.user_contacts = $scope.currentUser.imported_contacts[0].contacts;
    });

}]);