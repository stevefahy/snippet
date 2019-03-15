cardApp.controller("conversationsCtrl", ['$scope', '$rootScope', '$location', '$http', 'Invites', 'Email', 'Users', 'Conversations', '$q', 'FormatHTML', 'General', 'Profile', '$cookies', '$timeout', 'principal', 'UserData', function($scope, $rootScope, $location, $http, Invites, Email, Users, Conversations, $q, FormatHTML, General, Profile, $cookies, $timeout, principal, UserData) {

    // Detect device user agent 
    var ua = navigator.userAgent;
    // array of conversations
    $scope.conversations = [];

    var SCROLL_THUMB_MIN = 5;

    var currentScroll;
    var maxScroll;
    var ch;
    var pb;
    var mobile = false;

    if (ua.indexOf('AndroidApp') >= 0) {
        mobile = true;
    }

    // Continue chat
    $scope.chat = function(conversation_id, conversation, index) {
        // Set profile change for the conversation.
        var profile_obj = {};
        profile_obj.user_name = conversation.name;
        profile_obj.avatar = conversation.avatar;
        Profile.setConvProfile(profile_obj);
        // Redirect to the conversation.
        $location.path("/chat/conversation/" + conversation_id);
    };

    // Continue public conversation
    $scope.chatPublic = function(admin, conversation, index) {
        // Set profile change for the conversation.
        var profile_obj = {};
        profile_obj.user_name = conversation.name;
        profile_obj.avatar = conversation.avatar;
        Profile.setConvProfile(profile_obj);
        var user = UserData.getUser();
        $location.path("/" + user.google.name);
    };

    $scope.$on('window_resize', function(ngRepeatFinishedEvent) {
        setUpScrollBar();
    });

    $scope.$watch('conversations.length', function(newStatus) {
        if (maxScroll > 0) {
            setUpScrollBar();
        }
    });

    $scope.$on('$destroy', function() {
        //leaving controller.
        unbindScroll();
    });

    unbindScroll = function() {
        $('.content_cnv')[0].removeEventListener('scroll', scrollFunction, { passive: true }, { once: true });
        $('.progress-container').removeClass('active');
    };

    bindScroll = function() {
        setUpScrollBar();
        $('.content_cnv')[0].addEventListener('scroll', scrollFunction, { passive: true }, { once: true });
    };

    var updateScrollBar = function() {
        var sth = (100 / (((ch / cdh) * 100) / 100));
        if (sth < SCROLL_THUMB_MIN) {
            sth = SCROLL_THUMB_MIN;
        }
        // Set the progress thumb height.
        $(pb).css('height', sth + "%");
        var sm = 100 - sth;
        var s = (currentScroll / (maxScroll) * 100);
        s = (s * sm) / 100;
        // Set the progress thumb position.
        pb.style.top = s + "%";
    };

    setUpScrollBar = function() {
        if (mobile) {
            $('.progress-container').css('top', $('.content_cnv').offset().top);
            $('.progress-container').css('height', $('.content_cnv').height());
            pb = document.getElementById('progress-thumb');
            $(pb).css('height', SCROLL_THUMB_MIN + "%");
            cdh = $('.content_cnv').height();
            ch = $('.content_cnv')[0].scrollHeight;
            currentScroll = $('.content_cnv').scrollTop();
            maxScroll = $('.content_cnv')[0].scrollHeight - $('.content_cnv')[0].clientHeight;
            if (maxScroll > 0) {
                $('.progress-container').addClass('active');
                $('#progress-thumb').removeClass('fade_in');
                $('#progress-thumb').addClass('fade_in');
                updateScrollBar();
            }
        }
    };

    var scrollFunction = function() {
        currentScroll = $(this).scrollTop();
        maxScroll = this.scrollHeight - this.clientHeight;
        var scrolled = (currentScroll / maxScroll) * 100;
        updateScrollBar();
    };

    loadConversations = function() {
        var deferred = $q.defer();
        var promises = [];
        var sent_content_length = 200;
        var sender_name;
        var card_content;
        var formatted_conversations;
        var prom1 = UserData.getConversations().then(function(result) {
            formatted_conversations = result;
            formatted_conversations.map(function(key, array) {
                var prom2 = UserData.getConversationLatestCardById(key._id).then(function(result) {
                    var user_unviewed;
                    if (result.data == null) {
                        result.data = key;
                        sender_name = "";
                        result.data.content = "";
                    }
                    key.updatedAt = result.data.updatedAt;
                    card_content = result.data.content;
                    // get the index position of the current user within the participants array
                    var user_pos = General.findWithAttr(key.participants, '_id', UserData.getUser()._id);
                    if (user_pos >= 0) {
                        // get the currently stored unviewed cards for the current user
                        user_unviewed = key.participants[user_pos].unviewed;
                        // Set the new_messages number.
                        key.new_messages = user_unviewed.length;
                    }
                    // Set the card content.
                    // set the name of the user who sent the card
                    if (result != 'null') {
                        var sn = UserData.getContact(result.data.user);
                        if (sn != "Unknown") {
                            sender_name = sn.user_name;
                        }
                    } else {
                        sender_name = 'null';
                    }
                    // Public conversation
                    if (key.conversation_type == 'public') {
                        // Get the conversation name and add to model.
                        key.name = key.conversation_name;
                        key.avatar = key.conversation_avatar;
                        notification_body = card_content;
                    }
                    // Group conversation. (Two or more)
                    if (key.conversation_name != '') {
                        // Get the conversation name and add to model.
                        key.name = key.conversation_name;
                        key.avatar = key.conversation_avatar;
                        notification_body = sender_name + ': ' + card_content;
                    }
                    // Two user conversation (not a group)
                    if (key.conversation_name == '') {
                        if (user_pos >= 0) {
                            // get the currently stored unviewed cards for the current user
                            user_unviewed = key.participants[user_pos].unviewed;
                            // Set the new_messages number.
                            key.new_messages = user_unviewed.length;
                        }
                        // Get the position of the current user
                        if (user_pos === 0) {
                            participant_pos = 1;
                        } else {
                            participant_pos = 0;
                        }
                        // Find the other user
                        var res = UserData.getContact(key.participants[participant_pos]._id);
                        var avatar = "default";
                        // set the other user name as the name of the conversation.
                        if (res) {
                            key.name = res.user_name;
                            avatar = res.avatar;
                        }
                        key.avatar = avatar;
                        notification_body = card_content;
                    }
                    sent_content = FormatHTML.prepSentContent(notification_body, sent_content_length);
                    key.latest_card = sent_content;
                });
                promises.push(prom2);
            });
        });
        promises.push(prom1);
        $q.all(promises).then(function() {
            $scope.conversations = formatted_conversations;
            // Wait for the page transition animation to end before applying scroll.
            $timeout(function() {
                bindScroll();
            }, 1000);
        });
    };

    // Check logged in.
    if (principal.isValid()) {
        // Check whether the users data has loaded.
        UserData.checkUser().then(function(result) {
            if (result != undefined) {
                $scope.currentUser = UserData.getUser();
                var profile = {};
                profile.avatar = 'default';
                profile.user_name = UserData.getUser().user_name;
                if (UserData.getUser().avatar != undefined) {
                    profile.avatar = UserData.getUser().avatar;
                }
                // Store the profile.
                Profile.setProfile(profile);
                $rootScope.$broadcast('PROFILE_SET');
                // get the local conversations
                loadConversations();
                //
            } else {
                $location.path("/api/login");
            }
        });
    } else {
        $location.path("/api/login");
    }

}]);