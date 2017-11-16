cardApp.controller("conversationCtrl", ['$scope', '$rootScope', '$location', '$http', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'Users', '$routeParams', '$timeout', function($scope, $rootScope, $location, $http, Cards, replaceTags, Format, Edit, Conversations, Users, $routeParams, $timeout) {

    // Use the url / id to load the conversation
    var id = $routeParams.id;
    // Set the conversation id so that it can be retrieved by cardcreate_ctrl
    Conversations.setConversationId(id);
    // Get the conversation by id
    $http.get("/chat/get_conversation/" + id).then(function(result) {
        $scope.cards = result.data;
        // Get the user name for the user id
        // TODO dont repeat if user id already retreived
        $scope.cards.map(function(key, array) {
            Users.search_id(key.user)
                .success(function(res) {
                    if (res.error === 'null') {
                        // user cannot be found
                    }
                    if (res.success) {
                        // Set the user_name to the retrieved name
                        key.user_name = res.success.google.name;
                    }
                })
                .error(function(error) {});
        });
        // Scroll to the bootom of the list
        $timeout(function() {
            scrollToBottom(1);
        }, 200);

    });

    // Scroll to the bottom of the list
    scrollToBottom = function(speed) {
        $('html, body').animate({
            scrollTop: $('#bottom').offset().top
        }, speed, function() {});
    };

    // Broadcast by cardcreate_ctrl when a new card has been created
    $scope.$on('CONV_UPDATED', function(event, data) {
        // Get the user name for the user id
        // TODO dont repeat if user id already retreived
        Users.search_id(data.user)
            .success(function(res) {
                if (res.error === 'null') {
                    // user cannot be found
                }
                if (res.success) {
                    // Set the user_name to the retrieved name
                    data.user_name = res.success.google.name;
                }
            })
            .error(function(error) {});
        // Update the cards model
        $scope.cards.push(data);
        // scroll if necessary
        $timeout(function() {
            scrollToBottom(1000);
        }, 200);
    });

}]);