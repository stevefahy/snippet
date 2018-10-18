//
// SERVICES
//
var crop_finished = false;

//
// replaceTags Service
//

cardApp.service('replaceTags', function() {

    var self = this;

    this.replace = function(str) {
        // find string between and including &lt;pre&gt; to &lt;/pre&gt;
        var regex = /&lt;pre&gt;(?:(?!&lt;pre&gt;).)*(?:(?!&lt;pre&gt;).)*&lt;\/pre&gt;/gi;
        // find string between and including <pre> to </pre>
        var regex2 = /<pre>(?:(?!<pre>).)*(?:(?!<pre>).)*<\/pre>/gi;
        var output = str;
        if (str.match(regex)) {
            output = this.encodeString(str, regex);
        } else if (str.match(regex2)) {
            output = this.encodeString(str, regex2);
        }
        return output;
    };

    this.encodeString = function(str, reg) {
        var b = str.match(reg);
        for (var i in b) {
            str = str.replace(b[i], '[---TEMP' + i + '---]');
            b[i] = b[i].replace(/&lt;pre&gt;/g, "<pre>")
                .replace(/&lt;\/pre&gt;/g, "</pre>");
        }
        str = str.replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">");
        for (var k in b) {
            str = str.replace('[---TEMP' + k + '---]', b[k]);
        }
        return str;
    };

    // TOD is this now redundant?
    this.removeDeleteId = function(str) {
        str = $("<div>" + str + "</div>");
        $('span#delete', str).each(function(e) {
            $(this).replaceWith($(this).html());
        });
        // check if any remain
        if ($(str).find('span#delete').length > 0) {
            str = str.html();
            return self.removeDeleteId(str);
        } else {
            str = str.html();
            return str;
        }
    };

    this.removeSpaces = function(elem) {
        var orig = document.getElementById(elem).innerHTML;
        var spaces_removed = orig.replace(/\u200B/g, '');
        document.getElementById(elem).innerHTML = spaces_removed;
    };

    this.removeFocusIds = function(str) {
        str = $("<div>" + str + "</div>");
        $('span#focus', str).each(function(e) {
            $(this).replaceWith($(this).html());
        });
        // check if any remain
        if ($(str).find('span#focus').length > 0) {
            str = str.html();
            return self.removeFocusIds(str);
        } else {
            str = str.html();
            return str;
        }
    };

    this.removeCropper = function(str) {
        console.log('removeCropper');
        str = $("<div>" + str + "</div>");
        $('.cropper-container', str).each(function(e) {
            $(this).replaceWith($(this).html());
        });
        str = str.html();
        return str;
    };


});

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


//
// FormatHTML Service
//

cardApp.service('FormatHTML', ['Format', 'General', function(Format, General) {

    this.stripHtml = function(html) {
        var div = document.createElement("div");
        div.innerHTML = html;
        var text = div.textContent || div.innerText || "";
        return text;
    };

    this.fixhtml = function(html) {
        var div = document.createElement('div');
        div.innerHTML = html;
        return (div.innerHTML);
    };

    this.prepSentContent = function(content, length) {
        var string_count = length;
        var temp_content = Format.checkForImage(content);
        // Remove unwanted HTML
        var regex_1 = temp_content.replace(/\u200b/gi, "");
        var regex_2 = regex_1.replace(/\s{2,}/gi, " ");
        var regex_3 = regex_2.replace(/<span>/gi, "");
        var regex_4 = regex_3.replace(/<\/span>/gi, "");
        var regex_5 = regex_4.replace(/<br>/gi, " ");
        var regex_6 = regex_5.replace(/<h([1-7])>(.*?)<\/h[1-7]>/gi, "<b> $2 </b>");

        temp_content = regex_6;

        // Loop through the content to count the characters only and not the HTML
        var count = 0;
        var counting = true;
        for (var i = 0; i <= temp_content.length; i++) {
            if (counting && temp_content[i] == '<') {
                counting = false;
            }
            if (counting) {
                count++;
            }
            if (!counting && temp_content[i] == '>') {
                counting = true;
            }
            if (count > string_count) {
                // Fix any unclosed HTML tags
                temp_content = this.fixhtml(temp_content.substr(0, i + 1));
                break;
            }
        }
        if (temp_content.length >= string_count) {
            temp_content += '...';
        }
        return temp_content;
    };

}]);

//
// General Service
//

cardApp.service('General', ['Users', 'Format', function(Users, Format) {
    var ua = navigator.userAgent;
    var keyboard_listen = false;
    var self = this;

    // Profile Image
    //
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

    // USERS
    //
    // Find User
    this.findUser = function(id, callback) {
        var user_found;
        Users.search_id(id)
            .then(function(res) {
                if (res.data.error) {
                    user_found = res.data.error;
                } else if (res.data.success) {
                    user_found = res.data.success;

                }
                return callback(user_found);
            })
            .catch(function(error) {
                console.log(error);
            });
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
        //console.log(result);
        if (result.length == 0) {
            return true;
        } else {
            return false;
        }
    };

    //
    // Keyboard listener
    //
    // Detect soft keyboard on Android
    var is_landscape = false;
    var initial_height = window.innerHeight;
    var initial_width = window.innerWidth;
    var portrait_height;
    var landscape_height;

    // If the initial height is less than the screen height (status bar etc..)
    // then adjust the initial width to take into account this difference
    if (initial_height < screen.height) {
        initial_width = initial_width - (screen.height - initial_height);
    }
    if (initial_height > initial_width) {
        //portrait
        portrait_height = initial_height;
        landscape_height = initial_width;
    } else {
        // landscape
        landscape_height = initial_height;
        portrait_height = initial_width;
    }

    this.resizeListener = function() {
        keyboard_listen = true;
        is_landscape = (screen.height < screen.width);
        if (is_landscape) {
            if (window.innerHeight < landscape_height) {
                hideFooter();
            } else {
                showFooter();
            }
        } else {
            if (window.innerHeight < portrait_height) {
                hideFooter();
            } else {
                showFooter();
            }
        }
    };

    hideFooter = function() {
        var focused = document.activeElement;
        if (focused.id != 'cecard_create') {
            $('.create_container').hide();
        }
        $('.footer').hide();
        $('#placeholderDiv').css('bottom', '-1px');
        // Paste div that will be scrolled into view if necessary and the deleted.
        Format.pasteHtmlAtCaret("<span class='scroll_latest_footer' id='scroll_latest_footer'></span>");
        // Scroll into view if necessary
        Format.scrollLatest('scroll_latest_footer');
    };

    showFooter = function() {
        $('.footer').show();
        $('.create_container').show();
        $('#placeholderDiv').css('bottom', '59px');
    };

    // Start listening for keyboard.
    this.keyBoardListenStart = function() {
        if (ua.indexOf('AndroidApp') >= 0) {
            if (!keyboard_listen) {
                window.addEventListener('resize', this.resizeListener);
                keyboard_listen = true;
            }
        }
    };

    // Stop listening for keyboard.
    this.keyBoardListenStop = function() {
        if (keyboard_listen) {
            window.removeEventListener('resize', this.resizeListener);
            keyboard_listen = false;
        }
    };

}]);

//
// FilterImage Service
//

