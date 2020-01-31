//
// ContentEditable Service
//

cardApp.service('ContentEditable', ['$rootScope', function($rootScope) {

    // Set the cards contenteditable boolean value.
    this.setContenteditable = function(cropper, bool) {
        $(cropper).closest('div.ce').attr('contenteditable', bool);
    };

    // get the cards contenteditable boolean value.
    this.getContenteditable = function(cropper) {
        return $(cropper).closest('div.ce').attr('contenteditable');
    };

}]);