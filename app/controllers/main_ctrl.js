cardApp.controller("MainCtrl", ['$scope', '$window', '$rootScope', 'socket', 'principal', 'UserData', function($scope, $window, $rootScope, socket, principal, UserData) {

    $rootScope.dataLoading = false;

    var ua = navigator.userAgent;

    function getHiddenProp() {
        var prefixes = ['webkit', 'moz', 'ms', 'o'];

        // if 'hidden' is natively supported just return it
        if ('hidden' in document) return 'hidden';

        // otherwise loop over all the known prefixes until we find one
        for (var i = 0; i < prefixes.length; i++) {
            if ((prefixes[i] + 'Hidden') in document)
                return prefixes[i] + 'Hidden';
        }

        // otherwise it's not supported
        return null;
    }

    function isHidden() {
        var prop = getHiddenProp();
        if (!prop) return false;

        return document[prop];
    }

    // use the property name to generate the prefixed event name
    var visProp = getHiddenProp();
    if (visProp) {
        // Web only
        if (ua.indexOf('AndroidApp') < 0) {
            var evtname = visProp.replace(/[H|h]idden/, '') + 'visibilitychange';
            document.addEventListener(evtname, visChange);
        }
    }

    function visChange() {
        if (isHidden()) {
            console.log('hidden');
        } else {
            console.log('visible');

            console.log('socket: ' + socket.isConnected());
            console.log('logged in: ' + principal.isValid());
            if (!socket.isConnected()) {
                // connect to socket.io via socket service 
                // and request that a unique namespace be created for this user with their user id
                //socket.setId(UserData.getUser()._id);
                //socket.connect(socket.getId());
            }
        }

    }

    if (ua.indexOf('AndroidApp') < 0) {
        $window.onfocus = function() {
            console.log('foc');
            UserData.checkDataUpdate();
        };
    }

}]);