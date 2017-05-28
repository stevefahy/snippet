var cardApp = angular.module("cardApp", ['ngSanitize']);

cardApp.service('Format', ['$window', '$rootScope', '$timeout', '$q', function($window, $rootScope, $timeout, $q) {

    var self = this;
    var tag_count_previous;
    var paste_in_progress = false;
    var marky_started_array = [];
    var prevent_key = false;

    var initial_key = '90';
    // Array to dynamically set marky chars to html tags
    var marky_array = [{
        chars: 'b',
        charnum: 2,
        charstring: 'zb',
        html: 'b'

    }, {
        chars: 'i',
        charnum: 2,
        charstring: 'zi',
        html: 'i'

    }, {
        chars: 'p',
        charnum: 2,
        charstring: 'zp',
        html: 'pre'

    }];

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
                if (node.parentNode.tagName != 'PRE') {
                    // Not within a PRE tag
                    var np = setNodePos(node, node.nodeValue.indexOf(word));
                    found.f = 'y';
                    found.p = np;
                }
            }
        }
        return found;
    }

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

    function evluateChar(marky_array, ma) {
        //var char_watch = '';
        //for (var cw = 0; cw < marky_array[ma].charnum; cw++) {
        var char_watch = marky_array[ma].charstring;
        //}
        return char_watch;
    }
    /*
    function evluateChar(marky_array, ma) {
        var char_watch = '';
        for (var cw = 0; cw < marky_array[ma].charnum; cw++) {
            char_watch += marky_array[ma].chars;
        }
        return char_watch;
    }
    */
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
        var node_content_after = node_content.substr(before_index + Number(marky_array.charnum), node_content.length);
        node_content = node_content_before + node_content_after;
        $(node).html(node_content);
        $(node.attr('id', 'marky'));
        return marky_started_array;
    }

    function unclosedMarky(marky_started_array, marky_array) {
        // if still within an an unclosed Marky then continue with that unclosed Marky
        if (marky_started_array.length > 0) {
            // Change to for loop
            var marky_html_index = arrayObjectIndexOf(marky_array, marky_started_array[0], 'charstring');
            if (marky_html_index !== -1) {
                var marky_html = marky_array[marky_html_index].html;
                var new_tag = '<' + marky_html + '>&#x200b</' + marky_html + '>';
                self.pasteHtmlAtCaret(new_tag);
            }

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
            if (!include(marky_started_array, 'pp')) {
                marky_started_array.push('pp');
            }
            content_to_match = content;
        }

        var ignore_non_pre = false;
        for (var ma = 0; ma < marky_array.length; ma++) {
            if (pre) {
                if (marky_array[ma].html !== 'pre') {
                    ignore_non_pre = true;
                } else {
                    ignore_non_pre = false;
                }
            }
            var mark_count_new;
            var mark_list_current;
            if (!ignore_non_pre) {
                //var reg2_str = "(" + marky_array[ma].chars + '{' + marky_array[ma].charnum + '})';
                var reg2_str = "(" + marky_array[ma].charstring + ")";
                mark_count_new = (content_to_match.match(new RegExp(reg2_str, 'igm')) || []).length;
                mark_list_current = content_to_match.match(new RegExp(reg2_str, 'igm'));
            }
            if (mark_list_current !== null && mark_list_current !== undefined) {
                //marky open
                var currentChars = mark_list_current[0];
                var char_watch = evluateChar(marky_array, ma);
                if (!include(marky_started_array, char_watch)) {
                    // Open Marky tag
                    marky_started_array.push(JSON.parse(JSON.stringify(mark_list_current[0])));
                    var updateChars = currentChars.replace(char_watch, "<" + marky_array[ma].html + " id='marky'></" + marky_array[ma].html + ">");

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
                                    moveCaretInto('marky');
                                }, 0);
                            }
                        )
                        .then(
                            function() {
                                return $timeout(function() {
                                    prevent_key = false;
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
                            )
                            .then(
                            function() {
                                return $timeout(function() {
                                    prevent_key = false;
                                }, 0);
                            }
                        );
                    }
                }
            }
        }
    };

    this.contentChanged = function(content, elem) {
        var open_count = 0;
        var close_count = 0;
        if (!self.paste_in_progress) {
            selection = window.getSelection();
            var anchor_node = selection.anchorNode.parentNode.tagName;
            if (anchor_node != 'PRE') {
                // HTML
                var reg = /(&lt;.*?&gt;)(.*?)(&lt;\/.*?&gt;)/ig;
                var tag_count_new;
                var tag_list_current;
                content_less_pre = self.removePreTag(content);
                tag_count_new = (content_less_pre.match(reg) || []).length;
                tag_list_current = content_less_pre.match(reg);

                if (tag_list_current !== null) {
                    for (var k in tag_list_current) {
                        open_count += (tag_list_current[k].match(/(&lt;([^\/])&gt;)/g) || []).length;
                        close_count += (tag_list_current[k].match(/(&lt;\/.\W?&gt;)/g) || []).length;
                    }
                }
                if (tag_count_new > self.tag_count_previous && open_count == close_count) {
                    for (var i in tag_list_current) {
                        var updatedChars = tag_list_current[i];
                        updatedChars = updatedChars.replace(/&lt;/g, "<")
                            .replace(/&gt;/g, ">");
                        var open_index = updatedChars.indexOf('>');
                        var updatedChars2 = updatedChars.substr(0, open_index) + " id='marky'" + updatedChars.substr(open_index, updatedChars.length);
                        self.selectText(elem, updatedChars);
                        self.pasteHtmlAtCaret(updatedChars2);
                        moveCaretAfter('marky');
                    }
                }
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
    var start_key = false;
    this.checkKey = function($event, elem) {
        if(prevent_key){
            $event.preventDefault();
        }
        // x
        if($event.keyCode == initial_key){
            start_key = true;
        }
        // b, i, p
        if(start_key){
            if($event.keyCode == '66' || $event.keyCode == '73' || $event.keyCode == '80'){
                prevent_key = true;
                start_key = false;
            }
        }
        if ($event.keyCode == 13) {
            $event.preventDefault();
            self.pasteHtmlAtCaret('<br><br>');
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
