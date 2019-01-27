//
// ImageAdjustment Service
//

cardApp.service('ImageAdjustment', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal) {

    var self = this;
    var image_id;
    var source;
    var target;
    var image_parent;


    this.setImageAdjustment = function(parent_container, id, name, value) {
        var ia = this.getImageAdjustments(parent_container, id);
        if (ia == undefined) {
            ia = {};
        }
        ia[name] = value;
        //console.log($('.'+ parent_container + ' #image_' + id));
        //console.log($('.' + parent_container + ' #cropper_' + id + ' #image_' + id));
        // Custom attribute for storing image adjustments.
        $('.'+ parent_container + ' #image_' + id).attr('adjustment-data', JSON.stringify(ia));
        //$('.'+ parent_container + ' .cropper_' + id + ' #image_' + id).attr('adjustment-data', JSON.stringify(ia));
    };

    this.getImageAdjustments = function(parent_container, id) {
        var adjustment_data;
        // Custom attribute for storing image adjustments.
        //div#cropper_1548618126080_abstract_3d_4-wallpaper-1920x1080 > img#image_1548618126080_abstract_3d_4-wallpaper-1920x1080
        //.content_cnv #cropper_1548618126080_abstract_3d_4-wallpaper-1920x1080 #image_1548618126080_abstract_3d_4-wallpaper-1920x1080 
        //console.log($('.' + parent_container + ' .cropper_cont#image_' + id));
        //console.log($('.' + parent_container + ' #cropper_' + id + ' #image_' + id));
        var ia = $('.' + parent_container + ' #image_' + id).attr('adjustment-data');
        //var ia = $('.' + parent_container + '.cropper_' + id + ' #image_' + id).attr('adjustment-data');
        if (ia != undefined) {
            adjustment_data = JSON.parse(ia);
        }
        return adjustment_data;
    };
    




    this.setImageParent = function(id) {
        image_parent = id;
    };

    this.getImageParent = function() {
        return image_parent;
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

    this.setSharpen = function(parent_container, id, target, source, amount) {
        target.width = source.width;
        target.height = source.height;
        var sharpen = amount;
        var adjacent = (1 - sharpen) / 4;
        var matrix = [0, adjacent, 0, adjacent, sharpen, adjacent, 0, adjacent, 0];
        var res = self.filterImage(self.convolute, source, matrix);
        var ctx = target.getContext('2d');
        ctx.putImageData(res, 0, 0);
        this.setImageAdjustment(parent_container, id, 'sharpen', amount);
    };
}]);