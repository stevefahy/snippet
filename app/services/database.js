//
// Database Service
//

cardApp.service('Database', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', 'ImageEdit', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal, ImageEdit) {

    var self = this;

    var updateinprogress = false;
    var sent_content_length = 200;
    var headersObj;

    var card_create = {
        _id: 'card_create',
        content: '',
        user: '',
        user_name: ''
    };

    //Set the FCM data for the Notification request

    function createOptions(headers, data) {
        this.options = {
            uri: 'https://fcm.googleapis.com/fcm/send',
            method: 'POST',
            headers: headers,
            json: data
        };
    }

    function createHeaders(auth) {
        this.headers = {
            'Authorization': auth,
            'Content-Type': 'application/json'
        };
    }

    function createData(to, title, body, url) {
        this.data = {
            "to": to,
            "notification": {
                "title": title,
                "body": body
            },
            "data": {
                "url": url
            }
        };
    }

    // Get the FCM details (Google firebase notifications).
    // Only get if the user is logged in, otherwise it is not required.
    if (principal.isAuthenticated) {
        $http.get("/api/fcm_data").then(function(result) {
            if (result != result.data.fcm != 'forbidden') {
                fcm = result.data.fcm;
                headersObj = new createHeaders('key=' + fcm.firebaseserverkey);
            }
        });
    }

    this.setNotification = function(data, currentUser, card_content) {
        var notification_title;
        var notification_body;
        // Public conversation
        if (data.conversation_type == 'public') {
            // Get the conversation name and add to model.
            notification_title = data.conversation_name;
            notification_body = card_content;
        }
        // Group conversation. 
        if (data.participants.length > 2) {
            // Set the notification title to the conversation title
            notification_title = data.conversation_name;
            notification_body = '<b>' + currentUser.google.name + '</b>' + ': ' + card_content;
        }
        // Two user conversation (not a group)
        if (data.participants.length == 2) {
            // Set the notification title to the senders name
            notification_title = currentUser.google.name;
            notification_body = card_content;
        }
        var notification = { title: notification_title, body: notification_body };
        return notification;
    };

    // SAVE CARD (Android image bug. Temporarily save the updated card but do not send notification.)
    this.saveTempCard = function(card_id, card, currentUser) {
        if (!updateinprogress) {
            updateinprogress = true;
            setTimeout(function() {
                card.content = replaceTags.replace(card.content);
                // Remove any temp filtered images
                card.content = Format.removeTempFiltered(card.content);
                var pms = { 'card': card };
                // call the update function from our service (returns a promise object)
                Cards.update(pms)
                    .then(function(returned) {
                        updateinprogress = false;
                    })
                    .catch(function(error) {
                        updateinprogress = false;
                        //console.log('error: ' + error);
                    });
            }, 0);
        }
    };

    this.cardPosted = async function(response, method) {
        var deferred = $q.defer();
        var card_id = response._id;
        var card_response = response;
        var updated_viewed_users;
        var current_conversation_id = response.conversationId;
        var currentUser = UserData.getUser();
        var sent_content;
        var notification_title;
        var notification_body;
        var card_content = response.content;
        var recipients;
        if (method == 'POST') {
            // notify conversation_ctrl and cardcreate_ctrl that the conversation has been updated
            // reset the input box
            $rootScope.$broadcast('CARD_CREATED');
        }
        switch (method) {
            case 'POST':
                post_type = 'created';
                break;
            case 'PUT':
                post_type = 'updated';
                break;
            case 'DELETE':
                post_type = 'deleted';
                break;
        }
        var viewed_users = [];
        // Update the participants viewed array for this conversation with this card (Conversation updateAt time is also updated.). Public conversations do not store viewed data.
        Conversations.updateViewed(current_conversation_id, card_id)
            .then(function(response) {
                updated_viewed_users = response.participants;
                var notification = self.setNotification(response, currentUser, card_content);
                notification_title = notification.title;
                notification_body = notification.body;
                sent_content = FormatHTML.prepSentContent(notification_body, sent_content_length);
                if (response.conversation_type == 'public') {
                    recipients = response.followers;
                } else {
                    recipients = response.participants;
                }
                // Only send notifications if there are other participants.
                if (recipients.length > 0) {
                    // Send notifications
                    for (var i in recipients) {
                        // dont emit to the user which sent the card
                        if (recipients[i]._id !== currentUser._id) {
                            // Add this users id to the viewed_users array.
                            viewed_users.push({ "_id": recipients[i]._id });
                            // Find the other user(s)
                            var result = UserData.getContact(recipients[i]._id);
                            // Get the participants notification key
                            // Set the message title and body
                            if (result != 'Unknown') {
                                if (result.notification_key_name !== undefined) {
                                    // Send to all registered devices!
                                    for (var y in result.tokens) {
                                        var dataObj = new createData(result.tokens[y].token, notification_title, sent_content, response._id);
                                        var optionsObj = new createOptions(headersObj.headers, dataObj.data);
                                        // Send the notification
                                        Users.send_notification(optionsObj.options)
                                            .then(function(res) {
                                                if (res.error) {}
                                            });
                                    }
                                }
                            }
                        }
                    }
                    // Add the current user to the participants being notified of update in case they have multiple devices.
                    viewed_users.push({ "_id": currentUser._id });
                    // Emit that the card has been created.
                    if (response.conversation_type == 'public') {
                        socket.emit('public_' + post_type, { sender_id: socket.getId(), conversation_id: current_conversation_id, card_id: card_id, followers: viewed_users });
                    } else {
                        // update other paticipants in the conversation via socket.
                        socket.emit('private_' + post_type, { sender_id: socket.getId(), conversation_id: current_conversation_id, card_id: card_id, participants: viewed_users, viewed_users: updated_viewed_users });
                    }
                    updateinprogress = false;
                    deferred.resolve();
                } else {
                    // Add the current user to the participants being notified of update in case they have multiple devices.
                    viewed_users.push({ "_id": currentUser._id });
                    // Emit that the card has been created.
                    if (response.conversation_type == 'public') {
                        socket.emit('public_' + post_type, { sender_id: socket.getId(), conversation_id: current_conversation_id, card_id: card_id, followers: viewed_users });
                    }
                    updateinprogress = false;
                    deferred.resolve();
                }
            })
            .catch(function(error) {
                //console.log('error: ' + error);
                deferred.resolve();
            });
        return deferred.promise;
    }

    function send_message_to_sw(msg, obj) {
        //console.log(card);
        var send = { "message": msg, object: obj };
        //send = JSON.parse(JSON.stringify(send));
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage(send);
        }
    }

    // CREATE CARD
    this.createCard = function(id, card_create, currentUser) {
        var promises = [];
        var promises_followers = [];
        var online_card_create = Object.assign({}, card_create);
        var offline_card_create = Object.assign({}, card_create);
        var currentUser = UserData.getUser();
        // Create a temp id
        online_card_create._id = 'temp_id_' + new Date().getTime();
        online_card_create.user = currentUser.google.name;
        // Get the Conversation in which this card is being created.
        var current_conversation_id = Conversations.getConversationId();
        online_card_create.conversationId = current_conversation_id;
        online_card_create.content = replaceTags.replace(online_card_create.content);
        online_card_create.content = Format.removeDeleteIds();
        online_card_create.content = replaceTags.removeDeleteId(online_card_create.content);
        online_card_create.content = replaceTags.removeFocusIds(online_card_create.content);
        // Remove any temp filtered images
        online_card_create.content = Format.removeTempFiltered(online_card_create.content);
        //
        // Offline
        //
        // Copy the data from online object to offline object.
        var offline_card_create = Object.assign({}, online_card_create);
        if (!$rootScope.online) {
            var currentUser = UserData.getUser();
            offline_card_create.user_name = currentUser.user_name;
            offline_card_create.user = currentUser._id;
            offline_card_create.avatar = currentUser.avatar;
            offline_card_create.createdAt = General.getISODate();
            offline_card_create.updatedAt = General.getISODate();
            // replace blob image with image url.
            online_card_create.content = Format.replaceBlob(offline_card_create.content);
            offline_card_create.original_content = offline_card_create.content;
            addCards([offline_card_create]).then(function(result) {
                $rootScope.$broadcast('CARD_CREATED');
            })
            var type = Conversations.getConversationType();
            UserData.conversationsLatestCardAdd(offline_card_create.conversationId, offline_card_create);
            send_message_to_sw("card_create_update", { operation: 'create_update', card: offline_card_create, conversation_type: type });
        }
        // Post the card to the server.
        Cards.create(online_card_create)
            .then(function(response) {
                // Update viewed users and send notifications.
                self.cardPosted(response.data, 'POST');
            })
            .catch(function(error) {
                //console.log('error: ' + error);
            });
    };

    // UPDATE CARD
    this.updateCard = function(card_id, card, currentUser) {
        var deferred = $q.defer();
        if (!updateinprogress) {
            setTimeout(function() {
                var promises = [];
                var promises_followers = [];
                var temp_card = Object.assign({}, card);
                // Get the Conversation in which this card is being created.
                temp_card.content = replaceTags.replace(temp_card.content);
                // DANGER These had been removed for android image save bug
                temp_card.content = replaceTags.removeDeleteId(temp_card.content);
                temp_card.content = replaceTags.removeFocusIds(temp_card.content);
                // Remove any temp filtered images
                temp_card.content = Format.removeTempFiltered(temp_card.content);
                // Copy the data from online object to offline object.
                var offline_temp_card = Object.assign({}, temp_card);
                if (!$rootScope.online) {
                    var type = Conversations.getConversationType();
                    offline_temp_card.updatedAt = new Date().toISOString();
                    card.updatedAt = new Date().toISOString();
                    // replace blob image with image url.
                    temp_card.content = Format.replaceBlob(offline_temp_card.content);
                }
                UserData.conversationsLatestCardAdd(offline_temp_card.conversationId, offline_temp_card);
                send_message_to_sw("card_create_update", { operation: 'create_update', card: offline_temp_card, conversation_type: type });
                var pms = { 'card': temp_card };
                // call the create function from our service (returns a promise object)
                Cards.update(pms)
                    .then(function(returned) {
                        updateinprogress = false;
                        self.cardPosted(returned.data, 'PUT').then(function(returned) {
                            deferred.resolve();
                        });
                    })
                    .catch(function(error) {
                        //console.log('error: ' + error);
                        updateinprogress = false;
                        deferred.resolve();
                    });
            }, 0);
        }
        return deferred.promise;
    };

    // DELETE CARD
    this.deleteCard = async function(card_id, conversation_id, currentUser) {
        var promises = [];
        var promises_followers = [];
        var sent_content;
        var notification_title;
        var notification_body;
        var card_content = 'Post deleted.';
        var current_conversation_id = Conversations.getConversationId();
        var recipients;
        var viewed_users = [];
        var updated_viewed_users;
        // Offline
        if (!$rootScope.online) {
            let previous_card = await deleteCard(card_id);
            UserData.conversationsLatestCardDelete(conversation_id, card_id, previous_card);
            var type = Conversations.getConversationType();
            let temp_card = { _id: card_id };
            //send_message_to_sw("card_create_update", { operation: 'delete', card: temp_card, conversation_type: type });
        }
        Cards.delete(card_id)
            .then(function(returned) {
                self.cardPosted(returned.data, 'DELETE');
            })
            .catch(function(error) {
                //console.log('error: ' + error);
            });
    };

}]);