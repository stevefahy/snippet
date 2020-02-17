// Format Service

cardApp.service('Format', ['$window', '$rootScope', '$timeout', '$q', 'Users', 'Cards', 'replaceTags', 'socket', '$injector', 'ImageAdjustment', function($window, $rootScope, $timeout, $q, Users, Cards, replaceTags, socket, $injector, ImageAdjustment) {

    var self = this;
    var tag_count_previous;
    var paste_in_progress = false;
    var marky_started_array = [];
    var marky_char_array = [];
    var start_key = false;
    var ua = navigator.userAgent;
    var refreshedToken;
    var marky_found = false;
    var focused_id;
    var focused_card;
    var focused_user;
    var savedSelection;

    // Android Javascript Interface calls from app

    $window.imageUploaded = self.imageUploaded;
    $window.imageUploadedOffline = self.imageUploadedOffline;

    // Set serverUrl based upon current host (local or live)
    if (location.hostname === 'localhost') {
        // TODO should this not have /upload then route_folder for both would just be / in upload_app route.js
        serverUrl = 'http://localhost:8060/upload';
    } else {
        serverUrl = 'https://www.snipbee.com/upload';
    }

    this.imageUploaded = function(data) {
        insertImage(data);
    };

    this.imageUploadedOffline = function(data) {
        insertImageOffline(data);
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
        //span_start: '<span id="checkbox_edit" >',
        //span_end: '</span>',

        // start class='scroll_latest' id='marky'


        span_start: '<span class="cb_container"><span class="checkbox" id="checkbox_edit" >',
        span_end: '</span><span class="cb_label scroll_latest"  id="marky"></span></span>',

        close: false
    }, {
        charstring: INITIAL_KEY + '1',
        html: 'h1',
        //attribute: '',
        attribute: 'class="header_1"',
        // class='scroll_latest' id='marky'
        //span_start: '<span id="marky"  class="header_1 scroll_latest">',
        //span_end: '</span>',
        close: true
    }, {
        charstring: INITIAL_KEY + '2',
        html: 'h2',
        attribute: 'class="header_2"',
        //span_start: '<span id="header" >',
        //span_end: '</span>',
        close: true
    }, {
        charstring: INITIAL_KEY + '3',
        html: 'h3',
        attribute: 'class="header_3"',
        //span_start: '<span id="header" >',
        //span_end: '</span>',
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

    // Create marky_char_array from marky_array
    for (var i = 0; i < marky_array.length; i++) {
        marky_char_array.push(INITIAL_KEY.toUpperCase() + marky_array[i].charstring.charAt(1).toUpperCase());
    }

    // TODO - make general function
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
                img.onload = function() {};
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

    this.replaceBlob = function(content) {
        var div = document.createElement('div');
        div.innerHTML = content.trim();
        $(div).find('img').each(function() {
            if ($(this).attr('src').substr(0, 5) == 'blob:') {
                let original_image_name = $(this).attr('original-image-name');
                $(this).removeAttr('original-image-name');
                if (!$(this).attr('id').includes('filtered')) {
                    // Original image
                    $(this).attr('src', IMAGES_URL + original_image_name);
                } else {
                    // Filtered image
                    $(this).attr('src', IMAGES_URL + original_image_name + '?TEMP_DATE_' + new Date());
                }
            }
            if ($(this).attr('data-src')) {
                if ($(this).attr('data-src').substr(0, 5) == 'blob:') {
                    console.log('filtered');
                    let original_image_name = $(this).attr('original-image-name');
                    $(this).removeAttr('original-image-name');
                    $(this).attr('data-src', IMAGES_URL + original_image_name + '?TEMP_DATE_' + new Date());
                }
            }
        });
        var replaced = div.innerHTML;
        return replaced;
    }

    this.removeDeleteIds = function() {
        $('#cecard_create').html($('#cecard_create').html().replace(/<span id="delete">/g, ""));
        $('#cecard_create').html($('#cecard_create').html().replace(/<\/span>/g, ""));
        return $('#cecard_create').html();
    };

    // Added for update.
    imageLoaded = function(image) {
        var new_image = document.getElementById('new_image');
        $(new_image).removeAttr('onload id');
        var unique_id = new_image.className.split(' ')[1];
        $(new_image).attr('id', 'image_' + unique_id);
        var nw = document.getElementById('image_' + unique_id).naturalWidth;
        var nh = document.getElementById('image_' + unique_id).naturalHeight;
        var nr = nh / nw;
        var original_image_data = { nat_width: nw, nat_height: nh, nat_ratio: nr };
        $('#cropper_' + unique_id).attr('image-original', JSON.stringify(original_image_data));
        $('#cropper_' + unique_id).css('maxWidth', new_image.naturalWidth);
        $('#cropper_' + unique_id).css('cssFloat', 'left');
        // Check if this image is the first piece of content. If it is then add a class to remove spacing between card and image (only required if text is the directly after the title area).
        var previous_node = $(new_image).parent()[0].previousSibling;
        var card_id = $(new_image).parent().closest('.ce').attr('id');
        var is_topmost = true;
        var end_search = false;
        $('#' + 'image_' + unique_id).parent().parents().each(function(index, item) {
            if (is_topmost && !end_search) {
                if ($(item)[0].className == 'after_image' && is_topmost) {
                    $(item).contents().each(function(index2, item2) {
                        if ($(item2)[0].nodeType != 3) {
                            if ($(item2)[0].className.indexOf('cropper_cont') >= 0) {
                                if ($(item2)[0].id.indexOf(unique_id) >= 0) {
                                    end_search = true;
                                    return false;
                                } else {
                                    is_topmost = false;
                                    return false;
                                }
                            } else if ($(item2)[0].className.indexOf('after_image') >= 0) {
                                if ($(item2)[0].firstChild != null) {
                                    if ($(item2)[0].firstChild.childNodes.length > 0) {
                                        is_topmost = false;
                                        return false;
                                    }
                                }
                            }
                        } else {
                            if ($(item2)[0].nodeValue != "") {
                                is_topmost = false;
                                return false;
                            }
                        }
                    });
                }
                if ($(item)[0].className.indexOf('ce') >= 0 && $(item)[0].className.indexOf('ce') < 3) {
                    $(item).contents().each(function(index3, item3) {
                        if ($(item3)[0].nodeType == 3 && $(item3)[0].length > 0) {
                            is_topmost = false;
                            return false;
                        } else if ($(item3)[0].nodeType == 1) {
                            if ($(item3)[0].id.indexOf(unique_id) >= 0) {
                                end_search = true;
                                return false;
                            } else {
                                is_topmost = false;
                                return false;
                            }
                        }
                    });
                    return false;
                }
            }
        });
        if (is_topmost) {
            // First remove the no_image_space class from all other croper_cont in this card
            $('#' + card_id + ' .no_image_space').removeClass('no_image_space');
            $('#cropper_' + unique_id).addClass('no_image_space');
        }
        // Move the cursor into the after image span
        moveCaretInto('after_image_' + unique_id);
        $rootScope.$broadcast('imagePasted');
    };

    const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        const blob = new Blob(byteArrays, { type: contentType });
        return blob;
    }

    insertImage = function(data) {
        if (data.response === 'saved') {
            let full_file = data.file;
            let file_name = data.file.substring(0, data.file.indexOf('.'));
            var new_image = "<div class='cropper_cont' onclick='editImage(this, \"" + file_name + "\")' id='cropper_" + file_name + "'><img loading='eager' class='resize-drag " + file_name + "' id='new_image' original-image-name='" + full_file + "' onload='imageLoaded(); imagePosted();' src=\"" + IMAGES_URL + full_file + "\"></div><slider></slider><span class='after_image' id='after_image_" + file_name + "'>&#x200b;&#10;</span><span class='clear_after_image'></span><span class='scroll_image_latest' id='delete'>&#x200b</span>";
            self.pasteHtmlAtCaret(new_image);
        }
    };

    insertImageOffline = function(data) {
        if (data.response === 'saved') {
            const contentType = 'image/png';
            const b64Data = data.base64;
            const blob = b64toBlob(b64Data, contentType);
            const blobUrl = URL.createObjectURL(blob);
            fileBlob = new File([blob], data.file);
            self.uploadFileAndroidOffline(fileBlob);
        }
    };

    insertObjUrl = function(data) {
        if (data.response === 'saved') {
            let full_file = data.file;
            let file_name = data.file_name.substring(0, data.file_name.indexOf('.'));
            let original_image = data.original_image;
            var new_image = "<div class='cropper_cont' onclick='editImage(this, \"" + file_name + "\")' id='cropper_" + file_name + "'><img loading='eager' class='resize-drag " + file_name + "' id='new_image' original-image-name='" + original_image + "' onload='imageLoaded(); imagePosted();' src=\"" + full_file + "\"></div><slider></slider><span class='after_image' id='after_image_" + file_name + "'>&#x200b;&#10;</span><span class='clear_after_image'></span><span class='scroll_image_latest' id='delete'>&#x200b</span>";
            self.pasteHtmlAtCaret(new_image);
        }
    };

    self.uploadImages = function(form, image_obj, callback) {
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
            error: function(jqXHR, exception) {
                if (callback) {
                    callback(image_obj);
                } else {
                    insertObjUrl(image_obj);
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
            let image_obj;
            // Offline. Create temporary object url image.
            if (!$rootScope.online) {
                image_obj = createObjUrlImage(self.formData, callback);
            }
            // Image processing of ALL images complete. Upload form
            self.uploadImages(self.formData, image_obj, callback);

        });
    };

    function createObjUrlImage(e) {
        let file = e.get('uploads[]');
        let name = e.get('uploads[]').name;
        var objUrl = window.URL.createObjectURL(file);
        let image_object = {
            file: objUrl,
            file_name: name,
            original_image: file.name,
            response: "saved"
        };
        return image_object;
    }

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
            let image_obj;
            // Offline. Create temporary object url image.
            if (!$rootScope.online) {
                image_obj = createObjUrlImage(self.formData, callback);
            }
            // Image processing of ALL images complete. Upload form
            self.uploadImages(self.formData, image_obj, callback);
        });
    };

    // UPLOAD ==================================================================
    uploadClickListen = function(id) {
        console.log('ucl');
        // make the button active temporarily so that it functions.
        $('#upload-input').addClass('active');
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

    this.uploadFileAndroidOffline = function(file) {
        file_array = [file];
        self.prepareImage(file_array);
    }

    this.uploadFile = function(id, card, currentUser) {
        console.log(id);
        if (ua.indexOf('AndroidApp') >= 0) {
            if (document.activeElement.id != 'cecard_create' && id != undefined && id != 'card_create') {
                // save the card first (Android bug)
                self.saveCard(id, card, currentUser);
            }
            Android.choosePhoto();
        } else {
            // All browsers except MS Edge
            if (ua.toLowerCase().indexOf('edge') == -1) {
                uploadClickListen(id);
            }
            $('#upload-input').on('change', function() {
                $rootScope.$broadcast('imageUpload', id);
                var files = $(this).get(0).files;
                if (files.length > 0) {
                    self.prepareImage(files);
                }
                // reset the input value to null so that files of the same name can be uploaded.
                this.value = null;
                $('#upload-input').removeClass('active');
            });
            // MS Edge only
            if (ua.toLowerCase().indexOf('edge') > -1) {
                $timeout(function() {
                    uploadClickListen(id);
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
            var reg_pre = /(<img)(.*src="data:image.*?>)(.*?)(>)/ig;
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
        var content_upper = content.toUpperCase();
        for (var i = 0; i < marky_char_array.length; i++) {
            if (content_upper.indexOf(marky_char_array[i]) >= 0) {
                marky_found = true;
                break;
            }
        }
        return marky_found;
    };

    checkUpdate = function() {
        console.log('checkUpdate');
        if (ua.indexOf('AndroidApp') >= 0) {
            if (focused_id != undefined) {
                self.getBlurAndroid(focused_id, focused_card, focused_user);
            }
        }
    };

    // Called by Android onPause. Update the card.
    this.getBlurAndroid = function(id, card, currentUser) {
        console.log('getBlurAndroid');
        console.log(id);
        console.log(card);
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

    this.updateCard = function(id, card, currentUser) {
        var deferred = $q.defer();
        var content = $('.content_cnv #ce' + card._id).html();
        if ((content != card.original_content)) {
            card.content = $('.content_cnv #ce' + card._id).html();
            card.original_content = card.content;
            // Inject the Database Service
            var Database = $injector.get('Database');
            // Update the card
            Database.updateCard(id, card, currentUser).then(function() {
                deferred.resolve();
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    };

    this.getBlur = function(id, card, currentUser) {
        // Add slight delay so that document.activeElement works
        setTimeout(function() {
            var content_title = $('.content_cnv #card_' + card._id + ' .title_area #ce_title'  + card._id).html();
            //var content_content = $('.content_cnv .content_area #ce' + card._id).html();
            var content_content = $('.content_cnv #card_' + card._id + ' .content_area #ce' + card._id).html();
           //console.log(content_title);
           //console.log(content_content);
            var content = content_title + content_content;
            //console.log(content);
            // Get the element currently in focus
            var active = $(document.activeElement).closest("div").attr('id');
            // If the blurred card is not the current card or the hidden input.
            if (('ce' + card._id != active && (active != 'hidden_input_container')) && !ImageAdjustment.getImageEditing()) {
                // Card out of focus. Reset the marky_started_array.
                marky_started_array = [];
                // Check if there is a marky in progress
                // zm launching image capture should not trigger an update. It causes error.
                found_marky = findMarky(card.content);
                // check the content has changed and not currently mid marky. Or that an image is being edited.
                if ((content != card.original_content && (found_marky == false)) && !ImageAdjustment.getImageEditing()) {
                    if (!ImageAdjustment.getImageEditing()) {
                        //card.content = $('.content_cnv #ce' + card._id).html();
                        var card_copy = { ...card };
                        //card.content = content;
                        card_copy.content = content;
                    }
                    // Inject the Database Service
                    var Database = $injector.get('Database');
                    // Update the card
                    Database.updateCard(id, card_copy, currentUser);
                }
            }
        }, 100);
    };

    /*
    this.getBlur = function(id, card, currentUser) {
        // Add slight delay so that document.activeElement works
        setTimeout(function() {
            var content = $('.content_cnv #ce' + card._id).html();
            // Get the element currently in focus
            var active = $(document.activeElement).closest("div").attr('id');
            // If the blurred card is not the current card or the hidden input.
            if (('ce' + card._id != active && (active != 'hidden_input_container')) && !ImageAdjustment.getImageEditing()) {
                // Card out of focus. Reset the marky_started_array.
                marky_started_array = [];
                // Check if there is a marky in progress
                // zm launching image capture should not trigger an update. It causes error.
                found_marky = findMarky(card.content);
                // check the content has changed and not currently mid marky. Or that an image is being edited.
                if ((content != card.original_content && (found_marky == false)) && !ImageAdjustment.getImageEditing()) {
                    if (!ImageAdjustment.getImageEditing()) {
                        card.content = $('.content_cnv #ce' + card._id).html();
                    }
                    // Inject the Database Service
                    var Database = $injector.get('Database');
                    // Update the card
                    Database.updateCard(id, card, currentUser);
                }
            }
        }, 100);
    };
    */

    this.getTagCountPrevious = function(content) {
        var tag_count_previous_local;
        if (content !== undefined) {
            var reg = /(&lt;.*?&gt;)(.*?)(&lt;\/.*?&gt;)/ig;
            var content_less_pre = self.removePreTag(content);
            // create original vars
            tag_count_previous_local = (content_less_pre.match(reg) || []).length;
        }
        console.log(tag_count_previous_local);
        return tag_count_previous_local;
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
                var np = setNodePos(node, node.nodeValue.indexOf(word));
                found.f = 'y';
                found.p = np;
            }
        }
        return found;
    }

    function moveCaretAfter(id) {
        console.log('moveCaretAfter');
        self.removeDeleteIds();
        var current_node = $("#" + id).get(0);
        if (current_node != undefined) {
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
        }
        return;
    }

    function moveCaretInto(id) {
        console.log(id);
        console.log($("#" + id));
        $("#" + id).html('&#x200b');
        var current_node = $("#" + id).get(0);
        console.log(current_node);
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
        $('#' + id).addClass('scroll_enter_latest');
        $('#' + id).removeAttr('id');
        // Scroll the pasted HTML into view
        self.scrollLatest('scroll_enter_latest');
        return;
    }

    function moveAfterPre(id) {
        var pre_node = $("#" + id).get(0);
        console.log($("#" + id));
        console.log(pre_node);
        var nested_level = marky_started_array.length - 1;
        console.log(nested_level);
        // If this PRE element is nested within elements
        if (nested_level > 0) {
            // Find the previous_node (formatting elements) which this is currently nested within.
            var previous_node = $("#" + id).get(0);
            console.log(previous_node);
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
                console.log(result);
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
        var item_index = marky_started_array.indexOf(char_watch.toLowerCase());
        marky_started_array.splice(item_index, 1);
        var ns = marky_array.html + ":contains('" + char_watch + "')";
        var node = $($(ns));
        // If the node is found.
        if (node.length > 0) {
            var node_content = $(node).html();
            var before_index = node_content.indexOf(char_watch);
            var node_content_before = node_content.substr(0, before_index);
            var node_content_after = node_content.substr(before_index + Number(marky_array.charstring.length), node_content.length);
            node_content = node_content_before + node_content_after;
            $(node).html(node_content);
            $(node.attr('id', 'marky'));
            $(node.removeClass('in_progress'));
        }
        return marky_started_array;
    }

    // TODO - make General?
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
                if (marky_html != 'pre' && marky_html != 'input') {
                    //if (marky_html != 'input') {
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

    this.markyCheck = function(content, elem) {
        //console.log('markyCheck');
        console.log(content);
        console.log(elem);
        var escape_marky = false;
        // Inject the General Service
        var General = $injector.get('General');
        // Ignore Canvas Images (which may contain chars from markey_array).
        //const copied = Object.assign({}, content)
        var string_copy = (' ' + content).slice(1);
        var content_less_temp = self.removeTempFiltered(string_copy);
        var content_to_match = content_less_temp;
        var mark_list_current;
        var ma_index;
        console.log(marky_array);
        // Create a RegEx to check for all upper and lowercase variations of the markys.
        for (var ma = 0; ma < marky_array.length; ma++) {
            var char_one = marky_array[ma].charstring.substr(0, 1);
            var char_two = marky_array[ma].charstring.substr(1, 1);
            var char_one_other_case = General.swapCase(char_one);
            var char_two_other_case = General.swapCase(char_two);
            var reg2_str = "(" + '[' + char_one + char_one_other_case + ']' + '[' + char_two + char_two_other_case + ']' + ")";
            var result = content_to_match.match(new RegExp(reg2_str, 'igm'));
            console.log(result);
            if (result != null) {
                // Check for escape 
                var marky_index = content_to_match.indexOf(result);
                var marky_preceding = content_to_match.substring(marky_index - 1, marky_index);
                console.log(marky_preceding);
                if (marky_preceding == ESCAPE_KEY) {
                    var currentChars = content_to_match.substring(marky_index - 1, marky_index + 2);
                    var updateChars = "<span id='marky' class='escaped'>" + currentChars.substring(1, 2) + '<WBR>' + currentChars.substring(2, 3) + "</span>";
                    // Replace the Escaped Marky with a the Marky chars separated by a <WBR> tag.
                    // Use timeout to fix bug on Galaxy S6 (Chrome, FF, Canary)
                    $timeout(function() {
                        console.log(elem);
                        console.log(currentChars);
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
                                    moveCaretAfter('marky');
                                }, 0);
                            }
                        );
                } else {
                    mark_list_current = result;
                    ma_index = ma;
                }
                // Found the Marky.
                break;
            }
        }

        if (mark_list_current !== null && mark_list_current !== undefined) {
            //marky open
            var currentChars = mark_list_current[0];
            var char_watch = mark_list_current[0];
            var char_watch_lowercase = char_watch.toLowerCase();
            console.log(marky_array[ma_index].html);
            if (marky_array[ma_index].html !== '') {
                var ma_arg = marky_array[ma_index];
                console.log(marky_started_array);
                console.log(char_watch_lowercase);
                if (!include(marky_started_array, char_watch_lowercase)) {
                    //
                    // Open Marky tag
                    //
                    var close_tag = true;
                    // Check whether this Tag is to be closed as well as opened.
                    if (marky_array[ma_index].close === false) {
                        close_tag = false;
                    }
                    // Only add this Tag to the marky_started_array if it needs to be closed
                    if (close_tag) {
                        marky_started_array.push(JSON.parse(JSON.stringify(mark_list_current[0].toLowerCase())));
                    }
                    var updateChars;
                    if (marky_array[ma_index].span_start != undefined) {
                        //updateChars = currentChars.replace(char_watch, marky_array[ma_index].span_start + "<" + marky_array[ma_index].html + " " + marky_array[ma_index].attribute + " class='scroll_latest' id='marky'>" + marky_array[ma_index].span_end);
                        updateChars = currentChars.replace(char_watch, marky_array[ma_index].span_start + "<" + marky_array[ma_index].html + " " + marky_array[ma_index].attribute + ">" + marky_array[ma_index].span_end);
                    } else {
                        //updateChars = currentChars.replace(char_watch, "<" + marky_array[ma_index].html + " " + marky_array[ma_index].attribute + " class='scroll_latest in_progress' id='marky'>");
                        updateChars = currentChars.replace(char_watch, "<" + marky_array[ma_index].html + " " + marky_array[ma_index].attribute + " class='scroll_latest in_progress' id='marky'>");
                    }
                    if (close_tag) {
                        updateChars += "</" + marky_array[ma_index].html + ">";
                    }
                    replaceTags.removeSpaces(elem);
                    // Use timeout to fix bug on Galaxy S6 (Chrome, FF, Canary)
                    $timeout(function() {
                        console.log(elem);
                        console.log(currentChars);
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
                                    console.log(close_tag);
                                    console.log(ma_arg.html);
                                    if (close_tag) {
                                        if (ma_arg.html == 'pre') {
                                        //if (ma_arg.html == 'pre' || ma_arg.html == 'input') {
                                        //marky_html != 'input'
                                            moveAfterPre('marky');
                                        } else {
                                            moveCaretInto('marky');
                                        }
                                    } else {
                                        if (ma_arg.html == 'input') {
                                            moveCaretInto('marky');
                                        } else {
                                            moveCaretAfter('marky');
                                        }
                                        
                                    }
                                }, 0);
                            }
                        );
                } else {
                    // Check whether to Close Marky tag 
                    // Close it if it has been opened, otherwise this is another Marky being opened
                    if (include(marky_started_array, char_watch_lowercase)) {
                        $timeout(function() {
                                marky_started_array = closeMarky(ma_arg, marky_started_array, char_watch);
                            }, 0)
                            .then(
                                function() {
                                    return $timeout(function() {
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
            } else if (marky_array[ma_index].script !== '' && marky_array[ma_index].script !== undefined) {
                console.log('image get');
                console.log(elem);
                //ce_title5e45c1e472f70e04d8ffad6a
                //ce5e45c1e472f70e04d8ffad6a
                // Not HTML but SCRIPT 
                // TODO Fix so that the actual script which is passed is called     
                if (marky_array[ma_index].script === 'getImage') {
                    var el = elem;
                    var index_el = elem.indexOf('_title');
                    if(index_el >= 0){
                        el = elem.substr(8, el.length);
                        el = 'ce'+el;
                        console.log(el);
                    }
                    $('#upload-trigger' + el).trigger('click');
                }
                // Use timeout to fix bug on Galaxy S6 (Chrome, FF, Canary)
                // Timeout causing bug on Web MS Edge. Removed and changed paste from '' to '&#x200b'
                $timeout(function() {
                        self.selectText(elem, currentChars);
                    }, 0)
                    .then(
                        function() {
                            self.pasteHtmlAtCaret('');
                        }
                    );
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
            self.markyCheck(content, elem);
        } else {
            self.paste_in_progress = false;
        }
    };

    this.selectText = function(element, word) {
        console.log(element);
        var doc = document;
        var current_node;
        console.log(doc.getElementById(element));
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
                if (clas == 'scroll_latest_footer' || clas == 'scroll_image_latest') {
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
            var selection_start = $(self.getSelectionStart());
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
                if (html.indexOf('scroll_image_latest') >= 0) {
                    self.scrollLatest('scroll_image_latest');
                }
            }
        } else if (document.selection && document.selection.type != "Control") {
            // IE < 9
            document.selection.createRange().pasteHTML(html);
            if (html.indexOf('scroll_image_latest') >= 0) {
                self.scrollLatest('scroll_image_latest');
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

    this.getSelectionStart = function() {
        var node = document.getSelection().anchorNode;
        return node;
    };

    this.keyListen = function(elem) {
        var getKeyCode = function() {
            var editableEl = document.getElementById(elem);
            // lowercase
            var a = getCharacterPrecedingCaret(editableEl);
            return a;
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
                    // Removed an in progress node.
                    // Inject the General Service
                    var General = $injector.get('General');
                    // Get the position of this HTML element in the marky_array.
                    var index = General.findWithAttr(marky_array, 'html', m.removedNodes[0].nodeName.toLowerCase());
                    // If this tag exists in the marky_started_array then remove it.
                    var del = marky_started_array.indexOf(marky_array[index].charstring);
                    if (del >= 0) {
                        marky_started_array.splice(del, 1);
                    }
                }
            }
        });

        document.getElementById(elem).onkeyup = function(e) {
            var selection_start = $(self.getSelectionStart());
            // Listen for backspace
            if (e.keyCode == 8) {
                if ($(selection_start).attr("class") != undefined) {
                    var prev_class = $(selection_start).attr("class");
                    var parent = $(selection_start).closest('.ce').attr("id");
                    // If this is a header then delete the header elements and remove from the marky_started_array if it exists.
                    if (prev_class.indexOf('header') >= 0 && parent == 'header') {
                        $(selection_start).parent().remove();
                        var del = marky_started_array.indexOf(INITIAL_KEY + prev_class.substr(7, 1));
                        marky_started_array.splice(del, 1);
                    }
                    // If this is a cropper_cont then delete the header elements and remove from the marky_started_array if it exists.
                    if (prev_class.indexOf('after_image') >= 0) {
                        if (selection_start[0].innerHTML == '<br>') {
                            selection_start[0].innerHTML = '';
                        }
                        if ($(selection_start)[0].previousElementSibling) {
                            var slider = $(selection_start)[0].previousElementSibling;
                            var cropper = $(selection_start)[0].previousElementSibling.previousElementSibling;
                            var clear = $(selection_start)[0].nextElementSibling;
                            if (slider != null) {
                                slider.remove();
                            }
                            if (cropper != null) {
                                cropper.remove();
                            }
                            if (clear != null) {
                                clear.remove();
                            }
                        }
                        if ($('.' + prev_class).prev().prev().attr('class').indexOf('cropper_cont') >= 0) {
                            var currentChars = $('.' + prev_class).prev().prev().parent().html();
                            var elem = $('.' + prev_class).closest('.ce');
                        }
                    }
                }
            }
            var selection_text = selection_start[0].nodeValue;
            if (selection_text != undefined) {
                var selection_text_upper = selection_text.toUpperCase();
                var init_key = selection_text_upper.indexOf(INITIAL_KEY.toUpperCase());
                if (init_key >= 0) {
                    var last_chars = selection_text_upper.substring(init_key, init_key + 2);
                    if (marky_char_array.indexOf(last_chars) >= 0) {
                        stopEditing(this.id);
                    }
                }
            }
        };
    };

    function stopEditing(elem) {
        // Move focus to the hidden input field so that editing is stopped.
        // The hidden input is fixed to the bottom offscreen so that scrolling does not occur on mobile
        $('#hidden_input').focus();
    }

    this.checkCursor = function($event, elem) {
        // Store current caret pos
        $timeout(function() {
            savedSelection = self.saveSelection(document.getElementById(elem));
        });
    };

    this.checkKey = function($event, elem) {
        if ($event.keyCode == 13) {
            // Stop the default behavior for the ENTER key and insert <br><br> instead
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