//
// FILTERS
//

//
// emtpyToEnd Filter
//

// Filter to put empty values to the end of an array.
cardApp.filter("emptyToEnd", function() {
    return function(array, key) {
        var present = array.filter(function(item) {
            return item[key];
        });
        var empty = array.filter(function(item) {
            return !item[key];
        });
        return present.concat(empty);
    };
});

cardApp.filter("momentFilter", function() {
    return function(value, format) {
        var today = moment();
        if (today.isSame(value, 'd')) {
            return moment(value).format("HH:mm");
        } else {
            return moment(value).calendar();
        }
    };
});

cardApp.filter("momentFilterConv", function() {
    return function(value, format) {
        var today = moment();
        if (today.isSame(value, 'd')) {
            return moment(value).format("HH:mm");
        } else {
            return moment(value).format("DD/MM/YY HH:mm");
        }
    };
});