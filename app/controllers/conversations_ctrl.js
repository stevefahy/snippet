cardApp.controller("conversationsCtrl", ['$scope', '$rootScope', '$location', '$http', 'Invites', 'Email', 'Users', 'Conversations', '$q', 'FormatHTML', 'General', 'Profile', '$cookies', '$timeout', 'principal', 'UserData', 'viewAnimationsService', function($scope, $rootScope, $location, $http, Invites, Email, Users, Conversations, $q, FormatHTML, General, Profile, $cookies, $timeout, principal, UserData, viewAnimationsService) {

    // Animation
    if ($rootScope.nav) {
        $('#page-system').removeClass("page-conversation-static");
        $('#page-system').removeClass("page-contacts");
        $('#page-system').addClass("page-conversation");
        viewAnimationsService.setEnterAnimation('page-conversations');
        viewAnimationsService.setLeaveAnimation('page-conversation');
    }

    $rootScope.nav = { from: 'convs', to: 'conv' };
    // variable to turn on animation of view chage. Loading conversation directly should not animate.
    $rootScope.animate_pages = true;
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
                //$rootScope.nav = { from: 'convs', to: 'conv' };
                $location.path("/" + result.google.name);
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
                $scope.conversations = UserData.getConversationsBuild();
            } else {
                $location.path("/api/login");
            }
        });
    } else {
        $location.path("/api/login");
    }

}]);