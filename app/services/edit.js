//
// Edit Service
//

cardApp.service('Edit', ['$q', '$timeout', function($q, $timeout) {

    var self = this;

    // Close currently opened dropdowns
    this.closeDropdowns = function() {
        var deferred = $q.defer();
        var dropdowns = document.getElementsByClassName("dropdown-content");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
        deferred.resolve();
        return deferred.promise;
    };

    // EDIT Dropdown
    // On user click toggle between hiding and showing the dropdown content
    this.dropDownToggle = async function(event, id) {
        if (event) {
            event.stopPropagation();
        }
        await self.closeDropdowns();
        $('.content_cnv #myDropdown' + id).addClass('show');
    };

    // Close the dropdown menu if the user clicks outside of it
    window.onclick = function(event) {
        if (!event.target.matches('.material-icons')) {
            self.closeDropdowns();
        }
    };

}]);