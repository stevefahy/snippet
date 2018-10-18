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