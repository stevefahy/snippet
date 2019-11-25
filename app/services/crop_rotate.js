//
// CropRotate Service
//

cardApp.service('CropRotate', ['$rootScope', 'Slider', 'ImageAdjustment', 'ImageFunctions', 'Debug', '$q', 'Loading', 'Resize', 'Drag', 'ContentEditable', 'Scroll', function($rootScope, Slider, ImageAdjustment, ImageFunctions, Debug, $q, Loading, Resize, Drag, ContentEditable, Scroll) {

    // Used for rotating a cropping image(s).
    var canvas_original;
    var crop_area_original;
    var ctx_crop_bg;
    var ctx_crop_src;
    var initial_adjustments;

    var ua = navigator.userAgent;
    var self = this;

    // Menu

    var animateImageSizeMenuIn = function() {
        var deferred = $q.defer();
        $('.image_size_menu').addClass('active');
        $('.image_size_menu').animate({ "right": "0" }, {
            duration: 400,
            easing: "easeOutQuad",
            complete: function() {
                deferred.resolve();
            }
        });
        return deferred.promise;
    };

    // Animation Listener.

    var image_size_menu_animate_out_end = function() {
        // remove the animation end listener which called this function.
        $(this).off('webkitAnimationEnd oAnimationEnd animationend ', image_size_menu_animate_out_end);
        $('.image_size_menu').removeClass('active');
        $('.image_size_menu').removeClass('animate_out');
        $('.image_size_menu').css('right', '');
    };

    // Perspective

    var storePerspectiveValue = function(direction, value) {
        var opposite_dir = 'horizontal';
        if (direction == 'horizontal') {
            opposite_dir = 'vertical';
        }
        var perspective = ImageAdjustment.getImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'perspective');
        if (perspective == undefined) {
            persp_object = {
                [direction]: value,
                [opposite_dir]: 0
            };
        } else {
            persp_object = {
                [direction]: value,
                [opposite_dir]: perspective[opposite_dir]
            };
        }
        ImageAdjustment.setImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'perspective', persp_object);
        self.sliderRotateUpdate();
    };

    this.togglePerspectiveSlider = function(e) {
        e.preventDefault();
        e.stopPropagation();
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();
        var ia = ImageAdjustment.getImageAdjustments(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId());
        // Only open if it has not already been opened.
        if ($('.slider_container_inner #s_perspective_v').length <= 0) {
            var data_p_v = { 'id': id, 'type': 'perspective_v' };
            var data_p_h = { 'id': id, 'type': 'perspective_h' };
            data_p_v.last_position = $rootScope.slider_settings.perspective_v.reset;
            data_p_h.last_position = $rootScope.slider_settings.perspective_h.reset;
            // Get the last position of the slider.
            if (ia != undefined) {
                if (ia.perspective != undefined) {
                    $rootScope.slider_settings.perspective_v.amount = ia.perspective.vertical;
                    $rootScope.slider_settings.perspective_h.amount = ia.perspective.horizontal;
                    data_p_v.last_position = ia.perspective.vertical;
                    data_p_h.last_position = ia.perspective.horizontal;
                }
            }
            addSlider(Slider.slider_perspective_v, parent_container, id, data_p_v);
            addSlider(Slider.slider_perspective_h, parent_container, id, data_p_h);
        } else {
            Slider.closeSlider("s_perspective_v", "s_perspective_h");
        }
    };

    this.sliderperspectiveVChange = function(value, quality) {
        var h = $rootScope.slider_settings.perspective_h.amount;
        ImageAdjustment.quickPerspectiveChange(value, h, quality);
        if (quality == 'high') {
            storePerspectiveValue('vertical', value);
        }
    };

    this.sliderperspectiveHChange = function(value, quality) {
        var v = $rootScope.slider_settings.perspective_v.amount;
        ImageAdjustment.quickPerspectiveChange(v, value, quality);
        if (quality == 'high') {
            storePerspectiveValue('horizontal', value);
        }
    };

    // Rotated

    this.rotateImage = function(e, dir) {
        e.preventDefault();
        e.stopPropagation();
        var angle = ImageAdjustment.getImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'rotated');
        if (angle == undefined) {
            angle = 0;
        }
        if (dir == 'right' && angle < 270) {
            angle += 90;
        } else if (dir == 'right') {
            angle = 0;
        }
        if (dir == 'left' && angle > 0) {
            angle -= 90;
        } else if (dir == 'left') {
            angle = 270;
        }
        ImageAdjustment.setImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'rotated', angle);
        self.setUpRotated();
    };

    // Flip

    this.flipImage = function(e, dir) {
        e.preventDefault();
        e.stopPropagation();
        var flip_dir = 'flip_v';
        if (dir == 'h') {
            flip_dir = 'flip_h';
        }
        var flipped = ImageAdjustment.getImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), flip_dir);
        if (!flipped) {
            ImageAdjustment.setImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), flip_dir, 'true');
        } else {
            ImageAdjustment.removeImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), flip_dir);
        }
        var p = ImageAdjustment.getPerspective();
        var h = $rootScope.slider_settings.perspective_h.amount;
        var v = $rootScope.slider_settings.perspective_v.amount;
        if (dir == 'h') {
            ImageAdjustment.quickFlipH(p.ctxo_hi);
            ImageAdjustment.quickFlipH(p.ctxo_lo);
            ImageAdjustment.quickPerspectiveChange(v, h, 'high');
        } else {
            ImageAdjustment.quickFlipV(p.ctxo_hi);
            ImageAdjustment.quickFlipV(p.ctxo_lo);
            ImageAdjustment.quickPerspectiveChange(v, h, 'high');
        }
        self.sliderRotateUpdate();
    };


    // Crop Rotate

    var createImageSizeImages = function() {
        var deferred = $q.defer();
        var promises = [];
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();
        $('.image_size_menu').find('#make_crop').attr("onclick", 'makeCrop(event, \'' + id + '\')');
        // Create canvas with all current adjustments (uncropped).
        var image = $('.' + parent_container + ' #image_' + id)[0];
        var target = ImageFunctions.imageToCanvas(image);
        var source = ImageFunctions.imageToCanvas(image);
        var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
        // All adjustements less crop - Filter target, Filter source, Sharpen target.
        if (ia != undefined) {
            // Dont crop the image.
            ia.crop = undefined;
            // Dont rotate the image
            ia.rotate = undefined;
            // Dont add perspective to the image
            ia.perspective = undefined;
            var prom = ImageAdjustment.applyFilters(source, ia).then(function(result) {
                target.width = result.width;
                target.height = result.height;
                var ctx = target.getContext('2d');
                ctx.drawImage(result, 0, 0);
                deferred.resolve(target);
            });
            promises.push(prom);
        }
        $q.all(promises).then(function() {
            deferred.resolve(target);
        });
        return deferred.promise;
    };

    var scaleToFit = function(image) {
        var new_h;
        var parent_container = ImageAdjustment.getImageParent();
        var original_image = image;
        var nat_h = original_image.naturalHeight;
        // check whether rotated
        var rotated = ImageAdjustment.getImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'rotated');
        if (rotated == 90 || rotated == 270) {
            nat_h = original_image.naturalWidth;
        }
        // Get scale ratio of the image (as displayed which may be scaled to fit compared to the original image).
        var win_scale = ImageAdjustment.getImageScale(original_image);
        var orig_h = nat_h;
        if (win_scale > 1) {
            orig_h = (nat_h / win_scale).toFixed(1);
        }
        var win_h = $(window).height();
        var display_used = $('.header').height() + $('.create_container').height() + $('.footer').height() + IMAGE_MARGIN;
        var available_h = (win_h - display_used).toFixed(1);
        if (orig_h > available_h) {
            new_h = available_h;
        } else {
            new_h = orig_h;
        }
        return parseFloat(new_h).toFixed(1);
    };

    var initCropRotate = function(parent_container, id) {
        var deferred = $q.defer();
        var canvas_orig = $('.crop_bg')[0];
        var canvas_crop = $('#crop_src')[0];
        canvas_original = ImageAdjustment.cloneCanvas(canvas_orig);
        crop_area_original = ImageAdjustment.cloneCanvas(canvas_crop);
        var canvas = $('.crop_bg')[0];
        ctx_crop_bg = canvas.getContext('2d', { alpha: false });
        var canvas2 = $('#crop_src')[0];
        ctx_crop_src = canvas2.getContext('2d', { alpha: false });
        deferred.resolve();
        return deferred.promise;
    };

    var createCropperImages = function(parent_container, id, target) {
        var deferred = $q.defer();
        var promises = [];
        var new_canvas_src = ImageAdjustment.cloneCanvas(target);
        var new_canvas_bg = ImageAdjustment.cloneCanvas(target);
        var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
        var img;
        var img_bg;
        var crop_data;
        // Create the two cropper images from the target canvas.
        $(new_canvas_src).addClass('hide');
        $(new_canvas_bg).addClass('hide');
        img = $(new_canvas_src).appendTo('.' + parent_container + ' #cropper_' + id + ' .crop_area');
        $(img).addClass('temp_canvas_filtered');
        img_bg = $(new_canvas_bg).appendTo('.' + parent_container + ' #cropper_' + id);
        $(img_bg).addClass('crop_bg hide');
        //$(img_bg).addClass('hide');
        $(img).attr('id', 'crop_src');
        // Set up Perspective
        var prom1 = ImageAdjustment.perspectiveInit($('#crop_src')[0]).then(function(p) {
            var prom2 = ImageAdjustment.perspective_setup(p.cvso_lo.width, p.cvso_lo.height, p.cvso_hi.width, p.cvso_hi.height).then(function(result) {
                var ctx1 = $('.crop_bg')[0].getContext('2d');
                var ctx2 = $('#crop_src')[0].getContext('2d');
                // Transform the context so that the image is centred like it is for the rotate function.
                ctx1.setTransform(1, 0, 0, 1, p.cvso_hi.width / 2, p.cvso_hi.height / 2);
                ctx2.setTransform(1, 0, 0, 1, p.cvso_hi.width / 2, p.cvso_hi.height / 2);
                p.ctxd1 = ctx1;
                p.ctxd2 = ctx2;
                ImageAdjustment.setPerspective(p);
                if (ia != undefined) {
                    if (ia.perspective != undefined) {
                        $rootScope.slider_settings.perspective_v.amount = ia.perspective.vertical;
                        $rootScope.slider_settings.perspective_h.amount = ia.perspective.horizontal;
                        ImageAdjustment.quickPerspectiveChange(ia.perspective.vertical, ia.perspective.horizontal, 'high');
                    }
                }
                var prom3 = initCropRotate(parent_container, id);
                if (ia != undefined) {
                    crop_data = ia.crop;
                    if (ia.rotate != undefined) {
                        // rotate the image(s).
                        self.sliderRotateChange(ia.rotate);
                    }
                }
                // all done
                $.when(prom1, prom2, prom3).then(function(r1, r2, r3) {
                    deferred.resolve();
                });
            });
        });
        return deferred.promise;
    };

    var hideImages = function(parent_container, id) {
        // If filtered image exists
        if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
            $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').addClass('hide');
            $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').addClass('temp_crop_hide');
        }
        $('#crop_src').removeClass('hide');
        $('.crop_bg').removeClass('hide');
    };

    // Update the canvas contexts for rotation after perspective has changed.
    this.sliderRotateUpdate = function() {
        var deferred = $q.defer();
        var promises = [];
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();
        var image = $('.' + parent_container + ' #image_' + id)[0];
        var rotated_val;
        var perspective_val;
        var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
        if (ia != undefined) {
            ia.crop = undefined;
            ia.rotate = undefined;
        }
        var prom1 = ImageAdjustment.applyFilters(image, ia).then(function(new_image) {
            canvas_original = ImageAdjustment.cloneCanvas(new_image);
            crop_area_original = ImageAdjustment.cloneCanvas(new_image);
        });
        promises.push(prom1);
        $q.all(promises).then(function() {
            deferred.resolve();
        });
        return deferred.promise;
    };

    this.setUpRotated = function() {
        var deferred = $q.defer();
        var promises = [];
        var image_original = $('.' + ImageAdjustment.getImageParent() + ' #cropper_' + ImageAdjustment.getImageId() + ' #image_' + ImageAdjustment.getImageId())[0];
        var source = ImageFunctions.imageToCanvas(image_original);
        var crop_bg = $('.crop_bg')[0];
        var crop_src = $('#crop_src')[0];
        var ia = ImageAdjustment.getImageAdjustments(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId());
        var image_h;
        var crop_data;
        if (ia != undefined) {
            var stored_perspective = ia.perspective;
            var stored_rotate = ia.rotate;
            ia.crop = undefined;
            ia.perspective = undefined;
            ia.rotate = undefined;
        }
        var prom1 = ImageAdjustment.applyFilters(source, ia).then(function(canvas_original_filters) {
            canvas_original = canvas_original_filters;
            crop_area_original = canvas_original_filters;
            $('.crop_bg')[0].width = canvas_original.width;
            $('.crop_bg')[0].height = canvas_original.height;
            $('#crop_src')[0].width = canvas_original.width;
            $('#crop_src')[0].height = canvas_original.height;
            image_h = scaleToFit(image_original);
            $('.crop_bg').css('height', image_h);
            $('#crop_src').css('height', image_h);
            // Set up Perspective
            var prom2 = ImageAdjustment.perspectiveInit(canvas_original).then(function(p) {
                var prom3 = ImageAdjustment.perspective_setup(p.cvso_lo.width, p.cvso_lo.height, p.cvso_hi.width, p.cvso_hi.height).then(function(result) {
                    ctx_crop_bg = $('.crop_bg')[0].getContext('2d');
                    ctx_crop_src = $('#crop_src')[0].getContext('2d');
                    $('.crop_bg')[0].width = canvas_original.width;
                    $('.crop_bg')[0].height = canvas_original.height;
                    $('#crop_src')[0].width = canvas_original.width;
                    $('#crop_src')[0].height = canvas_original.height;
                    // Transform the context so that the image is centred like it is for the rotate function.
                    var w = p.cvso_hi.width;
                    var h = p.cvso_hi.height;
                    ctx_crop_bg.setTransform(1, 0, 0, 1, w / 2, h / 2);
                    ctx_crop_src.setTransform(1, 0, 0, 1, w / 2, h / 2);
                    ctx_crop_bg.drawImage(canvas_original, -canvas_original.width / 2, -canvas_original.height / 2);
                    ctx_crop_src.drawImage(canvas_original, -canvas_original.width / 2, -canvas_original.height / 2);
                    p.ctxd1 = ctx_crop_bg;
                    p.ctxd2 = ctx_crop_src;
                    if (ia != undefined) {
                        p.rotated = ia.rotated;
                    }
                    ImageAdjustment.setPerspective(p);
                    if (stored_perspective != undefined) {
                        $rootScope.slider_settings.perspective_v.amount = stored_perspective.vertical;
                        $rootScope.slider_settings.perspective_h.amount = stored_perspective.horizontal;
                        ImageAdjustment.quickPerspectiveChange(stored_perspective.vertical, stored_perspective.horizontal, 'high');
                    }
                    if (stored_rotate != undefined) {
                        // rotate the image(s).
                        self.sliderRotateChange(stored_rotate);
                    }
                    self.sliderRotateUpdate();
                    // all done
                    $.when(prom1, prom2, prom3).then(function(r1, r2, r3) {
                        deferred.resolve();
                    });
                });
            });
            if (ia != undefined) {
                crop_data = ia.crop;
            }
            // Make resizable.
            Resize.makeResizableDiv('.crop_box', '.resizers', '.crop_area', '#crop_src', image_original, crop_data, ImageAdjustment.getImageId());
        });
        return deferred.promise;
    };

    var openCropRotate = function() {
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        var original_image = $('.' + ImageAdjustment.getImageParent() + ' #cropper_' + ImageAdjustment.getImageId() + ' #image_' + ImageAdjustment.getImageId())[0];
        var ia = ImageAdjustment.getImageAdjustments(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId());
        var crop_data;
        $(cropper).css('maxWidth', '');
        self.setUpRotated().then(function() {
            // Sroll fix
            $('#progress-thumb').addClass('crop_fix');
            // Add drag id to crop_adjust
            $('.' + ImageAdjustment.getImageParent() + ' #cropper_' + ImageAdjustment.getImageId() + ' .crop_adjust').attr('id', 'drag');
            if (ia != undefined) {
                crop_data = ia.crop;
            }
            //Make the DIV element draggagle:
            Drag.setUp(document.getElementById("drag"), document.getElementById("crop_src"), document.querySelector('.crop_area'));
            // Make resizable.
            $('.' + ImageAdjustment.getImageParent() + ' .crop_box').addClass('active');
            Resize.makeResizableDiv('.crop_box', '.resizers', '.crop_area', '#crop_src', original_image, crop_data, ImageAdjustment.getImageId());
            // Open the Rotate slider.
            self.toggleRotateSlider();
        });
    };

    var buildImageSize = function(parent_container, id, target) {
        var original_image = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        var image_h = scaleToFit(original_image);
        var cropper = $('.' + parent_container + ' #cropper_' + id)[0];
        var init_h = $(cropper).height().toFixed(1);
        // Add the crop box if it has not already been added.
        if ($('.' + parent_container + ' #cropper_' + id + ' .crop_box').length <= 0) {
            $('.crop_box').clone().prependTo('.' + parent_container + ' #cropper_' + id);
        }
        // Create the two images required for crop rotate.
        createCropperImages(parent_container, id, target).then(function() {
            $('.' + parent_container + ' #image_' + id).addClass('hide');
            $('.crop_bg').css('height', image_h);
            hideImages(parent_container, id);
            if (image_h != init_h) {
                // Set the cropper height to its current height so that it can be animated.
                $(cropper).css('height', init_h);
                $(cropper).stop();
                // Animate the full uncropped image onscreen
                $(cropper).animate({ height: image_h }, {
                    duration: 700,
                    easing: "easeOutQuad",
                    complete: function() {
                        // Unset the cropper height after animation completes.
                        $(this).css('height', '');
                        openCropRotate();
                    }
                });
            } else {
                openCropRotate();
            }
        });
    };

    var removeCrop = function() {
        $('.crop_box.active').remove();
        // Animate image_size_menu offscreen
        $('.image_size_menu.active').addClass('animate_out');
        $(".image_size_menu.animate_out").on('webkitAnimationEnd oAnimationEnd animationend ', image_size_menu_animate_out_end);
        if ($('.temp_canvas_filtered').length > 0) {
            $('.temp_canvas_filtered').remove();
        }
        if ($('.temp_crop_hide').length > 0) {
            $('.temp_crop_hide').removeClass('hide');
            $('.temp_crop_hide').removeClass('temp_crop_hide');
        }
        $('.crop_bg').remove();
    };

    // Rotate

    this.toggleRotateSlider = function() {
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();
        // Only open if it has not already been opened.
        if ($('.slider_container_inner #s_rotate').length <= 0) {
            var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
            var data_r = { 'id': id, 'type': 'rotate' };
            data_r.last_position = $rootScope.slider_settings.rotate.reset;
            // Get the last position of the slider.
            if (ia != undefined) {
                if (ia.rotate != undefined) {
                    data_r.last_position = ia.rotate;
                }
            }
            addSlider(Slider.slider_rotate, parent_container, id, data_r);
        } else {
            Slider.closeSlider('s_rotate');
        }
    };

    this.sliderRotateChange = function(value) {
        ImageAdjustment.quickRotate(ctx_crop_bg, canvas_original, value);
        ImageAdjustment.quickRotate(ctx_crop_src, crop_area_original, value);
    };

    this.sliderRotateEnd = function(value) {
        ImageAdjustment.setImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'rotate', value);
    };

    this.cancelCrop = function(e) {
        e.preventDefault();
        e.stopPropagation();
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        var image_original = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        var image_adjusted = $('.' + parent_container + ' #cropper_' + id + ' img.adjusted');
        var anim_h;
        var io;
        var scale;
        var cropper_h;
        cropper_h = $(cropper).height().toFixed(1);
        Debug.show();
        // Change the top color on android.
        if (ua.indexOf('AndroidApp') >= 0) {
            Android.changeTopBar('#F0F0F0');
        }
        // Sroll fix
        $('#progress-thumb').removeClass('crop_fix');
        // Reset the image adjustments to their initial values.
        ImageAdjustment.setImageAdjustments(parent_container, id, initial_adjustments);
        ContentEditable.setContenteditable(cropper, true);
        if (image_adjusted.length > 0) {
            image_adjusted.removeClass('hide');
            ImageFunctions.adjustSrc(image_original, 'hide');
            anim_h = image_adjusted.height().toFixed(1);
        } else {
            io = ImageAdjustment.getImageOriginal(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId());
            scale = ImageAdjustment.getScale(image_original, cropper);
            $(image_original).removeClass('hide');
            anim_h = (io.nat_height / scale).toFixed(1);
        }
        removeCrop();
        Slider.removeSlider();
        ImageAdjustment.setImageEditing(false);
        if (cropper_h != anim_h) {
            // Set the cropper height to its current height so that it can be animated.
            $(cropper).css('height', cropper_h);
            $(cropper).stop();
            // Animate back to the existing image (original or adjusted).
            $(cropper).animate({ height: anim_h }, {
                duration: 700,
                easing: "easeOutQuad",
                complete: function() {
                    // Unset the cropper height after animation completes.
                    $(this).css('height', '');
                }
            });
        }
    };

    this.makeCrop = function(e, id) {
        e.preventDefault();
        e.stopPropagation();
        var parent_container = ImageAdjustment.getImageParent();
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        var original_image = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        var crop_area = $('.crop_box.active .crop_adjust')[0];
        var source_canvas = document.getElementById('crop_src');
        // Get scale ratio of the image (as displayed which may be scaled to fit compared to the original image).
        var scale = ImageAdjustment.getScale(original_image, source_canvas);
        var aheight = Math.round($(crop_area).outerHeight() * scale);
        // Set the crop parmater values.
        var sx = crop_area.offsetLeft * scale;
        var sy = crop_area.offsetTop * scale;
        var swidth = Math.round($(crop_area).outerWidth() * scale);
        var sheight = Math.round($(crop_area).outerHeight() * scale);
        var crop_data = { 'x': sx, 'y': sy, 'width': swidth, 'height': sheight };
        // Use ratio of swidth to browser width to find out how much sheight needs to be scaled within the browser!!!
        var cropper_width = $(cropper).outerWidth().toFixed(2);
        var pad = $(cropper).outerHeight() - $(cropper).height();
        var width_scale;
        var anim_h;
        var init_h;
        var canv_temp;
        // Change the top color on android.
        if (ua.indexOf('AndroidApp') >= 0) {
            Android.changeTopBar('#F0F0F0');
        }
        // Sroll fix
        $('#progress-thumb').removeClass('crop_fix');
        // Disable scrolling until the crop has been saved.
        Scroll.disable('.content_cnv');
        // Determine the height for the animation.
        if (swidth > cropper_width) {
            width_scale = cropper_width / swidth;
            anim_h = ((aheight * width_scale) + pad).toFixed(2);
        } else {
            anim_h = (aheight + pad).toFixed(2);
        }
        init_h = $(cropper).outerHeight();
        // Set the cropper height to its current height so that it can be animated.
        $(cropper).css('height', init_h);
        // Hide the original image.
        ImageFunctions.adjustSrc(original_image, 'hide');
        // Crop the image.
        ImageAdjustment.crop(source_canvas, crop_data).then(function(canvas) {
            // Add a loading spinner to the existing image.
            Loading.addSpinner(canvas);
            // If Adjusted exists delete the original.
            if ($('.content_cnv #cropper_' + id + ' .adjusted').length > 0) {
                $('.content_cnv #cropper_' + id + ' .adjusted').remove();
            }
            // Add the cropped canvas to the screen until the image of it has been created.
            canv_temp = $(canvas).prependTo('.content_cnv #cropper_' + id);
            $(canv_temp).addClass('canvas_temp');
            // remove the crop box
            removeCrop();
            // remove the slider
            Slider.removeSlider();
            // Convert the cropped canvas to an image and place it onscreen.
            var p1 = ImageFunctions.canvasToImage(canvas, id).then(function(image) {
                $('.canvas_temp').remove();
                $(image).prependTo('.content_cnv #cropper_' + id);
                $('.loading_spinner').remove();
                ImageAdjustment.setImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'crop', crop_data);
                ImageAdjustment.setImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'rotate', $rootScope.slider_settings.rotate.amount);
                ImageAdjustment.setImageAdjusted(true);
            });
            // Animate the cropped image onto screen.
            $(cropper).stop();
            var p2 = $(cropper).animate({ height: anim_h }, {
                duration: 700,
                easing: "easeOutQuad"
            });
            // all done
            $.when(p1, p2).then(function() {
                // Unset the height of the cropper.
                $('.content_cnv #cropper_' + id).css('height', '');
                // Save
                ImageAdjustment.setImageEditing(false);
                ImageFunctions.saveCropper(cropper);
            });
        });
    };

    this.open = function() {
        var image;
        Slider.reset();
        // Get initial settings (these will be reset if andjustments are cancelled).
        initial_adjustments = ImageAdjustment.getImageAdjustments(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId());
        // Open the ImageSizemenu
        var p1 = animateImageSizeMenuIn();
        // Check whether this is an original or adjusted image.
        if ($('.' + ImageAdjustment.getImageParent() + ' #cropper_' + ImageAdjustment.getImageId() + ' img.adjusted').length > 0) {
            image = $('.' + ImageAdjustment.getImageParent() + ' #cropper_' + ImageAdjustment.getImageId() + ' img.adjusted')[0];
        } else {
            image = $('.' + ImageAdjustment.getImageParent() + ' #cropper_' + ImageAdjustment.getImageId() + ' #image_' + ImageAdjustment.getImageId())[0];
        }
        // Add a loading spinner to the image.
        Loading.addSpinner(image);
        // Create the two images required for displaying the manipulations.
        var p2 = createImageSizeImages();
        Debug.hide();
        $('.image_adjust_on').remove();
        // Change the top color on android.
        if (ua.indexOf('AndroidApp') >= 0) {
            Android.changeTopBar('#5E5E5E');
        }
        // all done
        $.when(p1, p2).then(function(r1, r2) {
            $('.loading_spinner').remove();
            buildImageSize(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), r2);
        });

    };

}]);