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
    $scope.restoreSelection = Format.restoreSelection;

    //$scope.saveSelection = Format.saveSelection;
    $scope.checkCursor = Format.checkCursor;

    $scope.input = false;
    var isFocused = false;




/*
    var style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = '.create_c_input { width: 75px; }';
    document.getElementsByTagName('head')[0].appendChild(style);
    //document.getElementById('someElementId').className = 'create_c_input';
    */
    // Add the input prompt attribute
    $timeout(function() {

        console.log($('.create_container').innerWidth());
        console.log($('.create_container').outerWidth());
        console.log($('.create_container').outerWidth(true));
        console.log($('.create_container')[0]['clientWidth']);

        $('#placeholderDiv').html(INPUT_PROMPT);
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
    // Hide the placeholder text when an image is created.
    //imageLoaded = function(elem) {
    //   console.log(elem);


    // $scope.input = true;
    //  $('#placeholderDiv').hide();
    // };
    imagePosted = function() {
        console.log('magePosted');
        $scope.input = true;
        $('#placeholderDiv').hide();


        console.log($('.create_container').innerWidth());
        console.log($('.create_container').outerWidth());
        console.log($('.create_container').outerWidth(true));
        console.log($('.create_container')[0]['clientWidth']);

        console.log($('.create_a').width());

        var scrollWidth = $('.create_container').outerWidth() - $('.create_container')[0]['clientWidth'];
        // $('.create_a').width( $('.create_a').width() - scrollWidth );
        //$('.create_container').width($('.create_container')[0]['clientWidth']);
        //var minusscroll = document.body.clientWidth; // El. width minus scrollbar width
        //var withscroll = document.body.scrollWidth;
        //console.log('minusscroll: ' + minusscroll);
        // console.log('withscroll: ' + withscroll);

        //document.getElementById('scroll').clientWidth
/*
        if (ua !== 'AndroidApp') {
            // add scoll class
            $(".create_a").removeClass("create_a_input").addClass("create_a_input_scroll");
            $(".create_a").removeClass("create_a").addClass("create_a_scroll");
            //$(".create_c").removeClass("create_c_input").addClass("create_c_input_scroll");
        }
        */

    };

resetCSS = function(){
            if (ua !== 'AndroidApp') {
            // add scoll class
            $(".create_a_scroll").removeClass("create_a_input_scroll").addClass("create_a_input");
            $(".create_a_scroll").removeClass("create_a_scroll").addClass("create_a");
            //$(".create_c").removeClass("create_c_input").addClass("create_c_input_scroll");
        }
    };

    checkInput = function(elem) {
        var trim = $.trim($(elem).text());
        // check for images
        console.log($(elem).html());
        console.log($(elem).html().indexOf('<img'));
        // check for whitespace at first position and remove
        if (trim.length == 1 && trim.charCodeAt(0) == '8203') {
            $(elem).html('');
        }
        // If there has been text inputed then hide the placeholder text.
        if ($(elem).text().length > 0 && $(elem).html().indexOf('<img') < 0) {
            $('#placeholderDiv').hide();
            $scope.input = true;
        } else {
            $('#placeholderDiv').show();
            $scope.input = false;
            //resetCSS();
        }
    };



    $(document).on('input keyup', '#cecard_create', function() {
        checkInput('#cecard_create');

    });

    $(document).on('click', '#placeholderDiv', function() {
        console.log('focus change');
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
        $scope.input = false;
        $('#cecard_create').focus();
        //$scope.checkCursor();
        checkInput('#cecard_create');
    });

    // If cecard_create was the last focused element restore the caret position there and create image.
    $scope.media = function() {
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
            this.setFocus();
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