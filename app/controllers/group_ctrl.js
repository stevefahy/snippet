cardApp.controller("groupCtrl", ['$scope', '$route', '$rootScope', '$routeParams', '$location', '$http', '$timeout', 'principal', 'UserData', 'Invites', 'Email', 'Users', 'Conversations', 'Profile', 'General', 'Format', 'Contacts', '$q', function($scope, $route, $rootScope, $routeParams, $location, $http, $timeout, principal, UserData, Invites, Email, Users, Conversations, Profile, General, Format, Contacts, $q) {

    // Use the urls id param from the route to load the conversation.
    var id = $routeParams.id;
    // Set the conversation id in case this page was loaded directly.
    Conversations.setConversationId(id);

    // Stop listening for Mobile soft keyboard.
    General.keyBoardListenStop();
    $scope.animating = true;
    // Vars
    $scope.contacts_on = false;
    $scope.image_drawer_opened = false;
    $scope.contacts = [];
    $scope.participants = [];
    $scope.selected = [];
    $scope.show_selected_drawer = false;
    $scope.show_image = false;
    $scope.valid_group = false;

    $scope.chat_update = {
        conversation_name: '',
        conversation_avatar: 'default',
        participants: []
    };
    // Image
    $scope.myImage = '';
    $scope.myCroppedImage = '';
    $scope.image_loaded = false;
    $scope.saved_avatar = '';

    $scope.is_admin = false;
    $scope.conversation = '';
    $scope.edit_conversation = false;
    $scope.participants_orig = [];
    $scope.admin_rights = false;

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
                    $scope.conversation = res;
                    if (res.admin.includes(UserData.getUser()._id)) {
                        $scope.is_admin = true;
                    }
                    res.participants.map(function(key, array) {
                        UserData.getConversationsUser(key._id)
                            .then(function(result) {
                                $scope.participants.push(result);
                                $scope.participants_orig.push(result);
                            });
                    });
                    // Admin rights
                    if (res.admin.includes(UserData.getUser()._id)) {
                        $scope.admin_rights = true;
                    }
                    // If two person
                    if (res.conversation_name == '') {
                        // conv_type or header.
                        $scope.conv_type = "two";
                        // Turn off admin of two person chat.
                        $scope.admin_rights = false;
                        var index = General.findWithAttr(res.participants, '_id', UserData.getUser()._id);
                        // Get the other user.
                        index = 1 - index;
                        UserData.getConversationsUser(res.participants[index]._id)
                            .then(function(result) {
                                $scope.avatar = result.avatar;
                                $scope.saved_avatar = result.avatar;
                                $scope.conversation_name = result.user_name;
                                $scope.chat_update.conversation_avatar = result.avatar;
                                $scope.group_name = $scope.conversation_name;
                                updateProfile();
                            });
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
            loadUserContacts();
        });
    } else {
        $location.path("/api/login");
    }

    $scope.editable = function() {
        if ($scope.admin_rights && !$scope.edit_conversation) {
            return true;
        } else {
            return false;
        }
    };

    $scope.editConversation = function() {
        // Reset group
        $scope.cancelGroup();
        if ($scope.admin_rights && !$scope.edit_conversation) {
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
        $scope.avatar = $scope.saved_avatar;
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

    // Update a Group conversation
    $scope.updateGroup = function(event) {
        event.stopPropagation();
        if ($scope.selected.length > 0) {
            //$scope.startChat($scope.selected, contact, $scope.group_name);
            $scope.chat_update.conversation_name = $scope.group_name;
            // reset the participants array.
            $scope.chat_update.participants = [];
            // Add all users contained in the new_participants array
            $scope.selected.map(function(key, array) {
                $scope.chat_update.participants.push({ _id: key._id, viewed: 0 });
            });
            var pms = { 'id': id, 'conversation': $scope.chat_update };
            // Updateconversation in DB.
            Conversations.update(pms)
                .then(function(res) {
                    $scope.saved_avatar = res.data.conversation_avatar;
                    // Update the conversation details for the model
                    res.data.avatar = res.data.conversation_avatar;
                    //res.data.conversation_avatar = $scope.conversation.conversation_avatar;
                    res.data.latest_card = $scope.conversation.latest_card;
                    res.data.name = res.data.conversation_name;
                    // Update the participants model.
                    $scope.participants = [];
                    res.data.participants.map(function(key, array) {
                        UserData.getConversationsUser(key._id)
                            .then(function(result) {
                                $scope.participants.push(result);
                            });
                    });
                    // Add this conversation to the local model.
                    UserData.addConversationModel(res.data)
                        .then(function(res) {
                            //console.log(res);
                        });
                    var profile_obj = {};
                    // if group
                    if (res.data.conversation_name != '') {
                        profile_obj.user_name = res.data.conversation_name;
                        profile_obj.avatar = res.data.conversation_avatar;
                        Profile.setConvProfile(profile_obj);
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

    // IMAGE

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

    showSelected = function() {
        $scope.contacts.map(function(key, array) {
            if (General.findWithAttr($scope.participants, '_id', key._id) >= 0) {
                $scope.doSelect(key);
            }
        });
    };

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
        $scope.contacts_on = true;
    };

    // IMAGE

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
    imageUploaded = function(data) {
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

    // Listeners

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