// Format Service

cardApp.service('Format', ['$window', '$rootScope', '$timeout', '$q', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', '$injector', function($window, $rootScope, $timeout, $q, Users, Cards, Conversations, replaceTags, socket, $injector) {

    var self = this;
    var tag_count_previous;
    var paste_in_progress = false;
    var marky_started_array = [];
    var INITIAL_KEY = 'z';
    var secondkey_array = [];
    var within_pre = false;
    var start_key = false;
    var ua = navigator.userAgent;
    // Image resize max width or height
    var MAX_WIDTH = 1080;
    var MAX_HEIGHT = 1080;
    var JPEG_COMPRESSION = 0.8;
    var IMAGES_URL = 'fileuploads/images/';
    var refreshedToken;
    var marky_found = false;
    var focused_id;
    var focused_card;
    var focused_user;
    var savedSelection;

    $window.imageUploaded = self.imageUploaded;

    // Set serverUrl based upon current host (local or live)
    if (location.hostname === 'localhost') {
        // TODO should this not have /upload then route_folder for both would just be / in upload_app route.js
        serverUrl = 'http://localhost:8060/upload';
    } else {
        serverUrl = 'https://www.snipbee.com/upload';
    }

    this.imageUploaded = function(data) {
        console.log('Format');
        console.log(data);
        insertImage(data);
    };

    // Array to dynamically set marky chars to html tags
    var marky_array = [{
        charstring: INITIAL_KEY + 'b',
        html: 'b',
        attribute: '',
        close: true
    }, {
        charstring: INITIAL_KEY + 'i',
        html: 'i',
        attribute: '',
        close: true
    }, {
        charstring: INITIAL_KEY + 'p',
        html: 'pre',
        attribute: '',
        close: true
    }, {
        charstring: INITIAL_KEY + 'c',
        html: 'input',
        attribute: 'type="checkbox" onclick="checkBoxChanged(this)" onmouseover="checkBoxMouseover(this)" onmouseout="checkBoxMouseout(this)" ',
        span_start: '<span id="checkbox_edit" >',
        span_end: '</span>',
        close: false
    }, {
        charstring: INITIAL_KEY + '1',
        html: 'h1',
        attribute: 'class="header_1"',
        span_start: '<span id="header" >',
        span_end: '</span>',
        close: true
    }, {
        charstring: INITIAL_KEY + '2',
        html: 'h2',
        attribute: 'class="header_2"',
        span_start: '<span id="header" >',
        span_end: '</span>',
        close: true
    }, {
        charstring: INITIAL_KEY + '3',
        html: 'h3',
        attribute: 'class="header_3"',
        span_start: '<span id="header" >',
        span_end: '</span>',
        close: true
    }, {
        charstring: INITIAL_KEY + 'r',
        html: 'hr',
        attribute: '',
        close: false
    }, {
        charstring: INITIAL_KEY + 'q',
        html: 'q',
        attribute: '',
        close: true
    }, {
        charstring: INITIAL_KEY + 'm',
        html: '',
        attribute: '',
        script: 'getImage',
        close: false
    }];

    // Create secondkey_array from marky_array
    for (var i = 0; i < marky_array.length; i++) {
        secondkey_array.push(marky_array[i].charstring.charAt(1));
    }

    function getDate() {
        var today = new Date();
        var time = today.getTime();
        return time;
    }

    function createImageElement() {
        return $q(function(resolve, reject) {
            var img = document.createElement("img");
            resolve(img);
        });
    }

    function loadFileReader(img, file) {
        return $q(function(resolve, reject) {
            var reader = new FileReader();
            reader.addEventListener("load", function() {
                img.onload = function() {

                };
                img.src = reader.result;
                resolve(img);
            }, false);
            reader.readAsDataURL(file);
        });
    }

    function loadExifReader(img, file) {
        return $q(function(resolve, reject) {
            var reader = new FileReader();
            reader.onloadend = function() {
                var exif = EXIF.readFromBinaryFile(reader.result);
                var obj = { 'image': img, 'exif': exif };
                resolve(obj);
            };
            reader.readAsArrayBuffer(file);
        });
    }

    function resizeImage(img, exif) {
        return $q(function(resolve, reject) {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            var width = img.width;
            var height = img.height;
            if (width > height && width > MAX_WIDTH) {
                // landscape
                ratio = width / MAX_WIDTH;
                width = MAX_WIDTH;
                height = height / ratio;
            } else if (height > width && height > MAX_HEIGHT) {
                // portrait
                ratio = height / MAX_HEIGHT;
                height = MAX_HEIGHT;
                width = width / ratio;
            }
            canvas.width = width;
            canvas.height = height;
            var orientation = exif.Orientation;
            ctx.save();
            switch (orientation) {
                case 2:
                    ctx.translate(width, 0);
                    ctx.scale(-1, 1);
                    break;
                case 3:
                    ctx.translate(width, height);
                    ctx.rotate(Math.PI);
                    break;
                case 4:
                    ctx.translate(0, height);
                    ctx.scale(1, -1);
                    break;
                case 5:
                    ctx.rotate(0.5 * Math.PI);
                    ctx.scale(1, -1);
                    break;
                case 6:
                    // portrait so switch width height
                    canvas.width = height;
                    canvas.height = width;
                    ctx.rotate(0.5 * Math.PI);
                    ctx.translate(0, -height);
                    break;
                case 7:
                    ctx.rotate(0.5 * Math.PI);
                    ctx.translate(width, -height);
                    ctx.scale(-1, 1);
                    break;
                case 8:
                    // portrait so switch width height
                    canvas.width = height;
                    canvas.height = width;
                    ctx.rotate(-0.5 * Math.PI);
                    ctx.translate(-width, 0);
                    break;
            }
            ctx.drawImage(img, 0, 0, width, height);
            ctx.restore();
            // compress JPEG
            var dataURL = canvas.toDataURL('image/jpeg', JPEG_COMPRESSION);
            resolve(dataURL);
        });
    }

    this.dataURItoBlob = function(dataURI) {
        return $q(function(resolve, reject) {
            // convert base64/URLEncoded data component to raw binary data held in a string
            var byteString;
            if (dataURI.split(',')[0].indexOf('base64') >= 0) {
                byteString = atob(dataURI.split(',')[1]);
            } else {
                byteString = unescape(dataURI.split(',')[1]);
            }
            // separate out the mime component
            var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
            // write the bytes of the string to a typed array
            var ia = new Uint8Array(byteString.length);
            for (var i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            var newBlob = new Blob([ia], { type: mimeString });
            resolve(newBlob);
        });
    };

    this.removeDeleteIds = function() {
        $('#cecard_create').html($('#cecard_create').html().replace(/<span id="delete">/g, ""));
        $('#cecard_create').html($('#cecard_create').html().replace(/<\/span>/g, ""));
        //$('#cecard_create').html($('#cecard_create').html().replace(/\u200B/g, ""));
        // Put back in space after images
        //$('#cecard_create .after_image').html('&#x200b'); 
        return $('#cecard_create').html();
    };

    // Added for update. Ensures focus is called after an image is inserted.
    imageLoaded = function() {
        var active_el = document.activeElement;
        var new_image = document.getElementById('new_image');
        $(new_image).removeAttr('onload id');
        active_el.blur();
        active_el.focus();
        // Scroll the image into view.
        self.scrollLatest('scroll_image_latest');
        $(new_image).attr('id', 'image_' + new_image.className.split(' ')[1]);
        $('#cropper_' + new_image.className.split(' ')[1]).css('maxWidth', new_image.naturalWidth);
        $('#cropper_' + new_image.className.split(' ')[1]).css('cssFloat', 'left');
    };

    insertImage = function(data) {
        console.log(data);
        if (data.response === 'saved') {
            data.file_name = data.file.substring(0, data.file.indexOf('.'));
            var new_image = "<div class='cropper_cont' onclick='editImage(this, \"" + data.file_name + "\")' id='cropper_" + data.file_name + "'><img class='resize-drag " + data.file_name + "' id='new_image' onload='imageLoaded(); imagePosted();' src='" + IMAGES_URL + data.file + "'></div><slider></slider><span class='after_image'>&#x200b;&#10;</span><span class='scroll_image_latest' id='delete'>&#x200b</span>";
            self.pasteHtmlAtCaret(new_image);
            // commented out because it causes an issue with onblur which is used to update card.
            /*
            // remove zero width space above image if it exists 
            var clone = $('#cecard_create').clone();
            //clone.find('#delete').remove();
            var old_text = clone.html();
            var new_text = old_text.replace(/\u200B/g, '');
            new_text += "<span id='delete_image'>&#x200b</span>";
            $window.document.getElementById("cecard_create").innerHTML = new_text;
            moveCaretInto('delete_image');
            */
        }
    };

    self.uploadImages = function(form, callback) {
        $.ajax({
            url: serverUrl,
            type: 'POST',
            data: form,
            processData: false,
            contentType: false,
            success: function(data) {
                // insert or callback?
                if (callback) {
                    callback(data);
                } else {
                    insertImage(data);
                }
            },
            xhr: function() {
                // create an XMLHttpRequest
                var xhr = new XMLHttpRequest();
                // listen to the 'progress' event
                xhr.upload.addEventListener('progress', function(evt) {
                    if (evt.lengthComputable) {
                        // calculate the percentage of upload completed
                        var percentComplete = evt.loaded / evt.total;
                        percentComplete = parseInt(percentComplete * 100);
                        // update the Bootstrap progress bar with the new percentage
                        $('.progress-bar').text(percentComplete + '%');
                        $('.progress-bar').width(percentComplete + '%');
                        // once the upload reaches 100%, set the progress bar text to done
                        if (percentComplete === 100) {
                            $('.progress-bar').html('Done');
                        }
                    }
                }, false);
                return xhr;
            }
        });
    };

    this.prepImage = function(files, callback) {
        var promises = [];
        self.formData = new FormData();
        angular.forEach(files, function(file, key) {
            promises.push(
                self.formData.append('uploads[]', file, file.name)
            );
        });

        $q.all(promises).then(function(formData) {
            // Image processing of ALL images complete. Upload form
            self.uploadImages(self.formData, callback);
        });
    };

    this.prepareImage = function(files, callback) {
        var promises = [];
        self.formData = new FormData();
        angular.forEach(files, function(file, key) {
            promises.push(
                createImageElement().then(function(img) {
                    return loadFileReader(img, file);
                }).then(function(img) {
                    return loadExifReader(img, file);
                }).then(function(obj) {
                    return resizeImage(obj.image, obj.exif);
                }).then(function(dataurl) {
                    return self.dataURItoBlob(dataurl);
                }).then(function(blob) {
                    // Unique file name
                    if (!file.renamed) {
                        file_name = getDate() + '_' + file.name;
                    } else {
                        file_name = file.name;
                    }
                    self.formData.append('uploads[]', blob, file_name);
                })
            );
        });

        $q.all(promises).then(function(formData) {
            // Image processing of ALL images complete. Upload form
            self.uploadImages(self.formData, callback);
        });
    };

    // UPLOAD ==================================================================
    uploadClickListen = function() {
        $('#upload-input').click();
        // Unbind the on change event to prevent it from firing twice after first call
        $('#upload-input').unbind();
    };

    // Save the card while a image is being taken (Android bug)
    this.saveCard = function(id, card, currentUser) {
        // check the content has changed.
        if (card.content != card.original_content) {
            // Inject the Database Service
            var Database = $injector.get('Database');
            // Update the card
            Database.saveTempCard(id, card, currentUser);
        }
    };

    this.uploadFile = function(id, card, currentUser) {
        if (ua.indexOf('AndroidApp') >= 0) {
            if (document.activeElement.id != 'cecard_create' && id != undefined && id != 'card_create') {
                // save the card first (Android bug)
                self.saveCard(id, card, currentUser);
            }
            Android.choosePhoto();
        } else {
            // All browsers except MS Edge
            if (ua.toLowerCase().indexOf('edge') == -1) {
                uploadClickListen();
            }
            $('#upload-input').on('change', function() {
                var files = $(this).get(0).files;
                if (files.length > 0) {
                    self.prepareImage(files);
                }
                // reset the input value to null so that files of the same name can be uploaded.
                this.value = null;
            });
            // MS Edge only
            if (ua.toLowerCase().indexOf('edge') > -1) {
                $timeout(function() {
                    uploadClickListen();
                });
            }
        }
    };

    this.showAndroidToast = function(toast) {
        if (ua.indexOf('AndroidApp') >= 0) {
            Android.showToast(toast);
        }
    };

    this.removeTempFiltered = function(content) {
        var content_less_pre;
        if (content !== undefined) {
            var reg_pre = /(<img src="data:image.*?>)(.*?)(>)/ig;
            content_less_pre = content;
            var pre_match = content_less_pre.match(reg_pre);
            for (var v in pre_match) {
                content_less_pre = content_less_pre.replace(pre_match[v], '');
            }
        }
        return content_less_pre;
    };

    this.removePreTag = function(content) {
        var content_less_pre;
        if (content !== undefined) {
            var reg_pre = /(<pre.*?>)(.*?)(<\/pre>)/ig;
            content_less_pre = content;
            var pre_match = content_less_pre.match(reg_pre);
            for (var v in pre_match) {
                content_less_pre = content_less_pre.replace(pre_match[v], '');
            }
        }
        return content_less_pre;
    };

    this.checkForImage = function(content) {
        var res;
        if (content.indexOf('<img') >= 0) {
            var img_tag = content.substr(content.indexOf('<img'), content.indexOf('.jpg">') + 6);
            res = "Posted a photo.";
        } else {
            res = content;
        }
        return res;
    };

    this.getFocus = function(id, card, currentUser) {
        if (id != undefined && card != undefined) {
            self.tag_count_previous = self.getTagCountPrevious(card.content);
            focused_id = id;
            focused_card = card;
            focused_user = currentUser;
            return self.tag_count_previous;
        }
    };

    findMarky = function(content) {
        var marky_found = false;
        for (var i = 0; i < secondkey_array.length; i++) {
            if (content.indexOf(INITIAL_KEY + secondkey_array[i]) >= 0) {
                marky_found = true;
            }
        }
        return marky_found;
    };

    checkUpdate = function() {
        if (ua.indexOf('AndroidApp') >= 0) {
            if (focused_id != undefined) {
                self.getBlurAndroid(focused_id, focused_card, focused_user);
            }
        }
    };

    // Called by Android onPause
    // Update the card.
    this.getBlurAndroid = function(id, card, currentUser) {
        if (id != undefined && card != undefined && currentUser != undefined) {
            // Check if there is a marky in progress
            // zm launching image capture should not trigger an update. It causes error.
            found_marky = findMarky(card.content);
            // check the content has changed and not currently mid marky
            if (card.content != card.original_content && (found_marky == false)) {
                // Inject the Database Service
                var Database = $injector.get('Database');
                // Update the card
                Database.updateCard(id, card, currentUser);
            }
        }
    };

    this.getBlur = function(id, card, currentUser) {
        // Add slight delay so that document.activeElement works
        setTimeout(function() {
            // Get the element currently in focus
            var active = $(document.activeElement).closest("div").attr('id');
            // If the blurred card is not the current card or the hidden input.
            if (('ce' + card._id != active && (active != 'hidden_input_container')) || image_edit_finished == true) {
                // Check if there is a marky in progress
                // zm launching image capture should not trigger an update. It causes error.
                found_marky = findMarky(card.content);
                // check the content has changed and not currently mid marky
                if ((card.content != card.original_content && (found_marky == false)) || image_edit_finished == true) {
                    // Only do this if not in current card?
                    if ($('.cropper-container').length > 0) {
                        $('.cropper-container').remove();
                        card.content = $('#ce' + card._id).html();
                    }
                    if (image_edit_finished) {
                        card.content = $('#ce' + card._id).html();
                    }
                    image_edit_finished = false;
                    // Inject the Database Service
                    var Database = $injector.get('Database');
                    // Update the card
                    Database.updateCard(id, card, currentUser);
                }
            }
        }, 0);
    };

    this.getTagCountPrevious = function(content) {
        var tag_count_previous_local;
        if (content !== undefined) {
            var reg = /(&lt;.*?&gt;)(.*?)(&lt;\/.*?&gt;)/ig;
            var content_less_pre = self.removePreTag(content);
            // create original vars
            tag_count_previous_local = (content_less_pre.match(reg) || []).length;
        }
        return tag_count_previous_local;
    };

    // TODO Check if this is still required.
    this.setMediaSize = function(id, card) {
        return card.content;
    };

    // Currently not used
    /*
    this.removeEmptyTags = function(content,elem){
        var reg_empty = /<[^\/>][^>]*><\/[^>]+>/igm;
        var empty_tags = content_less_pre.match(reg_empty);
        for(var i in empty_tags){
            empty_tags[i].replace();
        }
    };
    */

    this.findNodeNumber = function(el, word) {
        var found = {};
        found.f = 'x';
        for (var x = 0; x < el.childNodes.length; x++) {
            if (found.f == 'x') {
                if (el.childNodes.item(x).nodeType == 3) {
                    found = findChars(el.childNodes.item(x), word);
                } else if (el.childNodes.item(x).nodeType == 1) {
                    for (var y = 0; y < el.childNodes.item(x).childNodes.length; y++) {
                        if (found.f == 'x') {
                            if (el.childNodes.item(x).childNodes.item(y).nodeValue !== null) {
                                found = findChars(el.childNodes.item(x).childNodes.item(y), word);
                            }
                            if (el.childNodes.item(x).childNodes.item(y).childNodes) {
                                found = getChildNodes(el.childNodes.item(x).childNodes.item(y), word, found);
                            }
                        }
                    }
                }
            } else {
                return found;
            }
        }
        return found;
    };

    function getChildNodes(node, word, found) {
        if (found.f == 'x') {
            for (var z = 0; z < node.childNodes.length; z++) {
                if (found.f == 'x') {
                    if (node.childNodes.item(z).nodeValue !== null) {
                        found = findChars(node.childNodes.item(z), word);
                    }
                    if (node.childNodes.item(z).childNodes && found.f == 'x') {
                        found = getChildNodes(node.childNodes.item(z), word, found);
                    }
                }
            }
        }
        return found;
    }

    function setNodePos(n, o) {
        var node_pos = {};
        node_pos.node = n;
        node_pos.offset = o;
        return node_pos;
    }

    function findChars(node, word) {
        var found = {};
        found.f = 'x';
        if (node.nodeValue) {
            if (node.nodeValue.indexOf(word) !== -1) {
                // FOUND
                //if (node.parentNode.tagName != 'PRE') {
                // Not within a PRE tag
                var np = setNodePos(node, node.nodeValue.indexOf(word));
                found.f = 'y';
                found.p = np;
                //}
            }
        }
        return found;
    }

    // TODO remove delete id?
    function moveCaretAfter(id) {
        self.removeDeleteIds();
        var current_node = $("#" + id).get(0);
        $("<span id='delete'>&#x200b</span>").insertAfter(current_node);
        var range = document.createRange();
        range.setStartAfter(current_node.nextSibling);
        range.setStart(current_node.nextSibling, 1);
        range.setEnd(current_node.nextSibling, 1);
        range.collapse(true);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        // Fix for Firefox which replaces the zero width space with a <br> tag
        if (ua.toLowerCase().indexOf('firefox') > -1) {
            $('#' + id).html($('#' + id).html().replace(/<br>/g, ""));
        }
        $('#' + id).removeAttr('id');
        return;
    }

    function moveCaretInto(id) {
        // Causing bug in cecreate_card when enter is pressed following data is deleted.
        //self.removeDeleteIds();
        $("#" + id).html('&#x200b');
        var current_node = $("#" + id).get(0);
        range = document.createRange();
        range.setStart(current_node.firstChild, 1);
        range.setEnd(current_node.firstChild, 1);
        range.collapse(true);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        // Fix for Firefox which replaces the zero width space with a <br> tag
        if (ua.toLowerCase().indexOf('firefox') > -1) {
            $('#' + id).html($('#' + id).html().replace(/<br>/g, ""));
        }
        $('#' + id).removeAttr('id');
        // Scroll the pasted HTML into view
        self.scrollLatest('scroll_enter_latest');
        return;
    }

    function moveAfterPre(id) {
        var pre_node = $("#" + id).get(0);
        var nested_level = marky_started_array.length - 1;
        // If this PRE element is nested within elements
        if (nested_level > 0) {
            // Find the previous_node (formatting elements) which this is currently nested within.
            var previous_node = $("#" + id).get(0);
            for (var i = 0; i < nested_level; i++) {
                par = 'parentNode';
                previous_node = previous_node[par];
            }
            // Insert this PRE element after the elements within which it was nested
            $(pre_node).insertAfter(previous_node);
            // Now re-apply currently open tags to the pre contents in sequence
            for (var msa = 0; msa < marky_started_array.length - 1; msa++) {
                // Find the HTML for this charstring and create that element
                var result = $.grep(marky_array, function(e) { return e.charstring == marky_started_array[msa]; });
                var updateChars = document.createElement(result[0].html);
                updateChars.attribute = result[0].attribute;
                if (msa === 0) {
                    pre_node.appendChild(updateChars);
                    updateChars.id = 'temp';
                } else {
                    $('#temp').get(0).appendChild(updateChars);
                    $('#temp').removeAttr('id');
                    updateChars.id = 'temp';
                }
                // Last
                if (msa == marky_started_array.length - 2) {
                    $('#marky').removeAttr('id');
                    $('#temp').removeAttr('id');
                    updateChars.id = 'marky';
                }
            }
        }
        moveCaretInto('marky');
    }

    function evluateChar(marky_array, ma) {
        var char_watch = marky_array[ma].charstring;
        return char_watch;
    }

    // Check if an Array includes an index value and return that value index
    function include(arr, obj) {
        return (arr.indexOf(obj) != -1);
    }

    function closeMarky(marky_array, marky_started_array, char_watch) {
        // Close Marky tag and remove it from the marky_started_array
        var item_index = marky_started_array.indexOf(char_watch);
        marky_started_array.splice(item_index, 1);
        var ns = marky_array.html + ":contains('" + char_watch + "')";
        var node = $($(ns));
        var node_content = $(node).html();
        var before_index = node_content.indexOf(char_watch);
        var node_content_before = node_content.substr(0, before_index);
        var node_content_after = node_content.substr(before_index + Number(marky_array.charstring.length), node_content.length);
        node_content = node_content_before + node_content_after;
        $(node).html(node_content);
        $(node.attr('id', 'marky'));
        //
        $(node.removeClass('in_progress'));
        return marky_started_array;
    }

    // Check if an Array of Objects includes a property
    arrayObjectIndexOf = function(myArray, searchTerm, property) {
        for (var i = 0, len = myArray.length; i < len; i++) {
            if (myArray[i][property] === searchTerm) return i;
        }
        return -1;
    };

    function unclosedMarky(marky_started_array, marky_array) {
        // if still within an an unclosed Marky then continue with that unclosed Marky
        var complete_tag;
        var loop_count = 0;
        for (var z = 0; z < marky_started_array.length; z++) {
            var marky_html_index = arrayObjectIndexOf(marky_array, marky_started_array[z], 'charstring');
            if (marky_html_index !== -1) {
                var marky_html = marky_array[marky_html_index].html;
                if (marky_html != 'pre') {
                    var new_tag = '<' + marky_html + ' class="scroll_latest" id="focus">&#x200b</' + marky_html + '>';
                    if (loop_count > 0) {
                        var pos = complete_tag.indexOf('&#x200b');
                        complete_tag = complete_tag.slice(0, pos) + new_tag + complete_tag.slice(pos + 7, complete_tag.length);
                    } else {
                        complete_tag = new_tag;
                    }
                    loop_count++;
                }
            }
        }
        if (complete_tag != undefined) {
            self.pasteHtmlAtCaret(complete_tag);
        }
        return;
    }

    this.markyCheck = function(content, elem, pre) {
        // pre false - currently not within a pre
        // pre true - currently within a pre
        if (!pre) {
            content_less_pre = self.removePreTag(content);
            content_to_match = content_less_pre;
        } else {
            content_to_match = content;
        }
        // Ignore Canvas Images (which may contain chars from markey_array).
        content_less_temp = self.removeTempFiltered(content);
        content_to_match = content_less_temp;
        for (var ma = 0; ma < marky_array.length; ma++) {
            var mark_list_current;
            var reg2_str = "(" + marky_array[ma].charstring + ")";
            mark_list_current = content_to_match.match(new RegExp(reg2_str, 'igm'));
            if (mark_list_current !== null && mark_list_current !== undefined) {
                //marky open
                var currentChars = mark_list_current[0];
                var char_watch = evluateChar(marky_array, ma);
                if (marky_array[ma].html !== '') {
                    if (!include(marky_started_array, char_watch)) {
                        // TODO DUPE! ma_arg
                        var ma_arg = marky_array[ma];
                        // Open Marky tag
                        var close_tag = true;
                        // Check whether this Tag is to be closed as well as opened
                        if (marky_array[ma].close === false) {
                            close_tag = false;
                        }
                        // Only add this Tag to the marky_started_array if it needs to be closed
                        if (close_tag) {
                            marky_started_array.push(JSON.parse(JSON.stringify(mark_list_current[0])));
                        }
                        var updateChars;
                        if (marky_array[ma].span_start != undefined) {
                            updateChars = currentChars.replace(char_watch, marky_array[ma].span_start + "<" + marky_array[ma].html + " " + marky_array[ma].attribute + " class='scroll_latest' id='marky'>" + marky_array[ma].span_end);
                        } else {
                            updateChars = currentChars.replace(char_watch, "<" + marky_array[ma].html + " " + marky_array[ma].attribute + " class='scroll_latest in_progress' id='marky'>");
                        }
                        if (close_tag) {
                            updateChars += "</" + marky_array[ma].html + ">";
                        }
                        replaceTags.removeSpaces(elem);
                        // Use timeout to fix bug on Galaxy S6 (Chrome, FF, Canary)
                        $timeout(function() {
                                self.selectText(elem, currentChars);
                            }, 0)
                            .then(
                                function() {
                                    return $timeout(function() {
                                        self.pasteHtmlAtCaret(updateChars);
                                    }, 0);
                                }
                            )
                            .then(
                                function() {
                                    return $timeout(function() {
                                        document.getElementById(elem).focus();
                                        if (close_tag) {
                                            if (ma_arg.html == 'pre') {
                                                moveAfterPre('marky');
                                            } else {
                                                moveCaretInto('marky');
                                            }
                                        } else {
                                            moveCaretAfter('marky');
                                        }
                                    }, 0);
                                }
                            );
                    } else {
                        // Check whether to Close Marky tag 
                        // Close it if it has been opened, otherwise this is another Marky being opened
                        char_watch = evluateChar(marky_array, ma);
                        if (include(marky_started_array, char_watch)) {
                            var ma_arg = marky_array[ma];
                            $timeout(function() {
                                    marky_started_array = closeMarky(ma_arg, marky_started_array, char_watch);
                                }, 0)
                                .then(
                                    function() {
                                        return $timeout(function() {
                                            //document.getElementById(elem).focus();
                                            moveCaretAfter('marky');
                                        }, 0);
                                    }
                                )
                                .then(
                                    function() {
                                        return $timeout(function() {
                                            unclosedMarky(marky_started_array, marky_array);
                                        }, 0);
                                    }
                                );
                        }
                    }
                } else if (marky_array[ma].script !== '' && marky_array[ma].script !== undefined) {
                    // Not HTML but SCRIPT 
                    // TODO Fix so that the actual script which is passed is called     
                    if (marky_array[ma].script === 'getImage') {
                        $('#upload-trigger' + elem).trigger('click');
                    }
                    // Use timeout to fix bug on Galaxy S6 (Chrome, FF, Canary)
                    // Timeout causing bug on Web MS Edge. Removed and changed paste from '' to '&#x200b'
                    $timeout(function() {
                            self.selectText(elem, currentChars);
                        }, 0)
                        .then(
                            function() {
                                self.pasteHtmlAtCaret('&#x200b');
                            }
                        );
                }
            }
        }
    };

    function getCharacterPrecedingCaret(containerEl) {
        var precedingChar = "",
            sel, range, precedingRange;
        if (window.getSelection) {
            sel = window.getSelection();
            if (sel.rangeCount > 0) {
                range = sel.getRangeAt(0).cloneRange();
                range.collapse(true);
                range.setStart(containerEl, 0);
                precedingChar = range.toString().slice(-1);
            }
        } else if ((sel = document.selection) && sel.type != "Control") {
            range = sel.createRange();
            precedingRange = range.duplicate();
            precedingRange.moveToElementText(containerEl);
            precedingRange.setEndPoint("EndToStart", range);
            precedingChar = precedingRange.text.slice(-1);
        }
        return precedingChar;
    }

    this.contentChanged = function(content, elem) {
        if (!self.paste_in_progress) {
            if (within_pre == false) {
                // MARKY
                self.markyCheck(content, elem, false);
            } else {
                // MARKY (Close PRE)
                self.markyCheck(content, elem, true);
            }
        } else {
            self.paste_in_progress = false;
        }
    };

    this.selectText = function(element, word) {
        var doc = document;
        var current_node;
        var node_pos = self.findNodeNumber(doc.getElementById(element), word);
        var text = doc.getElementById(element);
        if (doc.body.createTextRange) {
            range = document.body.createTextRange();
            range.moveToElementText(text);
            range.select();
        } else if (window.getSelection) {
            selection = window.getSelection();
            var sel = window.getSelection();
            range = document.createRange();
            el = doc.getElementById(element);
            current_node = node_pos.p.node;
            var current_text = current_node.nodeValue;
            var word_index = current_text.indexOf(word);
            if (word_index >= 0) {
                range.setStart(current_node, node_pos.p.offset);
                range.setEnd(current_node, node_pos.p.offset + word.length);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
        return;
    };

    // Scroll the HTML into view
    this.scrollLatest = function(clas) {
        var scroll_latest = document.querySelector('.' + clas);
        $timeout(function() {
            $timeout(function() {
                if (document.querySelector('.' + clas) != undefined) {
                    scrollIntoViewIfNeeded(scroll_latest, { duration: 200, offset: { bottom: 30 } });
                }
            }, 200);
            $timeout(function() {
                if (clas == 'scroll_latest_footer') {
                    // remove scroll div after scrolling
                    $('.' + clas).remove();
                } else {
                    // remove scroll class after scrolling
                    $('.' + clas).removeClass(clas);
                }
            }, 400);

        });
    };

    this.pasteHtmlAtCaret = function(html) {
        var sel, range, scroll_latest;
        if (window.getSelection) {
            // IE9 and non-IE
            sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0);
                range.deleteContents();
                var el = document.createElement("div");
                el.innerHTML = html;
                var frag = document.createDocumentFragment(),
                    node, lastNode;
                while ((node = el.firstChild)) {
                    lastNode = frag.appendChild(node);
                }
                range.insertNode(frag);
                // Preserve the selection
                if (lastNode) {
                    range = range.cloneRange();
                    // Firefox fix
                    if (ua.toLowerCase().indexOf('firefox') > -1) {
                        range.setStart(lastNode, 0);
                    } else {
                        range.setStartAfter(lastNode);
                    }
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
                if (html.indexOf('scroll_image_latest') < 0) {
                    self.scrollLatest('scroll_latest');
                }
            }
        } else if (document.selection && document.selection.type != "Control") {
            // IE < 9
            document.selection.createRange().pasteHTML(html);
            if (html.indexOf('scroll_image_latest') < 0) {
                self.scrollLatest('scroll_latest');
            }
        }
        return;
    };

    this.saveSelection = function(containerEl) {
        var start;
        if (window.getSelection && document.createRange) {
            var range = window.getSelection().getRangeAt(0);
            var preSelectionRange = range.cloneRange();
            preSelectionRange.selectNodeContents(containerEl);
            preSelectionRange.setEnd(range.startContainer, range.startOffset);
            start = preSelectionRange.toString().length;
            return {
                container: containerEl,
                start: start,
                end: start + range.toString().length
            };
        } else if (document.selection && document.body.createTextRange) {
            var selectedTextRange = document.selection.createRange();
            var preSelectionTextRange = document.body.createTextRange();
            preSelectionTextRange.moveToElementText(containerEl);
            preSelectionTextRange.setEndPoint("EndToStart", selectedTextRange);
            start = preSelectionTextRange.text.length;
            return {
                container: containerEl,
                start: start,
                end: start + selectedTextRange.text.length
            };
        }
    };

    this.restoreSelection = function(containerEl) {
        savedSel = savedSelection;
        if (window.getSelection && document.createRange) {
            var charIndex = 0,
                range = document.createRange();
            range.setStart(containerEl, 0);
            range.collapse(true);
            var nodeStack = [containerEl],
                node, foundStart = false,
                stop = false;
            while (!stop && (node = nodeStack.pop())) {
                if (node.nodeType == 3) {
                    var nextCharIndex = charIndex + node.length;
                    if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
                        range.setStart(node, savedSel.start - charIndex);
                        foundStart = true;
                    }
                    if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
                        range.setEnd(node, savedSel.end - charIndex);
                        stop = true;
                    }
                    charIndex = nextCharIndex;
                } else {
                    var i = node.childNodes.length;
                    while (i--) {
                        nodeStack.push(node.childNodes[i]);
                    }
                }
            }
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } else if (document.selection && document.body.createTextRange) {
            var textRange = document.body.createTextRange();
            textRange.moveToElementText(containerEl);
            textRange.collapse(true);
            textRange.moveEnd("character", savedSel.end);
            textRange.moveStart("character", savedSel.start);
            textRange.select();
        }
    };

    this.keyListen = function(elem) {
        var getKeyCode = function() {
            var editableEl = document.getElementById(elem);
            // lowercase
            var a = getCharacterPrecedingCaret(editableEl);
            return a;
        };

        var getSelectionStart = function() {
            var node = document.getSelection().anchorNode;
            return node;
        };

        var observeDOM = (function() {
            var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
            return function(obj, callback) {
                if (!obj || !obj.nodeType === 1) return; // validation
                if (MutationObserver) {
                    // define a new observer
                    var obs = new MutationObserver(function(mutations, observer) {
                        if (mutations[0].addedNodes.length || mutations[0].removedNodes.length)
                            callback(mutations[0]);
                    });
                    // have the observer observe foo for changes in children
                    obs.observe(obj, { childList: true, subtree: true });
                } else if (window.addEventListener) {
                    obj.addEventListener('DOMNodeInserted', callback, false);
                    obj.addEventListener('DOMNodeRemoved', callback, false);
                }
            };
        })();

        // Observe a specific DOM element:
        observeDOM(document.querySelector("#" + elem), function(m) {
            if (m.addedNodes.length == 0 && m.removedNodes.length > 0) {
                if (m.removedNodes[0].className == 'in_progress') {
                    // Removed an in prgress node.
                    // Inject the General Service
                    var General = $injector.get('General');
                    // Get the position of this HTML element in the marky_array.
                    var index = General.findWithAttr(marky_array, 'html', m.removedNodes[0].nodeName.toLowerCase());
                    // If this tag exists in the marky_started_array thrn remove it.
                    var del = marky_started_array.indexOf(marky_array[index].charstring);
                    if (del >= 0) {
                        marky_started_array.splice(del, 1);
                    }
                }
            }
        });

        document.getElementById(elem).onkeyup = function(e) {
            var kc = getKeyCode();
            // Listen for backspace
            if (e.keyCode == 8) {
                //console.log($(getSelectionStart().parentNode));
                if ($(getSelectionStart()).attr("class") != undefined) {
                    var prev_class = $(getSelectionStart()).attr("class");
                    var prev_elem = $(getSelectionStart());
                    var parent = $(getSelectionStart()).parent().attr("id");
                    // If this is a header then delete the header elements and remove from the marky_started_array if it exists.
                    if (prev_class.indexOf('header') >= 0 && parent == 'header') {
                        $(getSelectionStart()).parent().remove();
                        var del = marky_started_array.indexOf(INITIAL_KEY + prev_class.substr(7, 1));
                        marky_started_array.splice(del, 1);
                    }
                }
            }

            if (kc == INITIAL_KEY) {
                start_key = true;
            } else if (start_key) {
                start_key = false;
                for (var i = 0; i < secondkey_array.length; i++) {
                    if (kc == secondkey_array[i]) {
                        stopEditing(this.id);
                    }
                }
            }
        };
    };

    function stopEditing(elem) {
        // TODO Still need anchornode check?
        selection = window.getSelection();
        var anchor_node = selection.anchorNode.parentNode.tagName;
        if (anchor_node === 'PRE') {
            within_pre = true;
        } else {
            within_pre = false;
        }
        if (marky_started_array.indexOf(INITIAL_KEY + 'p') >= 0) {
            within_pre = true;
        }
        // Move focus to the hidden input field so that editing is stopped.
        // The hidden input is fixed to the bottom offscreen so that scrolling does not occur on mobile
        $('#hidden_input').focus();
    }

    this.checkCursor = function($event, elem) {
        // Store current caret pos
        savedSelection = self.saveSelection(document.getElementById(elem));
    };

    this.checkKey = function($event, elem) {
        // Stop the default behavior for the ENTER key and insert <br><br> instead
        if ($event.keyCode == 13) {
            $event.preventDefault();
            self.pasteHtmlAtCaret("<br><span class='scroll_enter_latest' id='enter_focus'></span>");
            moveCaretInto('enter_focus');
            return false;
        }
    };

    this.handlePaste = function($event) {
        self.paste_in_progress = true;
        var data_type = 'text/html';
        var target = $($event.target);
        if (target.is("pre")) {
            data_type = 'text/plain';
        }
        var text;
        if ($window.clipboardData) { //IE
            text = $window.clipboardData.getData('Text');
        } else if ($event.originalEvent) {
            try {
                text = $event.originalEvent.clipboardData.getData(data_type);
            } catch (ex) {
                text = undefined;
            }
        } else if ($event.clipboardData) {
            try {
                if (data_type == 'text/plain') {
                    $event.preventDefault();
                    text = $event.clipboardData.getData(data_type);
                }
            } catch (ex) {
                text = undefined;
            }
        }
        if (text) {
            document.execCommand('inserttext', false, text);
        }
    };
}]);