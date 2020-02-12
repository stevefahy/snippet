//
// Edit Service
//

cardApp.service('Edit', ['$q', '$timeout',  function($q, $timeout) {
    
    var self = this;
    // Close currently opened dropdowns
    this.closeDropdowns = function() {
        var deferred = $q.defer();
        var dropdowns = document.getElementsByClassName("dropdown-content");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            //console.log(openDropdown);
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
        deferred.resolve();
        return deferred.promise;
        //document.getElementById("myDropdown" + id).classList.add("show");
    };
    // EDIT Dropdown
    // On user click toggle between hiding and showing the dropdown content
    this.dropDownToggle = async function(event, id) {
        console.log('dropDownToggle: ' + id);
        if (event) {
            event.stopPropagation();
        }

        await self.closeDropdowns();

        /*var show = false;
        if (!document.getElementById("myDropdown" + id).classList.contains('show')) {
            //openDropdown.classList.remove('show');
            show = true
        }*/

        //self.closeDropdowns();
       // $timeout(function() {
        console.log('here');
console.log(document.getElementById("myDropdown" + id).classList);
        //console.log(id);
        //console.log($("#myDropdown" + id));
        //console.log(document.getElementById("myDropdown" + id).classList);
        //if (show) {
            //document.getElementById("myDropdown" + id).classList.add("show");
       $('.content_cnv #myDropdown' + id).addClass('show');
       // },1000);
        //}
        //document.getElementById("myDropdown" + id).classList.toggle("show");
    };

    // Close the dropdown menu if the user clicks outside of it
    window.onclick = function(event) {
        if (!event.target.matches('.material-icons')) {
            self.closeDropdowns();
        }
    };

}]);