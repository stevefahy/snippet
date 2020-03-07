//
// Notify Service
//

cardApp.service('Notify', ['$rootScope', '$templateRequest', '$sce', '$timeout', function($rootScope, $templateRequest, $sce, $timeout) {

    var self = this;

    var addingnotify = false;

    // Notify

    this.addNotify = function() {
        if (!addingnotify) {
            var notify = $sce.getTrustedResourceUrl('/views/notify.html');
            $templateRequest(notify).then(function(template) {
                var eb = $('.main').prepend(template);
                addingnotify = true;
                $timeout(function() {
                    $(".notify_container").addClass('notify_anim_on');
                    $(".notify_anim_on").on("animationend", notifyAddEnd);
                }, 100);
            });
        }
    }

    this.removeNotify = function() {
        $(".notify_container").addClass('notify_anim_off');
        $(".notify_anim_off").on('animationend', notifyRemoveEnd);
    }

    function notifyAddEnd() {
        $(".notify_anim_on").off('animationend', notifyAddEnd);
        self.removeNotify();
    }

    function notifyRemoveEnd() {
        addingnotify = false;
        $(".notify_anim_off").off('animationend', notifyRemoveEnd);
        $(".notify_container").removeClass('notify_anim_off');
        $(".notify_container").remove();
        $rootScope.$broadcast('notifyEnd');
    }

}]);