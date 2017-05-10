var cardApp = angular.module("cardApp", ['ngSanitize']);

cardApp.service('Format', ['$window', '$rootScope', function($window, $rootScope) {

    var self = this;
    var tag_count_previous;
    var paste_in_progress = false;

    this.removePreTag = function(content) {
        var content_less_pre;
        if (content !== undefined) {
            var reg_pre = /(<pre>)(.*?)(<\/pre>)/ig;
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
    this.markdown = function(content,elem){
    	var reg_mark = /(\*\*.*?)/ig;
    	md = content.match(reg_mark);
    	for(var i in md){
    		md = md.replace('**', '<b>');
    	}

    };
    */
    this.contentChanged = function(content, elem) {
        var open_count = 0;
        var close_count = 0;
        if (!self.paste_in_progress) {
            selection = window.getSelection();
            var anchor_node = selection.anchorNode.parentNode.tagName;
            if (anchor_node != 'PRE') {
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
                        self.selectText(elem, updatedChars);
                        self.pasteHtmlAtCaret(updatedChars + '&nbsp;');
                    }
                }
            }
        } else {
            self.paste_in_progress = false;
        }
    };

    this.getTextNode = function(node, str) {
        var node_pos = {};
        var children = node.childNodes;
        for (var i in children) {
            if (children[i].nodeType == 3) {
                if (children[i].nodeValue.indexOf(str) !== -1) {
                    node_pos.node = i;
                    node_pos.offset = children[i].nodeValue.indexOf(str);
                    return node_pos;
                }
            }
        }
    };

    this.selectText = function(element, word) {
        var doc = document;
        var node_pos = self.getTextNode(doc.getElementById(element), word);
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
            var current_node = el.childNodes[node_pos.node];
            var current_text = current_node.nodeValue;
            var word_index = current_text.indexOf(word);
            if (word_index >= 0) {
                range.setStart(el.childNodes[node_pos.node], node_pos.offset);
                range.setEnd(el.childNodes[node_pos.node], node_pos.offset + word.length);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
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

    };

    this.checkKey = function($event, elem) {
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