cardApp.service('FilterImage', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal) {

    var self = this;
    var image_id;
    var source;
    var target;

    this.setImageAdjustment = function(id, name, value) {
        var ia = this.getImageAdjustments(id);
        if (ia == undefined) {
            ia = {};
        }
        ia[name] = value;
        // Custom attribute for storing image adjustments.
        $('#image_' + id).attr('adjustment-data', JSON.stringify(ia));
    };

    this.getImageAdjustments = function(id) {
        var adjustment_data;
        // Custom attribute for storing image adjustments.
        var ia = $('#image_' + id).attr('adjustment-data');
        if (ia != undefined) {
            adjustment_data = JSON.parse(ia);
        }
        return adjustment_data;
    };

    this.setImageId = function(id) {
        image_id = id;
    };

    this.getImageId = function() {
        return image_id;
    };

    this.setSource = function(canvas) {
        source = canvas;
    };

    this.getSource = function() {
        return source;
    };

    this.setTarget = function(canvas) {
        target = canvas;
    };

    this.getTarget = function() {
        return target;
    };

    this.getPixels = function(img) {
        var c = this.getCanvas(img.width, img.height);
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        return ctx.getImageData(0, 0, c.width, c.height);
    };

    this.getCanvas = function(w, h) {
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    };

    this.filterImage = function(filter, image, var_args) {
        var args = [this.getPixels(image)];
        for (var i = 2; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        return filter.apply(null, args);
    };

    this.grayscale = function(pixels, args) {
        var d = pixels.data;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            // CIE luminance for the RGB
            // The human eye is bad at seeing red and blue, so we de-emphasize them.
            var v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            d[i] = d[i + 1] = d[i + 2] = v;
        }
        return pixels;
    };

    this.tmpCanvas = document.createElement('canvas');
    this.tmpCtx = this.tmpCanvas.getContext('2d');

    this.createImageData = function(w, h) {
        return this.tmpCtx.createImageData(w, h);
    };

    this.convolute = function(pixels, weights, opaque) {
        var side = Math.round(Math.sqrt(weights.length));
        var halfSide = Math.floor(side / 2);
        var src = pixels.data;
        var sw = pixels.width;
        var sh = pixels.height;
        // pad output by the convolution matrix
        var w = sw;
        var h = sh;
        var output = self.createImageData(w, h);
        var dst = output.data;
        // go through the destination image pixels
        var alphaFac = opaque ? 1 : 0;
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var sy = y;
                var sx = x;
                var dstOff = (y * w + x) * 4;
                // calculate the weighed sum of the source image pixels that
                // fall under the convolution matrix
                var r = 0,
                    g = 0,
                    b = 0,
                    a = 0;
                for (var cy = 0; cy < side; cy++) {
                    for (var cx = 0; cx < side; cx++) {
                        var scy = sy + cy - halfSide;
                        var scx = sx + cx - halfSide;
                        if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                            var srcOff = (scy * sw + scx) * 4;
                            var wt = weights[cy * side + cx];
                            r += src[srcOff] * wt;
                            g += src[srcOff + 1] * wt;
                            b += src[srcOff + 2] * wt;
                            a += src[srcOff + 3] * wt;
                        }
                    }
                }
                dst[dstOff] = r;
                dst[dstOff + 1] = g;
                dst[dstOff + 2] = b;
                dst[dstOff + 3] = a + alphaFac * (255 - a);
            }
        }
        return output;
    };

    if (!window.Float32Array)
        Float32Array = Array;

    this.convoluteFloat32 = function(pixels, weights, opaque) {
        var side = Math.round(Math.sqrt(weights.length));
        var halfSide = Math.floor(side / 2);

        var src = pixels.data;
        var sw = pixels.width;
        var sh = pixels.height;

        var w = sw;
        var h = sh;
        var output = {
            width: w,
            height: h,
            data: new Float32Array(w * h * 4)
        };
        var dst = output.data;

        var alphaFac = opaque ? 1 : 0;

        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var sy = y;
                var sx = x;
                var dstOff = (y * w + x) * 4;
                var r = 0,
                    g = 0,
                    b = 0,
                    a = 0;
                for (var cy = 0; cy < side; cy++) {
                    for (var cx = 0; cx < side; cx++) {
                        var scy = Math.min(sh - 1, Math.max(0, sy + cy - halfSide));
                        var scx = Math.min(sw - 1, Math.max(0, sx + cx - halfSide));
                        var srcOff = (scy * sw + scx) * 4;
                        var wt = weights[cy * side + cx];
                        r += src[srcOff] * wt;
                        g += src[srcOff + 1] * wt;
                        b += src[srcOff + 2] * wt;
                        a += src[srcOff + 3] * wt;
                    }
                }
                dst[dstOff] = r;
                dst[dstOff + 1] = g;
                dst[dstOff + 2] = b;
                dst[dstOff + 3] = a + alphaFac * (255 - a);
            }
        }
        return output;
    };

    this.createTemp = function(id) {
        var source = $('temp_canvas_filtered_' + id).clone().appendTo('#cropper_' + id);
        $(source).removeAttr('id');
        $(source).attr('id', 'source');
        return source;
    };

    this.setSharpen = function(id, target, source, amount) {
        target.width = source.width;
        target.height = source.height;
        var sharpen = amount;
        var adjacent = (1 - sharpen) / 4;
        var matrix = [0, adjacent, 0, adjacent, sharpen, adjacent, 0, adjacent, 0];
        var res = self.filterImage(self.convolute, source, matrix);
        var ctx = target.getContext('2d');
        ctx.putImageData(res, 0, 0);
        this.setImageAdjustment(id, 'sharpen', amount);
    };
}]);

//
// Cropper Service
//

