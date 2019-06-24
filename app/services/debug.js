//
// Debug Service
//

cardApp.service('Debug', ['$rootScope', function($rootScope) {

    this.show = function() {
        $('.debug_btn').css('visibility', 'visible');
    };

    this.hide = function() {
        $('.debug_btn').css('visibility', 'hidden');
    };

}]);