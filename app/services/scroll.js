//
// Scroll Service
//

cardApp.service('Scroll', function() {

    this.enable = function(target) {
        $(target).css('overflow-y', 'visible');
    };

    this.disable = function(target) {
        $(target).css('overflow-y', 'hidden');
        //$(target).css('overflow-x', 'visible');
    };

});