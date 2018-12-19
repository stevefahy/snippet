//
// Cropper Service
//

cardApp.service('Cropp', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', 'ImageAdjustment', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal, ImageAdjustment) {

    var self = this;
    var cropper;
    var image;
    var crop_in_progress;
    var reduce_height = false;
    var decrease_percent = 0;

    var JPEG_COMPRESSION = 0.8;

    $rootScope.crop_on = false;

    if (cropper != undefined) {
        cropper.destroy();
    }

    this.destroyCrop = function() {
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
        if (cropper != undefined) {
            cropper.destroy();
        }
    };

    resetContainer = function(id) {
        // Work out the available height.
        var avail_height = $(window).height() - ($('.header').height() + $('.create_container').height() + $('.footer').height());
        if (avail_height < $('.' + id).height()) {
            // work out the proportionate width needed to fit the height
            decrease_percent = (avail_height / $('.' + id).height());
            var decreased_width = ($('.' + id).width() * decrease_percent);
            // Set the height of the container
            var wrapper = document.getElementById('cropper_' + id);
            wrapper.style.width = decreased_width + 'px';
            reduce_height = true;
            var cont_data = { 'height': 0, 'width': decreased_width };
            // Custom attribute for storing image reduction data.
            $("." + id).attr('reduce-data', JSON.stringify(cont_data));
        }
    };

    this.openCrop = function(id) {
        var img_height;
        // If filtered image exists
        if ($('#cropper_' + id + ' img.adjusted').length > 0) {
            $('#cropper_' + id + ' img.adjusted').css('display', 'none');
            $('#image_' + id).css('display', 'inline');
            img_height = $('#image_' + id).height();
            // Get the filter and set it to cropper
            var filter = $('#image_' + id).attr('adjustment-data');
            $('#cropper_' + id).addClass(filter);
        }

        $('.image_edit_btns').css('display', 'none');
        $('.crop_edit').css('display', 'flex');
        $rootScope.crop_on = true;
        var wrapper = document.getElementById('cropper_' + id);
        $(wrapper).addClass('cropping');
        wrapper.style.maxWidth = '';
        wrapper.style.cssFloat = 'none';

        if ($('#cropper_' + id).attr('class').indexOf('no_image_space') >= 0) {
            $('#image_adjust_' + id).addClass('no_image_space_adjust_crop');
        }

        // Turn off contenteditable for this card
        var card = $(wrapper).parent().closest('div').attr('id');
        $('#' + card).attr('contenteditable', 'false');
        // Manually set the container width and height.
        var win_width = $(window).width();
        var stored_image = $("#image_" + id).attr('image-data');
        var avail_height = $(window).height() - ($('.header').height() + $('.create_container').height() + $('.footer').height());
        if (stored_image != undefined) {
            stored_image = JSON.parse(stored_image);
            var image_scale;
            if (win_width < avail_height) {
                // Portrait
                if (stored_image.naturalWidth > stored_image.naturalHeight) {
                    image_scale = win_width / stored_image.naturalWidth;
                } else {
                    image_scale = avail_height / stored_image.naturalHeight;
                }
            } else {
                // Landscape
                if (stored_image.naturalWidth > stored_image.naturalHeight) {
                    image_scale = win_width / stored_image.naturalWidth;
                    if (stored_image.naturalHeight * image_scale > avail_height) {
                        image_scale = avail_height / stored_image.naturalHeight;
                    }
                } else {
                    image_scale = avail_height / stored_image.naturalHeight;
                }
            }
            var scaled_height = stored_image.naturalHeight * image_scale;
            var scaled_width = stored_image.naturalWidth * image_scale;
            // Set the height of the container
            crop_in_progress = id;
            var img_width = stored_image.width;
            var inc = win_width / img_width;
            // get the actual screen height from the scaled width.
            var current_height = (stored_image.height * inc);
            if (avail_height < current_height) {
                decrease_percent = (avail_height / img_height);
                var decreased_height = (img_height * decrease_percent);
                wrapper.style.height = decreased_height + 'px';
            }
            if (stored_image.width < win_width) {
                wrapper.style.height = stored_image.height + 'px';
                wrapper.style.width = stored_image.width + 'px';
            }
            wrapper.style.maxWidth = '';
            wrapper.style.height = scaled_height + 'px';
            wrapper.style.width = scaled_width + 'px';
        }

        // TODO - do not enable crop if image less than min
        var options = {
            zoomable: false,
            minContainerWidth: 100,
            minContainerHeight: 100,
            ready: function() {
                $('#cropper_' + id + ' .cropper-canvas').addClass(filter);
                $('#cropper_' + id + ' .cropper-view-box').addClass(filter);
                $('#cropper_' + id).removeClass(filter);
            }
        };

        // Check for stored crop data
        var stored = $("#image_" + id).attr('crop-data');
        var reduced = $("#image_" + id).attr('reduce-data');

        if (reduced != undefined) {
            // Set the height of the container
            var wrapper = document.getElementById('cropper_' + id);
            var d = JSON.parse(reduced);
            var decreased_width = d.width;
            reduce_height = true;
        }
        // Previously cropped.
        if (stored != undefined) {
            options.data = JSON.parse(stored);
            image = document.getElementById('image_' + id);
            cropper = new Cropper(image, options, {});
        } else {
            // New Crop
            resetContainer(id);
            image = document.getElementById('image_' + id);
            var init_img_width = $('#image_' + id).width();
            // If image smaller than screen width then reduce container width
            if (init_img_width < win_width) {
                $('#cropper_' + id).css('width', init_img_width);
            }

            cropper = new Cropper(image, options, {
                crop(event) {
                    var wrapper = document.getElementById('cropper_' + id);
                    wrapper.style.width = '';
                }
            });
        }
    };

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
        var canv = $('canvas.temp_canvas_filtered').attr('id');
        if (canv != undefined) {
            id = canv.substr(21, canv.length - 20);
            var canvasFilter = document.getElementById('temp_canvas_filtered_' + id);
            var dataUrl = canvasFilter.toDataURL('image/jpeg', JPEG_COMPRESSION);
            Format.dataURItoBlob(dataUrl).then(function(blob) {
                blob.name = 'image_filtered_' + id + '.jpg';
                blob.renamed = true;
                Format.prepImage([blob], function(result) {
                    var img_new = new Image();
                    img_new.src = 'fileuploads/images/' + result.file + '?' + new Date();
                    img_new.className = 'adjusted';
                    img_new.id = 'image_filtered_' + id;
                    img_new.onload = function() {
                        $('#temp_canvas_filtered_' + id).remove();
                        // Remove current filter.
                        if ($('#cropper_' + id + ' img.adjusted').length > 0) {
                            $('#cropper_' + id + ' img.adjusted').remove();
                        }
                        // Get image Styles
                        var cssStyleParsed = getStyles(id);
                        $(this).attr("style", cssStyleParsed);
                        $('#image_' + id).css('display', 'none');
                        $('#temp_image_filtered_' + id).remove();
                        $(this).insertBefore('#image_' + id);
                        // SAVE
                        image_edit_finished = true;
                        $('#cropper_' + id).closest('div.ce').focus();
                        $('#cropper_' + id).closest('div.ce').blur();
                    };
                });
            });
        }
    };

    this.createFilter = function(id, filter) {
        var deferred = $q.defer();
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
            // Get image Styles
            var cssStyleParsed = getStyles(id);
            $(canvasFilter).attr("style", cssStyleParsed);
            canvasFilter.setAttribute('id', 'temp_canvas_filtered_' + id);
            canvasFilter.setAttribute('class', 'resize-drag temp_canvas_filtered');
            deferred.resolve(canvasFilter);
        });
        return deferred.promise;
    };

    this.filterClick = function(e, button, id, filter) {
        // Store the selcted filter in a custom attribute.
        ImageAdjustment.setImageAdjustment(id, 'filter', filter);
        self.createFilter(id, filter).then(function(canvasFilter) {
            if ($('#cropper_' + id + ' #temp_canvas_filtered_' + id).length >= 0) {
                $('#cropper_' + id + ' #temp_canvas_filtered_' + id).remove();
            }
            // Remove last filter
            if ($('#cropper_' + id + ' .adjusted').length >= 0) {
                $('#cropper_' + id + ' .adjusted').remove();
            }
            $('#cropper_' + id + ' #image_' + id).css('display', 'none');
            $(canvasFilter).insertBefore('#image_' + id);
            var ia = ImageAdjustment.getImageAdjustments(id);
            if (ia != undefined) {
                self.createSourceCanvas(id, canvasFilter);
                var target = document.getElementById('temp_canvas_filtered_' + id);
                self.applyAdjustments(id, target, ia);
            }
        });
        if (button != 'button') {
            e.stopPropagation();
        }
    };

    removeTempCanvas = function(id) {
        $('.temp_canvas_filtered').remove();
        if ($('#image_filtered_' + id).length > 0) {
            $('#image_filtered_' + id).css('display', 'unset');
        } else {
            $('#image_' + id).css('display', 'unset');
        }
    };

    getStyles = function(id) {
        // If Adjusted exists Get its Style.
        if ($('#cropper_' + id + ' .adjusted').length >= 0) {
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
                return cssStyleParsed;
            } else {
                return;
            }
        } else {
            return;
        }
    };

    imageToCanvas = function(id) {
        // Use the original image
        var image_id = 'image_' + id;
        var image = document.getElementById(image_id);
        var canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, image.width, image.height);
        return canvas;
    };

    this.applyAdjustments = function(id, target, ia) {
        var deferred = $q.defer();
        // Loop through all image adjustments.
        for (var i in ia) {
            // The filter adjustment is handled separately.
            if (i != 'filter') {
                // Apply any other image adjustments
                if (i == 'sharpen') {
                    ImageAdjustment.setSharpen(id, target, ImageAdjustment.getSource(), ia[i]);
                }
            }
        }
        deferred.resolve();
        return deferred.promise;
    };

    this.createSourceCanvas = function(id, source_image) {
        var source = document.createElement('canvas');
        source.width = source_image.width;
        source.height = source_image.height;
        var ctx = source.getContext('2d');
        ctx.drawImage(source_image, 0, 0, source_image.width, source_image.height);
        source.setAttribute('id', 'temp_canvas_source_' + id);
        source.setAttribute('class', 'resize-drag temp_canvas_filtered');
        // Get image Styles
        var cssStyleParsed = getStyles(id);
        source.setAttribute("style", cssStyleParsed);
        ImageAdjustment.setSource(source);
    };

    this.settingsImage = function(id) {
        var canvas = imageToCanvas(id);
        canvas.setAttribute('id', 'temp_canvas_filtered_' + id);
        canvas.setAttribute('class', 'resize-drag temp_canvas_filtered');
        // Get image Styles
        cssStyleParsed = getStyles(id);
        // Apply original style to thee new canvas.
        canvas.setAttribute("style", cssStyleParsed);
        // Get image-adjustments object
        var ia = ImageAdjustment.getImageAdjustments(id);
        // If this image has any adjustments.
        if (ia != undefined) {
            // If there is a filter applied.
            if (ia.filter != undefined) {
                // Create a canvas with the filter effect and return the canvas.
                self.createFilter(id, ia.filter).then(function(canvasFilter) {
                    //canvasFilter.setAttribute('id', 'temp_canvas_source_' + id);
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(canvasFilter, 0, 0);
                    ImageAdjustment.setSource(canvasFilter);
                    ImageAdjustment.setTarget(canvas);
                    // Apply other image adjustments to the filtered canvas.
                    self.applyAdjustments(id, canvas, ia).then(function(result) {
                        // Add the adjusted canvas and hide the original image.
                        $(canvas).insertBefore('#image_' + id);
                        $('#cropper_' + id + ' .adjusted').css('display', 'none');
                    });
                });
            } else {
                // No Filter but other image adjustments.
                var source_image = document.getElementById('image_' + id);
                ImageAdjustment.setSource(source_image);
                ImageAdjustment.setTarget(canvas);
                self.applyAdjustments(id, canvas, ia);
                $(canvas).insertBefore('#image_' + id);
                $('#cropper_' + id + ' .adjusted').css('display', 'none');
            }
        } else {
            // Not previously adjusted.
            // Use the original image as the source.
            $(canvas).insertBefore('#image_' + id);
            $('#cropper_' + id + ' #image_' + id).css('display', 'none');
            var source_image = document.getElementById('image_' + id);
            ImageAdjustment.setSource(source_image);
            ImageAdjustment.setTarget(canvas);
        }
    };

    this.adjustImage = function(e, id) {
        $('.image_adjust_on').remove();
        if ($('#cropper_' + id + ' .image_adjust_div').length <= 0) {
            var filt = $('.image_adjust_div').clone().insertAfter('#cropper_' + id);
            filt.attr('id', 'adjust_' + id);
            filt.css('position', 'relative');
            filt.addClass('filters_active');
            filt.css('visibility', 'visible');
            // TODO - function to handle all adjustments minus filter.
            ImageAdjustment.setImageId(id);
            var data = { 'id': id };
            // Get the last position of the slider.
            var ia = ImageAdjustment.getImageAdjustments(id);
            if (ia != undefined) {
                // TODO store as slider pos.
                data.last_position = ia.sharpen;
            }
            $rootScope.$broadcast('rzSliderRender', data);
        }
        // TODO - function to handle all adjustments minus filter.
        this.settingsImage(id);
        e.stopPropagation();
    };

    this.filterImage = function(e, id) {
        $('.image_adjust_on').remove();
        if ($('#cropper_' + id + ' .image_filt_div').length <= 0) {
            var temp = $('#cropper_' + id).clone();
            // If there is a filtered image then remove it.
            if ($('#cropper_' + id + ' .adjusted').length >= 0) {
                temp.find('img.adjusted').remove();
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
        $('.filters_active').remove();
        // Save the canvas to image
        self.saveImage();
        e.stopPropagation();
    };

    this.closeEdit = function(e, id) {
        e.stopPropagation();
        $('#' + e.target.id).closest('div.ce').attr('contenteditable', 'true');
        $('.image_adjust_on').remove();
        $('#cropper_' + id).removeClass('cropping');
        removeTempCanvas(id);
        // SAVE
        image_edit_finished = true;
        $('#cropper_' + id).closest('div.ce').focus();
        $('#cropper_' + id).closest('div.ce').blur();
    };

    this.editImage = function(scope, id) {
        if (principal.isValid()) {
            UserData.checkUser().then(function(result) {
                // Logged in.
                // Turn off content saving.
                image_edit_finished = false;
                // Get the editable attibute for this card (for this user).
                // check user has permision to edit.
                if ($(scope).closest('div.ce').attr('editable') == 'true') {
                    $(scope).closest('div.ce').attr('contenteditable', 'false');
                    // Only open editing if not already open.
                    if ($('#image_adjust_' + id).length <= 0) {
                        // Close existing
                        $('.image_adjust_on').remove();
                        $('.filters_active').remove();
                        var ia = $('.image_adjust').clone();
                        ia.insertBefore('#cropper_' + id);
                        $(ia).attr('id', 'image_adjust_' + id);
                        $('#image_adjust_' + id).css('visibility', 'visible');
                        $('#image_adjust_' + id).css('position', 'relative');
                        var edit_btns = "<div class='image_editor'><div class='image_edit_btns'><div class='' onclick='adjustImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_tune'>tune</i></div><div class='' onclick='filterImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_filter'>filter</i></div><div class='' onclick='openCrop(\"" + id + "\")'><i class='material-icons image_edit' id='ie_crop' >crop</i></div><div class='close_image_edit' onclick='closeEdit(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_close'>&#xE14C;</i></div></div><div class='crop_edit'><div class='set_crop' onclick='setCrop(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_accept'>&#xe876;</i></div></div></div>";
                        // set this to active
                        $('#image_adjust_' + id).addClass('image_adjust_on');
                        $('#image_adjust_' + id).append(edit_btns);
                        // Adjust marging top if this is the topmost image.
                        if ($('#cropper_' + id).attr('class').indexOf('no_image_space') >= 0) {
                            $('#image_adjust_' + id).addClass('no_image_space_adjust');
                        }
                    }
                }
            });
        }
    };

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
            ctx.globalCompositeOperation = 'darken';
            ctx.drawImage(bottomImage, 0, 0, image.width, image.height);
            ctx.drawImage(topImage, 0, 0, image.width, image.height);
        }
        // Screen
        if (type == 'screen') {
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(bottomImage, 0, 0, image.width, image.height);
            ctx.drawImage(topImage, 0, 0, image.width, image.height);
        }
        // Screen
        if (type == 'soft-light') {
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
        topCanvas.width = image.naturalWidth;
        topCanvas.height = image.naturalHeight;
        var topCtx = topCanvas.getContext('2d');
        topCtx.drawImage(topImage, 0, 0, image.naturalWidth, image.naturalHeight);
        // If there is a blend to be applied.
        if (filter_data.blend != 'none') {
            var grd;
            var canvas_gradient = document.createElement('canvas');
            canvas_gradient.width = image.width;
            canvas_gradient.height = image.height;
            var ctx_gradient = canvas_gradient.getContext('2d');
            // Gradients
            if (filter_data.gradient == 'radial') {
                // radial gradient
                // gradient_percent
                if (filter_data.gradient_percent != undefined) {
                    var penultimate_percent = filter_data.gradient_percent[filter_data.gradient_percent.length - 2];
                    var final_radius = image.width * (penultimate_percent / 100);
                    grd = ctx_gradient.createRadialGradient((image.width / 2), (image.height / 2), 0, (image.width / 2), (image.height / 2), final_radius);
                } else {
                    grd = ctx_gradient.createRadialGradient((image.width / 2), (image.height / 2), (image.width / 100), (image.width / 2), (image.height / 2), image.width);
                }
                for (var i = 0; i < filter_data.gradient_stops.length; i++) {
                    grd.addColorStop(filter_data.gradient_stops[i][0], "rgba(" + filter_data.gradient_stops[i][1] + "," + filter_data.gradient_stops[i][2] + "," + filter_data.gradient_stops[i][3] + "," + filter_data.gradient_stops[i][4] + ")");
                }
                // Fill with gradient
                ctx_gradient.fillStyle = grd;
                ctx_gradient.fillRect(0, 0, image.width, image.height);
            }
            if (filter_data.gradient == 'solid') {
                // Fill with colour
                ctx_gradient.fillStyle = "rgba(" + filter_data.gradient_stops[0][0] + "," + filter_data.gradient_stops[0][1] + "," + filter_data.gradient_stops[0][2] + "," + filter_data.gradient_stops[0][3] + ")";
                ctx_gradient.fillRect(0, 0, image.width, image.height);
            }
            if (filter_data.gradient == 'linear') {
                // radial gradient
                grd = ctx_gradient.createLinearGradient(0, 0, 0, image.width);
                for (var i = 0; i < filter_data.gradient_stops.length; i++) {
                    grd.addColorStop(filter_data.gradient_stops[i][0], "rgba(" + filter_data.gradient_stops[i][1] + "," + filter_data.gradient_stops[i][2] + "," + filter_data.gradient_stops[i][3] + "," + filter_data.gradient_stops[i][4] + ")");
                }
                // Fill with gradient
                ctx_gradient.fillStyle = grd;
                ctx_gradient.fillRect(0, 0, image.width, image.height);
            }
            bottomImage = canvas_gradient;
            var bottomCanvas = document.createElement("canvas");
            bottomCanvas.width = image.width;
            bottomCanvas.height = image.height;
            // get the 2d context to draw
            var bottomCtx = bottomCanvas.getContext('2d');
            bottomCtx.drawImage(bottomImage, 0, 0, image.width, image.height);

            applyBlending(bottomImage, topImage, image, id, filter_data.blend).then(function(result) {
                deferred.resolve(result);
            });
        } else {
            deferred.resolve(topCanvas);
        }
        return deferred.promise;
    }


    this.setCrop = function(event, image_id) {
        var cur_filter = $("#image_" + image_id).attr('adjustment-data');
        getData = function() {
            var stored_image_data = cropper.getImageData();
            var stored_data = cropper.getData();
            $("#image_" + image_id).attr('crop-data', JSON.stringify(stored_data));
            $("#image_" + image_id).attr('image-data', JSON.stringify(stored_image_data));
            var gcd = cropper.getCanvasData();
            var gd = cropper.getData();
            var gcbd = cropper.getCropBoxData();
            // Set the height of the container
            var wrapper = document.getElementById('cropper_' + image_id);
            wrapper.style.cssFloat = 'left';
            image.style.position = "relative";
            // TOP RIGHT BOTTOM LEFT
            // top as percent of gcd H and W
            var per_top = (gcbd.top / gcd.height) * 100;
            var per_right = ((gcd.width - gcbd.width - gcbd.left) / gcd.width) * 100;
            var per_bottom = ((gcd.height - (gcbd.height + gcbd.top)) / gcd.height) * 100;
            var per_left = (gcbd.left / gcd.width) * 100;
            var per_top_margin = (gcbd.top / gcd.width) * 100;
            var per_bottom_margin = ((gcd.height - (gcbd.top + gcbd.height)) / gcd.width) * 100;
            image.style.clipPath = "inset(" + per_top + "% " + per_right + "% " + per_bottom + "% " + per_left + "%)";
            var zoom_amount = ((((gcd.width - gcbd.width) / gcbd.width) * 100) + 100);
            image.style.maxWidth = zoom_amount + '%';
            image.style.width = zoom_amount + '%';
            image.style.left = ((per_left * (zoom_amount / 100)) * -1) + '%';
            image.style.marginTop = ((per_top_margin * (zoom_amount / 100)) * -1) + '%';
            image.style.marginBottom = ((per_bottom_margin * (zoom_amount / 100)) * -1) + '%';
            wrapper.style.maxWidth = gd.width + 'px';
            // reset the wrapper width and height.
            wrapper.style.width = '';
            wrapper.style.height = '';
            var cbd = { 'top': gcbd.top, 'right': (gcbd.width + gcbd.left), 'bottom': (gcbd.height + gcbd.top), 'left': gcbd.left };
            $("#image_" + image_id).attr('cbd-data', JSON.stringify(cbd));
            var win_width = $(window).width();
            if (stored_image_data.naturalWidth < win_width) {
                zoom_amount = stored_image_data.naturalWidth / (cbd.right - cbd.left);
            } else {
                zoom_amount = win_width / (cbd.right - cbd.left);
                var height = (cbd.bottom - cbd.top) * zoom_amount;
            }
            // Add class to show that this image has been cropped
            $("#image_" + image_id).addClass("cropped");
            // set this card to contenteditable true.
            var card = $(wrapper).parent().closest('div').attr('id');
            $('#' + card).attr('contenteditable', 'true');
            // Get image Styles
            var cssStyleParsed = getStyles(image_id);
            $('#cropper_' + image_id + ' .adjusted').attr("style", cssStyleParsed);
            // If Adjusted exists hide original.
            if ($('#cropper_' + image_id + ' .adjusted').length >= 0) {
                $("#image_" + image_id).css('display', 'none');
            }
            cropper.destroy();
            $rootScope.crop_on = false;
            //var event = null;
            closeEdit(event, image_id);
        };
        getData();

        $timeout(function() {
            // After image
            image_edit_finished = true;
            // CHECK - still needed?
            $('.content_cnv').scrollTop($('.content_cnv')[0].scrollHeight);
        }, 0);
    };

}]);