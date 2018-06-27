var cardApp = angular.module("cardApp", ['ngSanitize', 'ngRoute', 'angularMoment', 'ngAnimate', 'ngImgCrop', 'ngCookies', 'angular-jwt', 'luegg.directives']);

// Prefix for loading a snip id
var prefix = '/s/';

//
// ROUTES
//

cardApp.config(function($routeProvider, $locationProvider, $httpProvider) {
    $routeProvider
        .when('/', {
            templateUrl: '/views/conversations.html',
            controller: 'conversationsCtrl'
        })
        .when("/s/:snip", {
            templateUrl: '/views/card.html',
            controller: 'cardCtrl'
        })
        .when("/:username", {
            templateUrl: '/views/conversation.html',
            controller: 'conversationCtrl'
        })
        .when("/c/contacts", {
            templateUrl: '/views/contacts.html',
            controller: 'contactsCtrl'
        })
        // callback from importing google contacts.
        .when("/c/contacts/import", {
            templateUrl: '/views/contacts.html',
            controller: 'contactsCtrl',
            menuItem: 'import',
            reloadOnSearch: false
        })
        .when("/chat/conversations", {
            templateUrl: '/views/conversations.html',
            controller: 'conversationsCtrl'
        })
        .when("/chat/conversation/:id", {
            templateUrl: '/views/conversation.html',
            controller: 'conversationCtrl'
        })
        .when("/chat/user_public_conversation/:username", {
            templateUrl: '/views/conversation.html',
            controller: 'conversationCtrl'
        })
        .when("/api/join/:code", {
            templateUrl: '/views/join.html',
            controller: 'joinCtrl'
        })
        .when("/api/user_setting", {
            templateUrl: '/views/user_setting.html',
            controller: 'usersettingCtrl'
        })
        .when("/api/group_info/:id", {
            templateUrl: '/views/group.html',
            controller: 'groupCtrl'
        })
        .when("/api/logout", {
            templateUrl: '/views/login.html',
            controller: 'loginCtrl'
        })
        .when("/api/login", {
            templateUrl: '/views/login.html',
            controller: 'loginCtrl'
        })
        .when("/auth/callback", {
            templateUrl: '/views/authcallback.html',
            controller: 'authcallbackCtrl'
        })
        .otherwise({
            redirectTo: '/'
        });
    // use the HTML5 History API
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false,
        rewriteLinks: false
    });
});

//
// SERVICES
//

// Format Service

