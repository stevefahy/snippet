var cardApp = angular.module("cardApp", ['ngSanitize']);

cardApp.service('Format', ['$window', '$rootScope', '$timeout', '$q',  function($window, $rootScope, $timeout, $q) {

    var self = this;
    var tag_count_previous;
    var paste_in_progress = false;
    var marky_started_array = [];
    var initial_key = 'z';
    var secondkey_array = [];
    var within_pre = false;
    var start_key = false;
    var ua = navigator.userAgent;

    $window.androidToJS = this.androidToJS;
    $window.setFilePath = this.setFilePath;
    $window.setFileUri = this.setFileUri;
    $window.setFile = this.setFile;

    if(location.hostname === 'localhost'){
        serverUrl = 'http://localhost:8060/upload';
    } else {
        serverUrl = 'http://www.snipbee.com/upload';
    }

    androidToJS = function(arg) {
        //Android.showToast('one ' + arg);
    };

    setFilePath = function(file) {
        Android.showToast('setFilePath: ' + file);
        self.uploadFileAndroid(file);
        //self.pasteHtmlAtCaret("<img src ='file:/" + file + "'/>");
        //self.uploadFileAndroid(file);
        //self.pasteHtmlAtCaret("<img src ='file:/" + file + "' width='40' height='40'>");
        //self.pasteHtmlAtCaret("<img src ='" + file + "' width='40' height='40'>");
        //self.pasteHtmlAtCaret("<img src ='//media/external/images/media/3644/20170815_090018.jpg' width='40' height='40'>");
        //self.pasteHtmlAtCaret("<img src ='/media/external/images/media/3644/20170815_090018.jpg' width='40' height='40'>");
        //self.pasteHtmlAtCaret("<img src ='content://media/external/images/media/3644/20170815_090018.jpg' width='40' height='40'>");
        //self.pasteHtmlAtCaret("<img src ='https://www.google.ie/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png' width='40' height='40'>");
    };

    setFileUri = function(uri) {
        //Android.showToast('setFileUri: ' + uri);
        //self.uploadFileAndroid(uri);
    };

    setFile = function(image) {
        //Android.showToast(image);
        // TODO Pass this file reference to the file upload function
        // TODO embed uploaded image
        //self.pasteHtmlAtCaret("<img src ='" + image + "' width='40' height='40'>");
    };

    //var ua = navigator.userAgent;

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
        attribute: 'type="checkbox" onclick="checkBoxChanged(this)"',
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
    /*
    this.choosePhoto = function() {
        
        console.log('choosePhoto');
        if (ua === 'AndroidApp') {
            Android.choosePhoto();
            //Android.showToast(file);
        }
        //window.alert("file = " + file);
    };
    */
    /*
    function androidToJS(arg){
        $('#test').html('androidToJS 0');
        Android.showToast('one ' + arg);
    };

    androidToJS = function (arg){
        $('#test').html('androidToJS 1');
        Android.showToast('one ' + arg);
    };

    this.androidToJS = function (arg){
         $('#test').html('androidToJS 2');
        Android.showToast('two: ' + arg);
    };
    */
    // UPLOAD ==================================================================
    this.uploadFile = function() {
        console.log('upload pressed: ' + ua);
        if (ua === 'AndroidApp') {
            Android.choosePhoto();
            //Android.showToast(file);
        }
        $('#upload-input').click();
        $('.progress-bar').text('0%');
        $('.progress-bar').width('0%');

        $('#upload-input').on('change', function() {

            var files = $(this).get(0).files;
            if (files.length > 0) {
                // create a FormData object which will be sent as the data payload in the
                // AJAX request
                var formData = new FormData();
                // loop through all the selected files and add them to the formData object
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    // add the files to formData object for the data payload
                    formData.append('uploads[]', file, file.name);
                    //self.pasteHtmlAtCaret("<img src ='" + file + "'/>");
                }

                $.ajax({
                    //url: '/upload',
                    //url: 'http://www.snipbee.com/upload',
                    url: serverUrl,
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function(data) {
                        console.log('upload successful!\n' + data);
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
            }
        });
    };

    this.uploadFileAndroid = function(file) {
        Android.showToast('file: ' + file);
        //Android.showToast('uploadFileAndroid: ' + file.length);
        console.log('uploadFileAndroid');
        //var files = $(this).get(0).files;
        //if (files.length > 0) {
            // create a FormData object which will be sent as the data payload in the
            // AJAX request
            var formData = new FormData();
            // loop through all the selected files and add them to the formData object
            //for (var i = 0; i < files.length; i++) {
                //var file = files[i];
                // add the files to formData object for the data payload
                formData.append('uploads[]', file, file.name);
            //}
            $.ajax({
                url: '/upload',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(data) {
                    console.log('upload successful!\n' + data);
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
        //}
    };

    this.showAndroidToast = function(toast) {
        console.log('show toast js');
        if (ua === 'AndroidApp') {
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

    this.getFocus = function(content) {
        self.tag_count_previous = self.getTagCountPrevious(content);
        return self.tag_count_previous;
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
        $('#' + id).removeAttr('id');
        return;
    }

    function moveCaretInto(id) {
        $("#" + id).html('&#x200b');
        var current_node = $("#" + id).get(0);
        range = document.createRange();
        range.setStart(current_node.firstChild, 1);
        range.setEnd(current_node.firstChild, 1);
        range.collapse(true);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        $('#' + id).removeAttr('id');
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
    // Check if an Array of Objects includes a value
    function arrayObjectIndexOf(myArray, searchTerm, property) {
        for (var i = 0, len = myArray.length; i < len; i++) {
            if (myArray[i][property] === searchTerm) return i;
        }
        return -1;
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

    function unclosedMarky(marky_started_array, marky_array) {
        // if still within an an unclosed Marky then continue with that unclosed Marky
        var complete_tag;
        var loop_count = 0;
        for (var z = 0; z < marky_started_array.length; z++) {
            var marky_html_index = arrayObjectIndexOf(marky_array, marky_started_array[z], 'charstring');
            if (marky_html_index !== -1) {
                var marky_html = marky_array[marky_html_index].html;
                if (marky_html != 'pre') {
                    var new_tag = '<' + marky_html + '>&#x200b</' + marky_html + '>';
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
                        var updateChars = currentChars.replace(char_watch, "<" + marky_array[ma].html + " " + marky_array[ma].attribute + " id='marky'>");

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
                    console.log(marky_array[ma].script);
                    //this.uploadFileAndroid('file');
                    $('#upload-trigger').trigger('click');
                    // Use timeout to fix bug on Galaxy S6 (Chrome, FF, Canary)
                    $timeout(function() {
                            self.selectText(elem, currentChars);
                        }, 0)
                        .then(
                            function() {
                                return $timeout(function() {
                                    self.pasteHtmlAtCaret('');
                                }, 0);
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

    this.pasteHtmlAtCaret = function(html) {
        var sel, range;
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
                    range.setStartAfter(lastNode);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }

            }
        } else if (document.selection && document.selection.type != "Control") {
            // IE < 9
            document.selection.createRange().pasteHTML(html);
        }
        return;
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
        // Move the hidden input filed so that scrolling does not occur on mobile
        $("#hidden_input").css({ top: $(window).scrollTop() });
        $('#hidden_input').focus();
    }

    this.checkKey = function($event, elem) {
        // Stop the default behavior for the ENTER key and insert <br><br> instead
        if ($event.keyCode == 13) {
            $event.preventDefault();
            self.pasteHtmlAtCaret("<br><span id='focus'></span>");
            moveCaretInto('focus');
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

});



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
            element.bind("blur keyup change", function() {
                scope.$apply(read);
            });
        }
    };
});