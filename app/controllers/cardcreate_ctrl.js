cardApp.controller("cardcreateCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'socket', function($scope, $rootScope, $location, $http, $window, Cards, replaceTags, Format, Edit, Conversations, socket) {

    $scope.getFocus = Format.getFocus;
    $scope.contentChanged = Format.contentChanged;
    $scope.checkKey = Format.checkKey;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    $scope.uploadFile = Format.uploadFile;
    $scope.myFunction = Edit.myFunction;

    var current_conversation_id = Conversations.getConversationId();

    $scope.card_create = {
        _id: 'card_create',
        content: '',
        user: $scope.currentUser,
        user_name: ''
    };

    // Get the current users details
    $http.get("/api/user_data").then(function(result) {
        $scope.currentUser = result.data.user;
        $scope.card_create.user = $scope.currentUser.google.name;
    });

    // CREATE ==================================================================
    $scope.createCard = function(id, card_create) {
        $scope.card_create.conversationId = current_conversation_id;
        $scope.card_create.content = replaceTags.replace($scope.card_create.content);
        $scope.card_create.content = Format.setMediaSize(id, card_create);
        console.log('card_create');
        Cards.create($scope.card_create)
            .then(function(response) {
                console.log('response: ' + response);
                // reset the input box
                $scope.card_create.content = '';
                // redirect to root to display created card by id
                $rootScope.$broadcast('CONV_UPDATED', response.data);
                // Update the Conversation updateAt time.
                Conversations.updateTime(current_conversation_id)
                    .then(function(response) {
                         console.log('socket: ' + socket.getSocket());
                         console.log('socket.connected: ' + socket.getSocketStatus());
                        //socket.checkConnection($scope.currentUser._id, 'card_posted', { conversation_id: response.data._id, participants: response.data.participants });
                        socket.emit('card_posted', { conversation_id: response.data._id, participants: response.data.participants });
                    });
            });
    };

}]);