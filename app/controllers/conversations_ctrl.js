cardApp.controller("conversationsCtrl", ['$scope', '$rootScope', '$location', '$http', 'Invites', 'Email', 'Users', 'Conversations', '$q', 'FormatHTML', 'General', 'Profile', function($scope, $rootScope, $location, $http, Invites, Email, Users, Conversations, $q, FormatHTML, General, Profile) {

    this.$onInit = function() {
        sent_content_length = 20;
        // array of conversations
        $scope.conversations = [];
    };

    // Broadcast by socket service when a  card has been created, updated or deleted by another user to this user
    $scope.$on('NOTIFICATION', function(event, msg) {
        // Find the conversations for current user
        Conversations.find_user_conversations($scope.currentUser._id)
            .then(function(res) {
                // Get the index position of the updated conversation within the conversations model by conversation id
                var conversation_pos = General.findWithAttr(res.data, '_id', msg.conversation_id);
                // Get the index position of the current user within the updated conversation participants array in the conversations model
                var user_pos = General.findWithAttr(res.data[conversation_pos].participants, '_id', $scope.currentUser._id);
                // Get the unviewed cards for this user in this conversation.
                var user_unviewed = res.data[conversation_pos].participants[user_pos].unviewed;
                // Get the index position of the updated conversation within the  CURRENT conversations model by conversation id
                var local_conversation_pos = General.findWithAttr($scope.conversations, '_id', msg.conversation_id);
                // If the conversation does not exist within the local model then add it.
                if (local_conversation_pos < 0) {
                    // Get the latest card posted to this conversation
                    Conversations.getConversationLatestCard(res.data[conversation_pos]._id)
                        .then(function(result) {
                            if (result.data != null) {
                                formatLatestCard(result.data, res.data[conversation_pos], function(response) {
                                    // Add this conversation to the conversations model
                                    $scope.conversations.push(response);
                                });
                            } else {
                                key.latest_card = ' ';
                            }
                        });
                } else {
                    // update the local model
                    $scope.conversations[local_conversation_pos].participants[user_pos].unviewed = user_unviewed;
                    // Set the new_messages number.
                    $scope.conversations[local_conversation_pos].new_messages = user_unviewed.length;
                    // Get the latest card posted to this conversation
                    Conversations.getConversationLatestCard(msg.conversation_id)
                        .then(function(res) {
                            // If a card exists in the conversation
                            if (res.data != null) {
                                // Format the latest card
                                formatLatestCard(res.data, $scope.conversations[local_conversation_pos], function(result) {
                                    //console.log(result);
                                });
                            } else {
                                // Remove the conversation from the local model.
                                $scope.conversations[local_conversation_pos].latest_card = ' ';
                            }
                        });
                }
            });
    });

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
        General.findUser(admin, function(result) {
            $location.path("/" + result.google.name);
        });
    };

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
            General.findUser(data.user, function(result) {
                // get the index position of the current user within the participants array
                var user_pos = General.findWithAttr(key.participants, '_id', $scope.currentUser._id);
                // get the currently stored unviewed cards for the current user
                var user_unviewed = key.participants[user_pos].unviewed;
                // Set the new_messages number.
                key.new_messages = user_unviewed.length;
                // Set the card content.
                card_content = data.content;
                // set the name of the user who sent the card
                sender_name = result.user_name;
                // Public conversation
                if (key.conversation_type == 'public') {
                    // Get the conversation name and add to model.
                    key.name = key.conversation_name;
                    key.avatar = key.conversation_avatar;
                    notification_body = card_content;
                }
                /*
                // Group conversation. 
                if (key.participants.length > 2) {
                    // Get the conversation name and add to model.
                    key.name = key.conversation_name;
                    key.avatar = key.conversation_avatar;
                    notification_body = sender_name + ': ' + card_content;
                }
                // Two user conversation (not a group)
                if (key.participants.length == 2) {
                    // Get the position of the current user
                    if (user_pos === 0) {
                        participant_pos = 1;
                    } else {
                        participant_pos = 0;
                    }
                    // Find the other user
                    General.findUser(key.participants[participant_pos]._id, function(result) {
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
                */


                // Group conversation. (Two or more)
                console.log(key.conversation_name);
                if (key.conversation_name != '') {
                    console.log('Group conversation. (Two or more)');
                    // Get the conversation name and add to model.
                    key.name = key.conversation_name;
                    key.avatar = key.conversation_avatar;
                    notification_body = sender_name + ': ' + card_content;
                }
                // Two user conversation (not a group)
                if (key.conversation_name == '') {
                    console.log('Two user conversation (not a group)');
                    // Get the position of the current user
                    if (user_pos === 0) {
                        participant_pos = 1;
                    } else {
                        participant_pos = 0;
                    }
                    // Find the other user
                    General.findUser(key.participants[participant_pos]._id, function(result) {
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

    // TODO - Better way to get user details across controllers. service? middleware? app.use?
    // Get the current users details
    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            $scope.currentUser = result.data.user;
            var profile = {};
            profile.avatar = 'default';
            profile.user_name = result.data.user.user_name;
            if (result.data.user.avatar != undefined) {
                profile.avatar = result.data.user.avatar;
            }
            // Find the conversations for current user
            Conversations.find_user_conversations($scope.currentUser._id)
                .then(function(res) {
                    var conversations_raw = res.data;
                    conversations_raw.map(function(key, array) {
                        // Get the latest card posted to this conversation
                        Conversations.getConversationLatestCard(key._id)
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
        }
    });

}]);