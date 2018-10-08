var cardApp = angular.module("cardApp", ['ngSanitize', 'ngRoute', 'angularMoment', 'ngAnimate', 'ngImgCrop', 'ngCookies', 'angular-jwt', 'luegg.directives', 'angular-inview']);

// Prefix for loading a snip id
var prefix = '/s/';

// CONFIG

//
// ROUTES
//

//var crop_started = false;
var crop_finished = false;


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

//
// SERVICES
//

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
        //serverUrl = 'http://localhost:8060/';
    } else {
        serverUrl = 'https://www.snipbee.com/upload';
    }

    androidToJS = function(data) {
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
                    console.log(img.naturalWidth); // image is loaded; sizes are available
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
            //console.log(dataURI);
            // convert base64/URLEncoded data component to raw binary data held in a string
            var byteString;
            if (dataURI.split(',')[0].indexOf('base64') >= 0) {
                byteString = atob(dataURI.split(',')[1]);
            } else {
                byteString = unescape(dataURI.split(',')[1]);
            }
            //console.log(byteString);
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

        console.log(new_image.naturalWidth);
        console.log(new_image.className.split(' ')[1]);
        $('#cropper_' + new_image.className.split(' ')[1]).css('maxWidth', new_image.naturalWidth);
        $('#cropper_' + new_image.className.split(' ')[1]).css('cssFloat', 'left');
    };

    insertImage = function(data) {
        console.log(data);
        if (data.response === 'saved') {
            data.file_name = data.file.substring(0, data.file.indexOf('.'));
            //var unique_id = data.file_name + '_' + General.getDate();
            //var new_image = "<img class='resize-drag' id='new_image' onload='imageLoaded(); imagePosted();' src='" + IMAGES_URL + data.file + "'><span class='scroll_image_latest' id='delete'>&#x200b</span>";
            //&#x200b
            //var new_image = "<div class='cropper_cont' onclick='editImage(this, \"" + data.file_name + "\")' id='cropper_" + data.file_name + "'><div class='filter_div' id='a_filter_" + data.file_name + "'><img class='resize-drag " + data.file_name + "' id='new_image' onload='imageLoaded(); imagePosted();' src='" + IMAGES_URL + data.file + "'></div></div><span class='after_image'>&#x200b;&#10;</span><span class='scroll_image_latest' id='delete'>&#x200b</span>";
            //var new_image = "<div class='cropper_cont' onclick='editImage(this, \"" + data.file_name + "\")' id='cropper_" + data.file_name + "'><div class='image_fltr'><img class='resize-drag " + data.file_name + "' id='new_image' onload='imageLoaded(); imagePosted();' src='" + IMAGES_URL + data.file + "'></div></div><span class='after_image'>&#x200b;&#10;</span><span class='scroll_image_latest' id='delete'>&#x200b</span>";
            var new_image = "<div class='cropper_cont' onclick='editImage(this, \"" + data.file_name + "\")' id='cropper_" + data.file_name + "'><img class='resize-drag " + data.file_name + "' id='new_image' onload='imageLoaded(); imagePosted();' src='" + IMAGES_URL + data.file + "'></div><span class='after_image'>&#x200b;&#10;</span><span class='scroll_image_latest' id='delete'>&#x200b</span>";
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
        console.log('prepareImage');
        console.log(files);
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
                    //self.formData.append('uploads[]', blob, file.name);
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
        console.log('save');
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
        console.log('blur');
        // active = $(document.activeElement).closest("div").attr('id');




        // Add slight delay so that document.activeElement works
        setTimeout(function() {
            // Get the element currently in focus
            var active = $(document.activeElement).closest("div").attr('id');
            var active2 = $(document.activeElement);
            console.log(id);
            console.log(active);
            console.log(active2);
            // If the blurred card is not the current card or the hidden input.
            console.log(crop_finished);
            if (('ce' + card._id != active && (active != 'hidden_input_container')) || crop_finished == true) {

                // Check if there is a marky in progress
                // zm launching image capture should not trigger an update. It causes error.
                found_marky = findMarky(card.content);
                // check the content has changed and not currently mid marky
                console.log('blur?');
                console.log(found_marky);
                //console.log(card.content);
                //console.log(card.original_content);
                //



                if ((card.content != card.original_content && (found_marky == false)) || crop_finished == true) {
                    //if ((card.content != card.original_content && (found_marky == false)) && crop_finished == true) {
                    console.log('yes blur');

                    // Only do this if not in current card?
                    console.log($('.cropper-container').length);
                    if ($('.cropper-container').length > 0) {
                        $('.cropper-container').remove();

                        //Cropp.removeCrop();
                        //var Cropp = $injector.get('Cropp');
                        //Cropp.destroyCrop();

                        console.log(card);
                        console.log($('#ce' + card._id).html());
                        card.content = $('#ce' + card._id).html();
                        console.log(card);
                    }
                    if (crop_finished) {
                        card.content = $('#ce' + card._id).html();
                        console.log(card);
                    }
                    crop_finished = false;
                    //$('.cropper-container').remove();


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

    //this.moveCaretInto = function(id) {
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
            //console.log(node.parentNode);
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
                    //console.log(prev_class);
                    //console.log(prev_elem);
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
        //cropper-container
        //var orig = document.getElementById(elem).innerHTML;
        //var spaces_removed = orig.replace(/\u200B/g, '');
        //document.getElementById(elem).innerHTML = spaces_removed;
        //$('.cropper-container').remove();

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
        console.log(content);
        console.log(length);
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
// Cropper Service
//

cardApp.service('Cropp', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal) {


    var cropper;
    var image;
    var crop_in_progress;
    var reduce_height = false;
    var decrease_percent = 0;

    if (cropper != undefined) {
        cropper.destroy();
    }
    //var reset;
    var self = this;

    this.destroyCrop = function() {
        console.log('Cropp destroyCrop');
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
        //cropper.reset();
        //cropper.clear();
        if (cropper != undefined) {
            cropper.destroy();
        }
        console.log(cropper);
        //cropper = null;
        console.log(cropper);
    };
    /*
    this.deleteCrop = function(id) {
        console.log('deleteCrop');
        cropper.destroy();
    };
    */

    this.cloneCrop = function(id) {
        console.log('clone: ' + id);
        $('#cropper_' + id).clone().appendTo('.image_adjust');
    };

    resetContainer = function(id) {
        console.log('reset');
        // Work out the available height.
        console.log($('.header').height());
        console.log($('.create_container').height());
        console.log($('.footer').height());
        console.log($(window).height());
        var avail_height = $(window).height() - ($('.header').height() + $('.create_container').height() + $('.footer').height());
        console.log(avail_height);
        console.log($('.' + id).height());

        if (avail_height < $('.' + id).height()) {
            console.log('resize');
            // work out the proportionate width needed to fit the height
            // % Decrease = Decrease ÷ Original Number × 100
            // % increase = Increase ÷ Original Number × 100.
            decrease_percent = (avail_height / $('.' + id).height());
            console.log(decrease_percent);

            var decreased_width = ($('.' + id).width() * decrease_percent);

            // Set the height of the container
            var wrapper = document.getElementById('cropper_' + id);
            //wrapper.style.width = '400px';
            wrapper.style.width = decreased_width + 'px';
            reduce_height = true;

            var cont_data = { 'height': 0, 'width': decreased_width };
            //$("#image_" + image_id).attr('container-data', cont_height);
            $("." + id).attr('reduce-data', JSON.stringify(cont_data));
        }

    };
    $rootScope.crop_on = false;
    //var wrapper_in_progress;
    this.openCrop = function(id) {
        // If filtered image exists
        if ($('#cropper_' + id + ' img.filter').length > 0) {
            console.log('fltered already');
            // Store the height before setting dispaly none
            //console.log($('#image_' + id).css('display'));
            //$('#image_' + id).css('display','inline');
            //console.log($('#image_' + id).css('display'));
            //var img_height = $('.' + id).height();

            //$('#cropper_' + id + ' img.filter').remove();
            $('#cropper_' + id + ' img.filter').css('display', 'none');
            console.log($('#cropper_' + id + ' img.filter').css('display'));
            //$('#cropper_' + id + ' img#image_' + id).css('display', 'unset');
            //$('#cropper_' + id + ' img#image_' + id).css('display', 'inline');

            $('#image_' + id).css('display', 'inline');
            var img_height = $('#image_' + id).height();
            console.log($('#image_' + id).css('display'));
            console.log(img_height);

            // Get the filter and set it to cropper
            var filter = $('#image_' + id).attr('filter-data');
            console.log(filter);
            //$('#cropper_' + id).addClass(filter);
            //cropper-container
            //$('#cropper_' + id + ' .cropper-container').addClass(filter);

        }

        //[class*="filter"]::before {
        //$( "input[name^='news']" ).css('height', '');
        //$('#element').addClass('some-class');

        /*
        // For canvas image method
        $('#image_filtered_'+ id).css('display', 'none');
        $('#image_'+ id).css('display', 'unset');
        */

        $('.image_edit_btns').css('display', 'none');
        $('.crop_edit').css('display', 'flex');
        $rootScope.crop_on = true;
        var wrapper = document.getElementById('cropper_' + id);

        $(wrapper).addClass('cropping');
        //$(wrapper).find('.filter_div img').unwrap();
        // Turn off contenteditable for this card
        //$(card).attr('contenteditable');
        wrapper.style.maxWidth = '';
        wrapper.style.cssFloat = 'none';

        //$timeout(function() {
        //var wrapper = document.getElementById('cropper_' + id);
        var card = $(wrapper).parent().closest('div').attr('id');
        console.log(card);
        $('#' + card).attr('contenteditable', 'false');

        // First reset container and manually set its width and height.
        //resetContainer(id);
        //resetContainer(id);
        var win_width = $(window).width();
        var stored_image = $("#image_" + id).attr('image-data');
        var avail_height = $(window).height() - ($('.header').height() + $('.create_container').height() + $('.footer').height());


        //var stored_crop = $("#image_" + id).attr('crop-data');

        if (stored_image != undefined) {
            console.log(stored_image);

            stored_image = JSON.parse(stored_image);

            console.log(stored_image.naturalHeight);
            console.log(stored_image.naturalWidth);
            var image_scale;
            //var image_scale = win_width / stored_image.naturalWidth;


            if (win_width < avail_height) {
                // Portrait
                console.log('portrait');
                if (stored_image.naturalWidth > stored_image.naturalHeight) {
                    image_scale = win_width / stored_image.naturalWidth;
                } else {
                    image_scale = avail_height / stored_image.naturalHeight;
                }
            } else {
                // Landscape
                console.log('landscape');
                if (stored_image.naturalWidth > stored_image.naturalHeight) {
                    console.log('1');

                    //image_scale = avail_height / stored_image.naturalHeight;
                    image_scale = win_width / stored_image.naturalWidth;
                    if (stored_image.naturalHeight * image_scale > avail_height) {
                        image_scale = avail_height / stored_image.naturalHeight;
                    }
                } else {
                    console.log('2');
                    image_scale = avail_height / stored_image.naturalHeight;
                    //image_scale = win_width / stored_image.naturalWidth;
                }
            }
            var scaled_height = stored_image.naturalHeight * image_scale;
            var scaled_width = stored_image.naturalWidth * image_scale;

            // Set the height of the container
            //var wrapper = document.getElementById('cropper_' + id);
            crop_in_progress = id;
            console.log(wrapper);
            console.log('set wrapper: ' + stored_image.height);
            //wrapper.style.height = stored_image.height + 'px';

            //var win_width = $(window).width();
            var img_width = stored_image.width;
            var inc = win_width / img_width;
            console.log(stored_image.height * inc);
            //wrapper.style.height = (stored_image.height * inc) + 'px';
            wrapper.style.height = '200px';

            //var avail_height = $(window).height() - ($('.header').height() + $('.create_container').height() + $('.footer').height());
            // get the actual screen height from the scaled width.
            var current_height = (stored_image.height * inc);
            if (avail_height < current_height) {

                console.log('resize2');
                //decrease_percent = (avail_height / $('.' + id).height());
                decrease_percent = (avail_height / img_height);
                console.log(decrease_percent);
                console.log(img_height);
                //var decreased_height = ($('.' + id).height() * decrease_percent);
                var decreased_height = (img_height * decrease_percent);
                console.log(decreased_height);
                wrapper.style.height = decreased_height + 'px';

            }


            if (stored_image.width < win_width) {
                wrapper.style.height = stored_image.height + 'px';
                //wrapper.style.height = '200px';
                wrapper.style.width = stored_image.width + 'px';
            }
            //wrapper.style.width = stored_image.width;
            //wrapper.style.height = '';
            //wrapper.style.width = '';
            wrapper.style.maxWidth = '';
            wrapper.style.height = scaled_height + 'px';
            //wrapper.style.height = '200px';
            wrapper.style.width = scaled_width + 'px';
        }

        //$timeout(function() {
        // TODO - do not enable crop if image less than min
        var options = {
            //aspectRatio: 16 / 9,
            zoomable: false,
            minContainerWidth: 100,
            minContainerHeight: 100,

            ready: function() {
                //generatePreview();
                console.log('cropper loaded');
                console.log(id);
                console.log(filter);
                //$('#cropper_' + id + ' .cropper-container').addClass(filter);
                $('#cropper_' + id + ' .cropper-canvas').addClass(filter);
                //$('.cropper-canvas').addClass(filter);
                $('#cropper_' + id + ' .cropper-view-box').addClass(filter);
            }
            //autoCrop: true
        };

        console.log('openCrop: ' + id);

        // Check for stored crop data
        var stored = $("#image_" + id).attr('crop-data');
        console.log(stored);

        var reduced = $("#image_" + id).attr('reduce-data');

        if (reduced != undefined) {
            // Set the height of the container
            var wrapper = document.getElementById('cropper_' + id);
            //wrapper.style.width = '400px';
            var d = JSON.parse(reduced);
            var decreased_width = d.width;
            console.log(decreased_width);
            //wrapper.style.width = decreased_width + 'px';
            reduce_height = true;
        }

        if (stored != undefined) {
            console.log(JSON.parse(stored));

            options.data = JSON.parse(stored);

            //id = 'image_' + id;
            image = document.getElementById('image_' + id);
            console.log(image);


            cropper = new Cropper(image, options, {


                crop(event) {
                    console.log(event.detail.x);
                    console.log(event.detail.y);
                    console.log(event.detail.width);
                    console.log(event.detail.height);
                    console.log(event.detail.rotate);
                    console.log(event.detail.scaleX);
                    console.log(event.detail.scaleY);

                },

            });
            //cropper.reset();
        } else {
            // New Crop

            resetContainer(id);
            //reduce_height = false;

            $('.' + id).attr('id', 'image_' + id);
            // Add class to show that this image has been cropped
            // Add class to show that this image has been cropped
            //$("#image_" + image_id).addClass("cropped");
            //$('.' + id).
            //id = 'image_' + id;
            image = document.getElementById('image_' + id);
            console.log(image);

            var init_img_width = $('#image_' + id).width();
            console.log(init_img_width);
            // If image smaller than screen width then reduce container width
            if (init_img_width < win_width) {
                console.log('reduce width');
                $('#cropper_' + id).css('width', init_img_width);
                //$('#cropper_' + id).css('height', $('#image_' + id).height());
            }

            //$timeout(function() {

            cropper = new Cropper(image, options, {
                crop(event) {
                    console.log(event.detail.x);
                    console.log(event.detail.y);
                    console.log(event.detail.width);
                    console.log(event.detail.height);
                    console.log(event.detail.rotate);
                    console.log(event.detail.scaleX);
                    console.log(event.detail.scaleY);


                    var wrapper = document.getElementById('cropper_' + id);
                    //wrapper.style.width = '400px';
                    wrapper.style.width = '';

                },
            });
            //},1000);


        }

        //});

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
        console.log('saveImage');
        var image_to_save = document.getElementById('temp_image_filtered_' + id);

        //Format.dataURItoBlob(this.src).then(function(blob) {
        Format.dataURItoBlob(image_to_save.src).then(function(blob) {
            blob.name = 'image_filtered_' + id + '.jpg';
            blob.renamed = true;
            Format.prepImage([blob], function(result) {

                //var img5 = document.createElement("img");
                var img5 = new Image();

                img5.src = 'fileuploads/images/' + result.file + '?' + new Date();
                img5.className = 'filter';
                img5.onload = function() {
                    $('#temp_image_filtered_' + id).css('display', 'none');
                    // Remove current filter.
                    if ($('#cropper_' + id + ' img.filter').length > 0) {
                        $('#cropper_' + id + ' img.filter').remove();
                    }
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
                        $(this).attr("style", cssStyleParsed);
                    }
                    $('#image_' + id).css('display', 'none');

                    $('#temp_image_filtered_' + id).remove();
                    $(this).insertBefore('#image_' + id);
                    // Save
                    crop_finished = true;
                };
            });
        });
    };

    this.filterClick = function(e, button, id, filter) {

        $('.' + id).attr('id', 'image_' + id);
        $('#image_' + id).attr('filter-data', filter);

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


            // Canvas
            
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
                $(canvasFilter).attr("style", cssStyleParsed);
            }
            canvasFilter.setAttribute('id', 'temp_image_filtered_' + id);
            canvasFilter.setAttribute('class', 'resize-drag temp_image_filtered');

            if ($('#cropper_' + id + ' #temp_image_filtered_' + id).length >= 0) {
                $('#cropper_' + id + ' #temp_image_filtered_' + id).remove();
            }

            $('#cropper_' + id + ' #image_' + id).css('display', 'none');
            $(canvasFilter).insertBefore('#image_' + id);

            //ctx.font = "40pt Calibri";
            //ctx.fillText("TEMP", 40, 40);
            /*
                        var dataUrl = canvasFilter.toDataURL();

                        var img = document.createElement('img');
                        img.setAttribute('src', dataUrl);
                        //var filter_data = getFilter(filter);

                        ////
                        //var img4 = document.createElement('img');
                        //img4.setAttribute('src', dataUrl);
                        img.setAttribute('id', 'temp_image_filtered_' + id);
                        img.setAttribute('class', 'resize-drag temp_image_filtered');

                        img.onload = function() {

                            if ($('#cropper_' + id + ' #temp_image_filtered_' + id).length >= 0) {
                                $('#cropper_' + id + ' #temp_image_filtered_' + id).remove();
                            }

                            var img3 = this;
                            var canvas3 = document.createElement('canvas');
                            canvas3.setAttribute('id', 'image_filtered_' + id);
                            canvas3.width = img3.width;
                            canvas3.height = img3.height;
                            var ctx = canvas3.getContext('2d');
                            //if (filter_data.filter != undefined) {
                            //    ctx.filter = filter_data.filter;
                            //}
                            ctx.drawImage(img3, 0, 0, img3.width, img3.height);

                            var dataUrl = canvas3.toDataURL();



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
                                $(this).attr("style", cssStyleParsed);
                            }

                            $('#cropper_' + id + ' #image_' + id).css('display', 'none');

                                           // Remove current filter.
                                if ($('#cropper_' + id + ' img.filter').length > 0) {
                                    $('#cropper_' + id + ' img.filter').remove();
                                }

                            $(this).insertBefore('#image_' + id);

                            
                            self.saveImage(id);

                            /*
                                            img4.onload = function() {
                                                //$('#image_' + id).css('display', 'none');
                                                if ($('#cropper_' + id + ' #temp_image_filtered_' + id).length >= 0) {
                                                    $('#cropper_' + id + ' #temp_image_filtered_' + id).remove();
                                                }
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
                                                    $(this).attr("style", cssStyleParsed);
                                                }
                                                $('#cropper_' + id + ' #image_' + id).css('display', 'none');
                                                $(this).insertBefore('#image_' + id);
                                            };
                                            */
            /*
            img4.onload = function() {
                Format.dataURItoBlob(this.src).then(function(blob) {
                    blob.name = 'image_filtered_' + id + '.jpg';
                    blob.renamed = true;
                    Format.prepImage([blob], function(result) {
                        var img5 = document.createElement("img");
                        img5.src = 'fileuploads/images/' + result.file + '?' + new Date();
                        img5.className = 'filter';
                        img5.onload = function() {
                            // Remove current filter.
                            if ($('#cropper_' + id + ' img.filter').length > 0) {
                                $('#cropper_' + id + ' img.filter').remove();
                            }
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
                                $(this).attr("style", cssStyleParsed);
                            }
                            $('#image_' + id).css('display', 'none');
                            $(this).insertBefore('#image_' + id);
                            // Save
                            crop_finished = true;
                        };
                    });
                });
            };
            */
            //};
        });
        if (button != 'button') {
            e.stopPropagation();
        }
    };

    this.filterImage = function(e, id) {

        $('.image_adjust_on').remove();

        if ($('#cropper_' + id + ' .image_filt_div').length <= 0) {
            var temp = $('#cropper_' + id).clone();
            // If there is a filtered image then remove it.
            if ($('#cropper_' + id + ' .filter').length >= 0) {
                temp.find('img.filter').remove();
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
        crop_finished = true;
        // SAVE
        $('#' + e.target.id).closest('div.ce').focus();
        $('#' + e.target.id).closest('div.ce').blur();
        $('.filters_active').remove();
        e.stopPropagation();
    };

    this.closeEdit = function(e, id) {
        e.stopPropagation();
        $('#' + e.target.id).closest('div.ce').attr('contenteditable', 'true');
        $('.image_adjust_on').remove();
        $('#cropper_' + id).removeClass('cropping');
    };

    this.editImage = function(scope, id) {
        if (principal.isValid()) {
            UserData.checkUser().then(function(result) {
                // Logged in.
                // Get the editable attibute for this card (for this user).
                console.log($(scope).parent().attr('id'));
                console.log($(scope).parent().attr('editable'));
                // check user has permision to edit.
                //if ($(scope).parent().attr('editable') == 'true') {
                if ($(scope).closest('div.ce').attr('editable') == 'true') {

                    //var card = $(wrapper).parent().closest('div').attr('id');
                    //console.log(card);
                    $(scope).closest('div.ce').attr('contenteditable', 'false');

                    console.log('can edit');
                    console.log($('#cropper_' + id + ' .image_adjust').length);
                    // Only open editing if not already open.
                    //if (this.editing != true) {
                    //if ($('#cropper_' + id + ' .image_adjust').length <= 0) {
                    if ($('#image_adjust_' + id).length <= 0) {
                        // Close existing
                        $('.image_adjust_on').remove();
                        $('.filters_active').remove();
                        console.log('ADD EDIT');
                        //this.editing = true;
                        //$('#cropper_' + id).clone().appendTo('.image_adjust');
                        //$('.image_adjust').clone().insertBefore('.' + id);
                        //$('.image_adjust').clone().insertBefore('.' + id);
                        //$("div").clone().text('cloned div').appendTo("body");
                        var ia = $('.image_adjust').clone();
                        console.log(ia);
                        ia.insertBefore('#cropper_' + id);
                        //var ia = $('.image_adjust').clone().insertBefore('#cropper_' + id);

                        $(ia).attr('id', 'image_adjust_' + id);
                        //$('.image_adjust').clone().insertBefore('#a_filter_' + id);
                        //$('#cropper_' + id + ' .image_adjust').css('visibility', 'visible');
                        $('#image_adjust_' + id).css('visibility', 'visible');
                        $('#image_adjust_' + id).css('position', 'relative');
                        var edit_btns = "<div class='image_editor'><div class='image_edit_btns'><div class=''><i class='material-icons image_edit' id='ie_tune'>tune</i></div><div class='' onclick='filterImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_filter'>filter</i></div><div class='' onclick='openCrop(\"" + id + "\")'><i class='material-icons image_edit' id='ie_crop' >crop</i></div><div class='close_image_edit' onclick='closeEdit(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_close'>&#xE14C;</i></div></div><div class='crop_edit'><div class='set_crop' onclick='setCrop(\"" + id + "\")'><i class='material-icons image_edit' id='ie_accept'>&#xe876;</i></div></div></div>";
                        // set this to active
                        //$('#cropper_' + id + ' .image_adjust').addClass('image_adjust_on');
                        //$('#cropper_' + id + ' .image_adjust').append(edit_btns);

                        $('#image_adjust_' + id).addClass('image_adjust_on');
                        $('#image_adjust_' + id).append(edit_btns);

                        console.log($('#cropper_' + id + ' .image_adjust').length);
                    }
                }
            });
        }
    };

    /*
        function applyBlending(bottomImageData, topImageData, image, id, type) {
            var deferred = $q.defer();
            // create the canvas
            var canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            var ctx = canvas.getContext('2d');
            // get the pixel data as array
            var bottomData = bottomImageData.data;
            var topData = topImageData.data;

            // Multiply
            if (type == 'multiply') {
                for (var i = 0; i < topData.length; i += 4) {
                    topData[i] = topData[i] * (bottomData[i]) / 255;
                    topData[i + 1] = topData[i + 1] * (bottomData[i + 1]) / 255;
                    topData[i + 2] = topData[i + 2] * (bottomData[i + 2]) / 255;

                    topData[i + 3] = topData[i + 3] * (bottomData[i + 3]) / 255;
                }
            }

            // Overlay
            if (type == 'overlay') {
                for (var i = 0; i < topData.length; i += 4) {

                    bottomData[i] /= 2;
                    bottomData[i + 1] /= 2;
                    bottomData[i + 2] /= 2;

                    topData[i] = topData[i] < 128 ? (2 * topData[i] * bottomData[i] / 255) : (255 - 2 * (255 - topData[i]) * (255 - bottomData[i]) / 255);
                    topData[i + 1] = topData[i + 1] < 128 ? (2 * topData[i + 1] * bottomData[i + 1] / 255) : (255 - 2 * (255 - topData[i + 1]) * (255 - bottomData[i + 1]) / 255);
                    topData[i + 2] = topData[i + 2] < 128 ? (2 * topData[i + 2] * bottomData[i + 2] / 255) : (255 - 2 * (255 - topData[i + 2]) * (255 - bottomData[i + 2]) / 255);
                }
            }

            // Lighten
            if (type == 'lighten') {
                for (var i = 0; i < topData.length; i += 4) {

                    bottomData[i] /= 4;
                    bottomData[i + 1] /= 4;
                    bottomData[i + 2] /= 4;


                    topData[i] = (bottomData[i] > topData[i]) ? bottomData[i] : topData[i];
                    topData[i + 1] = (bottomData[i + 1] > topData[i + 1]) ? bottomData[i + 1] : topData[i + 1];
                    topData[i + 2] = (bottomData[i + 2] > topData[i + 2]) ? bottomData[i + 2] : topData[i + 2];
                }
            }

            // Darken
            if (type == 'darken') {
                console.log('darken');
                for (var i = 0; i < topData.length; i += 4) {

                    bottomData[i] *= .5;
                    bottomData[i + 1] *= .5;
                    bottomData[i + 2] *= .5;
                    
                    topData[i] = (bottomData[i] > topData[i]) ? topData[i] : bottomData[i];
                    topData[i + 1] = (bottomData[i + 1] > topData[i + 1]) ? topData[i + 1] : bottomData[i + 1];
                    topData[i + 2] = (bottomData[i + 2] > topData[i + 2]) ? topData[i + 2] : bottomData[i + 2];  
                }
            }

            ctx.putImageData(topImageData, 0, 0);
            deferred.resolve(canvas);
            return deferred.promise;
        }
        */

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
            console.log('darken');
            ctx.globalCompositeOperation = 'darken';
            ctx.drawImage(bottomImage, 0, 0, image.width, image.height);
            ctx.drawImage(topImage, 0, 0, image.width, image.height);
        }

        // Screen
        if (type == 'screen') {
            console.log('screen');
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(bottomImage, 0, 0, image.width, image.height);
            ctx.drawImage(topImage, 0, 0, image.width, image.height);
        }

        // Screen
        if (type == 'soft-light') {
            console.log('soft-light');
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
            console.log('blend: ' + filter_data.blend);
            var canvas2 = document.createElement('canvas');
            canvas2.width = image.width;
            canvas2.height = image.height;
            var ctx2 = canvas2.getContext('2d');
            console.log('gradient: ' + filter_data.gradient);
            if (filter_data.gradient == 'radial') {
                console.log('radial');
                // radial gradient
                // gradient_percent
                if (filter_data.gradient_percent != undefined) {
                    // [0,40,80,100]
                    console.log(filter_data.gradient_percent.length - 2);
                    var penultimate_percent = filter_data.gradient_percent[filter_data.gradient_percent.length - 2];
                    var final_radius = image.width * (penultimate_percent / 100);
                    console.log(final_radius);
                    var grd = ctx2.createRadialGradient((image.width / 2), (image.height / 2), 0, (image.width / 2), (image.height / 2), final_radius);
                } else {
                    var grd = ctx2.createRadialGradient((image.width / 2), (image.height / 2), (image.width / 100), (image.width / 2), (image.height / 2), image.width);
                }


                for (var i = 0; i < filter_data.gradient_stops.length; i++) {
                    grd.addColorStop(filter_data.gradient_stops[i][0], "rgba(" + filter_data.gradient_stops[i][1] + "," + filter_data.gradient_stops[i][2] + "," + filter_data.gradient_stops[i][3] + "," + filter_data.gradient_stops[i][4] + ")");
                }


                //grd.addColorStop(0, "rgba(" + filter_data.gradient_stops[0][0] + "," + filter_data.gradient_stops[0][1] + "," + filter_data.gradient_stops[0][2] + "," + filter_data.gradient_stops[0][3] + ")");
                //grd.addColorStop(1, "rgba(" + filter_data.gradient_stops[1][0] + "," + filter_data.gradient_stops[1][1] + "," + filter_data.gradient_stops[1][2] + "," + filter_data.gradient_stops[1][3] + ")");
                // Fill with gradient
                ctx2.fillStyle = grd;
                ctx2.fillRect(0, 0, image.width, image.height);
            }
            if (filter_data.gradient == 'solid') {
                // Fill with colour
                ctx2.fillStyle = "rgba(" + filter_data.gradient_stops[0][0] + "," + filter_data.gradient_stops[0][1] + "," + filter_data.gradient_stops[0][2] + "," + filter_data.gradient_stops[0][3] + ")";
                ctx2.fillRect(0, 0, image.width, image.height);
            }
            if (filter_data.gradient == 'linear') {
                console.log('linear');
                // radial gradient
                var grd = ctx2.createLinearGradient(0, 0, 0, image.width);
                for (var i = 0; i < filter_data.gradient_stops.length; i++) {
                    grd.addColorStop(filter_data.gradient_stops[i][0], "rgba(" + filter_data.gradient_stops[i][1] + "," + filter_data.gradient_stops[i][2] + "," + filter_data.gradient_stops[i][3] + "," + filter_data.gradient_stops[i][4] + ")");
                }
                //grd.addColorStop(0, "rgba(" + filter_data.gradient_stops[0][0] + "," + filter_data.gradient_stops[0][1] + "," + filter_data.gradient_stops[0][2] + "," + filter_data.gradient_stops[0][3] + ")");
                //grd.addColorStop(1, "rgba(" + filter_data.gradient_stops[1][0] + "," + filter_data.gradient_stops[1][1] + "," + filter_data.gradient_stops[1][2] + "," + filter_data.gradient_stops[1][3] + ")");
                // Fill with gradient
                ctx2.fillStyle = grd;
                ctx2.fillRect(0, 0, image.width, image.height);
            }

            bottomImage = canvas2;
            var bottomCanvas = document.createElement("canvas");
            bottomCanvas.width = image.width;
            bottomCanvas.height = image.height;
            // get the 2d context to draw
            var bottomCtx = bottomCanvas.getContext('2d');
            bottomCtx.drawImage(bottomImage, 0, 0, image.width, image.height);

            /*
            var bottomImageData = bottomCtx.getImageData(0, 0, image.width, image.height);
            var topImageData = topCtx.getImageData(0, 0, image.width, image.height);
             apply blending.
                applyBlending(bottomImageData, topImageData, image, id, filter_data.blend).then(function(result) {
                deferred.resolve(result);
            });
            */
            applyBlending(bottomImage, topImage, image, id, filter_data.blend).then(function(result) {
                deferred.resolve(result);
            });

        } else {
            deferred.resolve(topCanvas);
        }
        return deferred.promise;
    }


    this.setCrop = function(image_id) {
        console.log('setCrop: ' + image_id);
        var cur_filter = $("#image_" + image_id).attr('filter-data');
        console.log(cur_filter);
        //$timeout(function() {
        console.log(cur_filter);
        if (cur_filter != undefined) {
            // Temporarily apply filter to crop
            $("#cropper_" + image_id).addClass(cur_filter);
            filterClick('e', 'button', image_id, cur_filter);
        }
        // },1000);
        getData = function() {
            console.log('data');



            var stored_image_data = cropper.getImageData();
            console.log(stored_image_data);
            var stored_data = cropper.getData();
            console.log(stored_data);

            $("#image_" + image_id).attr('crop-data', JSON.stringify(stored_data));

            $("#image_" + image_id).attr('image-data', JSON.stringify(stored_image_data));




            var gcd = cropper.getCanvasData();
            var gd = cropper.getData();
            console.log(gd);
            console.log(cropper.getImageData());
            console.log(gcd);
            var gcbd = cropper.getCropBoxData();
            console.log(gcbd);

            console.log(image.naturalWidth + ' : ' + image.naturalHeight);
            console.log(image.width + ' : ' + image.height);

            // Set the height of the container
            var wrapper = document.getElementById('cropper_' + image_id);

            wrapper.style.cssFloat = 'left';

            //wrapper.style.height = gcd.height + 'px';
            //reset = gcd.height + 'px';

            image.style.position = "relative";
            console.log("rect(" + gcbd.top + "px " + (gcbd.width + gcbd.left) + "px " + (gcbd.height + gcbd.top) + "px " + gcbd.left + "px)");
            //image.style.clip = "rect(" + gcbd.top + "px " + (gcbd.width + gcbd.left) + "px " + (gcbd.height + gcbd.top) + "px " + gcbd.left + "px)";


            // TOP RIGHT BOTTOM LEFT
            // top as percent of gcd H and W

            //% increase = Increase ÷ Original Number × 100.
            // 10 as percent of 100
            // (10 / 100) * 100
            console.log(gcbd.top + ' / ' + gcd.height);
            var per_top = (gcbd.top / gcd.height) * 100;
            var per_right = ((gcd.width - gcbd.width - gcbd.left) / gcd.width) * 100;
            console.log(gcbd.height + ' + ' + gcbd.top + ' / ' + gcd.height);
            var per_bottom = ((gcd.height - (gcbd.height + gcbd.top)) / gcd.height) * 100;
            var per_left = (gcbd.left / gcd.width) * 100;

            var per_top_margin = (gcbd.top / gcd.width) * 100;
            var per_bottom_margin = ((gcd.height - (gcbd.top + gcbd.height)) / gcd.width) * 100;

            image.style.clipPath = "inset(" + per_top + "% " + per_right + "% " + per_bottom + "% " + per_left + "%)";

            var zoom_amount = ((((gcd.width - gcbd.width) / gcbd.width) * 100) + 100);
            console.log(zoom_amount);
            //zoom_amount = zoom_amount * 2;
            image.style.maxWidth = zoom_amount + '%';
            image.style.width = zoom_amount + '%';

            image.style.left = ((per_left * (zoom_amount / 100)) * -1) + '%';
            image.style.marginTop = ((per_top_margin * (zoom_amount / 100)) * -1) + '%';
            image.style.marginBottom = ((per_bottom_margin * (zoom_amount / 100)) * -1) + '%';
            //image.style.width = gcd.width + 'px';
            //image.style.width = (gcbd.width + gcbd.left) + 'px';
            //image.style.left = (gcbd.left * -1) + 'px';

            //image.style.marginTop = (gcbd.top * -1) + 'px';

            wrapper.style.maxWidth = gd.width + 'px';

            // reset the wrapper width and height.
            wrapper.style.width = '';
            wrapper.style.height = '';


            //var zoom_amount = (((gcd.width - gcbd.width) / gcbd.width)  * 100) + 100;
            //var zoom_amount = ((((gcd.width - gcbd.width) / gcbd.width) * 100) + 100) / 100;
            //console.log(zoom_amount);



            var cbd = { 'top': gcbd.top, 'right': (gcbd.width + gcbd.left), 'bottom': (gcbd.height + gcbd.top), 'left': gcbd.left };
            $("#image_" + image_id).attr('cbd-data', JSON.stringify(cbd));
            var win_width = $(window).width();
            /*
                        if (reduce_height) {
                            //var win_width = $(window).width();
                            //zoom_amount = zoom_amount / decrease_percent;
                            zoom_amount = win_width / (cbd.right - cbd.left);
                        }
                        */
            if (stored_image_data.naturalWidth < win_width) {
                //wrapper.style.height =  stored_image_data.height + 'px';
                //wrapper.style.width =  stored_image_data.naturalWidth + 'px';
                //wrapper.style.height = stored_image.height + 'px';
                //wrapper.style.width = stored_image.width + 'px';
                zoom_amount = stored_image_data.naturalWidth / (cbd.right - cbd.left);
                console.log(zoom_amount);
                // $(value).css("zoom", zoom);
                //image.style.zoom = (zoom_amount);

            } else {
                //wrapper.style.height =  stored_image_data.height + 'px';
                //wrapper.style.width = '';
                zoom_amount = win_width / (cbd.right - cbd.left);
                console.log(zoom_amount);
                //$(value).css("zoom", zoom_amount);

                var height = (cbd.bottom - cbd.top) * zoom_amount;
                console.log(height);
                // wrapper.style.height =  height + 'px';
            }

            console.log(zoom_amount);
            //image.style.zoom = (zoom_amount / 100);
            //image.style.zoom = (zoom_amount);
            console.log((gcbd.height * (zoom_amount / 100)) + 'px');
            //var cont_height = (gcbd.height * (zoom_amount / 100));


            console.log('reduce_height: ' + reduce_height);

            /*
                        if (reduce_height) {
                            cont_height = (cbd.bottom - cbd.top) * zoom_amount;
                            //cont_height = cont_height / decrease_percent;
                            //cont_height = cont_height / decrease_percent;
            wrapper.style.width = '';
                            wrapper.style.height = cont_height + 'px';
                        }
                        */

            if (stored_image_data.width < win_width) {
                //wrapper.style.height = stored_image_data.height + 'px';
            }

            //wrapper.style.height = cont_height + 'px';
            console.log($('#cropper_' + image_id).width());
            //var cont_data = {'height': cont_height, 'width': $('#cropper_' + image_id).width()};
            //$("#image_" + image_id).attr('container-data', cont_height);
            //$("#image_" + image_id).attr('container-data', JSON.stringify(cont_data));
            //image.style.maxWidth = 'unset';


            // Add class to show that this image has been cropped
            $("#image_" + image_id).addClass("cropped");




            var card = $(wrapper).parent().closest('div').attr('id');
            console.log(card);
            $('#' + card).attr('contenteditable', 'true');
            closeEdit(event, image_id);




        };
        getData();
        cropper.destroy();
        $rootScope.crop_on = false;

        // Re-apply filter
        // this.filterClick = function(e, button, id, filter)
        //var cur_filter = $("#image_" + image_id).attr('filter-data');
        //console.log(cur_filter);
        //if (cur_filter != undefined) {
        //   filterClick('e', 'button', image_id, cur_filter);
        //}

        //crop_finished = true;
        //$('#hidden_input').focus();  

        //$( "<div class='scroll_latest' id='enter_focus'>Test</div>" ).insertAfter( '#cropper_' + image_id );

        $timeout(function() {
            console.log('after_image');
            crop_finished = true;
            console.log(UserData.getUser());
            //var wrapper = document.getElementById('cropper_' + image_id);
            var card_id = $('#cropper_' + image_id).parent().attr('id');
            //card_id = card_id.substring(2, card_id.length);
            console.log(card_id);
            var active_el = document.activeElement;
            console.log(active_el);
            //$('#hidden_input').focus();
            //$('#' + card_id).focus();
            //$('#' + card_id).scrollIntoView();

            //$('.content_cnv').scrollTop();
            $('.content_cnv').scrollTop($('.content_cnv')[0].scrollHeight);
            //var scroll_latest = $('#' + card_id);
            //scrollIntoViewIfNeeded(scroll_latest, { duration: 200, offset: { bottom: 30 } });
            //document.activeElement.blur();
            //getcards();
            //console.log($scope.cards);
            //$rootScope.$broadcast('getCards', card_id);

            //$('#after_image').focus(); 
            //Format.pasteHtmlAtCaret()
            //Format.moveCaretInto('enter_focus');

            // Scroll into view if necessary
            //Format.scrollLatest('scroll_latest');
        }, 0);



        // Inject the Database Service
        //var Database = $injector.get('Database');
        // Update the card
        //Database.updateCard(id, card, currentUser);
        //card._id, card, currentUser
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
        console.log('stc');
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
        console.log('uc');
        console.log(currentUser);
        console.log('updateinprogress: ' + updateinprogress);
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
                //
                console.log('update card');
                //Cropp.destroyCrop();
                console.log(card);
                console.log(card.content);
                //card.content = replaceTags.removeCropper(card.content);
                // console.log(card.content);
                //cropper-container



                //cropper.destroy();
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
                                console.log(response);
                                // Only send notifications if there are other participants.
                                if (response.data.participants.length > 1) {
                                    var notification = self.setNotification(response.data, currentUser, card_content);
                                    console.log(notification);
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
                                        updateinprogress = false;
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
                            console.log(notification);
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

//
// FACTORIES
//

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
        //console.log('ERROR while parsing principal cookie.' + e);
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
var cards_model;
cardApp.factory('UserData', function($rootScope, $route, $timeout, $window, $http, $cookies, $location, jwtHelper, $q, principal, Users, Conversations, FormatHTML, General, socket, $filter) {
    var user;
    var contacts = [];
    var contacts_and_user = [];
    var conversations;
    var conversationsLatestCard = [];
    var conversationsUsers = [];
    var sent_content_length = 200;
    // Final conversations model for display.
    var conversations_model = [];
    // Final cards model for display.
    cards_model = [];


    var UserData = { isAuthenticated: false, isLoaded: false, isLoading: false };
    $rootScope.loaded = false;
    var isLoading = false;
    $rootScope.dataLoading = true;
    var ua = navigator.userAgent;
    $window.androidTokenRefresh = this.androidTokenRefresh;
    $window.androidToken = this.androidToken;
    $window.mobileNotification = this.mobileNotification;
    $window.networkChange = this.networkChange;

    $window.onResume = this.onResume;
    $window.onRestart = this.onRestart;
    $window.restoreState = this.restoreState;

    var update_inprogress = false;

    UserData.show = function() {
        console.log(cards_model);
    };


    // Android called functions.

    restoreState = function() {
        /*
        console.log('restoreState');
        console.log($rootScope.loaded);
        console.log($rootScope.dataLoading);
        */
    };

    onResume = function() {
        /*
        console.log('onResume');
        console.log($rootScope.loaded);
        console.log($rootScope.dataLoading);
        */
    };

    onRestart = function() {
        /*
        console.log('onRestart');
        console.log($rootScope.loaded);
        console.log($rootScope.dataLoading);
        */
    };

    networkChange = function(status) {
        if (status == "connected") {
            $timeout(function() {
                //console.log('connected');
            });
        } else if (status == "disconnected") {
            //console.log('disconnected');
        }
    };

    mobileNotification = function(data) {
        $timeout(function() {
            $location.path("/chat/conversation/" + data);
        });
    };

    androidTokenRefresh = function(data) {
        refreshedToken = JSON.parse(data);
        if (refreshedToken.id != undefined && refreshedToken.refreshedToken != undefined) {
            // get notifcation data and check if this needs to be updated or added
            Users.update_notification(refreshedToken);
        }
    };

    androidToken = function(data) {
        token = JSON.parse(data);
        if (token.id != undefined) {
            // get notifcation data and check if this needs to be updated or added
            Users.update_notification(token)
                .then(function(res) {
                    $rootScope.receivedToken = token;
                });
        }
    };

    UserData.checkFCMToken = function() {
        var deferred = $q.defer();
        if (ua.indexOf('AndroidApp') >= 0) {
            // check if exists in DB.
            if (UserData.getUser().notification_key_name != undefined) {
                // Check for refresh token.
                Android.checkFCMToken();
                deferred.resolve();
            } else {
                // Otherwise get token from Android (may have created account on Web).
                $rootScope.$watch('receivedToken', function(n) {
                    if (n) {
                        // received token
                        deferred.resolve();
                    }
                });
                Android.getFCMToken();
            }
        } else {
            // Web
            $timeout(function() {
                deferred.resolve();
            }, 100);
        }
        return deferred.promise;
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

    // Broadcast by Database createCard service when a new card has been created
    $rootScope.$on('CARD_UPDATED', function(event, data) {
        console.log('model updated');
        console.log(data);
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

    // Check for updates

    UserData.checkDataUpdate = function() {
        console.log('CDU');
        if (!update_inprogress) {
            update_inprogress = true;
            var toUpdate = [];
            // Find the conversations for current user
            var user_id = UserData.getUser()._id;
            var check_objects = ['admin', 'conversation_avatar', 'conversation_name', 'participants'];
            var convs_same = true;
            var conv_same = true;

            Conversations.find_user_conversations(user_id)
                .then(function(res) {
                    res.data.map(function(key) {
                        UserData.getConversationModelById(key._id)
                            .then(function(res) {
                                // Compare the LM with the DB conversations model.
                                for (var i in check_objects) {
                                    if (!General.isEqual(key[check_objects[i]], res[check_objects[i]])) {
                                        convs_same = false;
                                    }
                                }
                                if (!convs_same) {
                                    update_inprogress = false;
                                    var msg = { conversation_id: key._id };
                                    notification(msg);
                                } else if (convs_same) {
                                    // Compare the LM with the DB conversation cards model.
                                    Conversations.getConversationById(key._id)
                                        .then(function(result) {
                                            if (result.data.length > 0) {
                                                UserData.getCardsModelById(key._id)
                                                    .then(function(res) {
                                                        for (var i in result.data) {
                                                            if (!General.isEqual(result.data[i].content, res.data[i].content)) {
                                                                conv_same = false;
                                                            }
                                                        }
                                                        if (!conv_same) {
                                                            update_inprogress = false;
                                                            var msg = { conversation_id: res._id };
                                                            notification(msg);
                                                        }
                                                    });
                                            }
                                            update_inprogress = false;
                                        });
                                }
                            });
                    });
                });
        }
    };

    //
    // MAIN NOTIFICATION CENTER
    //

    notification = function(msg) {

        // CONVERSATIONS
        console.log(msg);
        if (!update_inprogress) {
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
                            console.log(result);
                            //Cards model
                            UserData.getCardsModelById(msg.conversation_id)
                                .then(function(res) {
                                    console.log(res);
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
                                        console.log('update existing card');
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
        }

    };

    $rootScope.$on('NOTIFICATION', function(event, msg) {
        notification(msg);
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
        console.log('ACM');
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
        console.log('FCM');
        var deferred = $q.defer();
        var index = General.findWithAttr(conversations_model, 'conversation_type', 'public');
        deferred.resolve(conversations_model[index]);
        return deferred.promise;
    };

    UserData.updateConversationById = function(id, conv) {
        console.log('UD1');
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
        console.log('VIEWED');
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
        console.log('UD2');
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
        console.log('UD3');
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

        console.log('build');
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
        console.log('UD4');
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
        console.log('GCLC');
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
        console.log('UD5');
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
        //console.log('build');
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
            //console.log('GET 9 BC');
            return UserData.checkFCMToken();
        }).then(function() {
            // connect to socket.io via socket service 
            // and request that a unique namespace be created for this user with their user id
            socket.setId(UserData.getUser()._id);
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

//
// DIRECTIVES
//
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


cardApp.directive('momentTime', ['$interval', '$filter', function($interval, $filter) {

    function link(scope, element, attrs) {
        var format,
            timeoutId;
        momentFilter = $filter('momentFilter');

        function updateTime() {
            element.text((new Date(), momentFilter(format)));
        }

        scope.$watch(attrs.momentTime, function(value) {
            format = value;
            updateTime();
        });

        element.on('$destroy', function() {
            $interval.cancel(timeoutId);
        });

        // start the UI update process; save the timeoutId for canceling
        timeoutId = $interval(function() {
            updateTime(); // update DOM
        }, 10000);
    }

    return {
        link: link
    };
}]);


cardApp.directive('momentTimeConv', ['$interval', '$filter', function($interval, $filter) {

    function link(scope, element, attrs) {
        var format,
            timeoutId;
        momentFilterConv = $filter('momentFilterConv');

        function updateTime() {
            element.text((new Date(), momentFilterConv(format)));
        }

        scope.$watch(attrs.momentTimeConv, function(value) {
            format = value;
            updateTime();
        });

        element.on('$destroy', function() {
            $interval.cancel(timeoutId);
        });

        // start the UI update process; save the timeoutId for canceling
        timeoutId = $interval(function() {
            updateTime(); // update DOM
        }, 10000);
    }

    return {
        link: link
    };
}]);

cardApp.directive('onFinishRender', function($timeout, $rootScope) {
    return {
        restrict: 'A',
        link: function(scope, element, attr) {
            if (scope.$last === true) {
                $timeout(function() {
                    //scope.$emit('ngRepeatFinished');
                    $rootScope.$broadcast("ngRepeatFinished", { temp: "some value" });
                });
            }
        }
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


// scrollIndicator directive
cardApp.directive('scrollIndicator', ['$window', '$document', '$timeout', '$compile', '$rootScope', function($window, $document, $timeout, $compile, $rootScope) {
    var defaults = {
        delay: 100,
        start_delay: 1000,
        init_scroll_delay: 3000,
        scroll_delay: 1000,
        thumb_min_height: 3,
        element_id: 'scroll_indicator_scroll',
        progress_container_class: 'progress-container',
        progress_bar_class: 'progress-bar',
        progress_thumb_id: 'progress-thumb',
        disable: 'false'
    };
    return {
        restrict: 'A',
        scope: {
            scrollIndicator: '='
        },
        link: function($scope, element, attrs) {
            var options = angular.extend({}, defaults, $scope.scrollIndicator);
            if (options.disable !== true) {
                var wrapperParentElement = element.parent()[0];
                var wrapperDomElement = element;
                element.attr('id', options.element_id);
                // create progress-container
                var progressContainer = angular.element($window.document.createElement('div'));
                progressContainer.addClass(options.progress_container_class);
                // create progress-bar
                var progressBar = angular.element('<div id="' + options.progress_thumb_id + '"></div>');
                progressBar.addClass(options.progress_bar_class);
                // Add the progress-bar to the progress-container
                progressContainer.append(progressBar);
                // Attach to the DOM
                wrapperParentElement.insertBefore(progressContainer[0], wrapperParentElement.children[0]);
                var scrollpromise;
                // hide the scroll thumb initially
                $(progressBar[0]).css('visibility', 'hidden');
                // set the delay val to the init_scroll_delay initially.
                var delay_val = options.init_scroll_delay;
                //Methods
                var values = {},
                    assignValues = function() {
                        // Position of scroll indicator 
                        var content_position = $(wrapperDomElement).position();
                        var content_height = $(wrapperDomElement).height();
                        // Top
                        $('.' + options.progress_container_class).css({ top: content_position.top });
                        // Height
                        $('.' + options.progress_container_class).css({ height: content_height });
                        //
                        values.content_div_height = $('#' + options.element_id).height();
                        values.content_height = element[0].scrollHeight;
                        if (values.content_height > values.content_div_height) {
                            values.height = element[0].scrollHeight - element[0].clientHeight;
                            values.scroll_thumb_height = (100 / (((values.content_height / values.content_div_height) * 100) / 100));
                            // Check for minimum height.
                            var thumb_height = options.thumb_min_height;
                            if (values.scroll_thumb_height > options.thumb_min_height) {
                                thumb_height = values.scroll_thumb_height;
                            }
                            // Set the progress thumb height.
                            $(progressBar[0]).css('height', thumb_height + "%");
                            // Set scrolled max value.
                            values.scrolled_max = 100 - thumb_height;
                            // set the intial scroll position
                            $timeout(function() {
                                $(progressBar[0]).css('visibility', 'visible');
                                // bind scroll
                                wrapperDomElement.bind('scroll', doScroll);
                                doScroll();
                            }, options.start_delay);
                        }
                    };
                // bind resize
                angular.element($window).bind('resize', function() { $timeout(assignValues, options.delay); });
                //
                // listen for directive div resize
                $scope.$watchGroup([getElementHeight, getElementScrollHeight], function(newValues, oldValues, scope) {
                    assignValues();
                });

                function getElementHeight() {
                    return element[0].clientHeight;
                }

                function getElementScrollHeight() {
                    return element[0].scrollHeight;
                }

                $timeout(assignValues, options.delay);

                $scope.$on('$destroy', function() {
                    $timeout.cancel(scrollpromise);
                    $(progressBar[0]).css('visibility', 'hidden');
                    $(progressBar[0]).removeClass('fade_out');
                    $(progressBar[0]).removeClass('fade_in');
                    wrapperDomElement.unbind('scroll');
                    angular.element($window).unbind('resize', assignValues);
                });

                doScroll = function() {
                    $(progressBar[0]).removeClass('fade_out');
                    $(progressBar[0]).addClass('fade_in');
                    // Cancel timeout to check for scroll stop
                    $timeout.cancel(scrollpromise);
                    // Start timeout to check for scroll stop
                    scrollpromise = $timeout(function() {
                        //console.log('scrolling stopped');
                        delay_val = options.scroll_delay;
                        $(progressBar[0]).removeClass('fade_in');
                        $(progressBar[0]).addClass('fade_out');
                    }, delay_val);
                    // Calculate scroll
                    var winScroll = document.getElementById(options.element_id).scrollTop;
                    var scrolled = (winScroll / (values.height) * 100);
                    scrolled = (scrolled * values.scrolled_max) / 100;
                    document.getElementById(options.progress_thumb_id).style.top = scrolled + "%";
                };
            }
        }
    };
}]);