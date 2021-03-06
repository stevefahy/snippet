cardApp.controller("cardcreateCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', '$timeout', 'Cards', 'replaceTags', 'Format', 'FormatHTML', 'Edit', 'Conversations', 'socket', 'Users', 'Database', 'principal', 'UserData', function($scope, $rootScope, $location, $http, $window, $timeout, Cards, replaceTags, Format, FormatHTML, Edit, Conversations, socket, Users, Database, principal, UserData) {

    var ua = navigator.userAgent;

    var INPUT_PROMPT = "Enter some text";

    $scope.getFocus = Format.getFocus;
    $scope.contentChanged = Format.contentChanged;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    $scope.uploadFile = Format.uploadFile;
    $scope.restoreSelection = Format.restoreSelection;
    $scope.checkCursor = Format.checkCursor;

    $window.imageUploaded = Format.imageUploaded;
    $window.imageUploadedOffline = Format.imageUploadedOffline;

    $scope.input = false;
    var isFocused = false;

    if (principal.isValid()) {
        UserData.checkUser().then(function(result) {
            $scope.currentUser = UserData.getUser();
            $scope.card_create.user = $scope.currentUser.user_name;
        });
    }

    $timeout(function() {
        // Add the input prompt text
        $('#placeholderDiv').html(INPUT_PROMPT);
        // listen for focus
        $('#cecard_create').on('focus', function() {
            $scope.focused = true;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
        $('#cecard_create').on('blur', function() {
            $scope.focused = false;
        });
    });

    $(document).on('input keyup', '#cecard_create', function() {
        checkInput('#cecard_create');
    });

    // Refocus to the input area if the placeholder is focused.
    $(document).on('click', '#placeholderDiv', function() {
        $('#cecard_create').focus();
    });

    $scope.card_create = {
        _id: 'card_create',
        content: '',
        user_name: ''
    };

    // Broadcast by Database createCard service when a new card has been created
    $scope.$on('CARD_CREATED', function(event, data) {
        // Reset the model
        $scope.card_create.content = '';
        $('#cecard_create').html('');
        $scope.input = false;
        if (ua.indexOf('AndroidApp') < 0) {
            $('#cecard_create').focus();
        }
        checkInput('#cecard_create');
    });

    // If cecard_create was the last focused element restore the caret position there and create image.
    $scope.media = function(event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        if (isFocused) {
            $scope.restoreSelection(document.getElementById("cecard_create"));
            $scope.uploadFile();
        }
    };

    // Check that the cecard_create was the last focused element
    $scope.checkFocus = function() {
        if ($scope.focused) {
            isFocused = true;
        } else {
            isFocused = false;
        }
    };

    // Create Card
    $scope.createCard = function(id, card_create) {
        Database.createCard(id, card_create, $scope.currentUser);
    };

    // Hide the placeholder text when an image is created.
    imagePosted = function() {
        var focused = document.activeElement;
        if (focused.id == 'cecard_create') {
            $scope.input = true;
            $('#placeholderDiv').hide();
        }
    };

    checkInput = function(elem) {
        var trim = $.trim($(elem).text());
        // check for whitespace at first position and remove
        if (trim.length == 1 && trim.charCodeAt(0) == '8203') {
            $(elem).html('');
        }
        // If there has been text or an image inputed then hide the placeholder text.
        if ($(elem).text().length > 0 || $(elem).html().indexOf('<img') >= 0) {
            $('#placeholderDiv').hide();
            $scope.input = true;
        } else {
            $('#placeholderDiv').show();
            $scope.input = false;
        }
    };

    setFocus = function() {
        $timeout(function() {
            var element = $window.document.getElementById('cecard_create');
            if (element) {
                element.focus();
            }
        });
    };

    // only check focus on web version
    if (ua.indexOf('AndroidApp') < 0) {
        $window.onfocus = function() {
            //setFocus();
        };
        //$window.focus();
        //setFocus();
    }

    $scope.$on('$destroy', function() {
        // leaving controller.
        $window.onfocus = null;
    });

}]);