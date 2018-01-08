cardApp.controller("conversationsCtrl", ['$scope', '$rootScope', '$location', '$http', 'Invites', 'Email', 'Users', 'Conversations', '$q', function($scope, $rootScope, $location, $http, Invites, Email, Users, Conversations, $q) {
    // array of conversations
    $scope.conversations = [];
    //
    $scope.chat_create = {
        conversation_name: '',
        participants: []
    };
    //
    var public_found = false;
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
                        if (key.conversation_type === 'public') {
                            public_found = true;
                        }
                        var user_received;
                        // get the index position of the current user within the participants array
                        var user_pos = findWithAttr(key.participants, '_id', $scope.currentUser._id);
                        // get the currently stored viewed number for the current user
                        var user_viewed = key.participants[user_pos].viewed;
                        // get the number of cards in this conversation
                        getConversationLength(key._id).then(function(result) {
                            // set the number of cards in this conversation
                            user_received = result;
                            // if the number of cards viewed is less then the number received
                            // set the new messages value 
                            if (user_viewed < user_received) {
                                key.new_messages = (user_received - user_viewed);
                            }
                        });
                        // If this is a two user conversation (not a group)
                        if (key.participants.length === 2) {
                            // Get the position of the current user
                            if (user_pos === 0) {
                                participant_pos = 1;
                            } else {
                                participant_pos = 0;
                            }
                            // Find the other user
                            findUser(key.participants[participant_pos]._id, function(result) {
                                // set their name
                                key.name = result;
                            });
                            // Add this other user to the conversations model
                            $scope.conversations.push(key);
                        } else if (key.participants.length > 0) {
                            // group conversation. Get the conversation name and add to model.
                            key.name = key.conversation_name;
                            $scope.conversations.push(key);
                        }
                    });
                    if (public_found == false) {
                        // create the initial public conversation for this user
                        createPublicConversation();
                    }
                });
        }
    });

    createPublicConversation = function() {
        // reset the participants array.
        $scope.chat_create.participants = [];
        // set the conversation type
        $scope.chat_create.conversation_type = 'public';
        // set the conversation name
        $scope.chat_create.conversation_name = 'Public';
        // set the creating user as admin
        $scope.chat_create.admin = $scope.currentUser._id;
        // Add current user as a participant
        $scope.chat_create.participants.push({ _id: $scope.currentUser._id, viewed: 0 });
        // Create conversation in DB.
        Conversations.create($scope.chat_create)
            .then(function(res) {
                res.data.name = res.data.conversation_name;
                $scope.conversations.push(res.data);
            });
    };

    // Get the number of cards in a converastion by ocnversation id
    getConversationLength = function(id) {
        return $http.get("/chat/get_conversation/" + id).then(function(result) {
            return result.data.length;
        });
    };

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

    // Continue chat
    $scope.chatPublic = function(admin, index) {
        // redirect to the chat
        // Find the username
        findUser(admin, function(result) {
            $location.path("/"+result);
        });
    };

    // TODO make service
    // find the array index of an object value
    function findWithAttr(array, attr, value) {
        for (var i = 0; i < array.length; i += 1) {
            if (array[i][attr] === value) {
                return i;
            }
        }
        return -1;
    }

    // Broadcast by socket service when a new card has been posted by another user to the current user
    $scope.$on('NOTIFICATION', function(event, msg) {
        //console.log('NOTIFICATION notify_users, conv id: ' + msg.conversation_id + ', participants: ' + msg.participants);
        // Get the index position of the updated conversation within the conversations model by conversation id
        var conversation_pos = findWithAttr($scope.conversations, '_id', msg.conversation_id);
        // Get the index position of the current user within the updated onversation participants array in the conversations model
        var user_pos = findWithAttr($scope.conversations[conversation_pos].participants, '_id', $scope.currentUser._id);
        // Get the latest viewed number for this user within the updated conversation
        var user_viewed = $scope.conversations[conversation_pos].participants[user_pos].viewed;
        // Get the number of cards in a converastion by ocnversation id
        getConversationLength(msg.conversation_id).then(function(result) {
            // if the number of cards viewed is less then the number received
            // set the new messages value 
            if (result > user_viewed) {
                $scope.conversations[conversation_pos].new_messages = result - user_viewed;
            }
        });
    });

}]);