cardApp.service('Cropp', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', 'FilterImage', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal, FilterImage) {

    var self = this;
    var cropper;
    var image;
    var crop_in_progress;
    var reduce_height = false;
    var decrease_percent = 0;

    $rootScope.crop_on = false;

    if (cropper != undefined) {
        cropper.destroy();
    }

    this.destroyCrop = function() {
        if (crop_in_progress != undefined) {
            var id = crop_in_progress;
            // reSet the height of the container
            var cont_height = $("#image_" + id).attr('container-data');
            var wrapper = document.getElementById('cropper_' + id);
            if (wrapper != undefined) {
                wrapper.style.height = cont_height + 'px';
                $(wrapper).removeClass('cropping');
            }
        }
        if (cropper != undefined) {
            cropper.destroy();
        }
    };

    /*
        this.cloneCrop = function(id) {
            $('#cropper_' + id).clone().appendTo('.image_adjust');
        };
        */

    resetContainer = function(id) {
        // Work out the available height.
        var avail_height = $(window).height() - ($('.header').height() + $('.create_container').height() + $('.footer').height());
        if (avail_height < $('.' + id).height()) {
            // work out the proportionate width needed to fit the height
            decrease_percent = (avail_height / $('.' + id).height());
            var decreased_width = ($('.' + id).width() * decrease_percent);
            // Set the height of the container
            var wrapper = document.getElementById('cropper_' + id);
            wrapper.style.width = decreased_width + 'px';
            reduce_height = true;
            var cont_data = { 'height': 0, 'width': decreased_width };
            // Custom attribute for storing image reduction data.
            $("." + id).attr('reduce-data', JSON.stringify(cont_data));
        }
    };

    this.openCrop = function(id) {
        // If filtered image exists
        if ($('#cropper_' + id + ' img.adjusted').length > 0) {
            $('#cropper_' + id + ' img.adjusted').css('display', 'none');
            $('#image_' + id).css('display', 'inline');
            var img_height = $('#image_' + id).height();
            // Get the filter and set it to cropper
            var filter = $('#image_' + id).attr('adjustment-data');
            $('#cropper_' + id).addClass(filter);
        }

        $('.image_edit_btns').css('display', 'none');
        $('.crop_edit').css('display', 'flex');
        $rootScope.crop_on = true;
        var wrapper = document.getElementById('cropper_' + id);
        $(wrapper).addClass('cropping');
        wrapper.style.maxWidth = '';
        wrapper.style.cssFloat = 'none';
        // Turn off contenteditable for this card
        var card = $(wrapper).parent().closest('div').attr('id');
        $('#' + card).attr('contenteditable', 'false');
        // Manually set the container width and height.
        var win_width = $(window).width();
        var stored_image = $("#image_" + id).attr('image-data');
        var avail_height = $(window).height() - ($('.header').height() + $('.create_container').height() + $('.footer').height());
        if (stored_image != undefined) {
            stored_image = JSON.parse(stored_image);
            var image_scale;
            if (win_width < avail_height) {
                // Portrait
                if (stored_image.naturalWidth > stored_image.naturalHeight) {
                    image_scale = win_width / stored_image.naturalWidth;
                } else {
                    image_scale = avail_height / stored_image.naturalHeight;
                }
            } else {
                // Landscape
                if (stored_image.naturalWidth > stored_image.naturalHeight) {
                    image_scale = win_width / stored_image.naturalWidth;
                    if (stored_image.naturalHeight * image_scale > avail_height) {
                        image_scale = avail_height / stored_image.naturalHeight;
                    }
                } else {
                    image_scale = avail_height / stored_image.naturalHeight;
                }
            }
            var scaled_height = stored_image.naturalHeight * image_scale;
            var scaled_width = stored_image.naturalWidth * image_scale;
            // Set the height of the container
            crop_in_progress = id;
            var img_width = stored_image.width;
            var inc = win_width / img_width;
            // get the actual screen height from the scaled width.
            var current_height = (stored_image.height * inc);
            if (avail_height < current_height) {
                decrease_percent = (avail_height / img_height);
                var decreased_height = (img_height * decrease_percent);
                wrapper.style.height = decreased_height + 'px';
            }
            if (stored_image.width < win_width) {
                wrapper.style.height = stored_image.height + 'px';
                wrapper.style.width = stored_image.width + 'px';
            }
            wrapper.style.maxWidth = '';
            wrapper.style.height = scaled_height + 'px';
            wrapper.style.width = scaled_width + 'px';
        }

        // TODO - do not enable crop if image less than min
        var options = {
            zoomable: false,
            minContainerWidth: 100,
            minContainerHeight: 100,
            ready: function() {
                $('#cropper_' + id + ' .cropper-canvas').addClass(filter);
                $('#cropper_' + id + ' .cropper-view-box').addClass(filter);
                $('#cropper_' + id).removeClass(filter);
            }
        };

        // Check for stored crop data
        var stored = $("#image_" + id).attr('crop-data');
        var reduced = $("#image_" + id).attr('reduce-data');

        if (reduced != undefined) {
            // Set the height of the container
            var wrapper = document.getElementById('cropper_' + id);
            var d = JSON.parse(reduced);
            var decreased_width = d.width;
            reduce_height = true;
        }
        // Previously cropped.
        if (stored != undefined) {
            options.data = JSON.parse(stored);
            image = document.getElementById('image_' + id);
            cropper = new Cropper(image, options, {});
        } else {
            // New Crop
            resetContainer(id);
            image = document.getElementById('image_' + id);
            var init_img_width = $('#image_' + id).width();
            // If image smaller than screen width then reduce container width
            if (init_img_width < win_width) {
                $('#cropper_' + id).css('width', init_img_width);
            }

            cropper = new Cropper(image, options, {
                crop(event) {
                    var wrapper = document.getElementById('cropper_' + id);
                    wrapper.style.width = '';
                }
            });
        }
    };

    var filter_array = [{
            filter_css_name: 'filter-original',
            filter_name: 'original',
            blend: 'none'
        },
        {
            filter_css_name: 'filter-1977',
            filter_name: '1977',
            filter: 'sepia(.5) hue-rotate(-30deg) saturate(1.4)',
            blend: 'none'
        },
        {
            filter_css_name: 'filter-aden',
            filter_name: 'aden',
            gradient: 'solid',
            gradient_stops: [
                [125, 105, 24, 0.1]
            ],
            filter: 'sepia(.2) brightness(1.15) saturate(1.4)',
            blend: 'multiply'
        },
        {
            filter_css_name: 'filter-amaro',
            filter_name: 'amaro',
            gradient: 'solid',
            gradient_stops: [
                [125, 105, 24, 0.2]
            ],
            filter: 'sepia(.35) contrast(1.1) brightness(1.2) saturate(1.3)',
            blend: 'overlay'

        },
        {
            filter_css_name: 'filter-ashby',
            filter_name: 'ashby',
            gradient: 'solid',
            gradient_stops: [
                [125, 105, 24, 0.35]
            ],
            filter: 'sepia(.5) contrast(1.2) saturate(1.8)',
            blend: 'lighten'
        },
        {
            filter_css_name: 'filter-brannan',
            filter_name: 'brannan',
            filter: 'sepia(.4) contrast(1.25) brightness(1.1) saturate(.9) hue-rotate(-2deg)',
            blend: 'none'
        },
        {
            filter_css_name: 'filter-brooklyn',
            filter_name: 'brooklyn',
            gradient: 'solid',
            gradient_stops: [
                [127, 187, 227, 0.2]
            ],
            filter: 'sepia(.25) contrast(1.25) brightness(1.25) hue-rotate(5deg)',
            blend: 'overlay'
        },
        {
            filter_css_name: 'filter-charmes',
            filter_name: 'charmes',
            gradient: 'solid',
            gradient_stops: [
                [125, 105, 24, 0.25]
            ],
            filter: 'sepia(.25) contrast(1.25) brightness(1.25) saturate(1.35) hue-rotate(-5deg)',
            blend: 'darken'
        },
        {
            filter_css_name: 'filter-clarendon',
            filter_name: 'clarendon',
            gradient: 'solid',
            gradient_stops: [
                [127, 187, 227, 0.4]
            ],
            filter: 'sepia(.15) contrast(1.25) brightness(1.25) hue-rotate(5deg)',
            blend: 'overlay'
        },
        {
            filter_css_name: 'filter-crema',
            filter_name: 'crema',
            gradient: 'solid',
            gradient_stops: [
                [125, 105, 24, 0.2]
            ],
            filter: 'sepia(.5) contrast(1.25) brightness(1.15) saturate(.9) hue-rotate(-2deg)',
            blend: 'multiply'
        },
        {
            filter_css_name: 'filter-dogpatch',
            filter_name: 'dogpatch',
            gradient: 'none',
            gradient_stops: [
                []
            ],
            filter: 'sepia(.35) saturate(1.1) contrast(1.5)',
            blend: 'none'
        },
        {
            filter_css_name: 'filter-earlybird',
            filter_name: 'earlybird',
            gradient: 'radial',
            gradient_stops: [
                [0, 125, 105, 24, 0],
                [1, 125, 105, 24, 0.3]
            ],
            filter: 'sepia(.25) contrast(1.25) brightness(1.15) saturate(.9) hue-rotate(-5deg)',
            blend: 'multiply'
        },
        {
            filter_css_name: 'filter-gingham',
            filter_name: 'gingham',
            gradient: 'solid',
            gradient_stops: [
                [230, 230, 230, 1]
            ],
            filter: 'contrast(1.1) brightness(1.1)',
            blend: 'soft-light'
        },
        {
            filter_css_name: 'filter-ginza',
            filter_name: 'ginza',
            gradient: 'solid',
            gradient_stops: [
                [125, 105, 24, 0.15]
            ],
            filter: 'sepia(.25) contrast(1.15) brightness(1.2) saturate(1.35) hue-rotate(-5deg)',
            blend: 'darken'
        },
        {
            filter_css_name: 'filter-hefe',
            filter_name: 'hefe',
            gradient: 'radial',
            gradient_stops: [
                [0, 0, 0, 0, 0],
                [1, 0, 0, 0, 0.25]
            ],
            filter: 'sepia(.4) contrast(1.5) brightness(1.2) saturate(1.4) hue-rotate(-10deg)',
            blend: 'multiply'
        },
        {
            filter_css_name: 'filter-helena',
            filter_name: 'helena',
            gradient: 'solid',
            gradient_stops: [
                [158, 175, 30, 0.25]
            ],
            filter: 'sepia(.5) contrast(1.05) brightness(1.05) saturate(1.35)',
            blend: 'overlay'
        },
        {
            filter_css_name: 'filter-hudson',
            filter_name: 'hudson',
            gradient: 'radial',
            gradient_stops: [
                [0, 25, 62, 167, 0],
                [1, 25, 62, 167, 0.25]
            ],
            filter: 'sepia(.25) contrast(1.2) brightness(1.2) saturate(1.05) hue-rotate(-15deg)',
            blend: 'multiply'
        },
        {
            filter_css_name: 'filter-inkwell',
            filter_name: 'inkwell',
            filter: 'brightness(1.25) contrast(.85) grayscale(1)',
            blend: 'none'
        },
        {
            filter_css_name: 'filter-juno',
            filter_name: 'juno',
            gradient: 'solid',
            gradient_stops: [
                [127, 187, 227, 0.2]
            ],
            filter: 'sepia(.35) contrast(1.15) brightness(1.15) saturate(1.8)',
            blend: 'overlay'
        },
        {
            filter_css_name: 'filter-kelvin',
            filter_name: 'kelvin',
            gradient: 'radial',
            gradient_stops: [
                [0, 128, 78, 15, 0.25],
                [1, 128, 78, 15, 0.50]
            ],
            filter: 'sepia(0.15) contrast(1.5) brightness(1.1) hue-rotate(-10deg)',
            blend: 'overlay'
        },
        {
            filter_css_name: 'filter-lark',
            filter_name: 'lark',
            filter: 'sepia(.25) contrast(1.2) brightness(1.3) saturate(1.25)',
            blend: 'none'
        },
        {
            filter_css_name: 'filter-lofi',
            filter_name: 'lofi',
            filter: 'saturate(1.1) contrast(1.5)',
            blend: 'none'
        },
        {
            filter_css_name: 'filter-ludwig',
            filter_name: 'ludwig',
            gradient: 'solid',
            gradient_stops: [
                [125, 105, 24, 0.1]
            ],
            filter: 'sepia(.25) contrast(1.05) brightness(1.05) saturate(2)',
            blend: 'overlay'
        },
        {
            filter_css_name: 'filter-maven',
            filter_name: 'maven',
            gradient: 'solid',
            gradient_stops: [
                [158, 175, 30, 0.25]
            ],
            filter: 'sepia(.35) contrast(1.05) brightness(1.05) saturate(1.75)',
            blend: 'darken'
        },
        {
            filter_css_name: 'filter-mayfair',
            filter_name: 'mayfair',
            gradient: 'radial',
            gradient_stops: [
                [0, 175, 105, 24, 0],
                [1, 175, 105, 24, 0.5]
            ],
            filter: 'contrast(1.1) brightness(1.15) saturate(1.1)',
            blend: 'multiply'
        },
        {
            filter_css_name: 'filter-moon',
            filter_name: 'moon',
            filter: 'brightness(1.4) contrast(.95) saturate(0) sepia(.35)',
            blend: 'none'
        },
        {
            filter_css_name: 'filter-nashville',
            filter_name: 'nashville',
            gradient: 'radial',
            gradient_stops: [
                [0, 128, 78, 15, 0.5],
                [1, 128, 78, 15, 0.65]
            ],
            filter: 'sepia(.25) contrast(1.5) brightness(.9) hue-rotate(-15deg)',
            blend: 'screen'
        },
        {
            filter_css_name: 'filter-perpetua',
            filter_name: 'perpetua',
            gradient: 'linear',
            gradient_stops: [
                [0, 0, 91, 154, 0.25],
                [1, 230, 193, 61, 0.25]
            ],
            filter: 'contrast(1.1) brightness(1.25) saturate(1.1)',
            blend: 'multiply'
        },
        {
            filter_css_name: 'filter-poprocket',
            filter_name: 'poprocket',
            gradient: 'radial',
            gradient_percent: [0, 40, 80, 100],
            gradient_stops: [
                [0, 206, 39, 70, 0.75],
                [0.4, 206, 39, 70, 0.75],
                [0.8, 0, 0, 0, 1],
                [1, 0, 0, 0, 1]
            ],
            filter: 'sepia(.15) brightness(1.2)',
            blend: 'screen'
        },
        {
            filter_css_name: 'filter-reyes',
            filter_name: 'reyes',
            filter: 'sepia(.75) contrast(.75) brightness(1.25) saturate(1.4)',
            blend: 'none'
        },
        {
            filter_css_name: 'filter-rise',
            filter_name: 'rise',
            gradient: 'radial',
            gradient_stops: [
                [0, 230, 193, 61, 0.25],
                [1, 230, 193, 61, 0.25]
            ],
            filter: 'sepia(.25) contrast(1.25) brightness(1.2) saturate(.9)',
            blend: 'lighten'
        },
        {
            filter_css_name: 'filter-sierra',
            filter_name: 'sierra',
            gradient: 'radial',
            gradient_stops: [
                [1, 128, 78, 15, 0.5],
                [0, 0, 0, 0, 0.65]
            ],
            filter: 'sepia(.25) contrast(1.5) brightness(.9) hue-rotate(-15deg)',
            blend: 'screen'
        },
        {
            filter_css_name: 'filter-skyline',
            filter_name: 'skyline',
            filter: 'sepia(.15) contrast(1.25) brightness(1.25) saturate(1.2)',
            blend: 'none'
        },
        {
            filter_css_name: 'filter-slumber',
            filter_name: 'slumber',
            gradient: 'solid',
            gradient_stops: [
                [125, 105, 24, 0.2]
            ],
            filter: 'sepia(.35) contrast(1.25) saturate(1.25)',
            blend: 'darken'
        },
        {
            filter_css_name: 'filter-stinson',
            filter_name: 'stinson',
            gradient: 'solid',
            gradient_stops: [
                [125, 105, 24, 0.45]
            ],
            filter: 'sepia(.35) contrast(1.25) brightness(1.1) saturate(1.25)',
            blend: 'lighten'
        },
        {
            filter_css_name: 'filter-sutro',
            filter_name: 'sutro',
            gradient: 'radial',
            gradient_percent: [0, 50, 90, 100],
            gradient_stops: [
                [0, 0, 0, 0, 0],
                [0.5, 0, 0, 0, 0],
                [0.7, 0, 0, 0, 0.5],
                [1, 0, 0, 0, 0.5]
            ],
            filter: 'sepia(.4) contrast(1.2) brightness(.9) saturate(1.4) hue-rotate(-10deg)',
            blend: 'darken'
        },
        {
            filter_css_name: 'filter-toaster',
            filter_name: 'toaster',
            gradient: 'radial',
            gradient_stops: [
                [0, 128, 78, 15, 1],
                [1, 0, 0, 0, 0.25]
            ],
            filter: 'sepia(.25) contrast(1.5) brightness(.95) hue-rotate(-15deg)',
            blend: 'screen'
        },
        {
            filter_css_name: 'filter-valencia',
            filter_name: 'valencia',
            gradient: 'solid',
            gradient_stops: [
                [230, 193, 61, 0.1]
            ],
            filter: 'sepia(.25) contrast(1.1) brightness(1.1)',
            blend: 'lighten'
        },
        {
            filter_css_name: 'filter-vesper',
            filter_name: 'vesper',
            gradient: 'solid',
            gradient_stops: [
                [125, 105, 24, 0.25]
            ],
            filter: 'sepia(.35) contrast(1.15) brightness(1.2) saturate(1.3)',
            blend: 'overlay'
        },
        {
            filter_css_name: 'filter-walden',
            filter_name: 'walden',
            gradient: 'solid',
            gradient_stops: [
                [229, 240, 128, 0.5]
            ],
            filter: 'sepia(.35) contrast(.8) brightness(1.25) saturate(1.4)',
            blend: 'darken'
        },
        {
            filter_css_name: 'filter-willow',
            filter_name: 'willow',
            filter: 'brightness(1.2) contrast(.85) saturate(.05) sepia(.2)',
            blend: 'none'
        },
        {
            filter_css_name: 'filter-xpro-ii',
            filter_name: 'xpro-ii',
            gradient: 'radial',
            gradient_stops: [
                [0, 0, 91, 154, 0.35],
                [1, 0, 0, 0, 0.65]
            ],
            filter: 'sepia(.45) contrast(1.25) brightness(1.75) saturate(1.3) hue-rotate(-5deg)',
            blend: 'multiply'
        }
    ];

    function b64toBlob(b64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 512;
        var byteCharacters = atob(b64Data);
        var byteArrays = [];
        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            var slice = byteCharacters.slice(offset, offset + sliceSize);
            var byteNumbers = new Array(slice.length);
            for (var i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            var byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        var blob = new Blob(byteArrays, { type: contentType });
        return blob;
    }

    this.saveImage = function(id) {
        var canv = $('canvas.temp_canvas_filtered').attr('id');
        id = canv.substr(21, canv.length - 20);
        var canvasFilter = document.getElementById('temp_canvas_filtered_' + id);
        var dataUrl = canvasFilter.toDataURL();
        Format.dataURItoBlob(dataUrl).then(function(blob) {
            blob.name = 'image_filtered_' + id + '.jpg';
            blob.renamed = true;
            Format.prepImage([blob], function(result) {
                var img5 = new Image();
                img5.src = 'fileuploads/images/' + result.file + '?' + new Date();
                img5.className = 'adjusted';
                img5.id = 'image_filtered_' + id;
                img5.onload = function() {
                    $('#temp_canvas_filtered_' + id).remove();
                    // Remove current filter.
                    if ($('#cropper_' + id + ' img.adjusted').length > 0) {
                        $('#cropper_' + id + ' img.adjusted').remove();
                    }
                    // Get image Styles
                    var cssStyleParsed = getStyles(id);
                    $(this).attr("style", cssStyleParsed);
                    $('#image_' + id).css('display', 'none');
                    $('#temp_image_filtered_' + id).remove();
                    $(this).insertBefore('#image_' + id);
                    // SAVE
                    crop_finished = true;
                    $('#cropper_' + id).closest('div.ce').focus();
                    $('#cropper_' + id).closest('div.ce').blur();
                };
            });
        });
    };

    this.createFilter = function(id, filter) {
        var deferred = $q.defer();
        convertImageToCanvas(document.getElementById('image_' + id), filter, id).then(function(canvas) {
            var canvasFilter = document.createElement('canvas');
            canvasFilter.width = canvas.width;
            canvasFilter.height = canvas.height;
            var ctx = canvasFilter.getContext('2d');
            var filter_data = getFilter(filter);
            if (filter_data.filter != undefined) {
                ctx.filter = filter_data.filter;
            }
            ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
            // Get image Styles
            var cssStyleParsed = getStyles(id);
            $(canvasFilter).attr("style", cssStyleParsed);
            canvasFilter.setAttribute('id', 'temp_canvas_filtered_' + id);
            canvasFilter.setAttribute('class', 'resize-drag temp_canvas_filtered');
            deferred.resolve(canvasFilter);
        });
        return deferred.promise;
    };

    this.filterClick = function(e, button, id, filter) {
        // Store the selcted filter in a custom attribute.
        FilterImage.setImageAdjustment(id, 'filter', filter);
        self.createFilter(id, filter).then(function(canvasFilter) {
            if ($('#cropper_' + id + ' #temp_canvas_filtered_' + id).length >= 0) {
                $('#cropper_' + id + ' #temp_canvas_filtered_' + id).remove();
            }
            // Remove last filter
            if ($('#cropper_' + id + ' .adjusted').length >= 0) {
                $('#cropper_' + id + ' .adjusted').remove();
            }
            $('#cropper_' + id + ' #image_' + id).css('display', 'none');
            $(canvasFilter).insertBefore('#image_' + id);
            var ia = FilterImage.getImageAdjustments(id);
            if (ia != undefined) {
                self.createSourceCanvas(id, canvasFilter);
                var target = document.getElementById('temp_canvas_filtered_' + id);
                self.applyAdjustments(id, target, ia);
            }
        });
        if (button != 'button') {
            e.stopPropagation();
        }
    };

    removeTempCanvas = function(id) {
        $('.temp_canvas_filtered').remove();
        if ($('#image_filtered_' + id).length > 0) {
            $('#image_filtered_' + id).css('display', 'unset');
        } else {
            $('#image_' + id).css('display', 'unset');
        }
    };

    getStyles = function(id) {
        // If Adjusted exists Get its Style.
        if ($('#cropper_' + id + ' .adjusted').length >= 0) {
            var cssStyle = $('#image_' + id).attr("style");
            if (cssStyle != undefined) {
                // Parse the inline styles to remove the display style
                var cssStyleParsed = "";
                style_arr = cssStyle.split(';');
                for (i = 0; i < style_arr.length - 1; i++) {
                    if (style_arr[i].indexOf('display') < 0) {
                        cssStyleParsed += style_arr[i] + ';';
                    }
                }
                return cssStyleParsed;
            } else {
                return;
            }
        } else {
            return;
        }
    };

    imageToCanvas = function(id) {
        // Use the original image
        var image_id = 'image_' + id;
        var image = document.getElementById(image_id);
        var canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, image.width, image.height);
        return canvas;
    };

    this.applyAdjustments = function(id, target, ia) {
        var deferred = $q.defer();
        // Loop through all image adjustments.
        for (var i in ia) {
            // The filter adjustment is handled separately.
            if (i != 'filter') {
                // Apply any other image adjustments
                if (i == 'sharpen') {
                    FilterImage.setSharpen(id, target, FilterImage.getSource(), ia[i]);
                    
                }
            }
        }
        deferred.resolve();
        return deferred.promise;
    };

    this.createSourceCanvas = function(id, source_image) {
        var source = document.createElement('canvas');
        source.width = source_image.width;
        source.height = source_image.height;
        var ctx = source.getContext('2d');
        ctx.drawImage(source_image, 0, 0, source_image.width, source_image.height);
        source.setAttribute('id', 'temp_canvas_source_' + id);
        source.setAttribute('class', 'resize-drag temp_canvas_filtered');
        // Get image Styles
        var cssStyleParsed = getStyles(id);
        source.setAttribute("style", cssStyleParsed);
        FilterImage.setSource(source);
    };

    this.settingsImage = function(id) {
        var canvas = imageToCanvas(id);
        canvas.setAttribute('id', 'temp_canvas_filtered_' + id);
        canvas.setAttribute('class', 'resize-drag temp_canvas_filtered');
        // Get image Styles
        cssStyleParsed = getStyles(id);
        // Apply original style to thee new canvas.
        canvas.setAttribute("style", cssStyleParsed);
        // Get image-adjustments object
        var ia = FilterImage.getImageAdjustments(id);
        // If this image has any adjustments.
        if (ia != undefined) {
            // If there is a filter applied.
            if (ia.filter != undefined) {
                // Create a canvas with the filter effect and return the canvas.
                self.createFilter(id, ia.filter).then(function(canvasFilter) {
                    //canvasFilter.setAttribute('id', 'temp_canvas_source_' + id);
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(canvasFilter, 0, 0);
                    FilterImage.setSource(canvasFilter);
                    FilterImage.setTarget(canvas);
                    // Apply other image adjustments to the filtered canvas.
                    self.applyAdjustments(id, canvas, ia).then(function(result) {
                        // Add the adjusted canvas and hide the original image.
                        $(canvas).insertBefore('#image_' + id);
                        $('#cropper_' + id + ' .adjusted').css('display', 'none');
                    });
                });
            } else {
                // No Filter but other image adjustments.
                var source_image = document.getElementById('image_' + id);
                FilterImage.setSource(source_image);
                FilterImage.setTarget(canvas);
                self.applyAdjustments(id, canvas, ia);
                $(canvas).insertBefore('#image_' + id);
                $('#cropper_' + id + ' .adjusted').css('display', 'none');
            }
        } else {
            // Not previously adjusted.
            // Use the original image as the source.
            $(canvas).insertBefore('#image_' + id);
            $('#cropper_' + id + ' #image_' + id).css('display', 'none');
            var source_image = document.getElementById('image_' + id);
            FilterImage.setSource(source_image);
            FilterImage.setTarget(canvas);
        }
    };

    this.adjustImage = function(e, id) {
        $('.image_adjust_on').remove();
        if ($('#cropper_' + id + ' .image_adjust_div').length <= 0) {
            var filt = $('.image_adjust_div').clone().insertAfter('#cropper_' + id);
            filt.attr('id', 'adjust_' + id);
            filt.css('position', 'relative');
            filt.addClass('filters_active');
            filt.css('visibility', 'visible');


            // TODO - function to handle all adjustments minus filter.
            FilterImage.setImageId(id);
            var data = { 'id': id };
            // Get the last position of the slider.
            var ia = FilterImage.getImageAdjustments(id);
            if (ia != undefined) {
                // TODO store as slider pos.
                data.last_position = ia.sharpen;
            }
            $rootScope.$broadcast('rzSliderRender', data);
        }


        // TODO - function to handle all adjustments minus filter.
        this.settingsImage(id);
        e.stopPropagation();
    };

    this.filterImage = function(e, id) {
        $('.image_adjust_on').remove();
        if ($('#cropper_' + id + ' .image_filt_div').length <= 0) {
            var temp = $('#cropper_' + id).clone();
            // If there is a filtered image then remove it.
            if ($('#cropper_' + id + ' .adjusted').length >= 0) {
                temp.find('img.adjusted').remove();
                temp.find('img').css('display', 'unset');
            }
            // If there are temp_image_filtered then remove.
            if ($('#cropper_' + id + ' .temp_image_filtered').length >= 0) {
                temp.find('img.temp_image_filtered').remove();
            }
            temp.addClass('temp');
            temp.find('.filter_div img').unwrap();
            var filt = $('.image_filt_div').clone().insertAfter('#cropper_' + id);
            filt.attr('id', 'filters_' + id);
            filt.css('position', 'relative');
            filt.addClass('filters_active');
            filt.css('visibility', 'visible');
            $(temp).removeAttr('onclick');
            $(temp).removeAttr('id');

            for (var i in filter_array) {
                var outer = document.createElement('div');
                $(outer).appendTo('#filters_' + id + ' .filters_container .filter_list');
                $(outer).addClass('filter_container');
                var current = temp.clone();
                $(current).appendTo($(outer));
                var title = document.createElement('div');
                $(title).addClass('filter_title');
                $(title).html(filter_array[i].filter_name);
                $(title).appendTo($(outer));
                $(current).removeAttr('class');
                $(current).addClass('cropper_cont');
                $(current).addClass('filter_thumb');
                $(current).addClass(filter_array[i].filter_css_name);
                $(current).attr('onClick', 'filterClick(event, this, "' + id + '", "' + filter_array[i].filter_css_name + '")');
            }
        }
        e.stopPropagation();
    };

    this.closeFilters = function(e) {
        $('#' + e.target.id).closest('div.ce').attr('contenteditable', 'true');
        $('.filters_active').remove();
        // Save the canvas to image
        self.saveImage();
        e.stopPropagation();
    };

    this.closeEdit = function(e, id) {
        e.stopPropagation();
        $('#' + e.target.id).closest('div.ce').attr('contenteditable', 'true');
        $('.image_adjust_on').remove();
        $('#cropper_' + id).removeClass('cropping');
        removeTempCanvas(id);
        // SAVE
        crop_finished = true;
        $('#cropper_' + id).closest('div.ce').focus();
        $('#cropper_' + id).closest('div.ce').blur();
    };

    this.editImage = function(scope, id) {
        if (principal.isValid()) {
            UserData.checkUser().then(function(result) {
                // Logged in.
                // Get the editable attibute for this card (for this user).
                // check user has permision to edit.
                if ($(scope).closest('div.ce').attr('editable') == 'true') {
                    $(scope).closest('div.ce').attr('contenteditable', 'false');
                    // Only open editing if not already open.
                    if ($('#image_adjust_' + id).length <= 0) {
                        // Close existing
                        $('.image_adjust_on').remove();
                        $('.filters_active').remove();
                        var ia = $('.image_adjust').clone();
                        ia.insertBefore('#cropper_' + id);
                        $(ia).attr('id', 'image_adjust_' + id);
                        $('#image_adjust_' + id).css('visibility', 'visible');
                        $('#image_adjust_' + id).css('position', 'relative');
                        var edit_btns = "<div class='image_editor'><div class='image_edit_btns'><div class='' onclick='adjustImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_tune'>tune</i></div><div class='' onclick='filterImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_filter'>filter</i></div><div class='' onclick='openCrop(\"" + id + "\")'><i class='material-icons image_edit' id='ie_crop' >crop</i></div><div class='close_image_edit' onclick='closeEdit(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_close'>&#xE14C;</i></div></div><div class='crop_edit'><div class='set_crop' onclick='setCrop(\"" + id + "\")'><i class='material-icons image_edit' id='ie_accept'>&#xe876;</i></div></div></div>";
                        // set this to active
                        $('#image_adjust_' + id).addClass('image_adjust_on');
                        $('#image_adjust_' + id).append(edit_btns);
                    }
                }
            });
        }
    };

    function applyBlending(bottomImage, topImage, image, id, type) {
        var deferred = $q.defer();
        // create the canvas
        var canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        var ctx = canvas.getContext('2d');
        // Multiply
        if (type == 'multiply') {
            ctx.globalCompositeOperation = 'multiply';
            ctx.drawImage(bottomImage, 0, 0, image.width, image.height);
            ctx.drawImage(topImage, 0, 0, image.width, image.height);
        }
        // Overlay
        if (type == 'overlay') {
            ctx.globalCompositeOperation = 'overlay';
            ctx.drawImage(topImage, 0, 0, image.width, image.height);
            ctx.drawImage(bottomImage, 0, 0, image.width, image.height);
        }
        // Lighten
        if (type == 'lighten') {
            ctx.globalCompositeOperation = 'lighten';
            ctx.drawImage(bottomImage, 0, 0, image.width, image.height);
            ctx.drawImage(topImage, 0, 0, image.width, image.height);
        }
        // Darken
        if (type == 'darken') {
            ctx.globalCompositeOperation = 'darken';
            ctx.drawImage(bottomImage, 0, 0, image.width, image.height);
            ctx.drawImage(topImage, 0, 0, image.width, image.height);
        }
        // Screen
        if (type == 'screen') {
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(bottomImage, 0, 0, image.width, image.height);
            ctx.drawImage(topImage, 0, 0, image.width, image.height);
        }
        // Screen
        if (type == 'soft-light') {
            ctx.globalCompositeOperation = 'soft-light';
            ctx.drawImage(topImage, 0, 0, image.width, image.height);
            ctx.drawImage(bottomImage, 0, 0, image.width, image.height);
        }
        deferred.resolve(canvas);
        return deferred.promise;
    }

    function getFilter(filter) {
        var result = [];
        var index = General.findWithAttr(filter_array, 'filter_css_name', filter);
        if (index >= 0) {
            result = filter_array[index];
        } else {
            result = -1;
        }
        return result;
    }

    function convertImageToCanvas(image, filter, id) {
        var deferred = $q.defer();
        var filter_data = getFilter(filter);
        // Convert image to canvas
        var topImage = image;
        var topCanvas = document.createElement("canvas");
        topCanvas.width = image.width;
        topCanvas.height = image.height;
        var topCtx = topCanvas.getContext('2d');
        topCtx.drawImage(topImage, 0, 0, image.width, image.height);
        // If there is a blend to be applied.
        if (filter_data.blend != 'none') {
            var grd;
            var canvas_gradient = document.createElement('canvas');
            canvas_gradient.width = image.width;
            canvas_gradient.height = image.height;
            var ctx_gradient = canvas_gradient.getContext('2d');
            // Gradients
            if (filter_data.gradient == 'radial') {
                // radial gradient
                // gradient_percent
                if (filter_data.gradient_percent != undefined) {
                    var penultimate_percent = filter_data.gradient_percent[filter_data.gradient_percent.length - 2];
                    var final_radius = image.width * (penultimate_percent / 100);
                    grd = ctx_gradient.createRadialGradient((image.width / 2), (image.height / 2), 0, (image.width / 2), (image.height / 2), final_radius);
                } else {
                    grd = ctx_gradient.createRadialGradient((image.width / 2), (image.height / 2), (image.width / 100), (image.width / 2), (image.height / 2), image.width);
                }
                for (var i = 0; i < filter_data.gradient_stops.length; i++) {
                    grd.addColorStop(filter_data.gradient_stops[i][0], "rgba(" + filter_data.gradient_stops[i][1] + "," + filter_data.gradient_stops[i][2] + "," + filter_data.gradient_stops[i][3] + "," + filter_data.gradient_stops[i][4] + ")");
                }
                // Fill with gradient
                ctx_gradient.fillStyle = grd;
                ctx_gradient.fillRect(0, 0, image.width, image.height);
            }
            if (filter_data.gradient == 'solid') {
                // Fill with colour
                ctx_gradient.fillStyle = "rgba(" + filter_data.gradient_stops[0][0] + "," + filter_data.gradient_stops[0][1] + "," + filter_data.gradient_stops[0][2] + "," + filter_data.gradient_stops[0][3] + ")";
                ctx_gradient.fillRect(0, 0, image.width, image.height);
            }
            if (filter_data.gradient == 'linear') {
                // radial gradient
                grd = ctx_gradient.createLinearGradient(0, 0, 0, image.width);
                for (var i = 0; i < filter_data.gradient_stops.length; i++) {
                    grd.addColorStop(filter_data.gradient_stops[i][0], "rgba(" + filter_data.gradient_stops[i][1] + "," + filter_data.gradient_stops[i][2] + "," + filter_data.gradient_stops[i][3] + "," + filter_data.gradient_stops[i][4] + ")");
                }
                // Fill with gradient
                ctx_gradient.fillStyle = grd;
                ctx_gradient.fillRect(0, 0, image.width, image.height);
            }
            bottomImage = canvas_gradient;
            var bottomCanvas = document.createElement("canvas");
            bottomCanvas.width = image.width;
            bottomCanvas.height = image.height;
            // get the 2d context to draw
            var bottomCtx = bottomCanvas.getContext('2d');
            bottomCtx.drawImage(bottomImage, 0, 0, image.width, image.height);

            applyBlending(bottomImage, topImage, image, id, filter_data.blend).then(function(result) {
                deferred.resolve(result);
            });

        } else {
            deferred.resolve(topCanvas);
        }
        return deferred.promise;
    }


    this.setCrop = function(image_id) {
        var cur_filter = $("#image_" + image_id).attr('adjustment-data');
        getData = function() {
            var stored_image_data = cropper.getImageData();
            var stored_data = cropper.getData();
            $("#image_" + image_id).attr('crop-data', JSON.stringify(stored_data));
            $("#image_" + image_id).attr('image-data', JSON.stringify(stored_image_data));
            var gcd = cropper.getCanvasData();
            var gd = cropper.getData();
            var gcbd = cropper.getCropBoxData();
            // Set the height of the container
            var wrapper = document.getElementById('cropper_' + image_id);
            wrapper.style.cssFloat = 'left';
            image.style.position = "relative";
            // TOP RIGHT BOTTOM LEFT
            // top as percent of gcd H and W
            var per_top = (gcbd.top / gcd.height) * 100;
            var per_right = ((gcd.width - gcbd.width - gcbd.left) / gcd.width) * 100;
            var per_bottom = ((gcd.height - (gcbd.height + gcbd.top)) / gcd.height) * 100;
            var per_left = (gcbd.left / gcd.width) * 100;
            var per_top_margin = (gcbd.top / gcd.width) * 100;
            var per_bottom_margin = ((gcd.height - (gcbd.top + gcbd.height)) / gcd.width) * 100;
            image.style.clipPath = "inset(" + per_top + "% " + per_right + "% " + per_bottom + "% " + per_left + "%)";
            var zoom_amount = ((((gcd.width - gcbd.width) / gcbd.width) * 100) + 100);
            image.style.maxWidth = zoom_amount + '%';
            image.style.width = zoom_amount + '%';
            image.style.left = ((per_left * (zoom_amount / 100)) * -1) + '%';
            image.style.marginTop = ((per_top_margin * (zoom_amount / 100)) * -1) + '%';
            image.style.marginBottom = ((per_bottom_margin * (zoom_amount / 100)) * -1) + '%';
            wrapper.style.maxWidth = gd.width + 'px';
            // reset the wrapper width and height.
            wrapper.style.width = '';
            wrapper.style.height = '';
            var cbd = { 'top': gcbd.top, 'right': (gcbd.width + gcbd.left), 'bottom': (gcbd.height + gcbd.top), 'left': gcbd.left };
            $("#image_" + image_id).attr('cbd-data', JSON.stringify(cbd));
            var win_width = $(window).width();
            if (stored_image_data.naturalWidth < win_width) {
                zoom_amount = stored_image_data.naturalWidth / (cbd.right - cbd.left);
            } else {
                zoom_amount = win_width / (cbd.right - cbd.left);
                var height = (cbd.bottom - cbd.top) * zoom_amount;
            }
            // Add class to show that this image has been cropped
            $("#image_" + image_id).addClass("cropped");
            // set this card to contenteditable true.
            var card = $(wrapper).parent().closest('div').attr('id');
            $('#' + card).attr('contenteditable', 'true');
            // Get image Styles
            var cssStyleParsed = getStyles(image_id);
            $('#cropper_' + image_id + ' .adjusted').attr("style", cssStyleParsed);
            // If Adjusted exists hide original.
            if ($('#cropper_' + image_id + ' .adjusted').length >= 0) {
                $("#image_" + image_id).css('display', 'none');
            }
            cropper.destroy();
            $rootScope.crop_on = false;
            closeEdit(event, image_id);
        };
        getData();

        $timeout(function() {
            // After image
            crop_finished = true;
            // CHECK - still needed?
            //var card_id = $('#cropper_' + image_id).parent().attr('id');
            //var active_el = document.activeElement;
            $('.content_cnv').scrollTop($('.content_cnv')[0].scrollHeight);
        }, 0);
    };

}]);


