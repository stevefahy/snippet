cardApp.controller("cardCtrl", ['$scope', 'Cards', 'Conversations', 'Users', 'replaceTags', '$rootScope', '$http', 'Format', 'Edit', '$window', '$routeParams', '$location', 'socket', function($scope, Cards, Conversations, Users, replaceTags, $rootScope, $http, Format, Edit, $window, $routeParams, $location, socket) {

    $scope.getFocus = Format.getFocus;
    $scope.contentChanged = Format.contentChanged;
    $scope.checkKey = Format.checkKey;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    $scope.uploadFile = Format.uploadFile;

    $scope.dropDownToggle = Edit.dropDownToggle;

    // Use the url /snip id to load a snip
    var snip = $routeParams.snip;
    // Use the url /username to load a users snips
    var username = $routeParams.username;

    // Get the current users details
    $http.get("/api/user_data").then(function(result) {
        if (result.data.user) {
            $scope.currentUser = result.data.user.google.name;
            loadUserData();
        }
    });

    if (username != undefined) {
        /*
        Cards.search_user(username)
            .success(function(data) {
                // update card_ctrl $scope.cards
                $rootScope.$broadcast('cards', data);
            });
            */
        //Conversations.find_user_public_conversation($scope.currentUser._id)
        Conversations.find_user_public_conversation(username)
            .then(function(res) {
                console.log(JSON.stringify(res));
                console.log('public conv check: ' + res.data);
                // $rootScope.$broadcast('cards', res.data);
                $scope.cards = res.data;
                conversation_length = $scope.cards.length;
                //updateConversationViewed(id, conversation_length);
                // Get the user name for the user id
                // TODO dont repeat if user id already retreived
                $scope.cards.map(function(key, array) {
                    Users.search_id(key.user)
                        .success(function(res) {
                            if (res.error === 'null') {
                                // user cannot be found
                            }
                            if (res.success) {
                                // Set the user_name to the retrieved name
                                key.user_name = res.success.google.name;
                            }
                        })
                        .error(function(error) {});
                });
                // Scroll to the bootom of the list
                //$timeout(function() {
                //    scrollToBottom(1);
               // }, speed);
            });
    }

    if (snip !== undefined) {
        Cards.search_id(snip)
            .success(function(data) {
                // update card_ctrl $scope.cards
                $rootScope.$broadcast('cards', data);
            });
    }

    loadUserData = function() {
        if (snip === undefined && username === undefined) {
            Cards.search_user($scope.currentUser)
                .success(function(data) {
                    // update card_ctrl $scope.cards
                    $rootScope.$broadcast('cards', data);
                });
        }
    };

    // update from cardcreate_ctrl createCard
    $scope.$on('cards', function(event, data) {
        $scope.cards = data;
    });

    // Function called from core.js by dynamically added input type=checkbox.
    // It rewrites the HTML to save the checkbox state.
    checkBoxChanged = function(checkbox) {
        if (checkbox.checked) {
            checkbox.setAttribute("checked", "true");
        } else {
            checkbox.removeAttribute("checked");
        }

    };

    // DELETE ==================================================================
    $scope.deleteCard = function(id) {
        Cards.delete(id)
            .success(function(data) {
                $rootScope.$broadcast('search');
            });
    };

    // UPDATE ==================================================================
    $scope.updateCard = function(id, card) {
        card.content = Format.setMediaSize(id, card);
        setTimeout(function() {
            $scope.$apply(function() {
                card.content = replaceTags.replace(card.content);
                card.content = replaceTags.removeDeleteId(card.content);
                var pms = { 'id': id, 'card': card };
                // call the create function from our service (returns a promise object)
                Cards.update(pms)
                    .success(function(data) {
                        $rootScope.$broadcast('search');
                    })
                    .error(function(error) {});
            });
        }, 1000);
    };
}]);