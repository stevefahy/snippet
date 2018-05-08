cardApp.controller("contactsCtrl", ['$scope', '$route', '$rootScope', '$location', '$http', '$timeout', 'Invites', 'Email', 'Users', 'Conversations', 'Profile', 'General', 'Format', 'Contacts', function($scope, $route, $rootScope, $location, $http, $timeout, Invites, Email, Users, Conversations, Profile, General, Format, Contacts) {

    $scope.pageClass = 'page-contacts';
/*
    this.$onInit = function() {
        console.log('contacts init');
        console.log(($scope.contacts));
    };
    */

   // console.log('contacts post init');
   // console.log(($scope.contacts));

   $scope.contacts_on = false;

    $scope.search_sel = false;
    $scope.import_sel = false;
    $scope.contacts_sel = true;

    $scope.animating = false;
    $scope.image_drawer_opened = false;

    //$scope.invite_input = ' Type email...';


    $(".contacts_transition").bind('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', function() {
        $scope.$apply(function($scope) {
            $scope.animating = false;
        });

        console.log('fin');
    });

    $(".show_image_transition").bind('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', function(event) {
        //$(".show_image_transition").off('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend');

        console.log($(".contact_div_image").height());
        if ($(".contact_div_image").height() == 0) {
            $scope.$apply(function($scope) {
                $scope.image_drawer_opened = false;
            });
        } else {
            $scope.$apply(function($scope) {
                $scope.image_drawer_opened = true;
            });
        }
        console.log(event.originalEvent.propertyName);
        console.log('fin image_drawer_opened: ' + $scope.image_drawer_opened);
    });

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

    $scope.user_contacts = [];

    loadGoogleContacts = function() {
        //https://www.google.com/m8/feeds/contacts/default/thin?alt=json&access_token=ya29.GlupBTMA_9903fys4hzzQc9vH_9DoG0cS6yVuzvlABtcGzKA_veuh5mLkhpHoNa21ZQQpMgzLBj9REJe8HnX3LgEMl4tirvUK-OVQ6KYjm4Vi7DInSYwhS7i8TqK&max-results=700&v=3.0
    };

    var paramValue = $route.current.$$route.menuItem;
    console.log(paramValue);

    $scope.contacts_imported = false;

    contactsFormat = function(result) {
        /*
        result.data.map(function(key, array) {
            //console.log(key.avatar);
            $http.get("/api/user_data").then(function(result) {
                $scope.currentUser = result.data.user;
                console.log($scope.currentUser);
                //key.avatar = key.avatar + '?access_token=' + $scope.currentUser.google.token;
            });
        });
        */


        $scope.user_contacts = result.data;



        var contacts_obj = { name: 'google', contacts: $scope.user_contacts };

        Users.add_imported_contacts(contacts_obj);
    };



    if (paramValue != undefined) {
        if (paramValue == 'import') {

            //if (!$scope.$$phase) {
              //  $scope.$apply(function($scope) {
                    $scope.contacts_imported = true;
                   
              //  });
            //}

            // check for canceled permission
            $scope.contactImportNoAnim();
            Contacts.getContacts().then(function(result) {
                console.log('callback');
                contactsFormat(result);
            });
        }




    }

    $scope.changePath = function(path) {
        // $location.path(path, false);
        //$location.search({name: path});
        //location.go(path);
        $location.path(path, { trigger: false });
    };

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

    newChat = function() {
        $scope.chat_create = {
            conversation_name: '',
            //admin: '',
            conversation_avatar: 'default',
            participants: []
        };
    };
    newChat();
    // contacts checkboxes
    $scope.selection = [];
    // contacts checkboxes selected
    $scope.selected = [];



    $scope.show_selected_drawer = false;
    $scope.show_image = false;
    var ua = navigator.userAgent;
    $scope.setting_change = false;
    $scope.valid_group = false;

    $scope.group_selected = false;
    $scope.invite_selected = false;

    $scope.invite_sent = false;

    $scope.cancelChanges = function() {
        console.log('cancel');
        $scope.show_image = false;
        // newChat();
        // $scope.chat_create.conversation_name = 'steve';
        //$scope.chat_create.conversation_name
    };

    $scope.cancelGroup = function(event) {
        console.log('cancelGroup');
        event.stopPropagation();
        $scope.group_selected = false;
        $scope.show_selected_drawer = false;

        $scope.selected = [];


        angular.forEach($scope.contacts, function(item) {
            item.item_selected = false;
        });

        //$scope.avatar = 'default';
        //newChat();

        $scope.valid_group = false;

        $scope.group_name = '';

        $scope.myImage = '';
        $scope.myCroppedImage = '';
        $scope.image_loaded = false;

        $scope.avatar = 'default';
    };


    $scope.cancelInvite = function(event) {
        console.log('cancelInvite');
        event.stopPropagation();
        $scope.invite_selected = false;
        $scope.invite_sent = false;
        $scope.invite_input = '';
        //newChat();
    };

    inputClicked = function(event) {
        event.stopPropagation();
        console.log('new');
        $scope.invite_sent = false;
    };

    $('#group_name').on('input', function() {
        console.log('input: ' + $(this).val());
        validateGroup();
    });

    /*
        $('#email_addr').on('input', function() {
            console.log('input: ' + $(this).val());
            //console.log(email_form.invite_input.$valid);
            //console.log(emailForm.username.$dirty);
            //validateEmail();
        });
        */

    validateGroup = function() {
        console.log($scope.valid_group);
        console.log($('#group_name').val().length);
        console.log($scope.selected.length);
        if ($('#group_name').val().length > 2 && $scope.selected.length > 0) {
            console.log('valid group');
            $scope.$apply(function($scope) {
                $scope.valid_group = true;
            });
        } else {
            console.log('invalid group');
            $scope.$apply(function($scope) {
                $scope.valid_group = false;
            });
        }


    };

    // IMAGE CTRL
    var myImageName = '';
    var mySavedImage = '';
    $scope.myImage = '';
    $scope.myCroppedImage = '';


    $('#fileInput').on('click', function() {
        // reset the input value to null so that files of the same name can be uploaded.
        this.value = null;
    });
    // Trigger the file input.
    $scope.triggerClick = function() {
        console.log($('#fileInput').val);

        $('#fileInput').trigger('click');

        //$('#fileInput').val('');

    };

    /*
                $('#upload-input').on('change', function() {
                var files = $(this).get(0).files;
                if (files.length > 0) {
                    self.prepareImage(files);
                }
                // reset the input value to null so that files of the same name can be uploaded.
                this.value = null;
            });
            */

    // Update Public conv avatar for this user
    $scope.saveChanges = function() {
        //$scope.startChat($scope.selected, contact);
        var saved = false;
        var profile = {};
        // If the user has changed the avatar.
        //if ($scope.myImage != '' && mySavedImage != $scope.myCroppedImage) {
        mySavedImage = $scope.myCroppedImage;
        saved = true;
        myImageName = 'img_' + getDate() + '_' + (new Date()).getTime() + '.jpg';
        urltoFile($scope.myCroppedImage, myImageName, 'image/jpeg')
            .then(function(file) {
                Format.prepareImage([file], function(result) {
                    profile.avatar = 'fileuploads/images/' + result.file;
                    // Change the current header.
                    $scope.$apply(function($scope) {
                        $scope.avatar = profile.avatar;
                        $scope.chat_create.conversation_avatar = profile.avatar;
                        // Close the image selection drawer.
                        $scope.show_image = false;
                    });

                    // Save the updated profile avatar and text.
                    //saveProfile(profile);
                });
            });
        //}
    };
    $scope.image_loaded = false;
    $scope.imgcropLoaded = function() {
        console.log('loaded');
        $scope.image_loaded = true;
        if ($('.crop_container').height() == 0) {
            $('.crop_container').css('height', '200px');
            $('.crop_container').css('left', '0px');
            $timeout(function() {
                $('.user_details').animate({
                    opacity: 0
                }, 100, function() {
                    // Animation complete.
                    $('.user_details').animate({
                        opacity: 0,
                        //left: 0
                    }, 0, function() {
                        // Animation complete.
                        $('.user_details').animate({
                            opacity: 0,
                            left: 0
                        }, 1000, function() {
                            // Animation complete.
                            $('.user_details').animate({
                                //left:0,
                                opacity: 1
                            }, 1000, function() {
                                // Animation complete.
                            });
                        });
                    });
                });
                $('.crop_container').animate({
                    height: 0
                }, 100, function() {
                    // Animation complete.
                    $('.crop_container').animate({
                        height: 0
                    }, 0, function() {
                        // Animation complete.
                        $('.crop_container').animate({
                            height: 200,
                        }, 1000, function() {
                            // Animation complete.
                        });
                    });
                });
                $('.imgcrop').animate({
                    opacity: 0,
                }, 100, function() {
                    // Animation complete.
                    $('.imgcrop').animate({
                        opacity: 1,
                        height: 0
                    }, 1, function() {
                        // Animation complete.
                        $('.imgcrop').animate({
                            height: 200
                        }, 1000, function() {
                            // Animation complete.
                        });
                    });
                });
            }, 100);
        }
    };

    // TODO - make service
    getDate = function() {
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth() + 1;
        var yyyy = today.getFullYear();
        if (dd < 10) {
            dd = '0' + dd;
        }
        if (mm < 10) {
            mm = '0' + mm;
        }
        var date = yyyy + mm + dd;
        return date;
    };

    /*
    saveProfile = function(profile) {
        console.log(profile);
        var pms = { 'id': $scope.currentFullUser._id, 'user': $scope.currentFullUser };
        // Update this users details.
        Users.update_user(pms)
            .then(function(data) {
                // Update the Profile service.
                Profile.setProfile(profile);
            })
            .catch(function(error) {
                console.log('error: ' + error);
            });
        // Find this users public conversation by id.
        Conversations.find_user_public_conversation_by_id($scope.currentFullUser._id)
            .then(function(result) {
                // Update the avatar for the public conversation.
                var obj = { 'id': result.data._id, 'avatar': profile.avatar };
                Conversations.updateAvatar(obj)
                    .then(function(result) {
                        console.log(result);
                    })
                    .catch(function(error) {
                        console.log('error: ' + error);
                    });
            })
            .catch(function(error) {
                console.log('error: ' + error);
            });
    };
    */
    // Transform the cropped image to a blob.
    function urltoFile(url, filename, mimeType) {
        return (fetch(url)
            .then(function(res) {
                return res.arrayBuffer();
            })
            .then(function(buf) {
                var blob = new Blob([buf], { type: mimeType });
                blob.name = filename;
                return blob;
            })
        );
    }

    // Load image returned from Android.
    function loadImage(img, callback) {
        src = 'fileuploads/images/' + img;
        var file = src;
        var xhr = new XMLHttpRequest();
        xhr.onload = function(e) {
            callback(this.response);
        };
        xhr.open('GET', file, true);
        xhr.responseType = 'blob';
        xhr.send();
    }

    // Image returned from Android.
    androidToJS = function(data) {
        var file = data.file;
        myImageName = data.file;
        var reader = new FileReader();
        reader.onload = function(evt) {
            $scope.$apply(function($scope) {
                $scope.myImage = evt.target.result;
            });
            $('.original').hide();
            $('.preview').css('left', '0px');
            $('.user_details').css('top', '-15px');
        };
        loadImage(file, function(result) {
            reader.readAsDataURL(result);
        });
    };
    // Android
    var handleFileClick = function(evt) {
        //if (ua === 'AndroidApp') {
        if (ua.indexOf('AndroidApp') >= 0) {
            Android.choosePhoto();
            if ($('.crop_container').height() == 0) {
                $('.user_details').css('left', '-1000px');
                $('.crop_container').css('height', '0px');
            }
        }
    };

    // Web
    var handleFileSelect = function(evt) {
        if ($('.crop_container').height() == 0) {
            //$('.original').hide();
            //$('.preview').css('left', '0px');
            // $('.user_details').css('left', '-1000px');
        }
        var file = evt.currentTarget.files[0];


        myImageName = file.name;
        var reader = new FileReader();
        reader.onload = function(evt) {
            $scope.$apply(function($scope) {
                $scope.myImage = evt.target.result;
                $scope.setting_change = true;
                $('.user_details').css('top', '-20px');
            });
            //evt.currentTarget.files = '';
        };
        reader.readAsDataURL(file);
    };
    // Web
    angular.element(document.querySelector('#fileInput')).on('change', handleFileSelect);
    // Android
    angular.element(document.querySelector('#fileInput')).on('click', handleFileClick);







    $scope.selectGroup = function() {
        $scope.group_selected = !$scope.group_selected;
        console.log('selectGroup');
        // $('#add_goup_button').css('cursor', 'auto');
        //$('.contact_div').css('cursor', 'auto');
        //$('#search-query-group').css('display', 'block');
    };

    $scope.selectInvite = function() {
        console.log('selectInvite');
        $scope.invite_selected = !$scope.invite_selected;
    };
    /*
               $("#import_contacts").click(function(event) {
    location.href = "/auth/google_contacts";
               });
               */
    /*
        $scope.dimportContacts = function() {
            $http.get("https://www.google.com/m8/feeds/contacts/default/thin?alt=json&access_token="+ $scope.currentUser.google.token + "&max-results=700&v=3.0").then(function(result) {
                console.log(result);
            });
        };
        */

    $scope.importContacts = function() {


        //$('#import_contacts').html('<a href="/auth/google_contacts">Google</a>');
        console.log('importContacts');

        $scope.contacts_imported = true;
         //$scope.animating = false;

        /*
                $http.get("https://www.google.com/m8/feeds/contacts/default/thin?alt=json&access_token=ya29.GlupBTMA_9903fys4hzzQc9vH_9DoG0cS6yVuzvlABtcGzKA_veuh5mLkhpHoNa21ZQQpMgzLBj9REJe8HnX3LgEMl4tirvUK-OVQ6KYjm4Vi7DInSYwhS7i8TqK&max-results=700&v=3.0").then(function(result) {
                    console.log(result);
                });
                */

        /*
        Contacts.getContacts().then(function(result) {
            console.log(result);
        });
        */


        Contacts.getPermissions().then(function(result) {
            console.log(result.data);


            if (result.data.indexOf('contacts.readonly') >= 0) {
                console.log('contacts permission granted');
                Contacts.getContacts().then(function(result) {
                    //console.log(result.data);
                    contactsFormat(result);
                });
            } else {
                console.log('contacts permission not granted');
                //get('/auth/google_contacts')
                ///auth/google_contacts
                //$location.path("/auth/google_contacts");
                //$location.url("/auth/google_contacts");
                //$http.get("/auth/google_contacts").then(function(result) {
                //    console.log(result);
                //});
                location.href = "/auth/google_contacts";
            }
        });

    };

    $scope.conversationImage = function(event) {
        event.stopPropagation();
        console.log('conversationImage');
        $scope.show_image = !$scope.show_image;
        $scope.image_drawer_opened = false;

        /*
                $scope.myImage = '';
                $scope.myCroppedImage = '';
                $scope.image_loaded = false;

                $scope.avatar = 'default';
                */


    };

    /*
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
        console.log($scope.selected);
    };
    */

    /*
        $scope.saveNameChanges = function(event){
            event.stopPropagation();
             //var valy = $("#group_name").val();
            console.log('saveNameChanges: ' + $scope.group_name);
                $scope.selectGroup();
        };
        */

    // Start a conversation
    $scope.createGroup = function(event, contact) {
        event.stopPropagation();
        console.log(contact);
        console.log($scope.selected.length);
        console.log($('#group_name').val());
        console.log($scope.group_name);
        if ($scope.selected.length > 0) {
            $scope.startChat($scope.selected, contact, $scope.group_name);
        }
    };

    // Start a conversation
    $scope.selectedUsers = function(event, contact) {
        event.stopPropagation();
        console.log(contact);
        console.log($scope.selected.length);
        if ($scope.selected.length > 0) {
            $scope.startChat($scope.selected, contact);
        }
    };

    checkImportedContacts = function() {
        //if($scope.currentUser.imported_contacts)
        console.log($scope.currentUser.imported_contacts);
        if ($scope.currentUser.imported_contacts.length > 0) {
            $scope.contacts_imported = true;
            console.log('LOAD IMPORTED CONTACTS');
            $scope.user_contacts = $scope.currentUser.imported_contacts[0].contacts;


           //console.log($scope.contacts);
            // check if imported contact is already a contact
            $scope.user_contacts.map(function(key, array) {
                //console.log(key.email);
                //$http.get("/api/user_data").then(function(result) {
                //$scope.currentUser = result.data.user;

                //array ,attr, val
                //for(var i in $scope.contacts){
                //  console.log($scope.contacts[i].google.email);
                //var index = General.findWithAttr($scope.contacts, 'google', key.email);
                var index = General.arrayObjectIndexOfValue($scope.contacts, key.email, 'google', 'email');

                //console.log(index);
                if (index > 0) {
                    key.is_contact = true;
                }
                //}
                //key.avatar = key.avatar + '?access_token=' + $scope.currentUser.google.token;
                //});
            });
           // console.log($scope.user_contacts);

        }
    };
    //var accessToken;
    // Get the current users details
    $http.get("/api/user_data").then(function(result) {

        if (result.data.user) {
            $scope.currentUser = result.data.user;
            console.log($scope.currentUser);


            //accessToken = result.data.user.google.token;
            // console.log('access_token: ' + accessToken);
            // load this users list of contacts
            loadUserContacts();

            // check whether contacts have been imported
            //checkImportedContacts();

            // Image
            $scope.currentFullUser = result.data.user;
            $scope.user_name = result.data.user.user_name;
            $scope.login_name = result.data.user.google.name;
            $scope.login_email = result.data.user.google.email;
            $scope.avatar = result.data.user.avatar;
            if ($scope.avatar == undefined) {
                $scope.avatar = 'default';
            }
            //
            $scope.avatar = 'default';
            // Hide the preview avatar
            //$('.preview').css('left', '-1000px');
            saved_user_name = $scope.user_name;
            // image
        } else {
            $location.path("/api/login");
        }
    });





    $scope.doSelect = function(contact) {
        console.log(contact);
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
            }, 100);
            // If the contact is deselected and is already in the $scope.selected array.
        } else if (!contact.item_selected && index >= 0) {
            // Get the contacts id.
            var id_0 = $($scope.selected[index])[0]._id;
            // Add the class for remving the contact.
            $('#select_' + id_0).addClass('contact_select_remove');
            // Wait for the contact to animate off screen before removing from $scope.selected.
            $timeout(function() {
                // Get the index position of this contact with the $scope.selected array.
                var index = General.findWithAttr($scope.selected, '_id', contact._id);
                // Remove contact from $scope.selected.
                $scope.selected.splice(index, 1);
                // If there are no items in $scope.selected then close the div which contains the selected contacts.
                if ($scope.selected == 0) {
                    $scope.show_selected_drawer = false;
                    validateGroup();
                }
            }, 301);
        }
    };

    $scope.doChat = function(contact) {
        if (contact.conversation_exists) {
            $scope.chat(contact.conversation_id, contact);
        } else {
            $scope.startChat([contact._id], contact);
        }
    };

    // Continue a conversation by conversation id
    $scope.chat = function(conversation_id, contact) {
        console.log('Chat');
        var profile_obj = {};
        profile_obj.user_name = contact.user_name;
        profile_obj.avatar = contact.avatar;
        Profile.setConvProfile(profile_obj);
        $location.path("/chat/conversation/" + conversation_id);
    };

    // Start a conversation
    // TODO - make sure two users cannot create a chat simultanously
    // TODO - make sure only one chat created with aother single user.
    $scope.startChat = function(new_participants, contact, name) {
        console.log('startChat');
        if (name != undefined) {
            $scope.chat_create.conversation_name = name;
        }
        /*
        var profile_obj = {};
        profile_obj.user_name = contact.user_name;
        profile_obj.avatar = contact.avatar;
        Profile.setConvProfile(profile_obj);
        */

        //$scope.chat_create.conversation_name = $scope.group_name;
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
            console.log(key);
            $scope.chat_create.participants.push({ _id: key._id, viewed: 0 });
        });
        console.log($scope.chat_create);
        // Create conversation in DB.
        Conversations.create($scope.chat_create)
            .then(function(res) {
                console.log(res);
                var profile_obj = {};
                // if group
                //if(res.data.participants.length > 2){
                if (res.data.conversation_name != '') {
                    profile_obj.user_name = res.data.conversation_name;
                    profile_obj.avatar = res.data.conversation_avatar;
                }
                // If two person
                //if(res.data.participants.length == 2){
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
                            //key.name = result.user_name;
                            //avatar = result.avatar;
                            profile_obj.user_name = result.user_name;
                            profile_obj.avatar = result.avatar;
                        }
                        profile_obj.avatar = avatar;
                    });
                }
                Profile.setConvProfile(profile_obj);
                // Go to the conversation after it has been created
                $location.path("/chat/conversation/" + res.data._id);
            });
    };

    $scope.checkChat = function(user, index) {
        console.log('checkchat');
        console.log(user);
        console.log(user.conversation_exists);
        console.log(user.conversation_id);

        if (user.conversation_exists) {
            $scope.chat(user.conversation_id, user, index);
        }

        // res.conversation_exists = true;
        //res.conversation_id = key._id;
        /*
        if (General.findWithAttr(key.participants, '_id', res.data.success._id) >= 0) {
            // set conversation_exists and conversation_id for the contacts
            res.data.success.conversation_exists = true;
            res.data.success.conversation_id = key._id;
        }
        */

    };



    // add a user to the current users contact list
    $scope.addUser = function(id, index, event) {

        event.stopPropagation();
        console.log('addUser');

        Users.add_contact(id)
            .then(function(res) {
                // Update the currentUser model
                $scope.currentUser = res.data;
                // remove this search result because it has now been added to the list of contacts
                //$scope.search_results.splice(index, 1);
                $scope.search_results[index].is_contact = true;
                // re-load the user contacts
                loadUserContacts();
            });

    };

    // check whether the search result is already a contact
    $scope.checkIfContact = function(result) {
        console.log('check result id: ' + result);
        console.log($scope.contacts);
        // if the result is the current user
        if (result === $scope.currentUser._id) {
            console.log('currentUser');
            return true;
        }
        // loop through the current users contact list
        for (var i = 0; i < $scope.contacts.length; i++) {
            // Check whether already a contact
            console.log($scope.contacts[i]._id + ' ==? ' + result);
            if ($scope.contacts[i]._id === result) {
                // already a contact
                return true;
            }
        }
        // not already a contact
        return false;
    };

    $scope.addInvite = function(email) {
        $scope.selectInvite();
        $scope.invite_input = email;
    };
    // invite a user to join via email
    $scope.inviteUser = function(invite_input) {
        console.log(invite_input);
        $scope.invite_user.recipient = invite_input;
        $scope.invite_user.sender_id = $scope.currentUser._id;
        $scope.invite_user.sender_name = $scope.currentUser.google.name;
        // create invite in database

        Invites.create_invite($scope.invite_user)
            .then(function(response) {
                // send the invite via email
                //sendMail(response.data);
                $scope.invite_sent = true;
                $scope.invite_input = '';
            });

    };

    // load this users contacts
    loadUserContacts = function() {
        console.log('loadUserContacts');
        // reset the contacts model
        $scope.contacts = [];



        var result = $scope.currentUser.contacts.map(function(key, array) {
            // Search for each user in the contacts list by id
            return Users.search_id(key)
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
                        console.log(res.data.success);
                    }
                    return;
                })
                .catch(function(error) {
                    console.log('error: ' + error);
                });

        });

        Promise.all(result).then(function() {
            // do something after the loop finishes
            console.log('promise fin');
            console.log($scope.contacts);
            $scope.contacts_on = true;
            // check whether contacts have been imported
            checkImportedContacts();
        }).catch(function(err) {
            // do something when any of the promises in array are rejected
        });

        // console.log($scope.contacts);

/*
        for (var i = 0; i < 10; i++) {
            var newcontact = { id: '1234', user_name: 'stever', avatar: 'fileuploads/images/pinky_2.png' };
            $scope.contacts.push(newcontact);
        }
        */


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
                            //var isConttact = $scope.checkIfContact(res._id);
                            // Do not list current user
                            if (res._id != $scope.currentUser._id) {


                                if ($scope.checkIfContact(res._id)) {
                                    res.is_contact = true;
                                }
                                //
                                // Check if individual conversation already created with this contact
                                // Get all coversations containing current user.
                                $http.get("/chat/conversation").then(function(result) {
                                    result.data.map(function(key, array) {
                                        // check that this is a two person chat.
                                        // Groups of three or more are loaded in conversations.html
                                        if (key.participants.length === 2) {
                                            // Check that current user is a participant of this conversation
                                            //var conversation_pos = General.findWithAttr(res.data, '_id', msg.conversation_id);
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
                                //console.log(res);

                                $scope.search_results.push(res);
                                $scope.$apply();
                            }

                        }));
                    },
                    error: function(error) {
                        console.log('error: ' + error);
                    }
                });
            },
            // The minimum number of characters a user must type before a search is performed.
            minLength: SEARCH_MIN,
        });
    });
}]);