//
// Database Service
//

cardApp.service('Database', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', 'Cropp', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal, Cropp) {

    var self = this;

    var updateinprogress = false;
    var sent_content_length = 200;

    var card_create = {
        _id: 'card_create',
        content: '',
        user: '',
        user_name: ''
    };

    //Set the FCM data for the Notification request

    function createOptions(headers, data) {
        this.options = {
            uri: 'https://fcm.googleapis.com/fcm/send',
            method: 'POST',
            headers: headers,
            json: data
        };
    }

    function createHeaders(auth) {
        this.headers = {
            'Authorization': auth,
            'Content-Type': 'application/json'
        };
    }

    function createData(to, title, body, url) {
        this.data = {
            "to": to,
            "notification": {
                "title": title,
                "body": body
            },
            "data": {
                "url": url
            }
        };
    }

    // Get the FCM details (Google firebase notifications).
    // Only get if the user is logged in, otherwise it is not required.
    var headersObj;
    if (principal.isAuthenticated) {
        $http.get("/api/fcm_data").then(function(result) {
            if (result != result.data.fcm != 'forbidden') {
                fcm = result.data.fcm;
                headersObj = new createHeaders('key=' + fcm.firebaseserverkey);
            }
        });
    }

    this.setNotification = function(data, currentUser, card_content) {
        var notification_title;
        var notification_body;
        // Public conversation
        if (data.conversation_type == 'public') {
            // Get the conversation name and add to model.
            notification_title = data.conversation_name;
            notification_body = card_content;
        }
        // Group conversation. 
        if (data.participants.length > 2) {
            // Set the notification title to the conversation title
            notification_title = data.conversation_name;
            notification_body = '<b>' + currentUser.google.name + '</b>' + ': ' + card_content;
        }
        // Two user conversation (not a group)
        if (data.participants.length == 2) {
            // Set the notification title to the senders name
            notification_title = currentUser.google.name;
            notification_body = card_content;
        }
        var notification = { title: notification_title, body: notification_body };
        return notification;
    };

    // SAVE CARD (Android image bug. Temporarily save the updated card but do not send notificstion.)
    this.saveTempCard = function(card_id, card, currentUser) {
        if (!updateinprogress) {
            updateinprogress = true;
            setTimeout(function() {
                card.content = Format.setMediaSize(card_id, card);
                card.content = replaceTags.replace(card.content);
                // Remove any temp filtered images
                card.content = Format.removeTempFiltered(card.content);
                var pms = { 'id': card_id, 'card': card };
                // call the update function from our service (returns a promise object)
                Cards.update(pms)
                    .then(function(returned) {
                        $rootScope.$broadcast('CARD_UPDATED', returned.data);
                        updateinprogress = false;
                    })
                    .catch(function(error) {
                        console.log('error: ' + error);
                    });
            }, 0);
        }
    };

    // CREATE AND UPDATE CARD
    // MERGE  Conversations.updateTime(card.conversationId) & Conversations.updateViewed(card.conversationId, viewed_users[x]._id, card_id)
    // UPDATE CARD
    this.updateCard = function(card_id, card, currentUser) {
        if (!updateinprogress) {
            updateinprogress = true;
            setTimeout(function() {
                var promises = [];
                card.content = Format.setMediaSize(card_id, card);
                card.content = replaceTags.replace(card.content);
                // DANGER These had been removed for android image save bug
                card.content = replaceTags.removeDeleteId(card.content);
                card.content = replaceTags.removeFocusIds(card.content);
                // Remove any temp filtered images
                card.content = Format.removeTempFiltered(card.content);
                var sent_content;
                var notification_title;
                var notification_body;
                var card_content = card.content;
                var pms = { 'id': card_id, 'card': card };
                // call the create function from our service (returns a promise object)
                Cards.update(pms)
                    .then(function(returned) {
                        $rootScope.$broadcast('CARD_UPDATED', returned.data);
                        var viewed_users = [];
                        // Update the Conversation updateAt time.
                        Conversations.updateTime(card.conversationId)
                            .then(function(response) {
                                updateinprogress = false;
                                // Only send notifications if there are other participants.
                                if (response.data.participants.length > 1) {
                                    var notification = self.setNotification(response.data, currentUser, card_content);
                                    notification_title = notification.title;
                                    notification_body = notification.body;
                                    sent_content = FormatHTML.prepSentContent(notification_body, sent_content_length);
                                    // Send notifications
                                    for (var i in response.data.participants) {
                                        // dont emit to the user which sent the card
                                        if (response.data.participants[i]._id !== currentUser._id) {
                                            // Add this users id to the viewed_users array.
                                            viewed_users.push({ "_id": response.data.participants[i]._id });
                                            // Find the other user(s)
                                            General.findUser(response.data.participants[i]._id, function(result) {
                                                // Get the participants notification key
                                                // Set the message title and body
                                                if (result.notification_key !== undefined) {
                                                    // Send the notification
                                                    var dataObj = new createData(result.notification_key, notification_title, sent_content, response.data._id);
                                                    var optionsObj = new createOptions(headersObj.headers, dataObj.data);
                                                    Users.send_notification(optionsObj.options)
                                                        .then(function(res) {
                                                            //console.log(res);
                                                        });
                                                }
                                            });
                                        }
                                    }
                                    // Update the unviewed arrary for all participants.
                                    for (var x = 0; x < viewed_users.length; x++) {
                                        promises.push(
                                            Conversations.updateViewed(card.conversationId, viewed_users[x]._id, card_id)
                                            .then(function(res) {
                                                //console.log(res);
                                            })
                                        );
                                    }
                                    // All Conversation participants unviewed arrays updated
                                    $q.all(promises).then(function() {
                                        // update other paticipants in the conversation via socket.
                                        socket.emit('card_posted', { sender_id: socket.getId(), conversation_id: card.conversationId, participants: viewed_users });
                                        //updateinprogress = false;
                                    });
                                }
                            });

                    })
                    .catch(function(error) {
                        console.log('error: ' + error);
                    });
            }, 0);
        }
    };

    // CREATE CARD
    this.createCard = function(id, card_create, currentUser) {
        var promises = [];
        card_create.user = currentUser.google.name;
        // Get the Conversation in which this card is being created.
        var current_conversation_id = Conversations.getConversationId();
        card_create.conversationId = current_conversation_id;
        card_create.content = Format.setMediaSize(id, card_create);
        card_create.content = replaceTags.replace(card_create.content);
        card_create.content = Format.removeDeleteIds();
        card_create.content = replaceTags.removeDeleteId(card_create.content);
        card_create.content = replaceTags.removeFocusIds(card_create.content);
        // Remove any temp filtered images
        card_create.content = Format.removeTempFiltered(card_create.content);
        var sent_content;
        var notification_title;
        var notification_body;
        var card_content = card_create.content;
        Cards.create(card_create)
            .then(function(response) {
                var card_id = response.data._id;
                var card_response = response.data;
                // notify conversation_ctrl and cardcreate_ctrl that the conversation has been updated
                // reset the input box
                $rootScope.$broadcast('CARD_CREATED', card_response);
                var viewed_users = [];
                // Update the Conversation updateAt time.
                Conversations.updateTime(current_conversation_id)
                    .then(function(response) {
                        // Only send notifications if there are other participants.
                        if (response.data.participants.length > 1) {
                            var notification = self.setNotification(response.data, currentUser, card_content);
                            notification_title = notification.title;
                            notification_body = notification.body;
                            sent_content = FormatHTML.prepSentContent(notification_body, sent_content_length);
                            // Send notifications
                            for (var i in response.data.participants) {
                                // dont emit to the user which sent the card
                                if (response.data.participants[i]._id !== currentUser._id) {
                                    // Add this users id to the viewed_users array.
                                    viewed_users.push({ "_id": response.data.participants[i]._id });
                                    // Find the other user(s)
                                    promises.push(UserData.getConversationsUser(response.data.participants[i]._id)
                                        .then(function(result) {
                                            // Get the participants notification key
                                            // Set the message title and body
                                            if (result.notification_key !== undefined) {
                                                var dataObj = new createData(result.notification_key, notification_title, sent_content, response.data._id);
                                                var optionsObj = new createOptions(headersObj.headers, dataObj.data);
                                                // Send the notification
                                                Users.send_notification(optionsObj.options)
                                                    .then(function(res) {
                                                        //console.log(res);
                                                    });
                                            }
                                        }));
                                }
                            }
                            // Update the unviewed array for all participants.
                            for (var x = 0; x < viewed_users.length; x++) {
                                promises.push(
                                    Conversations.updateViewed(current_conversation_id, viewed_users[x]._id, card_id)
                                    .then(function(res) {
                                        //console.log(res);
                                    })
                                );
                            }
                            // All Conversation participants unviewed arrays updated
                            $q.all(promises).then(function() {
                                //console.log('all promises - emit card_posted');
                                // update other paticipants in the conversation via socket.
                                socket.emit('card_posted', { sender_id: socket.getId(), conversation_id: current_conversation_id, participants: viewed_users });
                            });
                        }
                    });
            });
    };

    // DELETE CARD
    this.deleteCard = function(card_id, conversation_id, currentUser) {
        var sent_content;
        var notification_title;
        var notification_body;
        var card_content = 'Post deleted.';
        Cards.delete(card_id)
            .then(function(response) {
                // notify conversation_ctrl that the card has been deleted
                $rootScope.$broadcast('CARD_DELETED', card_id);
                // remove this Card from the unviewed array for all Conversation participants.
                Conversations.removeViewed(conversation_id, currentUser, card_id)
                    .then(function(response) {
                        var notification = self.setNotification(response.data, currentUser, card_content);
                        notification_title = notification.title;
                        notification_body = notification.body;
                        sent_content = FormatHTML.prepSentContent(notification_body, sent_content_length);
                        // Send notifications
                        for (var i in response.data.participants) {
                            // dont emit to the user which sent the card
                            if (response.data.participants[i]._id !== currentUser._id) {
                                // Find the other user(s)
                                General.findUser(response.data.participants[i]._id, function(result) {
                                    // Get the participants notification key
                                    // set the message title and body
                                    if (result.notification_key !== undefined) {
                                        var dataObj = new createData(result.notification_key, notification_title, sent_content, response.data._id);
                                        var optionsObj = new createOptions(headersObj.headers, dataObj.data);
                                        // Send the notification
                                        Users.send_notification(optionsObj.options)
                                            .then(function(res) {
                                                //console.log(res);
                                            });
                                    }
                                });
                            }
                        }
                        // socket.io emit the card posted to the server
                        socket.emit('card_posted', { sender_id: socket.getId(), conversation_id: response.data._id, participants: response.data.participants });
                    });
            })
            .catch(function(error) {
                console.log('error: ' + error);
            });
    };

}]);