cardApp.controller("conversationsCtrl", ['$scope', '$rootScope', '$location', '$http', 'Invites', 'Email', 'Users', 'Conversations', '$q', 'FormatHTML', 'General', 'Profile', '$cookies', '$timeout', 'principal', 'UserData', function($scope, $rootScope, $location, $http, Invites, Email, Users, Conversations, $q, FormatHTML, General, Profile, $cookies, $timeout, principal, UserData) {

    // Detect device user agent 
    var ua = navigator.userAgent;
    // array of conversations
    $scope.conversations = [];

    // Broadcast by socket service when a  card has been created, updated or deleted by another user to this user
    $scope.$on('NOTIFICATION', function(event, msg) {
        var id = Conversations.getConversationId();
        // Update the conversations.
        $scope.conversations = UserData.getConversationModel();
    });

    // Continue chat
    $scope.chat = function(conversation_id, conversation, index) {
        // Set profile change for the conversation.
        var profile_obj = {};
        profile_obj.user_name = conversation.name;
        profile_obj.avatar = conversation.avatar;
        Profile.setConvProfile(profile_obj);
        // redirect to the chat
        if (ua.indexOf('AndroidApp') >= 0) {
            //Android.showConversation(conversation_id);
            $location.path("/chat/conversation/" + conversation_id);
        } else {
            // redirect to the chat
            $location.path("/chat/conversation/" + conversation_id);
        }
    };

    // Continue public conversation
    $scope.chatPublic = function(admin, conversation, index) {
        // Set profile change for the conversation.
        var profile_obj = {};
        profile_obj.user_name = conversation.name;
        profile_obj.avatar = conversation.avatar;
        Profile.setConvProfile(profile_obj);
        // Find the username then redirect to the conversation.
        //UserData.getConversationsUser(admin[0])
        //   .then(function(result) {
        //       $location.path("/" + result.google.name);
        //   });
        var user = UserData.getUser(admin[0]);
        console.log(user);
        $location.path("/" + user.google.name);

    };

    loadConversations = function() {
        var sent_content_length = 200;
        var sender_name;
        var card_content;
        //Conversations.find().then(function(result) {
        UserData.getConversations().then(function(result) {
            console.log(result);
            result.map(function(key, array) {
                console.log(key);

                UserData.getConversationLatestCardById(key._id).then(function(result) {
                    console.log(result);
                    
                    if (result.data == null) {
                        result.data = key;
                        //result.data.
                        //notification_body = "EMPTY";

                        sender_name = "NONE";
                        //card_content = "EMPTY";
                        result.data.content = "EMPTY2";
                    }
                    key.updatedAt = result.data.updatedAt;
                    //key.latest_card = result.data.content;
                    card_content = result.data.content;




                    // get the index position of the current user within the participants array
                    var user_pos = General.findWithAttr(key.participants, '_id', UserData.getUser()._id);
                    if (user_pos >= 0) {
                        // get the currently stored unviewed cards for the current user
                        var user_unviewed = key.participants[user_pos].unviewed;
                        // Set the new_messages number.
                        key.new_messages = user_unviewed.length;
                    }
                    // Set the card content.
                    //card_content = data.content;
                    // set the name of the user who sent the card
                    if (result != 'null') {
                        var sn = UserData.getContact(result.data.user);
                        console.log(sn);
                        if(sn != "Unknown"){
                            sender_name = sn.user_name;
                        }
                        
                        //.then(function(result) {
                        //    console.log(result);
                        //   sender_name = result.user_name;
                        //});
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

                        // get the index position of the current user within the participants array
                        //var user_pos = General.findWithAttr(key.participants, '_id', UserData.getUser()._id);
                        console.log(user_pos);
                        if (user_pos >= 0) {
                            // get the currently stored unviewed cards for the current user
                            var user_unviewed = key.participants[user_pos].unviewed;
                            // Set the new_messages number.
                            key.new_messages = user_unviewed.length;
                        }

                        // Get the position of the current user
                        if (user_pos === 0) {
                            participant_pos = 1;
                        } else {
                            participant_pos = 0;
                        }
                        console.log(key.participants[participant_pos]);
                        // Find the other user
                        var res = UserData.getContact(key.participants[participant_pos]._id);
                        //.then(function(result) {
                        console.log(res);
                        var avatar = "default";
                        // set the other user name as the name of the conversation.
                        if (res) {
                            key.name = res.user_name;
                            avatar = res.avatar;
                        }
                        key.avatar = avatar;
                        // });
                        notification_body = card_content;
                        /*
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
                            */
                        //notification_body = card_content;

                    }
                    sent_content = FormatHTML.prepSentContent(notification_body, sent_content_length);
                    key.latest_card = sent_content;

                });
            });

            $scope.conversations = result;
            //conversations = result.data;
        });
    };

    // Check logged in.
    if (principal.isValid()) {
        // Check whether the users data has loaded.
        UserData.checkUser().then(function(result) {
            if (result != undefined) {
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
                // get the local conversations
                //$scope.conversations = UserData.getConversationsBuild();
                loadConversations();
                //
            } else {
                $location.path("/api/login");
            }
        });
    } else {
        $location.path("/api/login");
    }

}]);