//
// Edit Service
//

cardApp.service('Edit', function() {
    // Close currently opened dropdowns
    closeDropdowns = function() {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    };
    // EDIT Dropdown
    // On user click toggle between hiding and showing the dropdown content
    this.dropDownToggle = function(id) {
        console.log('drop' + id);
        closeDropdowns();
        document.getElementById("myDropdown" + id).classList.toggle("show");
    };

    // Close the dropdown menu if the user clicks outside of it
    window.onclick = function(event) {
        if (!event.target.matches('.material-icons')) {
            closeDropdowns();
        }
    };

});