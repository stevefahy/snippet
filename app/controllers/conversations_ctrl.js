cardApp.controller("conversationsCtrl", ['$scope', '$rootScope', '$location', '$http', 'Invites', 'Email', 'Users', 'Conversations', function($scope, $rootScope, $location, $http, Invites, Email, Users, Conversations) {
    // array of conversations
    $scope.conversations = [];
    // TODO - Better way to get user details across controllers. service? middleware? app.use?
    // Get the current users details
    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            $scope.currentUser = result.data.user;
            // Find the conversations for current user
            Conversations.find_user_conversations($scope.currentUser._id)
                .then(function(res) {
                    var conversations_raw = res.data;
                    conversations_raw.map(function(key, array) {
                        // If this is a two user conversation (not a group)
                        if (key.participants.length === 2) {
                            // Get the position of the current user
                            var user_pos = key.participants.indexOf($scope.currentUser._id);
                            if (user_pos === 0) {
                                participant_pos = 1;
                            } else {
                                participant_pos = 0;
                            }
                            // Find the other user
                            findUser(key.participants[participant_pos], function(result) {
                                // set their name
                                key.name = result;
                            });
                            // Add ths user to the conversations model
                            $scope.conversations.push(key);
                        } else if (key.participants.length > 2) {
                            // group conversation. Get the conversation name and add to model.
                            key.name = key.conversation_name;
                            $scope.conversations.push(key);
                        }
                    });
                });
        }
    });
    // Find User
    findUser = function(id, callback) {
        var user_found;
        Users.search_id(id)
            .success(function(res) {
                user_found = res.success.google.name;
                callback(user_found);
            })
            .error(function(error) {
                //
            });
    };
    // Continue chat
    $scope.chat = function(conversation, index) {
        // redirect to the chat
        $location.path("/chat/conversation/" + conversation);
    };

}]);