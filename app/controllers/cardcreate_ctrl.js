cardApp.controller("cardcreateCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', '$timeout', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'socket', 'Users', function($scope, $rootScope, $location, $http, $window, $timeout, Cards, replaceTags, Format, Edit, Conversations, socket, Users) {

    $scope.getFocus = Format.getFocus;
    $scope.contentChanged = Format.contentChanged;
    $scope.checkKey = Format.checkKey;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    $scope.uploadFile = Format.uploadFile;
    $scope.myFunction = Edit.myFunction;

    var fcm;

    var current_conversation_id = Conversations.getConversationId();

    //$window.document.hasFocus();

    setFocus = function() {
        $timeout(function() {
            var element = $window.document.getElementById('cecard_create');
            if (element) {
                element.focus();
                $rootScope.$broadcast('CONV_CHECK');
            }
        });
    };

    // Find User
    findUser = function(id, callback) {
        var user_found;
        Users.search_id(id)
            .success(function(res) {
                user_found = res.success;
                callback(user_found);
            })
            .error(function(error) {
                //
            });
    };

    var ua = navigator.userAgent;
    // only check focus on web version
    if (ua !== 'AndroidApp') {
        $window.onfocus = function() {
            this.setFocus();
        };
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

    // Get the FCM details
    $http.get("/api/fcm_data").then(function(result) {
        fcm = result.data.fcm;
        console.log('FCM result: ' + JSON.stringify(fcm));
    });

    // CREATE ==================================================================
    $scope.createCard = function(id, card_create) {
        $scope.card_create.conversationId = current_conversation_id;
        $scope.card_create.content = replaceTags.replace($scope.card_create.content);
        $scope.card_create.content = Format.setMediaSize(id, card_create);

        $scope.card_create.content = Format.removeDeleteIds();

        Cards.create($scope.card_create)
            .then(function(response) {
                // reset the input box
                var sent_content = $scope.card_create.content;
                $scope.card_create.content = '';
                // notify conversation_ctrl that the conversation has been updated
                $rootScope.$broadcast('CONV_UPDATED', response.data);
                // Update the Conversation updateAt time.
                Conversations.updateTime(current_conversation_id)
                    .then(function(response) {
                        // socket.io emit the card posted to the server
                        socket.emit('card_posted', { sender_id: socket.getId(), conversation_id: response.data._id, participants: response.data.participants });
                        // TODO send notifications
                        // send if web? Yes
                        // truncate body?
                        // add title ?
                        // send even if the user is in the conversation?
                        // notify relevant users of the cards creation
                        //
                        // Set the FCM data for the request
                        var data = {
                            //"operation": "",
                            //"notification_key_name": req.user._id,
                            //"registration_ids": [req.body.refreshedToken]
                            "to": "",
                            "notification": {
                                "title": "",
                                "body": ""
                            },
                            "data": {
                                "url":""
                            }
                        };
                        var headers = {
                            'Authorization': 'key=' + fcm.firebaseserverkey,
                            'Content-Type': 'application/json'
                            //'project_id': fcm.project_id

                        };
                        var options = {
                            uri: 'https://fcm.googleapis.com/fcm/send',
                            method: 'POST',
                            headers: headers,
                            json: data
                        };
                        console.log(headers.Authorization);
                        console.log('response.data: ' + JSON.stringify(response.data));
                        for (var i in response.data.participants) {
                            // dont emit to the user which sent the card
                            if (response.data.participants[i]._id !== $scope.currentUser._id) {
                                // get the participants notification key
                                // get the message body
                                console.log('$scope.card_create: ' + JSON.stringify($scope.card_create));
                                console.log(sent_content);
                                // Find the other user
                                findUser(response.data.participants[i]._id, function(result) {
                                    console.log(JSON.stringify(result));
                                    // TEST
                                    // Send data so that the conversation is opened
                                    //result.notification_key = "APA91bFOx5o5-W7AICr2ZtND0nKCeYl4i0U1M3wBH1r_Ad6Ud8nsnkRzZQzbLscvfdy_AX9Xbg0zjkphLCHU3y3P5m0L7MMpfwbXEROGO37SUA25WKXDPGwGPCSUR0wvA58qPiSSlp60";
                                    console.log('result.notification_key: ' + result.notification_key);
                                    if (result.notification_key !== undefined) {
                                        data.to = result.notification_key;
                                        data.notification.title = $scope.card_create.user;
                                        data.notification.body = sent_content;
                                        //
                                        data.data.url = response.data._id;
                                        //var notify_obj = {'data':data, 'headers':headers , 'options':options};
                                        Users.send_notification(options);
                                    }
                                });

                            }
                        }
                    });
            });
    };

}]);