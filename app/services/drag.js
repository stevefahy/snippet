//
// Drag Service
//

cardApp.service('Drag', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', 'ImageAdjustment', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal, ImageAdjustment) {
    var ua = navigator.userAgent;
    var mobile = false;
    if (ua.indexOf('AndroidApp') >= 0) {
        mobile = true;
    }
    var self = this;
    var elmnt = null;
    this.setUp = function(elmnt) {
        console.log('setUp');
        self.elmnt = elmnt;

        var pos1 = 0,
            pos2 = 0,
            pos3 = 0,
            pos4 = 0;

        elmnt.onmousedown = dragMouseDown;

        elmnt.addEventListener("touchstart", dragMouseDown, false);
    };



    function dragMouseDown(e) {
        console.log('start drag');
        e = e || window.event;
        //e.preventDefault();
        if (e.cancelable) {
            e.preventDefault();
        }
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;

        if (!mobile) {
            document.onmouseup = self.closeDragElement;
            // call a function whenever the cursor moves:
            document.onmousemove = elementDrag;
        }

        if (mobile) {
            self.elmnt.addEventListener("touchend", self.closeDragElement, true);
            self.elmnt.addEventListener("touchmove", elementDrag, false);
        }

    }

    function elementDrag(e) {
        console.log('drag');
        e = e || window.event;
        if (e.cancelable) {
            e.preventDefault();
        }
        // calculate the new cursor position:
        if (!mobile) {
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
        }
        if (mobile) {
            pos1 = pos3 - e.touches[0].clientX;
            pos2 = pos4 - e.touches[0].clientY;
            pos3 = e.touches[0].clientX;
            pos4 = e.touches[0].clientY;
        }
        // set the element's new position:
        self.elmnt.style.top = (self.elmnt.offsetTop - pos2) + "px";
        self.elmnt.style.left = (self.elmnt.offsetLeft - pos1) + "px";

        var per_top = self.elmnt.offsetTop - pos2;
        var per_left = self.elmnt.offsetLeft - pos1;
        var per_bottom = $('#crop_src').height() - (per_top + $('.crop_adjust').outerHeight());
        var per_right = $('#crop_src').width() - (per_left + $('.crop_adjust').outerWidth());

        $('.crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
    }

    this.stopDragElement = function() {
        console.log('stop drag');
        if (!mobile) {
            self.elmnt.onmousedown = null;
        } else {
            self.elmnt.removeEventListener("touchstart", dragMouseDown, false);
        }
        self.closeDragElement();
    };

    this.resume = function() {
        if (!mobile) {
            self.elmnt.onmousedown = dragMouseDown;
        } else {
            self.elmnt.addEventListener("touchstart", dragMouseDown, false);
        }
    };

    this.closeDragElement = function() {
        console.log('close drag');
        /* stop moving when mouse button is released:*/
        if (!mobile) {
            document.onmouseup = null;
            document.onmousemove = null;
        }
        if (mobile) {
            self.elmnt.removeEventListener("touchend", self.closeDragElement, true);
            self.elmnt.removeEventListener("touchmove", elementDrag, false);
        }
    };

}]);