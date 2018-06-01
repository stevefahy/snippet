cardApp.controller("conversationsCtrl", ['$scope', '$rootScope', '$location', '$http', 'Invites', 'Email', 'Users', 'Conversations', '$q', 'FormatHTML', 'General', 'Profile', '$cookies', 'principal', 'UserData', function($scope, $rootScope, $location, $http, Invites, Email, Users, Conversations, $q, FormatHTML, General, Profile, $cookies, principal, UserData) {

    $scope.pageClass = 'page-conversations';

    this.$onInit = function() {

    };

    sent_content_length = 20;
    // array of conversations
    $scope.conversations = [];

    // MOVE?

    // RE Broadcast by core.js of NOTIFICATION by socket service when a  card has been created, updated or deleted by another user to this user
    $scope.$on('NOTIFICATION_CONVS', function(event, type, msg) {

        var user_id = UserData.getUser()._id;

        if (type == 'update') {
            // Get the index position of the updated conversation within the conversations model by conversation id
            var conversation_pos = General.findWithAttr($scope.conversations, '_id', msg.conversationId);
            // Get the index position of the current user within the updated conversation participants array in the conversations model
            var user_pos = General.findWithAttr($scope.conversations[conversation_pos].participants, '_id', user_id);
            if (msg.latestCard != null) {
                // update the local model
                $scope.conversations[conversation_pos].participants[user_pos].unviewed = msg.user_unviewed;
                // Set the new_messages number.
                $scope.conversations[conversation_pos].new_messages = msg.user_unviewed.length;
                // Format the latest card
                formatLatestCard(msg.latestCard, $scope.conversations[conversation_pos], function(result) {
                    //
                });
            } else {
                // Remove the conversation from the local model.
                $scope.conversations[conversation_pos].latest_card = ' ';
            }
        }

        if (type == 'add') {
            if (msg.latestCard != null) {
                formatLatestCard(msg.latestCard, msg.latestConversation, function(response) {
                    // Add this conversation to the conversations model
                    $scope.conversations.push(response);
                });
            }
        }
    });

    formatLatestCard = function(data, key, callback) {
        if (data != null) {
            var card_content;
            var sent_content;
            var sender_name;
            var notification_body;
            var participant_pos;
            // Update the updatedAt
            key.updatedAt = data.updatedAt;
            // Get the name of the user which sent the card.
            UserData.getConversationsUser(data.user)
                .then(function(result) {
                    // get the index position of the current user within the participants array
                    var user_pos = General.findWithAttr(key.participants, '_id', $scope.currentUser._id);
                    if (user_pos >= 0) {
                        // get the currently stored unviewed cards for the current user
                        var user_unviewed = key.participants[user_pos].unviewed;
                        // Set the new_messages number.
                        key.new_messages = user_unviewed.length;
                    }
                    // Set the card content.
                    card_content = data.content;
                    // set the name of the user who sent the card
                    if (result != 'null') {
                        sender_name = result.user_name;
                    } else {
                        sender_name = 'null';
                    }
                    // Public conversation
                    if (key.conversation_type == 'public') {
                        // Get the conversation name and add to model.
                        key.name = key.conversation_name;
                        key.avatar = key.conversation_avatar;
                        notification_body = card_content;
                    }
                    // Group conversation. (Two or more)
                    if (key.conversation_name != '') {
                        // Get the conversation name and add to model.
                        key.name = key.conversation_name;
                        key.avatar = key.conversation_avatar;
                        notification_body = sender_name + ': ' + card_content;
                    }
                    // Two user conversation (not a group)
                    if (key.conversation_name == '') {
                        // Get the position of the current user
                        if (user_pos === 0) {
                            participant_pos = 1;
                        } else {
                            participant_pos = 0;
                        }
                        // Find the other user
                        UserData.getConversationsUser(key.participants[participant_pos]._id)
                            .then(function(result) {
                                var avatar = "default";
                                // set the other user name as the name of the conversation.
                                if (result) {
                                    key.name = result.user_name;
                                    avatar = result.avatar;
                                }
                                key.avatar = avatar;
                            });
                        notification_body = card_content;
                    }
                    sent_content = FormatHTML.prepSentContent(notification_body, sent_content_length);
                    key.latest_card = sent_content;
                    callback(key);
                });
        } else {
            // Empty conversation. Only empty public converations are listed.
            // Public conversation
            if (key.conversation_type == 'public') {
                // Get the conversation name and add to model.
                key.name = key.conversation_name;
                // Get the conversation avatar and add to model.
                key.avatar = key.conversation_avatar;
            }
            callback(key);
        }
    };

    // KEEP

    // Continue chat
    $scope.chat = function(conversation_id, conversation, index) {
        // Set profile change for the conversation.
        var profile_obj = {};
        profile_obj.user_name = conversation.name;
        profile_obj.avatar = conversation.avatar;
        Profile.setConvProfile(profile_obj);
        // redirect to the chat
        $location.path("/chat/conversation/" + conversation_id);
    };

    // Continue public conversation
    $scope.chatPublic = function(admin, conversation, index) {
        // Set profile change for the conversation.
        var profile_obj = {};
        profile_obj.user_name = conversation.name;
        profile_obj.avatar = conversation.avatar;
        Profile.setConvProfile(profile_obj);
        // Find the username then redirect to the conversation.
        UserData.getConversationsUser(admin[0])
            .then(function(result) {
                console.log(result);
                $location.path("/" + result.google.name);
            });
    };

    // Check logged in.
    if (principal.isValid()) {
        // Check whether the users data has loaded.
        UserData.checkUser().then(function(result) {
            $scope.currentUser = UserData.getUser();
            var profile = {};
            profile.avatar = 'default';
            profile.user_name = UserData.getUser().user_name;
            if (UserData.getUser().avatar != undefined) {
                profile.avatar = UserData.getUser().avatar;
            }
            // Store the profile.
            Profile.setProfile(profile);
            $rootScope.$broadcast('PROFILE_SET');
            // Find the conversations for current user
            UserData.getConversations()
                .then(function(res) {
                    var conversations_raw = res;
                    conversations_raw.map(function(key, array) {
                        // Get the latest card posted to this conversation
                        UserData.getConversationLatestCardById(key._id)
                            .then(function(res) {
                                if (res.data != null) {
                                    formatLatestCard(res.data, key, function(result) {
                                        // Add this conversation to the conversations model
                                        $scope.conversations.push(result);
                                    });
                                } else {
                                    // Only empty publc conversations are displayed.
                                    key.latest_card = ' ';
                                    if (key.conversation_type === 'public') {
                                        formatLatestCard(res.data, key, function(result) {
                                            // Add this conversation to the conversations model
                                            $scope.conversations.push(result);
                                        });
                                    }
                                }
                            });
                    });
                });
        });
    } else {
        $location.path("/api/login");
    }

}]);