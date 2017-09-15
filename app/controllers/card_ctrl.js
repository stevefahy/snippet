cardApp.controller("cardCtrl", ['$scope', 'Cards', 'replaceTags', '$rootScope', 'Format', '$window', '$routeParams', '$location', function($scope, Cards, replaceTags, $rootScope, Format, $window, $routeParams, $location) {

    $scope.getFocus = Format.getFocus;
    $scope.contentChanged = Format.contentChanged;
    $scope.checkKey = Format.checkKey;
    $scope.handlePaste = Format.handlePaste;
    $scope.keyListen = Format.keyListen;
    $scope.showAndroidToast = Format.showAndroidToast;
    $scope.uploadFile = Format.uploadFile;

    //var url = $location.absUrl();
    //$scope.firstParameter = url[2];
    //$scope.secondParameter = url[3];
    // var url = $location.absUrl().indexOf('/s/');
    // console.log('url: ' + url);
    console.log($routeParams);
    console.log($routeParams.username);
    console.log($routeParams.snip);
    //var snip;
    //var username;
    //if (url >= 0) {
    var snip = $routeParams.snip;
    //} else {
    var username = $routeParams.username;
    //}


    // console.log('snip: ' + snip);
    // console.log('username: ' + username);

    if (username != undefined) {
        console.log('username: ' + username);

        Cards.search_user(username)
            .success(function(data) {
                // update card_ctrl $scope.cards
                $rootScope.$broadcast('cards', data);
            });

    }
    if (snip != undefined) {
        console.log('snip: ' + snip);
        Cards.search_id(snip)
            .success(function(data) {
                // update card_ctrl $scope.cards
                $rootScope.$broadcast('cards', data);
            });
    }

    // update from cardcreate_ctrl createCard
    $scope.$on('cards', function(event, data) {
        $scope.cards = data;
    });

    // Function called from core.js by dynamically added input type=checkbox.
    // It rewrites the HTML to save the checkbox state.
    checkBoxChanged = function(checkbox) {
        if (checkbox.checked) {
            checkbox.setAttribute("checked", "true");
        } else {
            checkbox.removeAttribute("checked");
        }

    };

    // EDIT Dropdown
    /* When the user clicks on the button, 
toggle between hiding and showing the dropdown content */
    $scope.myFunction = function(id) {
        console.log('myDropdown' + id);
        document.getElementById("myDropdown" + id).classList.toggle("show");
    };

    // Close the dropdown menu if the user clicks outside of it
    window.onclick = function(event) {
        if (!event.target.matches('.dropbtn')) {

            var dropdowns = document.getElementsByClassName("dropdown-content");
            var i;
            for (i = 0; i < dropdowns.length; i++) {
                var openDropdown = dropdowns[i];
                if (openDropdown.classList.contains('show')) {
                    openDropdown.classList.remove('show');
                }
            }
        }
    };


    // DELETE ==================================================================
    $scope.deleteCard = function(id) {
        Cards.delete(id)
            .success(function(data) {
                $rootScope.$broadcast('search');
            });
    };

    // UPDATE ==================================================================
    /*
    $scope.updateCard = function(id, card) {
        console.log('update: ' + card);
        card.content = replaceTags.replace(card.content);
        card.content = replaceTags.removeDeleteId(card.content);
        var pms = { 'id': id, 'card': card };
        // validate the text to make sure that something is there
        // if text is empty, nothing will happen
        //if (card.title !== undefined) {
        // call the create function from our service (returns a promise object)
        Cards.update(pms)
            .success(function(data) {
                $rootScope.$broadcast('search');
                console.log('success: ' + data);
            })
            .error(function(error) {
                console.log('error: ' + error);
            });
    };
    */
    $scope.updateCard = function(id, card) {
        console.log('update: ' + id + ', ' + card);
        card.content = Format.setMediaSize(id, card);
        setTimeout(function() {
            $scope.$apply(function() {
                card.content = replaceTags.replace(card.content);
                card.content = replaceTags.removeDeleteId(card.content);

                var pms = { 'id': id, 'card': card };
                // call the create function from our service (returns a promise object)
                Cards.update(pms)
                    .success(function(data) {
                        $rootScope.$broadcast('search');
                        console.log('success: ' + data);
                    })
                    .error(function(error) {
                        console.log('error: ' + error);
                    });
            });
        }, 1000);
    };
}]);