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

    checkForImage = function(content) {
        var res;
        if (content.indexOf('<img') >= 0) {
            var img_tag = content.substr(content.indexOf('<img'), content.indexOf('.jpg">') + 6);
            res = "Posted a photo.";
        } else {
            res = content;
        }
        return res;
    };

    function stripHTML(html) {
        var tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }

    var ua = navigator.userAgent;
    // only check focus on web version
    if (ua !== 'AndroidApp') {
        $window.onfocus = function() {
            //this.setFocus();
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
                sent_content = checkForImage(sent_content);
                sent_content = stripHTML(sent_content);
                $scope.card_create.content = '';
                // notify conversation_ctrl that the conversation has been updated
                $rootScope.$broadcast('CONV_UPDATED', response.data);
                // Update the Conversation updateAt time.
                Conversations.updateTime(current_conversation_id)
                    .then(function(response) {
                        // socket.io emit the card posted to the server
                        socket.emit('card_posted', { sender_id: socket.getId(), conversation_id: response.data._id, participants: response.data.participants });
                        // Send notifications
                        // Set the FCM data for the request
                        var data = {
                            "to": "",
                            "notification": {
                                "title": "",
                                "body": ""
                            },
                            "data": {
                                "url": ""
                            }
                        };
                        var headers = {
                            'Authorization': 'key=' + fcm.firebaseserverkey,
                            'Content-Type': 'application/json'
                        };
                        var options = {
                            uri: 'https://fcm.googleapis.com/fcm/send',
                            method: 'POST',
                            headers: headers,
                            json: data
                        };
                        for (var i in response.data.participants) {
                            // dont emit to the user which sent the card
                            if (response.data.participants[i]._id !== $scope.currentUser._id) {
                                // Find the other user(s)
                                findUser(response.data.participants[i]._id, function(result) {
                                    // get the participants notification key
                                    // get the message title and body
                                    if (result.notification_key !== undefined) {
                                        data.to = result.notification_key;
                                        data.notification.title = $scope.card_create.user;
                                        data.notification.body = sent_content;
                                        // get the conversation id
                                        data.data.url = response.data._id;
                                        Users.send_notification(options);
                                    }
                                });
                            }
                        }
                    });
            });
    };
}]);