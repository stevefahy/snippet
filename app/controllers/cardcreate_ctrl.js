cardApp.controller("cardcreateCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', '$timeout', 'Cards', 'replaceTags', 'Format', 'FormatHTML', 'Edit', 'Conversations', 'socket', 'Users', 'Database', function($scope, $rootScope, $location, $http, $window, $timeout, Cards, replaceTags, Format, FormatHTML, Edit, Conversations, socket, Users, Database) {

    var ua = navigator.userAgent;

    var INPUT_PROMPT = "Enter some text";

    $scope.getFocus = Format.getFocus;
    $scope.contentChanged = Format.contentChanged;
    $scope.checkKey = Format.checkKey;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    $scope.uploadFile = Format.uploadFile;
    //$scope.myFunction = Edit.myFunction;
    $scope.restoreSelection = Format.restoreSelection;

    $scope.saveSelection = Format.saveSelection;
    $scope.checkCursor = Format.checkCursor;

    $scope.input = false;
    var isFocused = false;

    // Add the input prompt attribute
    $timeout(function() {


        $('#cecard_create').on('focus', function() {
            $scope.focused = true;
            //$timeout(function() {
            if (!$scope.$$phase) {
                $scope.$apply();
            }
            //});
            //$scope.$apply();
            if (ua.toLowerCase().indexOf('firefox') > -1 || ua.toLowerCase().indexOf('edge') > -1) {
                //var $this = $(this);
                //$this.html($this.html() + '<br>'); // firefox hack
            }



        });


        $('#cecard_create').on('blur', function() {
            //console.log('BLUR');
            $scope.focused = false;
            /*
            var last_focus = document.activeElement;
            console.log(last_focus);
            var caretPosEl = document.getElementById("caretposition");
            caretPosEl.innerHTML = "Last focused: " + last_focus;
            */

            if (ua.toLowerCase().indexOf('firefox') > -1 || ua.toLowerCase().indexOf('edge') > -1) {
                //var $this = $(this);
                //$this.text($this.text().replace('<.*?>', ''));
            }
        });

    });

    checkInput = function() {

    };

    imageLoaded = function() {
        console.log('imageLoaded');
        //checkInput();
        $scope.input = true;
        $('#placeholderDiv').hide();
    };

    $(document).on('input keyup', '#cecard_create', function() {
        var trim = $.trim($('#cecard_create').text());
        console.log('trim : ' + trim);
        // check for whitespace at first position
        if (trim.length == 1 && trim.charCodeAt(0) == '8203') {
            $('#cecard_create').html('');
        }
        //if ($.trim($('#cecard_create').text()).length > 0) {
        if ($('#cecard_create').text().length > 0) {
            $('#placeholderDiv').hide();
            $scope.input = true;
        } else {
            $('#placeholderDiv').show();
            $scope.input = false;
        }
    });


    // Add the input prompt listener
    (function($) {
        $(document).on('change keydown keypress input', 'div[data-placeholder]', function() {
            if (this.textContent) {
                $scope.input = true;
                //this.dataset.divPlaceholderContent = 'true';

            } else {
                $scope.input = false;
                //window.getSelection().removeAllRanges();
                //delete(this.dataset.divPlaceholderContent);
            }
        });

    })(jQuery);




    $scope.card_create = {
        _id: 'card_create',
        content: "",
        //user: $scope.currentUser,
        user_name: ''
    };

    // Broadcast by Database createCard service when a new card has been created
    $scope.$on('CARD_CREATED', function(event, data) {
        // Reset the placholder for text input checking
        $('#cecard_create').removeAttr("data-div-placeholder-content");
        // Reset the model
        $scope.card_create.content = '';
        //
        $scope.input = false;
    });

    $scope.media = function() {
        console.log('isFocused: ' + isFocused);

        if (isFocused) {
            console.log('media');
            //$scope.restoreCaret('cecard_create');
            //$scope.restoreSelection('cecard_create');
            //console.log('savedSelection: ' + savedSelection);
            // if (savedSelection) {
            $scope.restoreSelection(document.getElementById("cecard_create"));
            // }

            $scope.uploadFile();
        }
    };

    $scope.checkFocus = function() {
        console.log('checkFocus');
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

    setFocus = function() {
        $timeout(function() {
            var element = $window.document.getElementById('cecard_create');
            if (element) {
                element.focus();
                $rootScope.$broadcast('CONV_CHECK');
            }
        });
    };

    // only check focus on web version
    if (ua !== 'AndroidApp') {
        $window.onfocus = function() {
            //this.setFocus();

        };
        $window.focus();
        setFocus();
    }

    // TODO - Better way to get user details across controllers. service? middleware? app.use?
    // Get the current users details
    $http.get("/api/user_data").then(function(result) {
        $scope.currentUser = result.data.user;
        $scope.card_create.user = $scope.currentUser.google.name;
    });

}]);