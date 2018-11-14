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
        var regex_6 = regex_5.replace(/(<h([1-7])>(.*?)<\/h[1-7]>)/gi, "$2");
        var regex_7 = regex_6.replace(/(<span class=\"after_image\">)/gim, "");
        var regex_8 = regex_7.replace(/(<span class=\"clear_after_image\">)/gim, "");
        var regex_9 = regex_8.replace(/<b>/gi, "");
        var regex_10 = regex_9.replace(/<\/b>/gi, "");
        var regex_11 = regex_10.replace(/<i>/gi, "");
        var regex_12 = regex_11.replace(/<\/i>/gi, "");

        temp_content = regex_12;

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