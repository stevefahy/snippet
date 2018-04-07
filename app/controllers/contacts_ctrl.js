cardApp.controller("contactsCtrl", ['$scope', '$rootScope', '$location', '$http', 'Invites', 'Email', 'Users', 'Conversations', 'Profile', 'General', function($scope, $rootScope, $location, $http, Invites, Email, Users, Conversations, Profile, General) {

    // TODO - make sure two users cant create a 2 person conv with each other at the same time.
    // Add users to each others contacts when conv created?

    //The minimum number of characters a user must type before a search is performed.
    var SEARCH_MIN = 3;

    $scope.contacts = [];
    $scope.search_results = [];

    $scope.invite_user = {
        sender_id: '',
        sender_name: '',
        recipient: '',
        group_id: ''
    };

    $scope.chat_create = {
        conversation_name: '',
        //admin: '',
        participants: []
    };
    // contacts checkboxes
    $scope.selection = [];
    // contacts checkboxes selected
    $scope.selected = [];

    $scope.hide = false;


    var cont = {
        avatar:"fileuploads/images/img_20180406_1523047577836.jpg",
        contacts: [],
        conversation_exists: false,
        conversation_id: "5ac7dd028ad5360dac25a04e",
        first_login: false,
        google: {email: "stevefahydev@gmail.com", name: "steve fahy", token: "ya29.Gl2VBSoutMCefwvDi9B0u_YPltbB1Qm5_ayvEoMoTA0Tt…tzQd4zRe-y6b-1qZ-_3Qa157PkXAfOj1_qJ-W3eg-W5bSdsIY", id: "116918311836530879886"},
        tokens: [],
        user_name: "Test User",
        __v: 0,
        _id: "5ac750022b6e3a438c2ec835"
    };


    $scope.contactSearch = function(){
        console.log('hide');
        //bool = !bool;
        $scope.hide = !$scope.hide;
    };

    // contact checkbox value changed
    $scope.checkBoxChange = function(checkbox, value) {
        var index = $scope.selected.indexOf(checkbox);
        if (value === true && index < 0) {
            // selected. Add to the selected array if not already there.
            $scope.selected.push(checkbox);
            // deselected. Remove from the selected array if already there.
        } else if (value === false && index >= 0) {
            $scope.selected.splice(index, 1);
        }
    };

    // Start a conversation
    $scope.selectedUsers = function(contact) {
        $scope.startChat($scope.selected, contact);
    };

    // Get the current users details
    $http.get("/api/user_data").then(function(result) {
        $scope.currentUser = result.data.user;
        // load this users list of contacts
        loadUserContacts();
    });

    // Continue a conversation by conversation id
    $scope.chat = function(conversation_id, contact, index) {
        var profile_obj = {};
        profile_obj.user_name = contact.user_name;
        profile_obj.avatar = contact.avatar;
        Profile.setConvProfile(profile_obj);
        $location.path("/chat/conversation/" + conversation_id);
    };

    // Start a conversation
    // TODO - make sure two users cannot create a chat simultanously
    // TODO - make sure only one chat created with aother single user.
    $scope.startChat = function(new_participants, contact) {
        var profile_obj = {};
        profile_obj.user_name = contact.user_name;
        profile_obj.avatar = contact.avatar;
        Profile.setConvProfile(profile_obj);
        // reset the participants array.
        $scope.chat_create.participants = [];
        //
        $scope.chat_create.conversation_type = 'private';
        // set the creating user as admin if a group
        if (new_participants.length > 1) {
            $scope.chat_create.admin = $scope.currentUser._id;
        }
        // Add current user as a participant
        $scope.chat_create.participants.push({ _id: $scope.currentUser._id, viewed: 0 });

        // Add all users contained in the new_participants array
        new_participants.map(function(key, array) {
            $scope.chat_create.participants.push({ _id: key, viewed: 0 });
        });

        // Create conversation in DB.
        Conversations.create($scope.chat_create)
            .then(function(res) {
                // Go to the conversation after it has been created
                $location.path("/chat/conversation/" + res.data._id);
            });
    };

    // add a user to the current users contact list
    $scope.addUser = function(id, index) {
        Users.add_contact(id)
            .then(function(res) {
                // Update the currentUser model
                $scope.currentUser = res.data;
                // remove this search result because it has now been added to the list of contacts
                $scope.search_results.splice(index, 1);
                // re-load the user contacts
                loadUserContacts();
            });
    };

    // check whether the search result is already a contact
    $scope.checkIfContact = function(result) {
        // if the result is the current user
        if (result === $scope.currentUser._id) {
            return true;
        }
        // loop through the current users contact list
        for (var i = 0; i < $scope.contacts.length; i++) {
            // Check whether already a contact
            if ($scope.contacts[i]._id === result) {
                // already a contact
                return true;
            }
        }
        // not already a contact
        return false;
    };

    // invite a user to join via email
    $scope.inviteUser = function(invite_input) {
        $scope.invite_user.recipient = invite_input;
        $scope.invite_user.sender_id = $scope.currentUser._id;
        $scope.invite_user.sender_name = $scope.currentUser.google.name;
        // create invite in database
        Invites.create_invite($scope.invite_user)
            .then(function(response) {
                // send the invite via email
                sendMail(response.data);
            });
    };

    // load this users contacts
    loadUserContacts = function() {
        // reset the contacts model
        $scope.contacts = [];

        var test_num = 500;
        for(var i =0; i< test_num; i++){
            cont.$$hashKey = i;
            $scope.contacts.push(cont);
        }
        /*
        var result = $scope.currentUser.contacts.map(function(key, array) {
            // Search for each user in the contacts list by id
            Users.search_id(key)
                .then(function(res) {
                    if (res.error === 'null') {
                        // remove this contact as the user cannot be found
                        Users.delete_contact(key)
                            .then(function(data) {
                                //
                            })
                            .catch(function(error) {
                                console.log('error: ' + error);
                            });
                    }
                    if (res.data.success) {
                        // Check if individual conversation already created with this contact
                        // Get all coversations containing current user.
                        $http.get("/chat/conversation").then(function(result) {
                            result.data.map(function(key, array) {
                                // check that this is a two person chat.
                                // Groups of three or more are loaded in conversations.html
                                if (key.participants.length === 2) {
                                    // Check that current user is a participant of this conversation
                                    //var conversation_pos = General.findWithAttr(res.data, '_id', msg.conversation_id);
                                    if (General.findWithAttr(key.participants, '_id', res.data.success._id) >= 0) {
                                        // set conversation_exists and conversation_id for the contacts
                                        res.data.success.conversation_exists = true;
                                        res.data.success.conversation_id = key._id;
                                    }
                                }
                            });
                        });
                        // add the user as a contact
                        $scope.contacts.push(res.data.success);
                    }
                })
                .catch(function(error) {
                    console.log('error: ' + error);
                });
        });
        */
        console.log(($scope.contacts));
    };

    // send email invite to the recipient with the invite code.
    sendMail = function(invite) {
        Email.postEmail(invite)
            .then(function(response) {});
    };

    // autocomplete code for the search-query input box
    // after minLength characters are inputed then a search for a name containg these characters is executed
    $(function() {
        $("#search-query").autocomplete({
            source: function(request, response) {
                $.ajax({
                    url: "/api/search_member",
                    type: "GET",
                    data: request, // request is the value of search input
                    success: function(data) {
                        $scope.search_results = [];
                        // Map response values to field label and value
                        response($.map(data, function(res) {
                            // check if this user is already a contact
                            var isConttact = $scope.checkIfContact(res._id);
                            if ($scope.checkIfContact(res._id)) {
                                res.is_contact = true;
                            }
                            // populate search_results array with found users
                            $scope.search_results.push(res);
                            $scope.$apply();
                        }));
                    }
                });
            },
            // The minimum number of characters a user must type before a search is performed.
            minLength: SEARCH_MIN,
        });
    });
}]);