//
// General Service
//

cardApp.service('General', ['$rootScope', function($rootScope) {

    var self = this;

/*
    this.smtsw = function(msg, obj) {
        var s = 'steve';
        console.log('send_message_to_sw');
        //console.log(card);
        //var send = { "message": msg, object: obj };
        //send = JSON.parse(JSON.stringify(send));
        // if (navigator.serviceWorker.controller) {
        //    navigator.serviceWorker.controller.postMessage(send);
        //}
        return s;
    }
    */

    // Profile Image
    // Transform the cropped image to a blob.
    this.urltoFile = function(url, filename, mimeType) {
        return (fetch(url)
            .then(function(res) {
                return res.arrayBuffer();
            })
            .then(function(buf) {
                var blob = new Blob([buf], { type: mimeType });
                blob.name = filename;
                return blob;
            })
        );
    };

    this.swapCase = function(letters) {
        var newLetters = "";
        for (var i = 0; i < letters.length; i++) {
            if (letters[i] === letters[i].toLowerCase()) {
                newLetters += letters[i].toUpperCase();
            } else {
                newLetters += letters[i].toLowerCase();
            }
        }
        return newLetters;
    };

    this.isEqual = function(value, other) {
        // Get the value type
        var type = Object.prototype.toString.call(value);
        // If the two objects are not the same type, return false
        if (type !== Object.prototype.toString.call(other)) return false;
        // If items are not an object or array, return false
        //if (['[object Array]', '[object Object]'].indexOf(type) < 0) return false;
        // Compare the length of the length of the two items
        var valueLen = type === '[object Array]' ? value.length : Object.keys(value).length;
        var otherLen = type === '[object Array]' ? other.length : Object.keys(other).length;
        if (valueLen !== otherLen) return false;
        // Compare two items
        var compare = function(item1, item2) {
            // Get the object type
            var itemType = Object.prototype.toString.call(item1);
            // If an object or array, compare recursively
            if (['[object Array]', '[object Object]'].indexOf(itemType) >= 0) {
                if (!self.isEqual(item1, item2)) return false;
            }
            // Otherwise, do a simple comparison
            else {
                // If the two items are not the same type, return false
                if (itemType !== Object.prototype.toString.call(item2)) return false;
                // Else if it's a function, convert to a string and compare
                // Otherwise, just compare
                if (itemType === '[object Function]') {
                    if (item1.toString() !== item2.toString()) return false;
                } else {
                    if (item1 !== item2) return false;
                }
            }
        };
        // Compare properties
        if (type === '[object Array]') {
            for (var i = 0; i < valueLen; i++) {
                if (compare(value[i], other[i]) === false) return false;
            }
        } else {
            for (var key in value) {
                if (value.hasOwnProperty(key)) {
                    if (compare(value[key], other[key]) === false) return false;
                }
            }
        }
        // If nothing failed, return true
        return true;
    };

    // Find the array index of an object value contained in an array.
    this.findIncludesAttr = function(array, attr, value) {
        for (var i = 0; i < array.length; i += 1) {
            if (array[i][attr].includes(value)) {
                return i;
            }
        }
        return -1;
    };

    // Find the array index of two object values contained in an array.
    this.findIncludesAttrs = function(array, attr1, value1, attr2, value2) {
        for (var i = 0; i < array.length; i += 1) {
            if (array[i][attr1].includes(value1) && array[i][attr2].includes(value2)) {
                return i;
            }
        }
        return -1;
    };

    // Find the array index of an object value
    this.findWithAttr = function(array, attr, value) {
        for (var i = 0; i < array.length; i += 1) {
            if (array[i][attr] === value) {
                return i;
            }
        }
        return -1;
    };

    this.getDate = function() {
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth() + 1;
        var yyyy = today.getFullYear();
        if (dd < 10) {
            dd = '0' + dd;
        }
        if (mm < 10) {
            mm = '0' + mm;
        }
        var date = yyyy + mm + dd;
        return date;
    };

    this.getISODate = function() {
        var now = new Date();
        return now.toISOString();
    };

    // Check if an Array of Objects includes a property
    this.arrayObjectIndexOf = function(myArray, searchTerm, property) {
        for (var i = 0, len = myArray.length; i < len; i++) {
            if (myArray[i][property] === searchTerm) return i;
        }
        return -1;
    };

    // Check if an Array of Objects includes a property value
    this.arrayObjectIndexOfValue = function(myArray, searchTerm, property, value) {
        for (var i = 0, len = myArray.length; i < len; i++) {
            if (myArray[i][property][value] === searchTerm) return i;
        }
        return -1;
    };

    // Check if a nested Array of Objects includes a property value
    this.nestedArrayIndexOfValue = function(myArray, property, value) {
        for (var i = 0, len = myArray.length; i < len; i++) {
            for (var x = 0, len2 = myArray[i][property].length; x < len2; x++) {
                if (myArray[i][property][x] === value) return i;
            }
        }
        return -1;
    };

    // Helper function for findDifference.
    this.comparer = function(otherArray, value) {
        return function(current) {
            return otherArray.filter(function(other) {
                return other[value] == current[value];
            }).length == 0;
        };
    };

    // Find the difference between two arrays by value.
    // also named arraysAreEqual
    this.findDifference = function(new_arr, old_arr, value) {
        result = new_arr.filter(this.comparer(old_arr, value));
        return result;
    };

    this.arraysAreEqual = function(a, b, value) {
        var onlyInA = a.filter(comparer(b, value));
        var onlyInB = b.filter(comparer(a, value));
        result = onlyInA.concat(onlyInB);
        if (result.length == 0) {
            return true;
        } else {
            return false;
        }
    };

}]);