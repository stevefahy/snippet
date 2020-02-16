//
// Keyboard Service
//

cardApp.service('Keyboard', ['Format', '$rootScope', function(Format, $rootScope) {
    var ua = navigator.userAgent;
    var keyboard_listen = false;
    //
    // Keyboard listener
    //
    // Detect soft keyboard on Android
    var is_landscape = false;
    var initial_height = window.innerHeight;
    var initial_width = window.innerWidth;
    var portrait_height;
    var landscape_height;
    $rootScope.hide_footer = false;
    // If the initial height is less than the screen height (status bar etc..)
    // then adjust the initial width to take into account this difference
    if (initial_height < screen.height) {
        initial_width = initial_width - (screen.height - initial_height);
    }
    if (initial_height > initial_width) {
        //portrait
        portrait_height = initial_height;
        landscape_height = initial_width;
    } else {
        // landscape
        landscape_height = initial_height;
        portrait_height = initial_width;
    }

    this.resizeListener = function() {
        keyboard_listen = true;
        is_landscape = (screen.height < screen.width);
        if (is_landscape) {
            if (window.innerHeight < landscape_height) {
                hideFooter();
            } else {
                showFooter();
            }
        } else {
            if (window.innerHeight < portrait_height) {
                hideFooter();
            } else {
                showFooter();
            }
        }
        $rootScope.$broadcast('window_resize');
    };

    hideFooter = function() {
        var focused = document.activeElement;
        if (focused.id != 'cecard_create') {
            $('.create_container').hide();
        }
        $('.footer').hide();

        $rootScope.$apply(function() {
            $rootScope.hide_footer = true;
        });

        var x = document.activeElement.tagName;
        console.log(x);
        // Paste div that will be scrolled into view if necessary and then deleted.
        Format.pasteHtmlAtCaret("<span class='scroll_latest_footer' id='scroll_latest_footer'></span>");
        // Scroll into view if necessary
        Format.scrollLatest('scroll_latest_footer');
    };

    showFooter = function() {
        $rootScope.$apply(function() {
            $rootScope.hide_footer = false;
        });
        $('.footer').show();
        $('.create_container').show();
        $('#placeholderDiv').css('bottom', '5px');
    };

    // Start listening for keyboard.
    this.keyBoardListenStart = function() {
        if (ua.indexOf('AndroidApp') >= 0) {
            if (!keyboard_listen) {
                window.addEventListener('resize', this.resizeListener);
                keyboard_listen = true;
            }
        }
    };

    // Stop listening for keyboard.
    this.keyBoardListenStop = function() {
        if (keyboard_listen) {
            window.removeEventListener('resize', this.resizeListener);
            keyboard_listen = false;
        }
    };

}]);