cardApp.service('Format', ['$window', '$rootScope', '$timeout', '$q', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', '$injector', function($window, $rootScope, $timeout, $q, Users, Cards, Conversations, replaceTags, socket, $injector) {

    var self = this;
    var tag_count_previous;
    var paste_in_progress = false;
    var marky_started_array = [];
    var initial_key = 'z';
    var secondkey_array = [];
    var within_pre = false;
    var start_key = false;
    var ua = navigator.userAgent;
    // Image resize max width or height
    var MAX_WIDTH = 1080;
    var MAX_HEIGHT = 1080;
    var JPEG_COMPRESSION = 0.9;
    var IMAGES_URL = 'fileuploads/images/';
    var refreshedToken;
    var marky_found = false;
    var focused_id;
    var focused_card;
    var focused_user;
    var savedSelection;

    $window.androidToJS = this.androidToJS;

    // Set serverUrl based upon current host (local or live)
    if (location.hostname === 'localhost') {
        // TODO should this not have /upload then route_folder for both would just be / in upload_app route.js
        serverUrl = 'http://localhost:8060/upload';
    } else {
        serverUrl = 'https://www.snipbee.com/upload';
    }

    androidToJS = function(data) {
        insertImage(data);
    };

    // Array to dynamically set marky chars to html tags
    var marky_array = [{
        charstring: 'zb',
        html: 'b',
        attribute: '',
        close: true
    }, {
        charstring: 'zi',
        html: 'i',
        attribute: '',
        close: true
    }, {
        charstring: 'zp',
        html: 'pre',
        attribute: '',
        close: true
    }, {
        charstring: 'zc',
        html: 'input',
        attribute: 'type="checkbox" onclick="checkBoxChanged(this)" onmouseover="checkBoxMouseover(this)" onmouseout="checkBoxMouseout(this)" ',
        span_start: '<span id="checkbox_edit" >',
        span_end: '</span>',
        close: false
    }, {
        charstring: 'z1',
        html: 'h1',
        attribute: '',
        close: true
    }, {
        charstring: 'z2',
        html: 'h2',
        attribute: '',
        close: true
    }, {
        charstring: 'z3',
        html: 'h3',
        attribute: '',
        close: true
    }, {
        charstring: 'z4',
        html: 'h4',
        attribute: '',
        close: true
    }, {
        charstring: 'z5',
        html: 'h5',
        attribute: '',
        close: true
    }, {
        charstring: 'z6',
        html: 'h6',
        attribute: '',
        close: true
    }, {
        charstring: 'zr',
        html: 'hr',
        attribute: '',
        close: false
    }, {
        charstring: 'zq',
        html: 'q',
        attribute: '',
        close: true
    }, {
        charstring: 'zm',
        html: '',
        attribute: '',
        script: 'getImage',
        close: false
    }];

    // Create secondkey_array from marky_array
    for (var i = 0; i < marky_array.length; i++) {
        secondkey_array.push(marky_array[i].charstring.charAt(1));
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

    dataURItoBlob = function(dataURI) {
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

    // Scroll to the bottom of the list
    scrollToBottom = function(speed) {
        $('html, body').animate({
            scrollTop: $('#bottom').offset().top
        }, speed, function() {});
    };

    this.removeDeleteIds = function() {
        $('#cecard_create').html($('#cecard_create').html().replace(/<span id="delete">/g, ""));
        $('#cecard_create').html($('#cecard_create').html().replace(/<\/span>/g, ""));
        $('#cecard_create').html($('#cecard_create').html().replace(/\u200B/g, ""));
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
    };

    insertImage = function(data) {
        if (data.response === 'saved') {
            var new_image = "<img class='resize-drag' id='new_image' onload='imageLoaded(); imagePosted();' src='" + IMAGES_URL + data.file + "'><span class='scroll_image_latest' id='delete'>&#x200b</span>";
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
                    return dataURItoBlob(dataurl);
                }).then(function(blob) {
                    self.formData.append('uploads[]', blob, file.name);
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
            if (content.indexOf(initial_key + secondkey_array[i]) >= 0) {
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
            if ('ce' + card._id != active && (active != 'hidden_input_container')) {
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
                            updateChars = currentChars.replace(char_watch, "<" + marky_array[ma].html + " " + marky_array[ma].attribute + " class='scroll_latest' id='marky'>");
                        }
                        if (close_tag) {
                            updateChars += "</" + marky_array[ma].html + ">";
                        }
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
        document.getElementById(elem).onkeyup = function(e) {
            var kc = getKeyCode();
            if (kc == initial_key) {
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
        if (marky_started_array.indexOf('zp') >= 0) {
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

cardApp.service('FormatHTML', ['Format', function(Format) {

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
// Database Service
//

cardApp.service('Database', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal) {

    var self = this;

    var updateinprogress = false;
    var sent_content_length = 28;

    var card_create = {
        _id: 'card_create',
        content: '',
        user: '',
        user_name: ''
    };

    //Set the FCM data for the Notification request
    var data = {
        "to": "",
        "notification": {
            "title": "",
            "body": ""
        },
        "data": {
            "url": ""
        }
    };
    var headers = {
        'Authorization': "",
        'Content-Type': 'application/json'
    };
    var options = {
        uri: 'https://fcm.googleapis.com/fcm/send',
        method: 'POST',
        headers: headers,
        json: data
    };

    // Get the FCM details (Google firebase notifications).
    // Only get if the user is logged in, otherwise it is not required.
    if (principal.isAuthenticated) {
        $http.get("/api/fcm_data").then(function(result) {
            if (result != result.data.fcm != 'forbidden') {
                fcm = result.data.fcm;
                headers.Authorization = 'key=' + fcm.firebaseserverkey;
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
                                                data.to = result.notification_key;
                                                data.notification.title = notification_title;
                                                data.notification.body = sent_content;
                                                // get the conversation id
                                                data.data.url = response.data._id;
                                                // Send the notification
                                                console.log('send');
                                                console.log(options);
                                                Users.send_notification(options)
                                                    .then(function(res) {
                                                        console.log(res);
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
                                    updateinprogress = false;
                                });
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
                        console.log(response);
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
                                        console.log(result);
                                        // Get the participants notification key
                                        // Set the message title and body
                                        if (result.notification_key !== undefined) {
                                            data.to = result.notification_key;
                                            data.notification.title = notification_title;
                                            data.notification.body = sent_content;
                                            // get the conversation id
                                            data.data.url = response.data._id;
                                            // Send the notification
                                             console.log('send');
                                                console.log(options);
                                            Users.send_notification(options)
                                                .then(function(res) {
                                                    console.log(res);
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
                            console.log('all');
                            console.log(current_conversation_id);
                            console.log(viewed_users);
                            // update other paticipants in the conversation via socket.
                            console.log(socket.getId());
                            socket.emit('card_posted', { sender_id: socket.getId(), conversation_id: current_conversation_id, participants: viewed_users });
                        });
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
                                        data.to = result.notification_key;
                                        data.notification.title = notification_title;
                                        data.notification.body = sent_content;
                                        // get the conversation id
                                        data.data.url = response.data._id;
                                        // Send the notification
                                        Users.send_notification(options)
                                            .then(function(res) {
                                                console.log(res);
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

//
// contenteditable directive
//

cardApp.directive("contenteditable", function() {
    return {
        require: "ngModel",
        link: function(scope, element, attrs, ngModel) {
            function read() {
                ngModel.$setViewValue(element.html());
            }
            ngModel.$render = function() {
                element.html(ngModel.$viewValue || "");
            };
            element.bind("blur keyup change", function(event) {
                // WARNING added - if (!scope.$$phase) { 31/01/18
                if (!scope.$$phase) {
                    scope.$apply(read);
                }
            });
        }
    };
});

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

//
// principal Factory
//

cardApp.factory('principal', function($cookies, jwtHelper, $q, $rootScope) {
    var principal = { isAuthenticated: false, roles: [], user: { name: 'Guest' } };

    try {
        var token = $cookies.get('_accessToken');
        var decoded = jwtHelper.decodeToken(token);
        if (decoded && !jwtHelper.isTokenExpired(token)) {
            principal.isAuthenticated = true;
            principal.user = decoded.data.user;
            principal.token = token;
        }
    } catch (e) {
        console.log('ERROR while parsing principal cookie.' + e);
    }

    principal.logOut = function() {
        principal.isAuthenticated = false;
        principal.token = null;
        $cookies.remove('_accessToken');
    };

    principal.getToken = function() {
        return principal.token;
    };

    principal.isValid = function() {
        if (principal.token != undefined) {
            jwtHelper.isTokenExpired(principal.token);
            principal.isAuthenticated = !jwtHelper.isTokenExpired(principal.token);
        }
        return principal.isAuthenticated;
    };

    return principal;
});

//
// UserData Factory
//

cardApp.factory('UserData', function($rootScope, $timeout, $window, $http, $cookies, $location, jwtHelper, $q, principal, Users, Conversations, FormatHTML, General, socket, $filter) {
    var user;
    var contacts = [];
    var contacts_and_user = [];
    var conversations;
    var conversationsLatestCard = [];
    var conversationsUsers = [];
    var sent_content_length = 20;
    // Final conversations model for display.
    var conversations_model = [];
    // Final cards model for display.
    var cards_model = [];
    var UserData = { isAuthenticated: false, isLoaded: false, isLoading: false };
    $rootScope.loaded = false;
    var isLoading = false;
    $rootScope.dataLoading = true;
    var ua = navigator.userAgent;
    $window.androidTokenRefresh = this.androidTokenRefresh;
    $window.androidToken = this.androidToken;

    UserData.checkFCMToken = function() {
        var deferred = $q.defer();
        console.log('checkFCMToken');
        if (ua.indexOf('AndroidApp') >= 0) {
            // check if exists in DB.
            if (UserData.getUser().notification_key_name != undefined) {
                // Check for refresh token.
                console.log('check');
                Android.checkFCMToken();
                deferred.resolve();
            } else {
                // Otherwise get token from Android (may have created account on Web).
                console.log('get');

                $rootScope.$watch('receivedToken', function(n) {
                    if (n) {
                        // loaded!
                        console.log('receivedToken');
                        deferred.resolve();
                    }
                });
                Android.getFCMToken();
            }
        } else {
            // Web
            $timeout(function() {
            deferred.resolve();
        },100);
        }
        return deferred.promise;
    };

    androidTokenRefresh = function(data) {
        
        refreshedToken = JSON.parse(data);
        console.log(refreshedToken);
        if (refreshedToken.id != undefined && refreshedToken.refreshedToken != undefined) {
        //if (refreshedToken.token != undefined || (refreshedToken.id != undefined && refreshedToken.refreshedToken != undefined)) {
            // get notifcation data and check if this needs to be updated or added
            console.log('update token');
            Users.update_notification(refreshedToken);
        }
    };

    androidToken = function(data) {
        
        token = JSON.parse(data);
        console.log(token);
        if (token.id != undefined) {
            console.log('first token received');
            // get notifcation data and check if this needs to be updated or added
            Users.update_notification(token)
            .then(function(res) {
                $rootScope.receivedToken = token;
            });
            //deferred.resolve(user);
        }
    };

    // Broadcast by Database createCard service when a new card has been created
    $rootScope.$on('CARD_CREATED', function(event, data) {
        UserData.conversationsLatestCardAdd(data.conversationId, data)
            .then(function(res) {
                UserData.getConversationModelById(data.conversationId)
                    .then(function(result) {
                        var key = result;
                        UserData.formatLatestCard(data, key)
                            .then(function(result) {
                                // Add this conversation to the conversations model
                                UserData.addConversationModel(result);
                            });
                    });
            });
    });

    // MAIN NOTIFICATION CENTER
    $rootScope.$on('NOTIFICATION', function(event, msg) {

        // CONVERSATIONS
        console.log(msg);

        // Find the conversations for current user
        var user_id = UserData.getUser()._id;
        Conversations.find_user_conversations(user_id)
            .then(function(res) {
                // Get the index position of the updated conversation within the conversations model by conversation id
                var conversation_pos = General.findWithAttr(res.data, '_id', msg.conversation_id);
                // Get the index position of the current user within the updated conversation participants array in the conversations model
                var user_pos = General.findWithAttr(res.data[conversation_pos].participants, '_id', user_id);
                // Get the unviewed cards for this user in this conversation.
                var user_unviewed = res.data[conversation_pos].participants[user_pos].unviewed;
                // Find and add the users to Userdata conversationsUsers array if they haven't already been added..
                UserData.addConversationsUsers(res.data[conversation_pos].participants)
                    .then(function(response) {
                        // If this is a new conversation add the participants to the users contacts
                        res.data[conversation_pos].participants.map(function(key) {
                            // not already a contact and not current user.
                            if (!UserData.getUser().contacts.includes(key._id) && UserData.getUser()._id != key._id) {
                                // not already a contact. Create contact in DB.
                                UserData.createContact(key)
                                    .then(function(ret) {
                                        //console.log(ret);
                                    });
                            }

                            UserData.getConversationsUser(key._id)
                                .then(function(returned) {
                                    if (UserData.getUser()._id != returned._id) {
                                        returned.conversation_exists = true;
                                        returned.conversation_id = res.data[conversation_pos]._id;
                                        UserData.addContact(returned)
                                            .then(function(response) {
                                                //console.log(response);
                                            });
                                    }
                                });
                        });
                    });
                // add this conversation to the local model.
                UserData.addConversationModel(res.data[conversation_pos])
                    .then(function(result) {
                        var conversation_pos = General.findWithAttr(result, '_id', msg.conversation_id);
                    });
                // Get the index position of the updated conversation within the  CURRENT conversations model by conversation id
                var local_conversation_pos = General.findWithAttr(conversations_model, '_id', msg.conversation_id);
                // Get the latest card for this converation from the DB.
                // TODO - get from cards array?
                Conversations.getConversationLatestCard(msg.conversation_id)
                    .then(function(result) {
                        if (result.data != null) {
                            // Add latest card for this converation to LM.
                            UserData.conversationsLatestCardAdd(result.data.conversationId, result.data);
                        }
                        // Get the index position of the updated conversation within the conversations model by conversation id
                        var conversation_pos = General.findWithAttr(conversations_model, '_id', msg.conversation_id);
                        if (local_conversation_pos < 0) {
                            // Add this conversation to the local model.
                            UserData.addConversationModel(res.data[conversation_pos])
                                .then(function(result) {
                                    // Notify conversation if it is open so that viewed array is cleared.
                                    $rootScope.$broadcast('CONV_NOTIFICATION', result);
                                });
                            if (result.data != null) {
                                UserData.formatLatestCard(result.data, res.data[conversation_pos], function(response) {
                                    // Add this conversation to the conversations model
                                    conversations_model.push(response);
                                });
                            }
                        } else {
                            // Update the local model.
                            if (result.data != null) {
                                // update the local model
                                conversations_model[conversation_pos].participants[user_pos].unviewed = user_unviewed;
                                // Set the new_messages number.
                                conversations_model[conversation_pos].new_messages = user_unviewed.length;
                                // Format the latest card
                                UserData.formatLatestCard(result.data, conversations_model[conversation_pos], function(result) {});
                            } else {
                                // Remove the conversation from the local model.
                                conversations_model[conversation_pos].latest_card = ' ';
                            }
                            // Notify conversation if it is open so that viewed array is cleared.
                            $rootScope.$broadcast('CONV_NOTIFICATION', msg);
                        }
                    });



                // CONVERSATION - Update the cards model

                // get all cards for a conversation by conversation id
                Conversations.getConversationById(msg.conversation_id)
                    .then(function(result) {
                        //Cards model
                        UserData.getCardsModelById(msg.conversation_id)
                            .then(function(res) {
                                var conversation_length;
                                if (res != undefined) {
                                    // get the number of cards in the existing conversation
                                    conversation_length = res.data.length;
                                } else {
                                    conversation_length = 0;
                                }
                                // Check for new cards.
                                // find only the new cards which have been posted
                                var updates = result.data.slice(conversation_length, result.data.length);
                                if (conversation_length < result.data.length || res == undefined) {
                                    // console.log('add new card');
                                    // update the conversation model with the new cards
                                    updates.map(function(key) {
                                        key.original_content = key.content;
                                        // Find the username then redirect to the conversation.
                                        UserData.getConversationsUser(key.user)
                                            .then(function(r) {
                                                key.user_name = r.user_name;
                                                // Update the cards model
                                                UserData.addCardsModel(key.conversationId, key)
                                                    .then(function(response) {
                                                        //console.log(response);
                                                    });
                                            });
                                    });
                                } else if (conversation_length == result.data.length) {
                                    //console.log('update existing card');
                                    var local_updated = General.findDifference(result.data, res.data, 'content');
                                    var db_updated = General.findDifference(res.data, result.data, 'content');
                                    if (local_updated.length > 0) {
                                        local_updated.map(function(key) {
                                            // Find the username then redirect to the conversation.
                                            UserData.getConversationsUser(key.user)
                                                .then(function(r) {
                                                    // Update 
                                                    key.original_content = key.content;
                                                    key.user_name = r.user_name;
                                                    // Update the cards model
                                                    UserData.addCardsModel(key.conversationId, key)
                                                        .then(function(response) {
                                                            //console.log(response);
                                                        });
                                                });
                                        });
                                    }
                                } else if (conversation_length > result.data.length) {
                                    //console.log('delete existing card');
                                    var local_deleted = General.findDifference(res.data, result.data, '_id');
                                    if (local_deleted.length > 0) {
                                        local_deleted.map(function(key) {
                                            // Update the cards model
                                            UserData.deleteCardsModel(key.conversationId, key)
                                                .then(function(response) {
                                                    //console.log(response);
                                                });
                                        });
                                    }
                                }
                            });
                    });
            });
    });

    //
    // User
    //

    UserData.loadUser = function() {
        return $http.get("/api/user_data").then(function(result) {
            return result.data.user;
        });
    };

    UserData.setUser = function(value) {
        user = value;
        return user;
    };

    UserData.getUser = function() {
        return user;
    };

    //
    // User - Contacts
    //

    // Create Contact in DB.
    UserData.createContact = function(val) {
        var deferred = $q.defer();
        // Only add to DB if it does not already exist.
        if (General.findWithAttr(contacts, '_id', val._id) < 0) {
            // Create contact in DB.
            Users.add_contact(val._id)
                .then(function(res) {
                    deferred.resolve(contacts);
                });

        } else {
            deferred.resolve(contacts);
        }
        return deferred.promise;
    };

    UserData.addContact = function(val) {
        var deferred = $q.defer();
        var index = General.findWithAttr(contacts, '_id', val._id);
        // Only add locally if it does not already exist.
        if (index < 0) {
            // Add.
            contacts.push(val);
            deferred.resolve(contacts);
        } else {
            // Update.
            contacts[index] = val;
            deferred.resolve(contacts);
        }
        return deferred.promise;
    };

    UserData.setContacts = function(value) {
        var deferred = $q.defer();
        contacts = value;
        deferred.resolve(contacts);
        return deferred.promise;
    };

    UserData.getContacts = function() {
        return contacts;
    };

    UserData.setContactsAndUser = function() {
        var deferred = $q.defer();
        contacts_and_user = contacts;
        contacts_and_user.push(UserData.getUser());
        deferred.resolve(contacts_and_user);
        return deferred.promise;
    };

    UserData.getContactsAndUser = function() {
        return contacts_and_user;
    };

    UserData.addUserContact = function(id) {
        var deferred = $q.defer();
        user.contacts.push(id);
        deferred.resolve(user.contacts);
        return deferred.promise;
    };

    UserData.parseUserContact = function(result, user) {
        result.map(function(key, array) {
            // check that this is a two person chat.
            // Groups of three or more are loaded in conversations.html
            if (key.conversation_name == '') {
                // Check that current user is a participant of this conversation
                if (General.findWithAttr(key.participants, '_id', user._id) >= 0) {
                    // set conversation_exists and conversation_id for the contacts
                    user.conversation_exists = true;
                    user.conversation_id = key._id;
                }
            }
        });
        return user;
    };

    UserData.parseImportedContacts = function() {
        var deferred = $q.defer();
        if (UserData.getUser().imported_contacts.length > 0) {
            // check if imported contact is already a contact
            UserData.getUser().imported_contacts[0].contacts.map(function(key, array) {
                var index = General.arrayObjectIndexOfValue(UserData.getContacts(), key.email, 'google', 'email');
                if (index >= 0) {
                    key.is_contact = true;
                }
            });
            // Check whether the current user is in the user_contacts.
            var index = General.findWithAttr(UserData.getUser().imported_contacts[0].contacts, 'email', UserData.getUser().google.email);
            if (index >= 0) {
                UserData.getUser().imported_contacts[0].contacts[index].is_contact = true;
            }
            deferred.resolve();
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    };

    // load this users contacts
    UserData.loadUserContacts = function() {
        var deferred = $q.defer();
        // reset the contacts model
        var contacts = [];
        var delete_contacts = { contacts: [] };
        var promises = [];

        finish = function(contacts) {
            UserData.setContacts(contacts).then(function(result) {
                UserData.setContactsAndUser()
                    .then(function(res) {
                        deferred.resolve(result);
                    });
            });
        };

        var user_contacts = UserData.getUser().contacts;
        promises.push(user_contacts.map(function(key, array) {
            // Search for each user in the contacts list by id
            promises.push(Users.search_id(key)
                .then(function(res) {
                    if (res.data.error === 'null') {
                        // remove this contact as the user cannot be found
                        return delete_contacts.contacts.push(key);
                    }
                    if (res.data.success) {
                        // Add to the conversationsUsers list as it wil probably also be a conversation user.
                        UserData.addConversationsUser(res.data.success);
                        // Check if individual conversation already created with this contact
                        // Get all coversations containing current user.
                        return UserData.getConversations().then(function(result) {
                            var s = UserData.parseUserContact(result, res.data.success);
                            return contacts.push(s);
                        });
                    }
                })
                .catch(function(error) {
                    console.log('error: ' + error);
                }));
        }));

        // All the users contacts have been mapped.
        $q.all(promises).then(function() {
            // If there are any users in the delete_contacts array then delete them.
            if (delete_contacts.contacts.length > 0) {
                return Users.delete_contacts(delete_contacts)
                    .then(function(data) {
                        finish(contacts);
                    })
                    .catch(function(error) {
                        console.log(error);
                    });
            } else {
                return finish(contacts);
            }
        }).catch(function(err) {
            // do something when any of the promises in array are rejected
        });
        //return deferred.promise;
        return deferred.promise;
    };

    //
    // Profile
    //

    UserData.updateProfile = function(profile) {
        var deferred = $q.defer();
        user.user_name = profile.user_name;
        user.avatar = profile.avatar;
        // public conversation
        UserData.findPublicConversation(UserData.getUser()._id)
            .then(function(res) {
                res.avatar = profile.avatar;
                res.conversation_avatar = profile.avatar;
                res.conversation_name = profile.user_name;
                UserData.updateConversationById(res._id, res);
                deferred.resolve(user);
            });
        return deferred.promise;
    };

    //
    // Conversations
    //

    UserData.getConversations = function() {
        var deferred = $q.defer();
        deferred.resolve(conversations);
        return deferred.promise;
    };

    UserData.getConversationModelById = function(id) {
        var deferred = $q.defer();
        var index = General.findWithAttr(conversations_model, '_id', id);
        // If the conversation exist then return it, otherwise return false.
        if (index >= 0) {
            deferred.resolve(conversations_model[index]);
        } else {
            deferred.resolve(false);
        }
        return deferred.promise;
    };

    // TODO - needed?
    UserData.getConversationModel = function() {
        return conversations_model;
    };

    UserData.addConversationModel = function(conv) {
        var deferred = $q.defer();
        // Only add if the conversation does not already exist otherwise update.
        var index = General.findWithAttr(conversations_model, '_id', conv._id);
        if (index < 0) {
            // Add
            conversations_model.push(conv);
            deferred.resolve(conversations_model);
        } else {
            // Update
            conversations_model[index] = conv;
            deferred.resolve(conversations_model);
        }
        return deferred.promise;
    };

    UserData.findPublicConversation = function() {
        var deferred = $q.defer();
        var index = General.findWithAttr(conversations_model, 'conversation_type', 'public');
        deferred.resolve(conversations_model[index]);
        return deferred.promise;
    };

    UserData.updateConversationById = function(id, conv) {
        var deferred = $q.defer();
        var index = General.findWithAttr(conversations, '_id', id);
        // Only update the conversation if it exists, otherwise return false.
        if (index >= 0) {
            conversations[index] = conv;
            deferred.resolve(conversations[index]);
        } else {
            deferred.resolve(false);
        }
        return deferred.promise;
    };

    UserData.updateConversationViewed = function(id) {
        // Update the DB
        var user_id = UserData.getUser()._id;
        Conversations.clearViewed(id, user_id)
            .then(function(res) {
                // Update the local model.
                UserData.getConversationModelById(id).then(function(result) {
                    var index = General.findWithAttr(result.participants, '_id', user_id);
                    result.participants[index].unviewed = [];
                    result.new_messages = 0;
                    // Update the LM.
                    UserData.addConversationModel(result).then(function(res) {
                        //console.log(res);
                    });
                });
            });
    };

    UserData.loadConversations = function() {
        return Conversations.find().then(function(result) {
            conversations = result.data;
        });
    };

    UserData.removeConversations = function(conversations_delete) {
        var deferred = $q.defer();
        var i = conversations.length;
        while (i--) {
            var index = General.findWithAttr(conversations_delete, '_id', conversations[i]._id);
            // If the the conversation exists in the LM then remove it from the LM (User does not exist).
            if (index >= 0) {
                conversations.splice(i, 1);
            }
        }
        deferred.resolve(conversations);
        return deferred.promise;
    };

    UserData.cleanConversations = function() {
        var deferred = $q.defer();
        var promises = [];
        var conversations_delete = [];
        var result = UserData.getConversations()
            .then(function(res) {
                res.map(function(key, array) {
                    if (key.participants.length == 2) {
                        var index = General.findWithAttr(key.participants, '_id', principal.user._id);
                        // Get the other user.
                        index = 1 - index;
                        // Search for the other user.
                        // TODO - check users list first?
                        promises.push(Users.search_id(key.participants[index]._id)
                            .then(function(res) {
                                if (res.data.error === 'null') {
                                    // remove this conversation as the user cannot be found.
                                    conversations_delete.push({ _id: key._id });
                                }
                                if (res.data.success) {
                                    //
                                }
                            }));
                    }
                });

                // All the conversations have been mapped.
                $q.all(promises).then(function() {
                    UserData.removeConversations(conversations_delete)
                        .then(function() {
                            deferred.resolve(conversations);
                        });
                }).catch(function(err) {
                    // do something when any of the promises in array are rejected
                });
            });
        return deferred.promise;
    };

    //
    // Conversations - Users (participants)
    //

    UserData.listConversationsUsers = function() {
        return conversationsUsers;
    };

    UserData.addConversationsUser = function(user) {
        var deferred = $q.defer();
        // If the user does not already exist then add them.
        if (General.findWithAttr(conversationsUsers, '_id', user._id) < 0) {
            conversationsUsers.push(user);
            deferred.resolve(true);
        } else {
            deferred.resolve(false);
        }
        return deferred.promise;
    };

    UserData.addConversationsUsers = function(user_array) {
        var deferred = $q.defer();
        var promises = [];
        // loop through the user_array array.
        // check if user already exists in conversationsUsers
        // if not look up user and add to conversationsUsers
        promises.push(user_array.map(function(key, array) {
            if (General.findWithAttr(conversationsUsers, '_id', key._id) < 0) {
                promises.push(Users.search_id(key._id)
                    .then(function(res) {
                        if (res.data.error === 'null') {
                            // The user cannot be found. Add them as null.
                            UserData.addConversationsUser({ _id: key._id, user_name: res.data.error });
                        }
                        if (res.data.success) {
                            // User found. add them to conversationsUsers.
                            UserData.addConversationsUser(res.data.success);
                        }
                    })
                    .catch(function(error) {
                        console.log('error: ' + error);
                    }));
            }
        }));

        // All the users have been mapped.
        $q.all(promises).then(function() {
            deferred.resolve();
        }).catch(function(err) {
            // do something when any of the promises in array are rejected
        });
        return deferred.promise;
    };

    UserData.getConversationsUsers = function() {
        var deferred = $q.defer();
        deferred.resolve(conversationsUsers);
        return deferred.promise;
    };

    UserData.getConversationsUser = function(id) {
        var deferred = $q.defer();
        var index = General.findWithAttr(conversationsUsers, '_id', id);
        // If no user found then use UserData.addConversationsUsers to look up the user and add them.
        if (index < 0) {
            var users = [{ _id: id }];
            UserData.addConversationsUsers(users).then(function(result) {
                var index = General.findWithAttr(conversationsUsers, '_id', id);
                deferred.resolve(conversationsUsers[index]);
            });
        } else {
            deferred.resolve(conversationsUsers[index]);
        }
        return deferred.promise;
    };

    UserData.loadConversationsUsers = function() {
        var deferred = $q.defer();
        var promises = [];
        var temp_users = [];
        var result = UserData.getConversations()
            .then(function(res) {
                // Map all conversations.
                promises.push(res.map(function(key, array) {
                    // Map all participants of each conversation. 
                    key.participants.map(function(key2, array) {
                        // Check that this user does not already exist in temp_users or conversationsUsers
                        if (General.findWithAttr(temp_users, '_id', key2._id) < 0 && General.findWithAttr(conversationsUsers, '_id', key2._id) < 0) {
                            // Push this user to temp_users before looking up the user so that this user is not looked up again within this loop.
                            temp_users.push({ _id: key2._id });
                            // Look up user.
                            promises.push(Users.search_id(key2._id)
                                .then(function(res) {
                                    if (res.data.error === 'null') {
                                        // user cannot be found. Add as null user.
                                        UserData.addConversationsUser({ _id: key2._id, user_name: res.data.error });
                                    }
                                    if (res.data.success) {
                                        // Add user
                                        UserData.addConversationsUser(res.data.success);
                                    }
                                })
                                .catch(function(error) {
                                    console.log('error: ' + error);
                                }));
                        }
                    });

                }));
                // All the participants of all conversations have been mapped.
                $q.all(promises).then(function() {
                    // reset the temp_users array.
                    temp_users = [];
                    deferred.resolve(res);
                }).catch(function(err) {
                    // do something when any of the promises in array are rejected
                });
            });
        return deferred.promise;
    };

    //
    // Conversation
    //

    UserData.getCardsModelById = function(id) {
        var deferred = $q.defer();
        var index = General.findWithAttr(cards_model, '_id', id);
        deferred.resolve(cards_model[index]);
        return deferred.promise;
    };

    UserData.addCardsModelById = function(id) {
        var deferred = $q.defer();
        var index = General.findWithAttr(cards_model, '_id', id);
        if (index < 0) {
            // Create
            var temp = { _id: id, data: [] };
            cards_model.push(temp);
            deferred.resolve(cards_model);
        } else {
            // Already Created.
            deferred.resolve(cards_model[index]);
        }
        return deferred.promise;
    };

    UserData.deleteCardsModel = function(id, data) {
        var deferred = $q.defer();
        var index = General.findWithAttr(cards_model, '_id', id);
        var card_index = General.findWithAttr(cards_model[index].data, '_id', data._id);
        cards_model[index].data.splice(card_index, 1);
        deferred.resolve(cards_model);
        return deferred.promise;
    };

    UserData.addCardsModel = function(id, data) {
        var deferred = $q.defer();
        var index = General.findWithAttr(cards_model, '_id', id);
        if (index < 0) {
            // Create
            var temp = { _id: id, data: [data] };
            cards_model.push(temp);
            deferred.resolve(cards_model);
        } else {
            // Add / Update
            var card_index = General.findWithAttr(cards_model[index].data, '_id', data._id);
            if (card_index < 0) {
                // Add
                cards_model[index].data.push(data);
                deferred.resolve(cards_model[index]);
            } else {
                // Update
                cards_model[index].data[card_index] = data;
                deferred.resolve(cards_model[index]);
            }
        }
        return deferred.promise;
    };


    UserData.getConversation = function() {
        var deferred = $q.defer();
        var promises = [];
        cards_model = [];
        var convs = UserData.getConversationsBuild();
        // Map all conversations.
        promises.push(convs.map(function(key, array) {
            promises.push(Conversations.getConversationById(key._id)
                .then(function(result) {
                    var temp = { _id: key._id, data: [] };
                    promises.push(result.data.map(function(key, array) {
                        // Store the original characters of the card.
                        key.original_content = key.content;
                        // Get the user name for the user id
                        // TODO dont repeat if user id already retreived
                        promises.push(UserData.getConversationsUser(key.user)
                            .then(function(res) {
                                // Set the user_name to the retrieved name
                                key.user_name = res.user_name;
                                return;
                            })
                            .catch(function(error) {
                                console.log('error: ' + error);
                            }));
                        temp.data.push(key);
                    }));
                    cards_model.push(temp);
                }));
        }));
        // all conversations have been mapped.
        $q.all(promises).then(function() {
            deferred.resolve();
        }).catch(function(err) {
            // do something when any of the promises in array are rejected
        });
        return deferred.promise;
    };

    //
    // Conversations - Latest cards
    //

    UserData.conversationsLatestCardAdd = function(id, data) {
        var deferred = $q.defer();
        var index = General.findWithAttr(conversationsLatestCard, '_id', id);
        // Add if conversationsLatestCard for with this id doesnt exist. otherwise update
        if (index >= 0) {
            // Update.
            conversationsLatestCard[index].data = data;
            deferred.resolve(conversationsLatestCard);
        } else {
            // Add.
            var card = { _id: id, data: data };
            conversationsLatestCard.push(card);
            deferred.resolve(conversationsLatestCard);
        }
        return deferred.promise;
    };

    UserData.getLatestCards = function() {
        var deferred = $q.defer();
        deferred.resolve(conversationsLatestCard);
        return deferred.promise;
    };

    UserData.getConversationLatestCardById = function(id) {
        var deferred = $q.defer();
        var index = General.findWithAttr(conversationsLatestCard, '_id', id);
        deferred.resolve(conversationsLatestCard[index]);
        return deferred.promise;
    };

    // Get the latest card posted to each conversation
    // TODO - replace with function to get latest card from loaded conversation?
    UserData.getConversationsLatestCard = function() {
        var deferred = $q.defer();
        var promises = [];
        var result = UserData.getConversations()
            .then(function(res) {
                res.map(function(key, array) {
                    // Get the latest card posted to this conversation
                    promises.push(Conversations.getConversationLatestCard(key._id)
                        .then(function(res) {
                            return UserData.conversationsLatestCardAdd(key._id, res.data)
                                .then(function(res) {
                                    //console.log(res);
                                });
                        }));
                });
                // All the conversations have been mapped.
                $q.all(promises).then(function() {
                    deferred.resolve(res);
                }).catch(function(err) {
                    // do something when any of the promises in array are rejected
                });
            });
        return deferred.promise;
    };

    UserData.formatLatestCard = function(data, key) {
        var deferred = $q.defer();
        var promises = [];
        if (data != null) {
            var card_content;
            var sent_content;
            var sender_name;
            var notification_body;
            var participant_pos;
            // Update the updatedAt
            key.updatedAt = data.updatedAt;
            // Get the name of the user which sent the card.
            UserData.getConversationsUser(data.user)
                .then(function(result) {
                    // get the index position of the current user within the participants array
                    var user_pos = General.findWithAttr(key.participants, '_id', UserData.getUser()._id);
                    if (user_pos >= 0) {
                        // get the currently stored unviewed cards for the current user
                        var user_unviewed = key.participants[user_pos].unviewed;
                        // Set the new_messages number.
                        key.new_messages = user_unviewed.length;
                    }
                    // Set the card content.
                    card_content = data.content;
                    // set the name of the user who sent the card
                    if (result != 'null') {
                        sender_name = result.user_name;
                    } else {
                        sender_name = 'null';
                    }
                    // Public conversation
                    if (key.conversation_type == 'public') {
                        // Get the conversation name and add to model.
                        key.name = key.conversation_name;
                        key.avatar = key.conversation_avatar;
                        notification_body = card_content;
                    }
                    // Group conversation. (Two or more)
                    if (key.conversation_name != '') {
                        // Get the conversation name and add to model.
                        key.name = key.conversation_name;
                        key.avatar = key.conversation_avatar;
                        notification_body = sender_name + ': ' + card_content;
                    }
                    // Two user conversation (not a group)
                    if (key.conversation_name == '') {
                        // Get the position of the current user
                        if (user_pos === 0) {
                            participant_pos = 1;
                        } else {
                            participant_pos = 0;
                        }
                        // Find the other user
                        UserData.getConversationsUser(key.participants[participant_pos]._id)
                            .then(function(result) {
                                var avatar = "default";
                                // set the other user name as the name of the conversation.
                                if (result) {
                                    key.name = result.user_name;
                                    avatar = result.avatar;
                                }
                                key.avatar = avatar;
                            });
                        notification_body = card_content;
                    }
                    sent_content = FormatHTML.prepSentContent(notification_body, sent_content_length);
                    key.latest_card = sent_content;
                    deferred.resolve(key);
                });
        } else {
            // Empty conversation. Only empty public converations are listed.
            // Public conversation
            if (key.conversation_type == 'public' || key.conversation_name != '') {
                // Get the conversation name and add to model.
                key.name = key.conversation_name;
                // Get the conversation avatar and add to model.
                key.avatar = key.conversation_avatar;
            }
            deferred.resolve(key);
        }
        return deferred.promise;
    };

    UserData.getConversationsBuild = function() {
        var conversations_model_display = [];
        // Check for empty conversations before returning.
        conversations_model.map(function(key, index) {
            if ((key.latest_card == " " && key.conversation_type != "public" && key.conversation_name == "") || (key.latest_card == undefined && key.participants.length == 2)) {
                // empty
            } else {
                conversations_model_display.push(conversations_model[index]);
            }
        });
        return conversations_model_display;
    };

    UserData.buildConversations = function() {
        conversations_model = [];
        var deferred = $q.defer();
        var promises = [];
        // Find the conversations for current user
        UserData.getConversations()
            .then(function(res) {
                var conversations_raw = res;
                conversations_raw.map(function(key, array) {
                    // Get the latest card posted to this conversation
                    promises.push(UserData.getConversationLatestCardById(key._id)
                        .then(function(res) {
                            if (res.data != null) {
                                return UserData.formatLatestCard(res.data, key)
                                    .then(function(result) {
                                        // Add this conversation to the conversations model
                                        return conversations_model.push(result);
                                    });
                            } else {
                                // Only empty publc conversations are displayed.
                                key.latest_card = ' ';
                                if (key.conversation_type === 'public' || key.conversation_name != "") {
                                    return UserData.formatLatestCard(res.data, key)
                                        .then(function(result) {
                                            // Add this conversation to the conversations model
                                            return conversations_model.push(result);
                                        });
                                }
                            }
                        }));
                });
                // All the users conversations have been mapped.
                $q.all(promises).then(function() {
                    deferred.resolve(conversations_model);
                }).catch(function(err) {
                    // do something when any of the promises in array are rejected
                });
            });
        return deferred.promise;
    };

    //
    // LOAD ALL USER DATA
    //

    UserData.loadUserData = function() {
        var self = this;
        isLoading = true;
        var deferred = $q.defer();
        //console.log('GET 1 LU');
        UserData.loadUser().then(function(user) {
            if (user != null) {
                return UserData.setUser(user);
            } else {
                // No user.
                // Set loaded to true.
                $rootScope.loaded = true;
                $rootScope.dataLoading = false;
                isLoading = false;
                $location.path("/api/logout");
                deferred.resolve();
            }
        }).then(function() {
            //console.log('GET 3 LC');
            return UserData.loadConversations();
        }).then(function() {
            //console.log('GET 4 LUC');
            return UserData.loadUserContacts();
        }).then(function() {
            //console.log('GET 4a PIC');
            return UserData.parseImportedContacts();
        }).then(function() {
            //console.log('GET 5 CC');
            return UserData.cleanConversations();
        }).then(function() {
            //console.log('GET LCU 6');
            return UserData.loadConversationsUsers();
        }).then(function() {
            //console.log('GET 7 GCLC');
            return UserData.getConversationsLatestCard();
        }).then(function() {
            //console.log('GET 8 BC');
            return UserData.buildConversations();
        }).then(function() {
            //console.log('GET 8 BC');
            return UserData.getConversation();
        }).then(function() {
            console.log('GET 9 BC');
            return UserData.checkFCMToken();
        }).then(function() {
            console.log('sockets');
            // connect to socket.io via socket service 
            // and request that a unique namespace be created for this user with their user id
            console.log(UserData.getUser()._id);
            socket.setId(UserData.getUser()._id);
            console.log(socket.getId());


            socket.connect(socket.getId());
            
            // Set loaded to true.
            $rootScope.loaded = true;
            $rootScope.dataLoading = false;
            isLoading = false;
            //console.log('FIN loadUserData');
            deferred.resolve();
        });
        return deferred.promise;
    };

    // Check whether the loadUserData is loading or has been loaded already.
    UserData.checkUser = function() {
        var deferred = $q.defer();
        if (isLoading) {
            //console.log('already loading...wait');
            $rootScope.$watch('loaded', function(n) {
                if (n) {
                    // loaded!
                    deferred.resolve(user);
                }
            });
        } else {
            //console.log('not loading...get');
            // Check whether the user data has already been retrieved.
            if (UserData.getUser() != undefined) {
                //console.log('CALL VAR /api/user_data');
                deferred.resolve(user);
            } else {
                //console.log('CALL HTTP /api/user_data');
                deferred.resolve(loadUserData());
            }
        }
        return deferred.promise;
    };

    // Check that the user has a valid token.
    // Then load the users data if they have a vald token.
    if (principal.isValid()) {
        this.isAuthenticated = true;
        UserData.loadUserData().then(function(result) {
            //console.log('USER DATA LOADED');
        });
    } else {
        this.isAuthenticated = false;
    }
    return UserData;
});


cardApp.factory('Profile', function($rootScope, $window) {
    var user;
    var conversation;

    return {
        // User profile.
        getProfile: function() {
            return user;
        },
        setProfile: function(value) {
            user = value;
        },
        // Conversation profile.
        getConvProfile: function() {
            return conversation;
        },
        setConvProfile: function(value) {
            conversation = value;
        },
    };
});

// Add the access token to every request to the server.
cardApp.config(['$httpProvider', function($httpProvider) {
    var interceptor = [
        '$q',
        '$rootScope',
        'principal',
        function($q, $rootScope, principal) {
            var service = {
                // run this function before making requests
                'request': function(config) {
                    //Add your header to the request here
                    if (principal.token != undefined) {
                        config.headers['x-access-token'] = principal.token;
                    }
                    return config;
                }
            };
            return service;
        }
    ];
    $httpProvider.interceptors.push(interceptor);
}]);


cardApp.directive('onFinishRender', function($timeout) {
    return {
        restrict: 'A',
        link: function(scope, element, attr) {
            if (scope.$last === true) {
                $timeout(function() {
                    scope.$emit('ngRepeatFinished');
                });
            }
        }
    };
});


cardApp.factory('viewAnimationsService', function($rootScope) {

    var enterAnimation;

    var getEnterAnimation = function() {
        return enterAnimation;
    };

    var setEnterAnimation = function(animation) {
        enterAnimation = animation;
    };

    var setLeaveAnimation = function(animation) {
        $rootScope.$emit('event:newLeaveAnimation', animation);
    };

    return {
        getEnterAnimation: getEnterAnimation,
        setEnterAnimation: setEnterAnimation,
        setLeaveAnimation: setLeaveAnimation
    };
});

cardApp.directive('viewAnimations', function(viewAnimationsService, $rootScope) {
    return {
        restrict: 'A',
        link: function(scope, element) {

            var previousEnter, previousLeave;

            var enterAnimation = viewAnimationsService.getEnterAnimation();
            if (enterAnimation) {
                if (previousEnter) element.removeClass(previousEnter);
                previousEnter = enterAnimation;
                element.addClass(enterAnimation);
            }

            $rootScope.$on('event:newLeaveAnimation', function(event, leaveAnimation) {
                if (previousLeave) element.removeClass(previousLeave);
                previousLeave = leaveAnimation;
                element.addClass(leaveAnimation);
            });
        }
    };
});