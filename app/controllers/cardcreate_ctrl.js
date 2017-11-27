cardApp.controller("cardcreateCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', '$timeout', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'socket', function($scope, $rootScope, $location, $http, $window, $timeout, Cards, replaceTags, Format, Edit, Conversations, socket) {

    $scope.getFocus = Format.getFocus;
    $scope.contentChanged = Format.contentChanged;
    $scope.checkKey = Format.checkKey;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    $scope.uploadFile = Format.uploadFile;
    $scope.myFunction = Edit.myFunction;

    var current_conversation_id = Conversations.getConversationId();

    //$window.document.hasFocus();

    setFocus = function() {
        $timeout(function() {
            console.log('focus');
            var element = $window.document.getElementById('cecard_create');
            if (element) {
                console.log('foc');
                element.focus();
                $rootScope.$broadcast('CONV_CHECK');
            }
        });
    };

    var ua = navigator.userAgent;
    // only check focus on web version
    if (ua !== 'AndroidApp') {
        $window.onfocus = function() {
            console.log('focus');
            this.setFocus();
        };
        console.log('loaded');
        $window.focus();
        setFocus();
    }

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

        Cards.create($scope.card_create)
            .then(function(response) {
                // reset the input box
                $scope.card_create.content = '';
                // notify conversation_ctrl that the conversation has been updated
                $rootScope.$broadcast('CONV_UPDATED', response.data);
                // Update the Conversation updateAt time.
                Conversations.updateTime(current_conversation_id)
                    .then(function(response) {
                        // socket.io emit the card posted to the server
                        socket.emit('card_posted', { sender_id: socket.getId(), conversation_id: response.data._id, participants: response.data.participants });
                    });
            });
    };

}]);