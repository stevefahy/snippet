cardApp.controller("MainCtrl", ['$scope', '$window', '$rootScope', '$timeout', 'UserData', 'socket', 'principal', 'viewAnimationsService', function($scope, $window, $rootScope, $timeout, UserData, socket, principal, viewAnimationsService) {

    // Broadcast by socket after it has reconnected. Check for updates.
    $scope.$on('SOCKET_RECONNECT', function(event) {
        console.log('SOCKET_RECONNECT');
        //UserData.checkDataUpdate();
    });

    // Broadcast by socket service when data needs to be updated.
    $scope.$on('UPDATE_DATA', function(event, msg) {
        UserData.updateContact(msg.update_values)
            .then(function(result) {
                //console.log(result);
            });
        UserData.updateConversationsUser(msg.update_values)
            .then(function(result) {
                //console.log(result);
            });
    });

    //
    // ROUTE ANIMATION
    //

    var from;
    var to;

    $rootScope.$on('$routeChangeSuccess', function(event, next, prev) {
        if (prev != undefined) {
            //console.log(prev.$$route.originalPath);
            $rootScope.prev_route = prev.$$route.originalPath;
        }
    });

    $scope.$on('$routeChangeStart', function($event, next, current) {

        to = next.$$route.originalPath;

        if (current != undefined) {
            //console.log('current: ' + current.$$route.originalPath);
            from = current.$$route.originalPath;
            // Not a directly loaded page.
            $rootScope.animate_pages = true;
        }

        if (from == '/' && to == '/chat/conversations') {
            //console.log('FROM / TO /chat/conversations');
            $('#page-system').removeClass("page-static");
            $('#page-system').addClass("page-anim");
            viewAnimationsService.setEnterAnimation('page-anim z6000');
            viewAnimationsService.setLeaveAnimation('page-static z5000');
        } else if (from == '/chat/conversations' && to == '/') {
            //console.log('FROM /chat/conversations TO /');
            $('#page-system').removeClass("page-static");
            $('#page-system').addClass("page-anim");
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z6000');
        } else if (from == '/chat/conversations' && to == '/chat/conversation/:id') {
            //console.log('FROM /chat/conversations TO /chat/conversation/:id');
            viewAnimationsService.setEnterAnimation('page-anim z9000');
            viewAnimationsService.setLeaveAnimation('page-static z5000');
        } else if (from == '/chat/conversation/:id' && to == '/chat/conversations') {
            //console.log('FROM /chat/conversation/:id TO /chat/conversations');
            $('#page-system').removeClass("page-static");
            $('#page-system').addClass("page-anim");
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z9000');
        } else if (from == '/chat/conversation/:id' && to == '/api/group_info/:id') {
            //console.log('FROM /chat/conversation/:id TO /api/group_info/:id');
            $('#page-system').removeClass("z9000");
            viewAnimationsService.setEnterAnimation('page-anim z6000');
            viewAnimationsService.setLeaveAnimation('page-static z5000');
        } else if (from == '/api/group_info/:id' && to == '/chat/conversation/:id') {
            //console.log('FROM /api/group_info/:id TO /chat/conversation/:id');
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z7000');
        } else if (from == '/chat/conversations' && to == '/c/contacts') {
            //console.log('FROM /chat/conversations TO /c/contacts');
            viewAnimationsService.setLeaveAnimation('page-static z5000');
            viewAnimationsService.setEnterAnimation('page-anim z7000');
        } else if (from == '/c/contacts' && to == '/chat/conversations') {
            //console.log('FROM /c/contacts TO /chat/conversations');
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z7000');
        } else if (from == '/' && to == '/c/contacts') {
            //console.log('FROM / TO /c/contacts');
            viewAnimationsService.setEnterAnimation('page-anim z7000');
            viewAnimationsService.setLeaveAnimation('page-static z5000');
        } else if (from == '/c/contacts' && to == '/') {
            //console.log('FROM /c/contacts TO /');
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z9000');
        } else if (from == '/c/contacts' && to == '/chat/conversation/:id') {
            //console.log('FROM /c/contacts TO /chat/conversation/:id');
            viewAnimationsService.setEnterAnimation('page-anim z9000');
            viewAnimationsService.setLeaveAnimation('page-static z7000');
        } else if (from == '/' && to == '/api/user_setting') {
            //console.log('FROM / TO /api/user_setting');
            viewAnimationsService.setEnterAnimation('page-anim z9000');
            viewAnimationsService.setLeaveAnimation('page-static z5000');
        } else if (from == '/api/user_setting' && to == '/') {
            //console.log('FROM /api/user_setting TO /');
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z9000');
        } else if (from == '/chat/conversations' && to == '/api/user_setting') {
            //console.log('FROM /chat/conversations TO /api/user_setting');
            viewAnimationsService.setEnterAnimation('page-anim z9000');
            viewAnimationsService.setLeaveAnimation('page-static z5000');
        } else if (from == '/api/user_setting' && to == '/chat/conversations') {
            //console.log('FROM /api/user_setting TO /chat/conversations');
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z9000');
        } else if (from == '/chat/conversations' && to == '/:username') {
            //console.log('FROM /chat/conversations TO /:username');
            viewAnimationsService.setEnterAnimation('page-anim z9000');
            viewAnimationsService.setLeaveAnimation('page-static z5000');
        } else if (from == '/:username' && to == '/chat/conversations') {
            //console.log('FROM /:username TO /chat/conversations');
            $('#page-system').removeClass("page-static");
            $('#page-system').addClass("page-anim");
            viewAnimationsService.setEnterAnimation('page-static z5000');
            viewAnimationsService.setLeaveAnimation('page-anim z9000');
        }

    });

}]);