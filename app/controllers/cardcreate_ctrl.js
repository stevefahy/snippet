cardApp.controller("cardcreateCtrl", ['$scope', '$rootScope', '$location', '$http', '$window', '$timeout', 'Cards', 'replaceTags', 'Format', 'Edit', 'Conversations', 'socket', 'Users', 'Database', function($scope, $rootScope, $location, $http, $window, $timeout, Cards, replaceTags, Format, Edit, Conversations, socket, Users, Database) {

    var ua = navigator.userAgent;

    var DEFAULT_TEXT = "<span class=\"disable_edit\" unselectable=\"on\" onselectstart=\"return false;\">Type a message</span>";

    $scope.getFocus = Format.getFocus;
    $scope.contentChanged = Format.contentChanged;
    $scope.checkKey = Format.checkKey;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    $scope.uploadFile = Format.uploadFile;
    $scope.myFunction = Edit.myFunction;

    $scope.input_text = DEFAULT_TEXT;

    $scope.default = function() {
        console.log('default');
        if ($scope.card_create.content == DEFAULT_TEXT) {
            $scope.card_create.content = '';
        }
    };


    $timeout(function() {
        var el = $window.document.getElementById('cecard_create');
        el.onfocus = function() {
            console.log('foc');
            console.log($scope.card_create.content + ' == ' + DEFAULT_TEXT);
            if ($scope.card_create.content == DEFAULT_TEXT) {

                // Work around Chrome's little problem
                window.setTimeout(function() {
                    console.log('here');
                    selection = window.getSelection();
                    var sel = window.getSelection();
                    range = document.createRange();
                    range.setStart(el, 0);
                    range.setEnd(el, 0);
                    selection.removeAllRanges();
                    selection.addRange(range);


                }, 100);

            }


        };
    });
    /*
    el.focus();
        var range = el.createTextRange();
        range.collapse(true);
        range.select();
        */


    $scope.card_create = {
        _id: 'card_create',
        content: DEFAULT_TEXT, //'',
        //user: $scope.currentUser,
        user_name: ''
    };

    // Broadcast by Database createCard service when a new card has been created
    $scope.$on('CARD_CREATED', function(event, data) {
        $scope.card_create.content = '';
    });

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