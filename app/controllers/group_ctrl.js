cardApp.controller("groupCtrl", ['$scope', '$route', '$rootScope', '$routeParams', '$location', '$http', '$timeout', 'principal', 'UserData', 'Invites', 'Email', 'Users', 'Conversations', 'Profile', 'General', 'Format', 'Contacts', '$q', '$animate', 'viewAnimationsService', function($scope, $route, $rootScope, $routeParams, $location, $http, $timeout, principal, UserData, Invites, Email, Users, Conversations, Profile, General, Format, Contacts, $q, $animate, viewAnimationsService) {

    // Animation
    $rootScope.nav = { from: 'group', to: 'conv' };
    viewAnimationsService.setEnterAnimation('page-group');
    viewAnimationsService.setLeaveAnimation('page-group');
    // Loading conversation directly should not animate.
    $animate.enabled($rootScope.animate_pages);
    // turn on animation.
    $scope.contact_back = false;
    $scope.$on('$routeChangeStart', function($event, next, current) {
        $animate.enabled(true);
    });

    // Use the urls id param from the route to load the conversation.
    var id = $routeParams.id;

    // Check if the page has been loaded witha param (user contacts import callback).
    //var paramValue = $route.current.$$route.menuItem;
    // Stop listening for Mobile soft keyboard.
    General.keyBoardListenStop();
    // Contacts animation
    $scope.search_sel = false;
    $scope.import_sel = false;
    $scope.contacts_sel = true;
    $scope.animating = true;
    // Vars
    $scope.contacts_on = false;
    $scope.image_drawer_opened = false;
    $scope.user_contacts = [];
    $scope.contacts_imported = false;
    $scope.contacts = [];
    $scope.participants = [];
    $scope.search_results = [];
    // contacts selected
    $scope.selected = [];
    $scope.show_selected_drawer = false;
    $scope.show_image = false;
    $scope.valid_group = false;
    $scope.group_selected = false;
    $scope.invite_selected = false;
    $scope.invite_sent = false;
    $scope.invite_user = {
        sender_id: '',
        sender_name: '',
        recipient: '',
        group_id: ''
    };
    /*
    $scope.chat_create = {
        conversation_name: '',
        conversation_avatar: 'default',
        participants: []
    };
    */
    $scope.chat_update = {
        conversation_name: '',
        conversation_avatar: 'default',
        participants: []
    };
    // Image
    $scope.myImage = '';
    $scope.myCroppedImage = '';
    $scope.image_loaded = false;

    $scope.is_admin = false;
    $scope.conversation = '';
    $scope.edit_participants = false;

    $scope.edit_conversation = false;
    $scope.participants_orig = [];
    $scope.saved_avatar = '';

    $scope.admin_rights = false;



    //The minimum number of characters a user must type before a search is performed.
    var SEARCH_MIN = 3;
    var SELECTED_DRAWER_WAIT = 100;
    var SELECTED_REMOVE_WAIT = 301;
    var ua = navigator.userAgent;
    // Image
    var myImageName = '';
    var mySavedImage = '';

    updateProfile = function() {
        var profile = {};
        profile.avatar = $scope.avatar;
        profile.conversation_name = $scope.conversation_name;
        // Store the profile.
        console.log(profile);
        Profile.setProfile(profile);
        $rootScope.$broadcast('PROFILE_SET');
    };

    // Get the current users details
    if (principal.isValid()) {
        UserData.checkUser().then(function(result) {
            $scope.currentUser = UserData.getUser();
            // Default Group Image
            $scope.avatar = 'default';

            UserData.getConversationModelById(id)
                .then(function(res) {
                    console.log(res);
                    $scope.conversation = res;
                    if (res.admin.includes(UserData.getUser()._id)) {
                        console.log('is admin');
                        $scope.is_admin = true;
                    }

                    //$scope.participants = res.participants;
                    console.log(UserData.listConversationsUsers());
                    res.participants.map(function(key, array) {
                        console.log(key._id);
                        UserData.getConversationsUser(key._id)
                            .then(function(result) {
                                console.log(result);
                                $scope.participants.push(result);
                                $scope.participants_orig.push(result);
                            });
                    });

                    // Admin rights
                    if(res.admin.includes(UserData.getUser()._id)){
                        $scope.admin_rights = true;
                    }

                    // If two person
                    if (res.conversation_name == '') {
                        $scope.conv_type = "two";
                        // Turn off admin of two person chat.
                        $scope.admin_rights = false;
                        // TODO - make General function.
                        var index = General.findWithAttr(res.participants, '_id', UserData.getUser()._id);
                        // Get the other user.
                        index = 1 - index;
                        UserData.getConversationsUser(res.participants[index]._id)
                            .then(function(result) {
                                console.log(result);
                                //$scope.participants.push(result);

                                $scope.avatar = result.avatar;
                                $scope.saved_avatar = result.avatar;
                                $scope.conversation_name = result.user_name;
                                $scope.chat_update.conversation_avatar = result.avatar;
                                $scope.group_name = $scope.conversation_name;
                                updateProfile();
                            });

                        //
                    } else {
                        $scope.conv_type = "group";
                        $scope.avatar = res.conversation_avatar;
                        $scope.saved_avatar = res.conversation_avatar;
                        $scope.conversation_name = res.conversation_name;
                        $scope.chat_update.conversation_avatar = res.conversation_avatar;
                        $scope.group_name = $scope.conversation_name;
                        updateProfile();
                    }



                });
            /*
            var profile = {};
            profile.avatar = 'default';
            profile.user_name = UserData.getUser().user_name;
            if (UserData.getUser().avatar != undefined) {
                profile.avatar = UserData.getUser().avatar;
                $scope.avatar = UserData.getUser().avatar;
            }
            // Store the profile.
            Profile.setProfile(profile);
            $rootScope.$broadcast('PROFILE_SET');
            */

            // Check if the page has been loaded witha param (user contacts import callback).
            /*
            if (paramValue != undefined && paramValue == 'import') {
                // Set the navigation.
                $scope.contactImportNoAnim();
                // load this users list of imported user contacts
                Contacts.getContacts().then(function(result) {
                    // Update the current user with the imported contacts.
                    $scope.currentUser = result.data;
                    // Update the local model with the imported contacts.
                    UserData.setUser(result.data);
                    // load this users list of contacts
                    loadUserContacts();
                });
            } else {
                // load this users list of contacts
                loadUserContacts();
            }
            */
            loadUserContacts();
        });
    } else {
        $location.path("/api/login");
    }

    // Called by back button in header. (Hides Search or Import for back animation).
    /*
    $scope.pageAnimationStart = function() {
        if ($scope.search_sel) {
            $scope.search_back = true;
        } else if ($scope.import_sel == true) {
            $scope.import_back = true;
        }
    };
   
        $scope.resetPage = function() {
            console.log('resetPage');
            //$scope.pageClass = 'page-group';
            //$animate.enabled(false);
            //$scope.pageClass = 'page-conversation_group';
        };
        */

    // Navigation functions
    /*
    $scope.contactSearch = function() {
        $scope.search_sel = true;
        $scope.import_sel = false;
        $scope.contacts_sel = false;
        $scope.animating = true;
    };

    $scope.contactImport = function() {
        $scope.search_sel = false;
        $scope.import_sel = true;
        $scope.contacts_sel = false;
        $scope.animating = true;
    };

    $scope.contactImportNoAnim = function() {
        $scope.search_sel = false;
        $scope.import_sel = true;
        $scope.contacts_sel = false;
        $scope.animating = false;
    };

    $scope.contactContacts = function() {
        $scope.search_sel = false;
        $scope.import_sel = false;
        $scope.contacts_sel = true;
        $scope.animating = true;
    };
    */


    //
    // CONTACTS
    //

    $scope.editable = function(){
        if($scope.admin_rights && !$scope.edit_conversation){
            return true;
        } else {
            return false;
        }
    };

    $scope.editConversation = function() {
        if($scope.admin_rights && !$scope.edit_conversation){
        $scope.edit_conversation = !$scope.edit_conversation;
        if ($scope.edit_conversation) {
            showSelected();
        } else {
            if (event) {
                $scope.cancelGroup(event);
            } else {
                $scope.cancelGroup();
            }

        }
    }
    };




    /*
    $scope.editParticipants = function(event) {
        console.log($scope.edit_participants);
        $scope.edit_participants = !$scope.edit_participants;
        if ($scope.edit_participants) {
            showSelected();
        } else {
            if (event) {
                $scope.cancelGroup(event);
            } else {
                $scope.cancelGroup();
            }

        }
    };
    */

    $scope.isAdmin = function(id) {
        if ($scope.conversation.admin.includes(id)) {
            return true;
        } else {
            return false;
        }
    };

    $scope.cancelGroup = function(event) {
        if (event) {
            event.stopPropagation();
        }
        $scope.edit_conversation = false;
        $scope.show_selected_drawer = false;
        $scope.selected = [];
        // reset the items selected.
        angular.forEach($scope.contacts, function(item) {
            item.item_selected = false;
        });
        $scope.valid_group = false;
        $scope.group_name = $scope.conversation_name;
        $scope.myImage = '';
        $scope.myCroppedImage = '';
        $scope.image_loaded = false;
        //$scope.avatar = 'default';
        $scope.avatar = $scope.saved_avatar;
    };

    /*
    $scope.selectGroup = function() {
        console.log($scope.is_admin);
        if ($scope.is_admin) {
            $scope.group_selected = !$scope.group_selected;
        }
    };
    */

    showSelected = function() {
        $scope.contacts.map(function(key, array) {
            //$scope.chat_create.participants.push({ _id: key._id, viewed: 0 });
            console.log(key);
            if (General.findWithAttr($scope.participants, '_id', key._id) >= 0) {
                $scope.doSelect(key);
            }
            //$scope.doSelect(key);
        });
    };

    $scope.doSelect = function(contact) {
        // reverse item_selected boolean for this contact.
        contact.item_selected = !contact.item_selected;
        // Get the index position of this contact with the $scope.selected array.
        var index = General.findWithAttr($scope.selected, '_id', contact._id);
        // If the contact is selected and is not already in the $scope.selected array.
        if (contact.item_selected && index < 0) {
            // Open the div which contains the selected contacts.
            $scope.show_selected_drawer = true;
            // Wait for selected contacts div animation before adding selected contacts. (For animation performance reason).
            $timeout(function() {
                // Add contact to the selected array.
                $scope.selected.push(contact);
                validateGroup();
            }, SELECTED_DRAWER_WAIT);
            // If the contact is deselected and is already in the $scope.selected array.
        } else if (!contact.item_selected && index >= 0) {
            // Get the contacts id.
            var id_0 = $($scope.selected[index])[0]._id;
            // Add the class for removing the contact.
            $('#select_' + id_0).addClass('contact_select_remove');
            // Wait for the contact to animate off screen before removing from $scope.selected.
            $timeout(function() {
                // Get the index position of this contact with the $scope.selected array.
                var index = General.findWithAttr($scope.selected, '_id', contact._id);
                // Remove contact from $scope.selected.
                $scope.selected.splice(index, 1);
                validateGroup();
                // If there are no items in $scope.selected then close the div which contains the selected contacts.
                if ($scope.selected == 0) {
                    $scope.show_selected_drawer = false;
                    //validateGroup();
                }
            }, SELECTED_REMOVE_WAIT);
        }
    };

    /*
    // Start or continue a single user conversation with a contact.
    $scope.chat = function(contact) {
        if (contact.conversation_exists) {
            $scope.continueChat(contact.conversation_id, contact);
        } else {
            $scope.startChat([contact], contact);
        }
    };

    // Start a Group conversation
    $scope.createGroup = function(event, contact) {
        event.stopPropagation();
        if ($scope.selected.length > 0) {
            $scope.startChat($scope.selected, contact, $scope.group_name);
        }
    };
    */
    // Update a Group conversation
    $scope.updateGroup = function(event) {
        event.stopPropagation();
        if ($scope.selected.length > 0) {
            //$scope.startChat($scope.selected, contact, $scope.group_name);
            $scope.chat_update.conversation_name = $scope.group_name;
            //$scope.chat_create.conversation_avatar
            // reset the participants array.
            $scope.chat_update.participants = [];
            // Add all users contained in the new_participants array
            $scope.selected.map(function(key, array) {
                $scope.chat_update.participants.push({ _id: key._id, viewed: 0 });
            });
            console.log($scope.chat_update);
            var pms = { 'id': id, 'conversation': $scope.chat_update };
            // Updateconversation in DB.

            Conversations.update(pms)
                .then(function(res) {

                    console.log(res);
                    console.log($scope.conversation);
                    $scope.saved_avatar = res.data.conversation_avatar;
                    // Update the conversation details for the model
                    res.data.avatar = res.data.conversation_avatar;
                    //res.data.conversation_avatar = $scope.conversation.conversation_avatar;
                    res.data.latest_card = $scope.conversation.latest_card;
                    res.data.name = res.data.conversation_name;
                    // Update the participants model.
                    //if (General.findWithAttr($scope.participants, '_id', key._id) >= 0) {
                    //$scope.doSelect(key);
                    //}
                    $scope.participants = [];
                    res.data.participants.map(function(key, array) {
                        console.log(key._id);
                        UserData.getConversationsUser(key._id)
                            .then(function(result) {
                                console.log(result);
                                $scope.participants.push(result);
                            });
                    });

                    // Add this conversation to the local model.
                    UserData.addConversationModel(res.data)
                        .then(function(res) {
                            //
                            console.log(res);
                        });

                    var profile_obj = {};
                    // if group
                    if (res.data.conversation_name != '') {
                        profile_obj.user_name = res.data.conversation_name;
                        profile_obj.avatar = res.data.conversation_avatar;
                        Profile.setConvProfile(profile_obj);
                        // Go to the conversation after it has been created
                        //$location.path("/chat/conversation/" + res.data._id);
                    }
                    // If two person
                    if (res.data.conversation_name == '') {
                        // get the index position of the current user within the participants array
                        var user_pos = General.findWithAttr(res.data.participants, '_id', $scope.currentUser._id);
                        // Get the position of the current user
                        if (user_pos === 0) {
                            participant_pos = 1;
                        } else {
                            participant_pos = 0;
                        }
                        // Find the other user

                        // USERDATA PARTICIPANTS

                        General.findUser(res.data.participants[participant_pos]._id, function(result) {
                            profile_obj.avatar = "default";
                            // set the other user name as the name of the conversation.
                            if (result) {
                                profile_obj.user_name = result.user_name;
                                profile_obj.avatar = result.avatar;
                            }
                            Profile.setConvProfile(profile_obj);
                            // Go to the conversation after it has been created
                            $location.path("/chat/conversation/" + res.data._id);
                        });
                    }

                    // reset.
                    $scope.conversation_name = res.data.conversation_name;
                    $scope.cancelGroup();

                });


        }
    };

    /*
    // Continue a conversation by conversation id
    $scope.continueChat = function(conversation_id, contact) {
        var profile_obj = {};
        profile_obj.user_name = contact.user_name;
        profile_obj.avatar = contact.avatar;
        Profile.setConvProfile(profile_obj);
        $location.path("/chat/conversation/" + conversation_id);
    };

    // Start a conversation
    $scope.startChat = function(new_participants, contact, name) {
        if (name != undefined) {
            $scope.chat_create.conversation_name = name;
        }
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
            $scope.chat_create.participants.push({ _id: key._id, viewed: 0 });
        });
        // Create conversation in DB.
        Conversations.create($scope.chat_create)
            .then(function(res) {
                // Add this conversation to the local model.
                UserData.addConversationModel(res.data)
                    .then(function(res) {
                        //
                    });

                var profile_obj = {};
                // if group
                if (res.data.conversation_name != '') {
                    profile_obj.user_name = res.data.conversation_name;
                    profile_obj.avatar = res.data.conversation_avatar;
                    Profile.setConvProfile(profile_obj);
                    // Go to the conversation after it has been created
                    $location.path("/chat/conversation/" + res.data._id);
                }
                // If two person
                if (res.data.conversation_name == '') {
                    // get the index position of the current user within the participants array
                    var user_pos = General.findWithAttr(res.data.participants, '_id', $scope.currentUser._id);
                    // Get the position of the current user
                    if (user_pos === 0) {
                        participant_pos = 1;
                    } else {
                        participant_pos = 0;
                    }
                    // Find the other user

                    // USERDATA PARTICIPANTS

                    General.findUser(res.data.participants[participant_pos]._id, function(result) {
                        profile_obj.avatar = "default";
                        // set the other user name as the name of the conversation.
                        if (result) {
                            profile_obj.user_name = result.user_name;
                            profile_obj.avatar = result.avatar;
                        }
                        Profile.setConvProfile(profile_obj);
                        // Go to the conversation after it has been created
                        $location.path("/chat/conversation/" + res.data._id);
                    });
                }
            });
    };
    */

    // CONTACTS - IMAGE

    // Trigger the file input for image.
    $scope.triggerClick = function() {
        $('#fileInput').trigger('click');
    };

    // Save the conv avatar for this group.
    $scope.saveChanges = function() {
        mySavedImage = $scope.myCroppedImage;
        myImageName = 'img_' + General.getDate() + '_' + (new Date()).getTime() + '.jpg';
        General.urltoFile($scope.myCroppedImage, myImageName, 'image/jpeg')
            .then(function(file) {
                Format.prepareImage([file], function(result) {
                    // Change the current header.
                    $scope.$apply(function($scope) {
                        $scope.avatar = 'fileuploads/images/' + result.file;
                        $scope.chat_update.conversation_avatar = 'fileuploads/images/' + result.file;
                        // Close the image selection drawer.
                        $scope.show_image = false;

                    });
                    validateGroup();
                });
            });
    };

    $scope.imgcropLoaded = function() {
        $scope.image_loaded = true;
    };

    $scope.conversationImage = function(event) {
        event.stopPropagation();
        $scope.show_image = !$scope.show_image;
    };

    //
    // IMPORT
    //
    /*
    $scope.importContacts = function() {
        $scope.contacts_imported = true;
        // Always use /auth/google_contacts route (permission not granted) so that token can be returned.
        location.href = "/auth/google_contacts/" + UserData.getUser().google.email;
    };

    $scope.cancelInvite = function(event) {
        event.stopPropagation();
        $scope.invite_selected = false;
        $scope.invite_sent = false;
        $scope.invite_input = '';
        $scope.animating = true;
    };

    $scope.selectInvite = function() {
        $scope.invite_selected = !$scope.invite_selected;
        $scope.animating = true;
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
                $scope.invite_sent = true;
                $scope.invite_input = '';
            });
    };
    */

    //
    // SEARCH
    //
    /*
    // add a user to the current users contact list
    $scope.addUser = function(user, index, event) {
        event.stopPropagation();
        Users.add_contact(user._id)
            .then(function(res) {
                // Update the currentUser model
                UserData.addUserContact(user._id);
                UserData.addConversationsUser(user);
                UserData.addContact(user)
                    .then(function(res) {
                        // re-load the user contacts
                        $scope.contacts = UserData.getContacts();
                    });
                // remove this search result because it has now been added to the list of contacts
                $scope.search_results[index].is_contact = true;
            });
    };

    $scope.addInvite = function(email) {
        $scope.selectInvite();
        $scope.invite_input = email;
    };
    */
    //
    // CONTACTS
    //
    //function arraysAreEqual(ary1, ary2) {
    //   return (ary1.join('') == ary2.join(''));
    //}

    function comparer(otherArray) {
        return function(current) {
            return otherArray.filter(function(other) {
                return other._id == current._id;
            }).length == 0;
        };
    }

    function arraysAreEqual(a, b) {
        var onlyInA = a.filter(comparer(b));
        var onlyInB = b.filter(comparer(a));
        result = onlyInA.concat(onlyInB);
        //console.log(result);
        if (result.length == 0) {
            return true;
        } else {
            return false;
        }
    }






    validateGroup = function() {
        console.log($scope.selected);
        console.log($scope.participants);
        console.log(arraysAreEqual($scope.selected, $scope.participants));
        console.log($('#group_name').val() + ' != ' + $scope.conversation_name);
        console.log($scope.saved_avatar + ' != ' + $scope.avatar);
        if (($('#group_name').val().length > 2 && $('#group_name').val() != $scope.conversation_name) || ($scope.selected.length > 0 && !arraysAreEqual($scope.selected, $scope.participants)) || ($scope.saved_avatar != $scope.avatar)) {
            $scope.$apply(function($scope) {
                $scope.valid_group = true;
            });
        } else {
            $scope.$apply(function($scope) {
                $scope.valid_group = false;
            });
        }
    };

    loadUserContacts = function() {
        $scope.contacts = UserData.getContacts();
        //$scope.contacts = UserData.getContactsAndUser();

        //$scope.contacts.push($scope.currentUser);
        console.log($scope.contacts);
        //checkImportedContacts();
        $scope.contacts_on = true;
    };

    // CONTACTS - IMAGE

    // Load image returned from Android.
    loadImage = function(img, callback) {
        src = 'fileuploads/images/' + img;
        var file = src;
        var xhr = new XMLHttpRequest();
        xhr.onload = function(e) {
            callback(this.response);
        };
        xhr.open('GET', file, true);
        xhr.responseType = 'blob';
        xhr.send();
    };

    // Image returned from Android.
    androidToJS = function(data) {
        var file = data.file;
        myImageName = data.file;
        var reader = new FileReader();
        reader.onload = function(evt) {
            $scope.$apply(function($scope) {
                $scope.myImage = evt.target.result;
            });
        };
        loadImage(file, function(result) {
            reader.readAsDataURL(result);
        });
    };

    // Android
    var handleFileClick = function(evt) {
        if (ua.indexOf('AndroidApp') >= 0) {
            Android.choosePhoto();
        }
    };

    // Web
    var handleFileSelect = function(evt) {
        var file = evt.currentTarget.files[0];
        myImageName = file.name;
        var reader = new FileReader();
        reader.onload = function(evt) {
            $scope.$apply(function($scope) {
                $scope.myImage = evt.target.result;
            });
        };
        reader.readAsDataURL(file);
    };

    //
    // IMPORT
    //
    /*
    // send email invite to the recipient with the invite code.
    sendMail = function(invite) {
        Email.postEmail(invite)
            .then(function(response) {});
    };

    checkImportedContacts = function() {
        if ($scope.currentUser.imported_contacts.length > 0) {
            $scope.contacts_imported = true;
            $scope.user_contacts = $scope.currentUser.imported_contacts[0].contacts;
        }
        $scope.contacts_on = true;
    };

    inputClicked = function(event) {
        event.stopPropagation();
        $scope.invite_sent = false;
    };
    */
    //
    // SEARCH
    //
    /*
    // check whether the search result is already a contact
    checkIfContact = function(result) {
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

    // autocomplete code for the search-query input box
    // after minLength characters are inputed then a search for a name containg these characters is executed
    $(function() {
        $("#search-query").autocomplete({
            source: function(request, response) {
                $.ajax({
                    url: "/api/search_member",
                    headers: { 'x-access-token': principal.token },
                    type: "GET",
                    data: request, // request is the value of search input
                    success: function(data) {
                        $scope.search_results = [];
                        // Map response values to field label and value
                        response($.map(data, function(res) {
                            // check if this user is already a contact
                            // Do not list current user
                            if (res._id != $scope.currentUser._id) {
                                if (checkIfContact(res._id)) {
                                    res.is_contact = true;
                                }
                                // Check if individual conversation already created with this contact
                                // Get all coversations containing current user.
                                $http.get("/chat/conversation").then(function(result) {
                                    result.data.map(function(key, array) {
                                        // check that this is a two person chat.
                                        // Groups of three or more are loaded in conversations.html
                                        if (key.conversation_name != '') {
                                            // Check that current user is a participant of this conversation
                                            if (General.findWithAttr(key.participants, '_id', res._id) >= 0) {
                                                // set conversation_exists and conversation_id for the contacts
                                                res.conversation_exists = true;
                                                res.conversation_id = key._id;
                                            }
                                        }
                                    });
                                });
                                //
                                // populate search_results array with found users
                                $scope.search_results.push(res);
                                $scope.$apply();
                            }
                        }));
                    },
                    error: function(error) {
                        console.log(error);
                    }
                });
            },
            // The minimum number of characters a user must type before a search is performed.
            minLength: SEARCH_MIN,
        });
    });
    */
    // Animation end listeners.

    $(".contacts_transition").bind('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', function() {
        $scope.$apply(function($scope) {
            if ($scope.import_sel == true) {
                $scope.animating = false;
            }
        });
    });

    $(".show_image_transition").bind('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', function(event) {
        $scope.image_drawer_opened = !$scope.image_drawer_opened;
    });

    // Input listeners.
    $('#group_name').on('input', function() {
        validateGroup();
    });

    $('#fileInput').on('click', function() {
        // reset the input value to null so that files of the same name can be uploaded.
        this.value = null;
    });

    // Web
    angular.element(document.querySelector('#fileInput')).on('change', handleFileSelect);
    // Android
    angular.element(document.querySelector('#fileInput')).on('click', handleFileClick);

}]);