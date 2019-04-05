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

    var bound_l;
    var bound_r;
    var bound_t;
    var bound_b;
    var bound_w;
    var bound_h;

    var drag_w;

    this.setUp = function(elmnt, boundary) {
        self.elmnt = elmnt;
        var pos1 = 0,
            pos2 = 0,
            pos3 = 0,
            pos4 = 0;

        var cropper_loc = $(elmnt).closest('.cropper_cont');
        var offset_top = $(cropper_loc).offset().top;
        var offset_left = $(cropper_loc).offset().left;

        bound_l = boundary.getBoundingClientRect().left;
        bound_r = boundary.getBoundingClientRect().right;
        bound_t = boundary.getBoundingClientRect().top;
        bound_b = boundary.getBoundingClientRect().bottom;
        bound_w = $(boundary).outerWidth();
        bound_h = $(boundary).outerHeight();

      

        //console.log(bound_l + ' : ' + bound_r + ' : ' + bound_t + ' : ' + bound_b );
        elmnt.onmousedown = dragMouseDown;
        elmnt.addEventListener("touchstart", dragMouseDown, false);
    };

    function dragMouseDown(e) {
        e = e || window.event;
        if (e.cancelable) {
            e.preventDefault();
        }
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;

        drag_w = $(self.elmnt).outerWidth();

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
        //console.log(pos1 + ' : ' + pos2 + ' : ' + pos3 + ' : ' + pos4);
        //console.log(self.elmnt.offsetTop);
        var per_top;
        var per_left;
        // set the element's new position:
        var pos = $(self.elmnt).position();
        var new_top = pos.top - pos2;
        var new_left = pos.left - pos1;
        //var new_top = self.elmnt.offsetTop - pos2;
        //var new_left = self.elmnt.offsetLeft - pos1;
        var current_right = drag_w + new_left;
        //console.log(current_right);
        //console.log(bound_w);
        



        //self.closeDragElement
        if (new_top >= 0 && (new_left >= 0 && current_right <= bound_w)) {
            self.elmnt.style.top = new_top + "px";
            per_top = new_top;
            self.elmnt.style.left = new_left + "px";
            per_left = new_left;
            var per_bottom = $('#crop_src').height() - (per_top + $('.crop_adjust').outerHeight());
            var per_right = $('#crop_src').width() - (per_left + $('.crop_adjust').outerWidth());
            $('.crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
        }
        //var per_top = self.elmnt.offsetTop - pos2;
        //var per_left = self.elmnt.offsetLeft - pos1;
        /*
        var per_bottom = $('#crop_src').height() - (per_top + $('.crop_adjust').outerHeight());
        var per_right = $('#crop_src').width() - (per_left + $('.crop_adjust').outerWidth());
        $('.crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
        */
    }

    this.stopDragElement = function() {
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