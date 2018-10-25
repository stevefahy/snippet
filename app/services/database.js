//
// Database Service
//

cardApp.service('Database', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', 'Cropp', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal, Cropp) {

    var self = this;

    var updateinprogress = false;
    var sent_content_length = 200;

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
    var headersObj;
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


    // SAVE CARD (Android image bug. Temporarily save the updated card but do not send notificstion.)
    this.saveTempCard = function(card_id, card, currentUser) {
        if (!updateinprogress) {
            updateinprogress = true;
            setTimeout(function() {
                card.content = Format.setMediaSize(card_id, card);
                card.content = replaceTags.replace(card.content);
                // Remove any temp filtered images
                card.content = Format.removeTempFiltered(card.content);
                var pms = { 'id': card_id, 'card': card };
                // call the update function from our service (returns a promise object)
                Cards.update(pms)
                    .then(function(returned) {
                        $rootScope.$broadcast('CARD_UPDATED', returned.data);
                        updateinprogress = false;
                    })
                    .catch(function(error) {
                        console.log('error: ' + error);
                    });
            }, 0);
        }
    };

    // CREATE AND UPDATE CARD
    // MERGE  Conversations.updateTime(card.conversationId) & Conversations.updateViewed(card.conversationId, viewed_users[x]._id, card_id)
    // UPDATE CARD
    this.updateCard = function(card_id, card, currentUser) {
        if (!updateinprogress) {
            updateinprogress = true;
            setTimeout(function() {
                var promises = [];
                // Get the Conversation in which this card is being created.
                var current_conversation_id = Conversations.getConversationId();
                card.content = Format.setMediaSize(card_id, card);
                card.content = replaceTags.replace(card.content);
                // DANGER These had been removed for android image save bug
                card.content = replaceTags.removeDeleteId(card.content);
                card.content = replaceTags.removeFocusIds(card.content);
                // Remove any temp filtered images
                card.content = Format.removeTempFiltered(card.content);
                var sent_content;
                var notification_title;
                var notification_body;
                var card_content = card.content;
                var pms = { 'id': card_id, 'card': card };
                // call the create function from our service (returns a promise object)
                Cards.update(pms)
                    .then(function(returned) {
                        $rootScope.$broadcast('CARD_UPDATED', returned.data);
                        var viewed_users = [];
                        // Update the Conversation updateAt time.
                        //Conversations.updateTime(card.conversationId)
                        Conversations.updateTime(current_conversation_id)
                            .then(function(response) {
                                // Only send notifications if there are other participants.
                                if (response.data.participants.length > 1) {
                                    var notification = self.setNotification(response.data, currentUser, card_content);
                                    notification_title = notification.title;
                                    notification_body = notification.body;
                                    sent_content = FormatHTML.prepSentContent(notification_body, sent_content_length);
                                    // Send notifications
                                    for (var i in response.data.participants) {
                                        // dont emit to the user which sent the card
                                        if (response.data.participants[i]._id !== currentUser._id) {
                                            // Add this users id to the viewed_users array.
                                            viewed_users.push({ "_id": response.data.participants[i]._id });
                                            // Find the other user(s)
                                            promises.push(UserData.getConversationsUser(response.data.participants[i]._id)
                                                .then(function(result) {
                                                    // Get the participants notification key name
                                                    // Set the message title and body
                                                    if (result.notification_key_name !== undefined) {
                                                        // Send to all registered devices!
                                                        for (var y in result.tokens) {
                                                            var dataObj = new createData(result.tokens[y].token, notification_title, sent_content, response.data._id);
                                                            var optionsObj = new createOptions(headersObj.headers, dataObj.data);
                                                            Users.send_notification(optionsObj.options)
                                                                .then(function(res) {
                                                                    console.log(res);
                                                                });
                                                        }
                                                    }
                                                }));
                                        }
                                    }

                                    // Update the unviewed arrary for all participants.
                                    for (var x = 0; x < viewed_users.length; x++) {
                                        promises.push(
                                            Conversations.updateViewed(card.conversationId, viewed_users[x]._id, card_id)
                                            .then(function(res) {
                                                //console.log(res);
                                            })
                                        );
                                    }
                                    // All Conversation participants unviewed arrays updated
                                    $q.all(promises).then(function() {
                                        // Add the current user to the participants being notified of update in case they have multiple devices.
                                        viewed_users.push({ "_id": currentUser._id });
                                        // update other paticipants in the conversation via socket.
                                        socket.emit('card_posted', { sender_id: socket.getId(), conversation_id: card.conversationId, participants: viewed_users });
                                        updateinprogress = false;
                                    });
                                }
                            });

                    })
                    .catch(function(error) {
                        console.log('error: ' + error);
                    });
            }, 0);
        }
    };

    // CREATE CARD
    this.createCard = function(id, card_create, currentUser) {
        var promises = [];
        card_create.user = currentUser.google.name;
        // Get the Conversation in which this card is being created.
        var current_conversation_id = Conversations.getConversationId();
        card_create.conversationId = current_conversation_id;
        card_create.content = Format.setMediaSize(id, card_create);
        card_create.content = replaceTags.replace(card_create.content);
        card_create.content = Format.removeDeleteIds();
        card_create.content = replaceTags.removeDeleteId(card_create.content);
        card_create.content = replaceTags.removeFocusIds(card_create.content);
        // Remove any temp filtered images
        card_create.content = Format.removeTempFiltered(card_create.content);
        var sent_content;
        var notification_title;
        var notification_body;
        var card_content = card_create.content;
        Cards.create(card_create)
            .then(function(response) {
                var card_id = response.data._id;
                var card_response = response.data;
                // notify conversation_ctrl and cardcreate_ctrl that the conversation has been updated
                // reset the input box
                $rootScope.$broadcast('CARD_CREATED', card_response);
                var viewed_users = [];
                // Update the Conversation updateAt time.
                Conversations.updateTime(current_conversation_id)
                    .then(function(response) {
                        // Only send notifications if there are other participants.
                        if (response.data.participants.length > 1) {
                            var notification = self.setNotification(response.data, currentUser, card_content);
                            notification_title = notification.title;
                            notification_body = notification.body;
                            sent_content = FormatHTML.prepSentContent(notification_body, sent_content_length);
                            // Send notifications
                            for (var i in response.data.participants) {
                                // dont emit to the user which sent the card
                                console.log(response.data.participants[i]._id + ' !== ' + currentUser._id);
                                console.log(response.data.participants[i]._id !== currentUser._id);
                                if (response.data.participants[i]._id !== currentUser._id) {
                                    // Add this users id to the viewed_users array.
                                    viewed_users.push({ "_id": response.data.participants[i]._id });
                                    // Find the other user(s)
                                    promises.push(UserData.getConversationsUser(response.data.participants[i]._id)
                                        .then(function(result) {
                                            console.log(result);
                                            // Get the participants notification key
                                            // Set the message title and body
                                            if (result.notification_key_name !== undefined) {
                                                // Send to all registered devices!
                                                for (var y in result.tokens) {
                                                    console.log(result.tokens[y].token);
                                                    var dataObj = new createData(result.tokens[y].token, notification_title, sent_content, response.data._id);
                                                    var optionsObj = new createOptions(headersObj.headers, dataObj.data);
                                                    // Send the notification
                                                    Users.send_notification(optionsObj.options)
                                                        .then(function(res) {
                                                            console.log(res);
                                                            if (res.error) {
                                                                console.log('UserData.checkDataUpdate');
                                                                UserData.checkDataUpdate();

                                                            }
                                                        });
                                                }
                                            }
                                        }));
                                }
                            }
                            // Update the unviewed array for all participants.
                            for (var x = 0; x < viewed_users.length; x++) {
                                promises.push(
                                    Conversations.updateViewed(current_conversation_id, viewed_users[x]._id, card_id)
                                    .then(function(res) {
                                        //console.log(res);
                                    })
                                );
                            }
                            // All Conversation participants unviewed arrays updated
                            $q.all(promises).then(function() {
                                //console.log('all promises - emit card_posted');
                                // Add the current user to the participants being notified of update in case they have multiple devices.
                                viewed_users.push({ "_id": currentUser._id });
                                // update other paticipants in the conversation via socket.
                                console.log('card_posted');
                                socket.emit('card_posted', { sender_id: socket.getId(), conversation_id: current_conversation_id, participants: viewed_users });
                            });
                        }
                    });
            });
    };

    // DELETE CARD
    this.deleteCard = function(card_id, conversation_id, currentUser) {
        var promises = [];
        var sent_content;
        var notification_title;
        var notification_body;
        var card_content = 'Post deleted.';
        var current_conversation_id = Conversations.getConversationId();
        Cards.delete(card_id)
            .then(function(response) {
                // notify conversation_ctrl that the card has been deleted
                $rootScope.$broadcast('CARD_DELETED', card_id);
                // remove this Card from the unviewed array for all Conversation participants.
                Conversations.removeViewed(conversation_id, currentUser, card_id)
                    .then(function(response) {
                        var notification = self.setNotification(response.data, currentUser, card_content);
                        notification_title = notification.title;
                        notification_body = notification.body;
                        sent_content = FormatHTML.prepSentContent(notification_body, sent_content_length);
                        // Send notifications
                        for (var i in response.data.participants) {
                            // dont emit to the user which sent the card
                            if (response.data.participants[i]._id !== currentUser._id) {
                                // Find the other user(s)
                                UserData.getConversationsUser(response.data.participants[i]._id)
                                    .then(function(result) {
                                        // Get the participants notification key
                                        // set the message title and body
                                        if (result.notification_key_name !== undefined) {
                                            // Send to all registered devices!
                                            for (var y in result.tokens) {
                                                var dataObj = new createData(result.tokens[y].token, notification_title, sent_content, response.data._id);
                                                var optionsObj = new createOptions(headersObj.headers, dataObj.data);
                                                // Send the notification
                                                Users.send_notification(optionsObj.options)
                                                    .then(function(res) {
                                                        //console.log(res);
                                                    });
                                            }
                                        }
                                    });
                            }
                        }
                        // socket.io emit the card posted to the server
                        socket.emit('card_posted', { sender_id: socket.getId(), conversation_id: response.data._id, participants: response.data.participants });
                    });
            })
            .catch(function(error) {
                console.log('error: ' + error);
            });
    };

}]);