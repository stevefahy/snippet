//
// ImageAdjustment Service
//

//cardApp.service('ImageAdjustment', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal) {
cardApp.service('ImageAdjustment', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'General', 'UserData', 'principal', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, General, UserData, principal) {
    var self = this;
    var image_id;
    var source;
    var target;
    var image_parent;
    var image_adjusted;

    this.setImageAdjustment = function(parent_container, id, name, value) {
        var ia = this.getImageAdjustments(parent_container, id);
        if (ia == undefined) {
            ia = {};
        }
        ia[name] = value;
        // Custom attribute for storing image adjustments.
        $('.' + parent_container + ' #image_' + id).attr('adjustment-data', JSON.stringify(ia));
    };

    this.getImageAdjustments = function(parent_container, id) {
        var adjustment_data;
        // Custom attribute for storing image adjustments.
        var ia = $('.' + parent_container + ' #image_' + id).attr('adjustment-data');
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

    /*
    this.createTemp = function(id) {
        var source = $('temp_canvas_filtered_' + id).clone().appendTo('#cropper_' + id);
        $(source).removeAttr('id');
        $(source).attr('id', 'source');
        return source;
    };
    */
    /*
    this.returnCrop = function(source, crop) {
        var deferred = $q.defer();
        var cropped_canvas = document.createElement("canvas");
        var sx = crop.x;
        var sy = crop.y;
        var swidth = crop.width;
        var sheight = crop.height;
        cropped_canvas.width = swidth;
        cropped_canvas.height = sheight;
        var ctx = cropped_canvas.getContext('2d');
        ctx.drawImage(source, sx, sy, swidth, sheight, 0, 0, swidth, sheight);
        deferred.resolve(cropped_canvas);
        return deferred.promise;
    };
    */

    this.applyCrop = function(target, crop) {
        var deferred = $q.defer();
        if (crop != undefined) {
            var cropped_canvas = document.createElement("canvas");
            var sx = crop.x;
            var sy = crop.y;
            var swidth = crop.width;
            var sheight = crop.height;
            cropped_canvas.width = swidth;
            cropped_canvas.height = sheight;
            var ctx = cropped_canvas.getContext('2d');
            ctx.drawImage(target, sx, sy, swidth, sheight, 0, 0, swidth, sheight);
            target.width = swidth;
            target.height = sheight;
            var ctx2 = target.getContext('2d');
            ctx2.drawImage(cropped_canvas, 0, 0);
            deferred.resolve();
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    };

    this.applyFilters = function(source, filters) {
        var deferred = $q.defer();
        console.log(filters);
        if(filters == undefined){
            filters = {sharpen:undefined, filter:undefined, crop: undefined};
        }
        // Sharpen from source first
        // Crop last.
        self.filter(source, filters.filter)
            .then(function(result) {
                console.log(result);
                return self.sharpen(result, filters.sharpen)
            }).then(function(result) {
                console.log(result);
                return self.mycrop(result, filters.crop);
            }).then(function(result) {
                console.log(result);
                deferred.resolve(result);
            });
        return deferred.promise;

    };

    this.sharpen = function(source, amount) {
        console.log('sharpen');
        var deferred = $q.defer();
        var new_canvas = document.createElement("canvas");
        new_canvas.width = source.width;
        new_canvas.height = source.height;
        var ctx = new_canvas.getContext('2d');
        ctx.drawImage(source, 0, 0);
        if (amount != undefined) {
            var sharpen = amount;
            var adjacent = (1 - sharpen) / 4;
            var matrix = [0, adjacent, 0, adjacent, sharpen, adjacent, 0, adjacent, 0];
            var res = self.filterImage(self.convolute, source, matrix);
            //var ctx = target.getContext('2d');
            ctx.putImageData(res, 0, 0);
            deferred.resolve(new_canvas);
        } else {
            deferred.resolve(new_canvas);
        }
        return deferred.promise;
    };


    this.setSharpenUpdate = function(source, target, filters) {
        console.log('sharpenUpdate');
        var deferred = $q.defer();
        this.applyFilters(source, filters).then(function(result) {
            target.width = result.width;
            target.height = result.height;
            var ctx = target.getContext('2d');
            ctx.drawImage(result, 0, 0);
            $(target).addClass('adjusted');
            deferred.resolve(result);
        });
        this.setImageAdjusted(true);
        return deferred.promise;
    };

    this.getImageAdjusted = function(){
        return image_adjusted;
    };

    this.setImageAdjusted = function(boo){
        image_adjusted = boo;
    };
    
    /*
    this.setSharpen = function(parent_container, id, target, source, amount) {
        var deferred = $q.defer();
        if (amount != undefined) {
            var sharpen = amount;
            var adjacent = (1 - sharpen) / 4;
            var matrix = [0, adjacent, 0, adjacent, sharpen, adjacent, 0, adjacent, 0];
            var res = self.filterImage(self.convolute, source, matrix);
            var ctx = target.getContext('2d');
            ctx.putImageData(res, 0, 0);
            $('.' + parent_container + ' #cropper_' + id + ' .target_canvas').addClass('adjusted');
            this.setImageAdjustment(parent_container, id, 'sharpen', amount);
            this.setImageAdjusted(true);
            deferred.resolve();
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    };
    */
    

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

    function applyBlendingNew(bottomImage, topImage, id, type, w, h) {
        var deferred = $q.defer();
        // create the canvas
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        // Multiply
        if (type == 'multiply') {
            ctx.globalCompositeOperation = 'multiply';
            ctx.drawImage(bottomImage, 0, 0, w, h);
            ctx.drawImage(topImage, 0, 0, w, h);
        }
        // Overlay
        if (type == 'overlay') {
            ctx.globalCompositeOperation = 'overlay';
            ctx.drawImage(topImage, 0, 0, w, h);
            ctx.drawImage(bottomImage, 0, 0, w, h);
        }
        // Lighten
        if (type == 'lighten') {
            ctx.globalCompositeOperation = 'lighten';
            ctx.drawImage(bottomImage, 0, 0, w, h);
            ctx.drawImage(topImage, 0, 0, w, h);
        }
        // Darken
        if (type == 'darken') {
            ctx.globalCompositeOperation = 'darken';
            ctx.drawImage(bottomImage, 0, 0, w, h);
            ctx.drawImage(topImage, 0, 0, w, h);
        }
        // Screen
        if (type == 'screen') {
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(bottomImage, 0, 0, w, h);
            ctx.drawImage(topImage, 0, 0, w, h);
        }
        // Screen
        if (type == 'soft-light') {
            ctx.globalCompositeOperation = 'soft-light';
            ctx.drawImage(topImage, 0, 0, w, h);
            ctx.drawImage(bottomImage, 0, 0, w, h);
        }
        deferred.resolve(canvas);
        return deferred.promise;
    }

    this.filterLayers = function(canvas, filter) {
        console.log('filterLayers');
        var deferred = $q.defer();
        console.log(canvas);
        //var dataimage = $(canvas).attr('data-image');
        //dataimage = JSON.parse(dataimage);
        //var w = dataimage.width;
        //var h = dataimage.height;
        var w = canvas.width;
        var h = canvas.height;
        console.log(w + ' : ' + h);

        var targetCtx = canvas.getContext('2d');

        var filter_data = getFilter(filter);
        // Convert image to canvas
        var topImage = canvas;
        var topCanvas = document.createElement("canvas");
        topCanvas.width = w;
        topCanvas.height = h;
        var topCtx = topCanvas.getContext('2d');
        //topCtx.drawImage(topImage, 0, 0, w, h);
        topCtx.drawImage(topImage, 0, 0);
        // If there is a blend to be applied.
        if (filter_data.blend != 'none') {
            var grd;
            var canvas_gradient = document.createElement('canvas');
            canvas_gradient.width = w;
            canvas_gradient.height = h;
            var ctx_gradient = canvas_gradient.getContext('2d');
            // Gradients
            if (filter_data.gradient == 'radial') {
                // radial gradient, gradient_percent
                if (filter_data.gradient_percent != undefined) {
                    var penultimate_percent = filter_data.gradient_percent[filter_data.gradient_percent.length - 2];
                    var final_radius = w * (penultimate_percent / 100);
                    grd = ctx_gradient.createRadialGradient((w / 2), (h / 2), 0, (w / 2), (h / 2), final_radius);
                } else {
                    grd = ctx_gradient.createRadialGradient((w / 2), (h / 2), (w / 100), (w / 2), (h / 2), w);
                }
                for (var i = 0; i < filter_data.gradient_stops.length; i++) {
                    grd.addColorStop(filter_data.gradient_stops[i][0], "rgba(" + filter_data.gradient_stops[i][1] + "," + filter_data.gradient_stops[i][2] + "," + filter_data.gradient_stops[i][3] + "," + filter_data.gradient_stops[i][4] + ")");
                }
                // Fill with gradient
                ctx_gradient.fillStyle = grd;
                ctx_gradient.fillRect(0, 0, w, h);
            }
            if (filter_data.gradient == 'solid') {
                // Fill with colour
                ctx_gradient.fillStyle = "rgba(" + filter_data.gradient_stops[0][0] + "," + filter_data.gradient_stops[0][1] + "," + filter_data.gradient_stops[0][2] + "," + filter_data.gradient_stops[0][3] + ")";
                ctx_gradient.fillRect(0, 0, w, h);
            }
            if (filter_data.gradient == 'linear') {
                // radial gradient
                grd = ctx_gradient.createLinearGradient(0, 0, 0, w);
                for (var i = 0; i < filter_data.gradient_stops.length; i++) {
                    grd.addColorStop(filter_data.gradient_stops[i][0], "rgba(" + filter_data.gradient_stops[i][1] + "," + filter_data.gradient_stops[i][2] + "," + filter_data.gradient_stops[i][3] + "," + filter_data.gradient_stops[i][4] + ")");
                }
                // Fill with gradient
                ctx_gradient.fillStyle = grd;
                ctx_gradient.fillRect(0, 0, w, h);
            }
            bottomImage = canvas_gradient;
            var bottomCanvas = document.createElement("canvas");
            bottomCanvas.width = w;
            bottomCanvas.height = h;
            // get the 2d context to draw
            var bottomCtx = bottomCanvas.getContext('2d');
            bottomCtx.drawImage(bottomImage, 0, 0, w, h);
            var id = 'steve';
            applyBlendingNew(bottomImage, topImage, id, filter_data.blend, w, h).then(function(result) {
                targetCtx.drawImage(result, 0, 0, w, h);
                console.log('filterLayers done 2');
                deferred.resolve(result);
            });
        } else {
            console.log('filterLayers done 1');
            targetCtx.drawImage(topCanvas, 0, 0, w, h);
            deferred.resolve(topCanvas);
        }
        return deferred.promise;
    };

    this.filter = function(source, filter) {
        var deferred = $q.defer();
        var promises = [];
        var new_canvas = document.createElement("canvas");
        new_canvas.width = source.width;
        new_canvas.height = source.height;
        var ctx = new_canvas.getContext('2d');
        // reset filter
        ctx.filter = "none";
        ctx.drawImage(source, 0, 0);
        if (filter != undefined) {
            prom1 = self.filterLayers(new_canvas, filter).then(function(canvas) {
                var filter_data = getFilter(filter);
                if (filter_data.filter != undefined) {
                    ctx.filter = filter_data.filter;
                }
                ctx.drawImage(canvas, 0, 0);
            });
            promises.push(prom1);
        } else {
            deferred.resolve(new_canvas);
        }
        $q.all(promises).then(function() {
            deferred.resolve(new_canvas);
        });
        return deferred.promise;
    };

    this.composeFilter = function(target, filter) {
        console.log('composeFilter');
        var deferred = $q.defer();
        var promises = [];
        if (filter != undefined) {
            //var selfy = self;
            prom1 = self.filterLayers(target, filter).then(function(canvas) {
                console.log(canvas);
                var dataimage = $(target).attr('data-image');
                dataimage = JSON.parse(dataimage);
                var w = dataimage.width;
                var h = dataimage.height;
                console.log(w + ' : ' + h);

                var ctx = target.getContext('2d');
                var filter_data = getFilter(filter);
                if (filter_data.filter != undefined) {
                    ctx.filter = filter_data.filter;
                }
                ctx.drawImage(target, 0, 0);
            });
            promises.push(prom1);
        } else {
            console.log('composefilter undefined fin');
            deferred.resolve();
        }
        $q.all(promises).then(function() {
            console.log('composefilter all promise');
            deferred.resolve();
            //return selfy;
        });
        return deferred.promise;
        //return self;
    };

    this.cloneCanvas = function(oldCanvas) {
        //create a new canvas
        var newCanvas = document.createElement('canvas');
        var context = newCanvas.getContext('2d');
        //set dimensions
        newCanvas.width = oldCanvas.width;
        newCanvas.height = oldCanvas.height;
        //apply the old canvas to the new one
        context.drawImage(oldCanvas, 0, 0);
        //return the new canvas
        return newCanvas;
    };

    //
    this.crop = function(parent_container, id, target, source, crop) {
        var deferred = $q.defer();
        if (crop != undefined) {
            console.log('ai crop');
            console.log(source);

            var source = self.cloneCanvas(target);
            console.log(source);
            nat_w = source.width;
            //nat_h = orig_image.naturalHeight;
            console.log(nat_w);
            //var crop_image = document.getElementById('crop_src');
            //cur_w = $(crop_image).outerWidth();
            console.log(target);
            cur_w = target.width;
            console.log(cur_w);
            var scale = nat_w / cur_w;
            console.log(scale);

            console.log(crop);
            var sx = crop.x;
            var sy = crop.y;
            var swidth = crop.width;
            var sheight = crop.height;

            var source_canvas = source;
            var cropped_canvas = target;

            target.width = swidth;
            target.height = sheight;
            var ctx = target.getContext('2d');
            ctx.drawImage(source, sx, sy, swidth, sheight, 0, 0, swidth, sheight);
            // ctx.drawImage(source, 0, 0);
            // img, sx, sy, swidth, sheight, x, y, width, height
            self.setImageAdjustment(parent_container, id, 'crop', crop);

            var data = { width: swidth, height: sheight };
            $(target).attr('data-image', JSON.stringify(data));
            console.log('crop fin');
            deferred.resolve();
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    };

    this.mycrop = function(source, crop) {
        var deferred = $q.defer();
        var new_canvas = document.createElement("canvas");
        new_canvas.width = source.width;
        new_canvas.height = source.height;
        var ctx = new_canvas.getContext('2d');
        ctx.drawImage(source, 0, 0);
        if (crop != undefined) {
            var sx = crop.x;
            var sy = crop.y;
            var swidth = crop.width;
            var sheight = crop.height;
            new_canvas.width = swidth;
            new_canvas.height = sheight;
            ctx.drawImage(source, sx, sy, swidth, sheight, 0, 0, swidth, sheight);
            deferred.resolve(new_canvas);
        } else {
            deferred.resolve(new_canvas);
        }
        return deferred.promise;
    };
}]);