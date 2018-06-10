cardApp.controller("conversationsCtrl", ['$scope', '$rootScope', '$location', '$http', 'Invites', 'Email', 'Users', 'Conversations', '$q', 'FormatHTML', 'General', 'Profile', '$cookies', 'principal', 'UserData', function($scope, $rootScope, $location, $http, Invites, Email, Users, Conversations, $q, FormatHTML, General, Profile, $cookies, principal, UserData) {

    $scope.pageClass = 'page-conversations';
    //$rootScope.cvn_enter = true;

$rootScope.animate_pages = true;
 //$scope.cvn_enter = true;
    // array of conversations
    $scope.conversations = [];

$scope.pageAnimationEnd = function(){
    console.log('pageAnimationEnd cnvs');
     //$scope.cvn_enter = false;
};

$scope.$on('$routeChangeStart', function($event, next, current) { 
   // ... you could trigger something here ...
   console.log('CHANGE');
   //$animate.enabled(true);
   // $rootScope.cvn_enter = true;
 });

/*
    $(".page").bind('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', function(event) {
        //$scope.image_drawer_opened = !$scope.image_drawer_opened;
        console.log(event);
        console.log('CONVS ANIM FIN');

       // $timeout(function() {
        $scope.cvn_enter = false;
    //},1000);


    });
    */

bindings = function(){
 console.log("The DOM is now loaded and can be manipulated.");


};


//$scope.$apply(function(){
                          // document.addEventListener('load', bindings);
                           //console.log('NOW');
                       //});

                         $scope.load = function() {
    console.log("Window is loaded");
    bindings();
  };

    

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

            $scope.conversations = UserData.getConversationsBuild();
        });
    } else {
        $location.path("/api/login");
    }

}]);