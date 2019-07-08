//
// ImageEdit Service
//

cardApp.service('ImageEdit', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', 'ImageAdjustment', 'Drag', 'Resize', 'Keyboard', 'Scroll', 'Slider', 'ImageManipulate', '$templateRequest', '$sce', 'Debug', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal, ImageAdjustment, Drag, Resize, Keyboard, Scroll, Slider, ImageManipulate, $templateRequest, $sce, Debug) {

    var ua = navigator.userAgent;
    var self = this;
    var mobile = false;
    var temp_save = false;
    // Used for rotating a cropping image(s).
    var canvas_original;
    var crop_area_original;
    var ctx_crop_bg;
    var ctx_crop_src;

    if (ua.indexOf('AndroidApp') >= 0) {
        mobile = true;
    }

    // Helper functions

    var saveCropper = function(cropper) {
        var deferred = $q.defer();
        // Turn on contenteditable for this card before saving
        setContenteditable($(cropper)[0], true);
        // Save if the image has been adjusted. Or if this is a temp save of content before editing image.
        if (ImageAdjustment.getImageAdjusted() || temp_save) {
            var id = $(cropper).closest('div.ce').attr('id').substr(2, $(cropper).closest('div.ce').attr('id').length);
            saveCard(id).then(function() {
                temp_save = false;
                deferred.resolve();
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    };

    var hideAdjusted = function(parent_container, id) {
        // If there is already an adjusted image then hide it.
        if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
            $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').addClass('hide');
        }
    };

    var hideOriginal = function(parent_container, id) {
        // Hide the original image.
        $('.' + parent_container + ' #cropper_' + id + ' #image_' + id).addClass('hide');
        var image_original = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        adjustSrc(image_original, 'hide');
    };

    // Get the context of the image (content_cnv or card_create_container)
    var getParentContainer = function(scope) {
        var parent_container;
        if ($(scope).parents('div.card_create_container').length > 0) {
            parent_container = 'card_create_container';
        } else {
            parent_container = 'content_cnv';
        }
        return parent_container;
    };

    // Set the cards contenteditable boolean value.
    var setContenteditable = function(cropper, bool) {
        $(cropper).closest('div.ce').attr('contenteditable', bool);
    };

    var adjustSrc = function(image, state) {
        // restore image
        var datsrc = $(image).attr('data-src');
        var src_original = $(image).attr('src');
        var hide_image = '/assets/images/transparent.gif';
        // Set the data-src attribute if it has not already been created.
        if (datsrc == undefined) {
            $(image).attr('data-src', src_original);
        }
        if (state == 'hide') {
            $(image).attr('src', hide_image);
            $(image).addClass('hide');
        } else {
            // show
            $(image).attr('src', datsrc);
        }
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

    // Methods

    this.canvasToTempImage = function(canvas, id) {
        var deferred = $q.defer();
        var dataUrl = canvas.toDataURL('image/jpeg', JPEG_COMPRESSION);
        var image = document.createElement('img');
        image.src = dataUrl;
        deferred.resolve(image);
        return deferred.promise;
    };

    this.canvasToImage = function(canvas, id) {
        var deferred = $q.defer();
        var dataUrl = canvas.toDataURL('image/jpeg', JPEG_COMPRESSION);
        Format.dataURItoBlob(dataUrl).then(function(blob) {
            blob.name = 'image_filtered_' + id + '.jpg';
            blob.renamed = true;
            Format.prepImage([blob], function(result) {
                var img_new = new Image();
                img_new.src = IMAGES_URL + result.file + '?' + new Date();
                img_new.className = 'adjusted';
                img_new.id = 'image_filtered_' + id;
                img_new.onload = function() {
                    deferred.resolve(this);
                };
            });
        });
        return deferred.promise;
    };

    this.imageToCanvas = function(image) {
        // restore image src
        var src = $(image).attr('data-src');
        if (src != undefined) {
            $(image).attr('src', src);
        }
        var canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);
        return canvas;
    };

    this.editImage = function(scope, id) {
        var parent_container = getParentContainer(scope);
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        setContenteditable($(cropper)[0], false);
        // Check if this is new image to be edited.
        if (id != ImageAdjustment.getImageId()) {
            // Set the new ID.
            ImageAdjustment.setImageId(id);
            // Reset image editing to false
            ImageAdjustment.setImageEditing(false);
        }
        // Check that the user has permission to edit.
        if (principal.isValid()) {
            UserData.checkUser().then(function(result) {
                // Get the editable attibute for this card (for this user).
                // check user has permision to edit this image.
                if ($(scope).closest('div.ce').attr('editable') == 'true') {
                    // If this image is not already being edited then allow it to be edited.
                    if (!ImageAdjustment.getImageEditing()) {
                        // Turn off content saving.
                        ImageAdjustment.setImageEditing(true);
                        ImageAdjustment.setImageId(id);
                        ImageAdjustment.setImageAdjusted(false);
                        // Save any changes made to this card in case the user navigates away from conversations before finishing editing image.
                        temp_save = true;
                        saveCropper(cropper).then(function() {
                            // Turn off contenteditable for this card.
                            setContenteditable($(cropper)[0], false);
                            var image = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
                            // restore image so that it can be accessed as a source.
                            adjustSrc(image, 'show');
                            // Only open editing if not already open.
                            if ($('#image_adjust_' + id).length <= 0) {
                                // Close existing
                                $('.image_adjust_on').remove();
                                $('.filters_active').remove();
                                // Add the image edit menu.
                                var ia = $('.image_adjust').clone();
                                $(ia).attr('id', 'image_adjust_' + id);
                                ia.insertBefore('.' + parent_container + ' #cropper_' + id);
                                // Import the edit_btns html.
                                var edit_btns = $sce.getTrustedResourceUrl('/views/edit_btns.html');
                                $templateRequest(edit_btns).then(function(template) {
                                    var eb = $('#image_adjust_' + id).append(template);
                                    $(eb).find('.ti').attr("onclick", 'testImage(event, \'' + id + '\')');
                                    $(eb).find('.ai').attr("onclick", 'adjustImage(event, \'' + id + '\')');
                                    $(eb).find('.fi').attr("onclick", 'filterImage(event, \'' + id + '\')');
                                    $(eb).find('.ois').attr("onclick", 'openImageSize(event, \'' + id + '\')');
                                    $(eb).find('.close_image_edit').attr("onclick", 'closeImageEdit(event, \'' + id + '\')');
                                    // Adjust marging top if this is the topmost image.
                                    if ($('.' + parent_container + ' #cropper_' + id).attr('class').indexOf('no_image_space') >= 0) {
                                        $('#image_adjust_' + id).addClass('no_image_space_adjust');
                                    }
                                    // set this menu to active
                                    $('#image_adjust_' + id).addClass('image_adjust_on');
                                });
                            }
                        });
                    }
                }
            });
        }
    };

    this.makeCrop = function(e, id) {
        e.preventDefault();
        e.stopPropagation();
        // Change the top color on android.
        if (ua.indexOf('AndroidApp') >= 0) {
            Android.changeTopBar('#F0F0F0');
        }
        // Disable scrolling until the crop has been saved.
        Scroll.disable('.content_cnv');
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
        cropper_width = $(cropper).outerWidth().toFixed(2);
        var pad = $(cropper).outerHeight() - $(cropper).height();
        if (swidth > cropper_width) {
            var width_scale = cropper_width / swidth;
            anim_h = ((aheight * width_scale) + pad).toFixed(2);
        } else {
            anim_h = (aheight + pad).toFixed(2);
        }
        var init_h = $(cropper).outerHeight();
        // Set the cropper height to its current height so that it can be animated.
        $(cropper).css('height', init_h);
        // Hide the original image.
        adjustSrc(original_image, 'hide');
        // Crop the image.
        ImageAdjustment.crop(source_canvas, crop_data).then(function(canvas) {
            addSpinner(canvas);
            /*
            spinner_w = canvas.width;
            spinner_h = canvas.height;
            if (canvas.width > cropper_width) {
                spinner_w = cropper_width;
                var spinner_scale = canvas.width / cropper_width;
                spinner_h = canvas.height / spinner_scale;
            }
            // Import the loading spinner html.
            var spinner = $sce.getTrustedResourceUrl('/views/loading_spinner.html');
            $templateRequest(spinner).then(function(template) {
                $(template).prependTo('.content_cnv #cropper_' + id);
                $('.loading_spinner').css('width', spinner_w);
                $('.loading_spinner').css('height', spinner_h);
            });
            */
            // If Adjusted exists hide original.
            if ($('.content_cnv #cropper_' + id + ' .adjusted').length > 0) {
                $('.content_cnv #cropper_' + id + ' .adjusted').remove();
            }
            // Add the cropped canvas to the screen until the image of it has been created.
            var canv_temp = $(canvas).prependTo('.content_cnv #cropper_' + id);
            $(canv_temp).addClass('canvas_temp');
            // remove the crop box
            self.removeCrop();
            // remove the slider
            self.removeSlider();
            // Convert the cropped canvas to an image an place it onscreen.
            var p1 = self.canvasToImage(canvas, id).then(function(image) {
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
                saveCropper(cropper);
            });
        });
    };

    this.removeSlider = function() {
        $('.slider_container').css('height', '');
        $('.slider_container_inner').empty();
        $('.slider_container_inner').removeClass('active');
    };

    // Animtion

    var animateImageSizeMenuIn = function() {
        var deferred = $q.defer();
        //deferred.resolve();
        //return deferred.promise;
        //$('.image_size_menu').addClass('animate_in active');
        //$(".image_size_menu.animate_in").on('webkitAnimationEnd oAnimationEnd animationend ', image_size_menu_animate_in_end);

        $('.image_size_menu').addClass('active');
        // $('.image_size_menu').css('-webkit-transform', 'translateY(100%)');
        $('.image_size_menu').animate({ "right": "0" }, {
            duration: 400,
            easing: "easeOutQuad",
            complete: function() {
                console.log('anim fin');
                deferred.resolve();
            }
        });

        return deferred.promise;

    };

    // Animation Listener.

    var image_size_menu_animate_in_end = function() {
        // remove the animation end listener which called this function.
        $(this).off('webkitAnimationEnd oAnimationEnd animationend ', image_size_menu_animate_in_end);
        //$('.image_size_menu').removeClass('active');
        //$('.image_size_menu').removeClass('animate_out');
        imageSizeMenuOpen();
    };


    var image_size_menu_animate_out_end = function() {
        // remove the animation end listener which called this function.
        $(this).off('webkitAnimationEnd oAnimationEnd animationend ', image_size_menu_animate_out_end);
        $('.image_size_menu').removeClass('active');
        $('.image_size_menu').removeClass('animate_out');
        $('.image_size_menu').css('right', '');
    };

    var sliderAnimEnd = function() {
        $(this).remove();
    };

    this.removeCrop = function() {
        $('.crop_box.active').remove();
        // Remove image_size_menu.
        //$('.image_size_menu.active').removeClass('animate_on');
        //$('.image_size_menu').removeClass('animate_in');

        // Animate offscreen
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

    this.cancelCrop = function(e) {
        e.preventDefault();
        e.stopPropagation();
        Debug.show();
        // Change the top color on android.
        if (ua.indexOf('AndroidApp') >= 0) {
            Android.changeTopBar('#F0F0F0');
        }
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();

        // Get initial settings
        //initial_adjustments = ImageAdjustment.getImageAdjustments(parent_container, id);
        ImageAdjustment.setImageAdjustments(parent_container, id, initial_adjustments);

        var cropper = $('.' + parent_container + ' #cropper_' + id);
        setContenteditable(cropper, true);
        var anim_h;
        var image_original = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
            $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').removeClass('hide');
            adjustSrc(image_original, 'hide');
            anim_h = $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').height();
        } else {
            var io = ImageAdjustment.getImageOriginal(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId());
            var scale = ImageAdjustment.getScale(image_original, cropper);
            $(image_original).removeClass('hide');
            anim_h = (io.nat_height / scale).toFixed(2);
        }
        self.removeCrop();
        self.removeSlider();
        ImageAdjustment.setImageEditing(false);
        var cropper_h = $(cropper).outerHeight().toFixed(2);
        if (cropper_h != anim_h) {
            $(cropper).stop();
            // Animate back to the existing image (original or adjusted).
            $(cropper).animate({ height: anim_h }, {
                duration: 700,
                easing: "easeOutQuad"
            });
        }
    };

    this.createCropperImages = function(parent_container, id, target, h) {
        var deferred = $q.defer();
        console.log(target);
        //$('.' + parent_container + ' #image_' + id).addClass('hide');
        var new_canvas_src = ImageAdjustment.cloneCanvas(target);
        var new_canvas_bg = ImageAdjustment.cloneCanvas(target);
        console.log(new_canvas_src);
        $(new_canvas_src).addClass('hide');
        $(new_canvas_bg).addClass('hide');
        var img = $(new_canvas_src).appendTo('.' + parent_container + ' #cropper_' + id + ' .crop_area');
        $(img).addClass('temp_canvas_filtered');
        var img_bg = $(new_canvas_bg).appendTo('.' + parent_container + ' #cropper_' + id);
        $(img_bg).addClass('crop_bg');
        $(img).attr('id', 'crop_src');
        if (h != undefined) {
            $(img_bg).css('height', h);
            $(img).css('height', h);
        }
        var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
        console.log($('#crop_src')[0]);
        // Set up Perspective
        ImageAdjustment.perspectiveInit($('#crop_src')[0]).then(function(p) {
            ImageAdjustment.perspective_setup(p.cvso_lo.width, p.cvso_lo.height, p.cvso_hi.width, p.cvso_hi.height).then(function(result) {
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
                initCropRotate(parent_container, id);
                setUpRotated(0);
                var crop_data;
                if (ia != undefined) {
                    crop_data = ia.crop;
                    if (ia.rotate != undefined) {
                        // rotate the image(s).
                        self.sliderRotateChange(ia.rotate);
                    }
                }
                $('.' + parent_container + ' #image_' + id).addClass('hide');
                hideImages(parent_container, id);
                deferred.resolve();
            });
        });
        return deferred.promise;
    };

    this.buildImageSize = function(parent_container, id, target) {

        var original_image = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        var image_h = self.scaleToFit(original_image);

        if ($('.' + parent_container + ' #cropper_' + id + ' .crop_box').length <= 0) {
            var crop = $('.crop_box').clone().prependTo('.' + parent_container + ' #cropper_' + id);
            crop.addClass('active');
        }

        self.createCropperImages(parent_container, id, target, image_h).then(function() {

//crop.addClass('active');





            var cropper = $('.' + parent_container + ' #cropper_' + id);
            $(cropper).css('maxWidth', '');
            //var original_image = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
            //var image_h = self.scaleToFit(original_image);
            var init_h = $(cropper).outerHeight().toFixed(2);
            // If the scaled original image size is different to the current size.
            console.log(image_h + ' : ' + init_h);
            if (image_h != init_h) {
                // Set the cropper height to its current height so that it can be animated.
                $(cropper).css('height', init_h);
                $(cropper).stop();
                // Animate the cropper tool onscreen
                $(cropper).animate({ height: image_h }, {
                    duration: 700,
                    easing: "easeOutQuad",
                    start: function() {
                        //self.createCropperImages(parent_container, id, target, image_h);
                    },
                    complete: function() {
                        openCropRotate();
                    }
                });
            } else {
                // self.createCropperImages(parent_container, id, target, image_h).then(function() {
                openCropRotate();
                // });
            }

        });
    };

    var closeSlider = function(slider) {
        var slider_h = 0;
        var slider_count = $(".slider_container_inner").children().length;
        var currentHeight = $('.slider_container_inner').outerHeight();
        for (i = 0; i < arguments.length; i++) {
            slider_h += $('.slider_container_inner #' + arguments[i]).outerHeight();
            $('.slider_container_inner #' + arguments[i]).addClass('animate_minimize');
            slider_count--;
        }
        $timeout(function() {
            $(".animate_minimize").on('webkitTransitionEnd oTransitionEnd transitionend ', sliderAnimEnd);
            var h = currentHeight - slider_h;
            if (slider_count < 1) {
                $(".slider_container_inner").removeClass('active');
                $(".slider_container").css('height', '');
            } else {
                $('.slider_container').css('height', h);
            }
        }, 0);
    };

    var openRotateSlider = function() {
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
            closeSlider('s_rotate');
        }
    };

    this.openCropRotate = function(e) {
        if (e != undefined) {
            e.preventDefault();
            e.stopPropagation();
        }
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        $(cropper).css('maxWidth', '');
        var crop_data;
        var original_image = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
        $('.' + parent_container + ' #cropper_' + id + ' .crop_adjust').attr('id', 'drag');
        if (ia != undefined) {
            crop_data = ia.crop;
        }
        //Make the DIV element draggagle:
        Drag.setUp(document.getElementById("drag"), document.getElementById("crop_src"), document.querySelector('.crop_area'));
        // Make resizable.
        Resize.makeResizableDiv('.crop_box', '.resizers', '.crop_area', '#crop_src', original_image, crop_data, id);
        // Open the Rotate slider.
        openRotateSlider();
    };

    // Update the canvas contexts for rotation after perspective has changed.
    this.sliderRotateUpdate = function() {
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
        ImageAdjustment.applyFilters(image, ia).then(function(new_image) {
            canvas_original = ImageAdjustment.cloneCanvas(new_image);
            crop_area_original = ImageAdjustment.cloneCanvas(new_image);
        });
    };

    this.sliderRotateChange = function(value) {
        ImageAdjustment.quickRotate(ctx_crop_bg, canvas_original, value);
        ImageAdjustment.quickRotate(ctx_crop_src, crop_area_original, value);
    };

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

    var setUpRotated = function(angle) {
        var image_original = $('.' + ImageAdjustment.getImageParent() + ' #cropper_' + ImageAdjustment.getImageId() + ' #image_' + ImageAdjustment.getImageId())[0];
        var source = self.imageToCanvas(image_original);
        var crop_bg = $('.crop_bg')[0];
        var crop_src = $('#crop_src')[0];
        var ia = ImageAdjustment.getImageAdjustments(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId());
        if(ia!=undefined){
           var stored_perspective = ia.perspective;
        var stored_rotate = ia.rotate; 
        ia.crop = undefined;
        ia.perspective = undefined;
        ia.rotate = undefined;
    }
        
        
        ImageAdjustment.applyFilters(source, ia).then(function(canvas_original_filters) {
            canvas_original = canvas_original_filters;
            crop_area_original = canvas_original_filters;
            $('.crop_bg')[0].width = canvas_original.width;
            $('.crop_bg')[0].height = canvas_original.height;
            $('#crop_src')[0].width = canvas_original.width;
            $('#crop_src')[0].height = canvas_original.height;
            var image_h = self.scaleToFit(image_original);
            $('.crop_bg').css('height', image_h);
            $('#crop_src').css('height', image_h);
            $('.content_cnv #cropper_' + ImageAdjustment.getImageId()).css('maxWidth', canvas_original.width + 'px');
            $('.content_cnv #cropper_' + ImageAdjustment.getImageId()).css('height', '');
            // Set up Perspective
            ImageAdjustment.perspectiveInit(canvas_original).then(function(p) {
                ImageAdjustment.perspective_setup(p.cvso_lo.width, p.cvso_lo.height, p.cvso_hi.width, p.cvso_hi.height).then(function(result) {
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
                    if(ia!=undefined){
                       p.rotated = ia.rotated; 
                   } else {
                    p.rotated = angle;
                   }
                    
                    ImageAdjustment.setPerspective(p);
                    if (stored_perspective != undefined) {
                        $rootScope.slider_settings.perspective_v.amount = stored_perspective.vertical;
                        $rootScope.slider_settings.perspective_h.amount = stored_perspective.horizontal;
                        ImageAdjustment.quickPerspectiveChange(stored_perspective.vertical, stored_perspective.horizontal, 'high');
                    }
                    if (stored_rotate != undefined) {
                        //var latest_rotate = $rootScope.slider_settings.rotate.amount;
                        //console.log(latest_rotate);
                        // rotate the image(s).
                        self.sliderRotateChange(stored_rotate);
                    }
                    self.sliderRotateUpdate();
                });
            });
            var crop_data;
            if (ia != undefined) {
                crop_data = ia.crop;
            }
            // Make resizable.
            Resize.makeResizableDiv('.resizers', '.crop_area', '#crop_src', image_original, crop_data, ImageAdjustment.getImageId());
        });
    };

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
        setUpRotated(angle);
    };

    this.flip = function(e, dir) {
        e.preventDefault();
        e.stopPropagation();
        var flip_dir = 'flip_v';
        if (dir == 'h') {
            flip_dir = 'flip_h';
        }
        var flipped = ImageAdjustment.getImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), flip_dir);
        var ctx1 = $('.crop_bg')[0].getContext('2d');
        var ctx2 = $('#crop_src')[0].getContext('2d');
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

    this.openPerspective = function(e) {
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
            closeSlider("s_perspective_v", "s_perspective_h");
        }
    };

    var initCropRotate = function(parent_container, id) {
        var deferred = $q.defer();
        var canvas_orig = $('.crop_bg')[0];
        var canvas_crop = $('#crop_src')[0];
        canvas_original = ImageAdjustment.cloneCanvas(canvas_orig);
        crop_area_original = ImageAdjustment.cloneCanvas(canvas_crop);
        self.sliderRotateUpdate();
        var canvas = $('.crop_bg')[0];
        ctx_crop_bg = canvas.getContext('2d', { alpha: false });
        var canvas2 = $('#crop_src')[0];
        ctx_crop_src = canvas2.getContext('2d', { alpha: false });
        deferred.resolve();
        return deferred.promise;
    };

    this.scaleToFit = function(image) {
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
            orig_h = (nat_h / win_scale).toFixed(2);
        }
        var win_h = $(window).height();
        var display_used = $('.header').height() + $('.create_container').height() + $('.footer').height() + IMAGE_MARGIN;
        var available_h = win_h - display_used;
        if (orig_h > available_h) {
            new_h = available_h;
        } else {
            new_h = orig_h;
        }
        return new_h;
    };

    var createImageSizeImages = function() {
        var deferred = $q.defer();
        var promises = [];
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();
        $('.image_size_menu').find('#make_crop').attr("onclick", 'makeCrop(event, \'' + id + '\')');
        // Create canvas with all current adjustments (uncropped).
        var image = $('.' + parent_container + ' #image_' + id)[0];
        var target = self.imageToCanvas(image);
        var source = self.imageToCanvas(image);
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
            //animateImageSizeMenuIn();
            //self.buildImageSize(parent_container, id, target);
            console.log(target);
            deferred.resolve(target);
        });
        return deferred.promise;
    };

    var addSpinner = function(image) {
        /*
        spinner_w = canvas.width;
            spinner_h = canvas.height;
            if (canvas.width > cropper_width) {
                spinner_w = cropper_width;
                var spinner_scale = canvas.width / cropper_width;
                spinner_h = canvas.height / spinner_scale;
            }
            // Import the loading spinner html.
            var spinner = $sce.getTrustedResourceUrl('/views/loading_spinner.html');
            $templateRequest(spinner).then(function(template) {
                $(template).prependTo('.content_cnv #cropper_' + id);
                $('.loading_spinner').css('width', spinner_w);
                $('.loading_spinner').css('height', spinner_h);
            });
            */
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();

        var cropper = $('.' + parent_container + ' #cropper_' + id)[0];
        var cropper_width = $(cropper).outerWidth().toFixed(2);

        spinner_w = image.width;
        spinner_h = image.height;
        if (image.width > cropper_width) {
            spinner_w = cropper_width;
            var spinner_scale = image.width / cropper_width;
            spinner_h = image.height / spinner_scale;
        }
        // Import the loading spinner html.
        var spinner = $sce.getTrustedResourceUrl('/views/loading_spinner.html');
        $templateRequest(spinner).then(function(template) {
            $(template).prependTo('.content_cnv #cropper_' + id);
            $('.loading_spinner').css('width', spinner_w);
            $('.loading_spinner').css('height', spinner_h);
        });
    };

    var initial_adjustments;

    this.openImageSize = function(e, id) {
        var parent_container = getParentContainer(e.target);
        ImageAdjustment.setImageParent(parent_container);
        ImageAdjustment.setImageId(id);
        ImageAdjustment.setImageEditing(true);

        Slider.reset();

        // Get initial settings
        initial_adjustments = ImageAdjustment.getImageAdjustments(parent_container, id);

        var p1 = animateImageSizeMenuIn();

        var image;
        if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
            image = $('.' + parent_container + ' #cropper_' + id + ' img.adjusted')[0];
        } else {
            image = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        }

        addSpinner(image);
        /*
        var cropper = $('.' + parent_container + ' #cropper_' + id)[0];
        var cropper_width = $(cropper).outerWidth().toFixed(2);
        var image;
        if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
            image = $('.' + parent_container + ' #cropper_' + id + ' img.adjusted')[0];
        } else {
            image = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        }
        spinner_w = image.width;
        spinner_h = image.height;
        if (image.width > cropper_width) {
            spinner_w = cropper_width;
            var spinner_scale = image.width / cropper_width;
            spinner_h = image.height / spinner_scale;
        }
        // Import the loading spinner html.
        var spinner = $sce.getTrustedResourceUrl('/views/loading_spinner.html');
        $templateRequest(spinner).then(function(template) {
            $(template).prependTo('.content_cnv #cropper_' + id);
            $('.loading_spinner').css('width', spinner_w);
            $('.loading_spinner').css('height', spinner_h);
        });
        */


        var p2 = createImageSizeImages();
        Debug.hide();
        $('.image_adjust_on').remove();
        // Change the top color on android.
        if (ua.indexOf('AndroidApp') >= 0) {
            Android.changeTopBar('#5E5E5E');
        }
        // all done
        $.when(p1, p2).then(function(r1, r2) {
            //$.when(p2).then(function(r2) {
            console.log('p1 fin');
            console.log('p2 fin');
            console.log(r2);
            $('.loading_spinner').remove();
            self.buildImageSize(parent_container, id, r2);
        });
    };

    this.filterClick = function(e, button, id, filter) {
        var parent_container = getParentContainer(e.target);
        ImageAdjustment.setImageParent(parent_container);
        // Store the selected filter in a custom attribute.
        ImageAdjustment.setImageAdjustment(parent_container, id, 'filter', filter);
        var source = $('.content_cnv .source_canvas')[0];
        var target = $('.content_cnv .target_canvas')[0];
        $(target).addClass('adjusted');
        var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
        // Restore the orignal with all adjustments.
        ImageAdjustment.applyFilters(source, ia).then(function(result) {
            target.width = result.width;
            target.height = result.height;
            var ctx = target.getContext('2d');
            ctx.drawImage(result, 0, 0);
        });
        ImageAdjustment.setImageAdjusted(true);
        if (button != 'button') {
            e.stopPropagation();
        }
    };

    this.adjustImage = function(e, id) {
        var parent_container = getParentContainer(e.target);
        ImageAdjustment.setImageId(id);
        ImageAdjustment.setImageParent(parent_container);
        var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
        var image = $('.' + parent_container + ' #image_' + id)[0];
        $('.image_adjust_on').remove();
        if ($('.' + parent_container + ' #cropper_' + id + ' .image_adjust_div').length <= 0) {
            var filt = $('.image_adjust_div').clone().insertAfter('.' + parent_container + ' #cropper_' + id);
            filt.attr('id', 'adjust_' + id);
            filt.addClass('filters_active');
            var data = { 'id': id, 'type': 'sharpen' };
            data.last_position = $rootScope.slider_settings.sharpen.reset;
            // Get the last position of the slider.
            if (ia != undefined) {
                if (ia.sharpen != undefined) {
                    data.last_position = ia.sharpen;
                }
            }
            addSlider(Slider.slider_sharpen, parent_container, id, data);
        }
        var target = self.imageToCanvas(image);
        var source = self.imageToCanvas(image);
        target.setAttribute('id', 'temp_canvas_filtered_' + id);
        $(target).addClass('target_canvas');
        $(source).addClass('source_canvas');
        $(target).addClass('hide');
        $(source).addClass('hide');
        $(target).insertBefore('.' + parent_container + ' #image_' + id);
        $(source).insertBefore('.' + parent_container + ' #image_' + id);
        ImageAdjustment.setSource(source);
        ImageAdjustment.setTarget(target);
        // Apply all adjustments.
        ImageAdjustment.applyFilters(source, ia).then(function(result) {
            target.width = result.width;
            target.height = result.height;
            var ctx = target.getContext('2d');
            ctx.drawImage(result, 0, 0);
            hideOriginal(parent_container, id);
            hideAdjusted(parent_container, id);
            $(target).removeClass('hide');
        });
        e.stopPropagation();
    };

    this.buildFilters = function(parent_container, id, image) {
        var filt = $('.image_filt_div').clone().insertAfter('.' + parent_container + ' #cropper_' + id);
        filt.attr('id', 'filters_' + id);
        filt.addClass('filters_active');
        for (var i in FILTERS) {
            var outmost = document.createElement('div');
            var outer = document.createElement('div');
            $(outer).appendTo(outmost);
            $(outmost).appendTo('#filters_' + id + ' .filters_container .filter_list');
            $(outmost).addClass('filter_container');
            var current = document.createElement('img');
            current.src = image.src;
            $(current).appendTo($(outer));
            var title = document.createElement('div');
            $(title).addClass('filter_title');
            $(title).html(FILTERS[i].filter_name);
            $(title).appendTo($(outmost));
            $(outer).removeAttr('class');
            $(outer).addClass('cropper_cont');
            $(outer).addClass('filter_thumb');
            $(outer).addClass(FILTERS[i].filter_css_name);
            $(outer).attr('onClick', 'filterClick(event, this, "' + id + '", "' + FILTERS[i].filter_css_name + '")');
        }
    };

    this.filterImage = function(e, id) {
        var parent_container = getParentContainer(e.target);
        $('.image_adjust_on').remove();
        ImageAdjustment.setImageId(id);
        // Hide the original image.
        if ($('.' + parent_container + ' #cropper_' + id + ' .image_filt_div').length <= 0) {
            var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
            var image = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
            var source = self.imageToCanvas(image);
            var target = self.imageToCanvas(image);
            $(source).addClass('source_canvas');
            $(target).addClass('target_canvas');
            $(target).addClass('hide');
            var source2 = $(source).prependTo('.content_cnv #cropper_' + id)[0];
            var target2 = $(target).prependTo('.content_cnv #cropper_' + id)[0];
            if (ia != undefined) {
                // Target canvas - All adjustments
                ImageAdjustment.applyFilters(source, ia).then(function(result) {
                    target.width = result.width;
                    target.height = result.height;
                    var ctx = target.getContext('2d');
                    ctx.drawImage(result, 0, 0);
                    // Source canvas (all adjustments less filter)
                    ia.filter = undefined;
                    ImageAdjustment.applyFilters(source, ia).then(function(result) {
                        self.canvasToTempImage(result, id).then(function(image) {
                            self.buildFilters(parent_container, id, image);
                            $(target).removeClass('hide');
                            hideAdjusted(parent_container, id);
                        });
                    });
                });
            } else {
                // Source canvas - no adjustments
                self.canvasToTempImage(source, id).then(function(image) {
                    self.buildFilters(parent_container, id, image);
                    $(target).removeClass('hide');
                    hideOriginal(parent_container, id);
                });
            }
        }
        e.stopPropagation();
    };

    this.sliderTestChange = function(value) {
        var ctx_source = $('.content_cnv .source_canvas')[0].getContext('2d');
        var ctx_target = $('.content_cnv .target_canvas')[0].getContext('2d');
        //Get data for the entire image
        var data = ctx_source.getImageData(0, 0, ctx_source.canvas.width, ctx_source.canvas.height);
        ImageManipulate.exposure2.filter(data, { amount: value });
        ctx_target.putImageData(data, 0, 0);
    };

    this.testImage = function(e, id) {
        var parent_container = getParentContainer(e.target);
        ImageAdjustment.setImageId(id);
        ImageAdjustment.setImageParent(parent_container);
        var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
        var image = $('.' + parent_container + ' #image_' + id)[0];
        $('.image_adjust_on').remove();
        if ($('.' + parent_container + ' #cropper_' + id + ' .image_adjust_div').length <= 0) {
            var filt = $('.image_adjust_div').clone().insertAfter('.' + parent_container + ' #cropper_' + id);
            filt.attr('id', 'adjust_' + id);
            filt.addClass('filters_active');
            var data = { 'id': id, 'type': 'test' };
            data.last_position = $rootScope.slider_settings.test.reset;
            // Get the last position of the slider.
            if (ia != undefined) {
                if (ia.test != undefined) {
                    data.last_position = ia.test;
                }
            }
            addSlider(Slider.slider_test, parent_container, id, data);
        }
        var target = self.imageToCanvas(image);
        var source = self.imageToCanvas(image);
        target.setAttribute('id', 'temp_canvas_filtered_' + id);
        $(target).addClass('target_canvas');
        $(source).addClass('source_canvas');
        $(target).addClass('hide');
        $(source).addClass('hide');
        $(target).insertBefore('.' + parent_container + ' #image_' + id);
        $(source).insertBefore('.' + parent_container + ' #image_' + id);
        ImageAdjustment.setSource(source);
        ImageAdjustment.setTarget(target);
        // Apply all adjustments.
        ImageAdjustment.applyFilters(source, ia).then(function(result) {
            target.width = result.width;
            target.height = result.height;
            var ctx = target.getContext('2d');
            ctx.drawImage(result, 0, 0);
            source.width = result.width;
            source.height = result.height;
            var ctx_source = source.getContext('2d');
            ctx_source.drawImage(result, 0, 0);
            hideOriginal(parent_container, id);
            hideAdjusted(parent_container, id);
            $(target).removeClass('hide');
        });
        e.stopPropagation();
    };

    this.closeFilters = function(e) {
        var deferred = $q.defer();
        var promises = [];
        var parent_container = getParentContainer(e.target);
        var id = ImageAdjustment.getImageId();
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        setContenteditable(cropper, true);
        $('.filters_active').remove();
        self.removeSlider();
        var prev_adjusted = $('.adjusted.hide')[0];
        var current_adjusted = $('.content_cnv .target_canvas.adjusted')[0];
        var current_canvas = $('.content_cnv .target_canvas')[0];
        var source_canvas = $('.content_cnv .source_canvas')[0];
        var image_original = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        adjustSrc(image_original, 'hide');
        // Filter added.
        if (current_adjusted != undefined) {
            if (prev_adjusted != undefined) {
                $(prev_adjusted).remove();
            }
            // Save the canvas to image
            var prom = self.canvasToImage(current_adjusted, id).then(function(image) {
                var img_new = $(image).prependTo('.content_cnv #cropper_' + id);
                $(current_canvas).remove();
                $(source_canvas).remove();
                deferred.resolve();
            });
            promises.push(prom);
        } else {
            // No filter added
            if (prev_adjusted != undefined) {
                // Restore existing adjusted image.
                $(prev_adjusted).removeClass('hide');
            } else {
                // Restore original image.
                $('.' + parent_container + ' #cropper_' + id + ' #image_' + id).removeClass('hide');
                adjustSrc(image_original, 'show');
            }
            $(current_canvas).remove();
            $(source_canvas).remove();
            deferred.resolve();
        }
        $q.all(promises).then(function() {
            // SAVE
            ImageAdjustment.setImageEditing(false);
            saveCropper($('.' + parent_container + ' #cropper_' + id));
            deferred.resolve();
        });
        e.stopPropagation();
        return deferred.promise;
    };

    this.closeImageEdit = function(e, id) {
        e.stopPropagation();
        var parent_container = getParentContainer(e.target);
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        setContenteditable(cropper, true);
        $('.image_adjust_on').remove();
        if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
            hideOriginal(parent_container, id);
        }
        ImageAdjustment.setImageEditing(false);
        if (ImageAdjustment.getImageAdjusted()) {
            ImageAdjustment.setImageAdjusted(false);
        }
    };

}]);