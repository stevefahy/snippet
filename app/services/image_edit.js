//
// ImageEdit Service
//

cardApp.service('ImageEdit', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', 'ImageAdjustment', 'Drag', 'Resize', 'Keyboard', 'Scroll', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal, ImageAdjustment, Drag, Resize, Keyboard, Scroll) {

    var ua = navigator.userAgent;
    var self = this;
    var mobile = false;

    if (ua.indexOf('AndroidApp') >= 0) {
        mobile = true;
    }

    // Helper functions

    var showImage = function(image) {
        var deferred = $q.defer();
        $(image).animate({
            opacity: 1
        }, 500, function() {
            // Animation complete.
            $(this).removeClass('show_image');
            $(this).css('opacity', '');
            console.log('show complete');
            deferred.resolve();
        });
        return deferred.promise;
    };

    var saveCropper = function(cropper) {
        var deferred = $q.defer();
        console.log(cropper);
        // Turn off contenteditable for this card.
        setContenteditable($(cropper)[0], true);
        if (ImageAdjustment.getImageAdjusted() || temp_save) {
            var id = $(cropper).closest('div.ce').attr('id').substr(2, $(cropper).closest('div.ce').attr('id').length);
            console.log(id);
            $rootScope.$broadcast('saveCropper', { data: id });
            temp_save = false;
            deferred.resolve();
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

    var temp_save = false;

    this.editImage = function(scope, id) {
        var parent_container = getParentContainer(scope);
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        setContenteditable($(cropper)[0], false);
        // Check if this is new image to be edited.
        if (id != ImageAdjustment.getImageId()) {
            console.log('HERE');
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
                        console.log('EDIT IMAGE');
                        // Save any changes made to this card in case the user navigates away from conversations before finishing editing image.
                        // Set adjusted to true temporarily so that the card will save.
                        //ImageAdjustment.setImageAdjusted(true);
                        temp_save = true;
                        saveCropper(cropper).then(function() {
                            // Turn off contenteditable for this card.
                            setContenteditable($(cropper)[0], false);

                            // Turn off content saving.
                            //ImageAdjustment.setImageEditing(true);
                            //ImageAdjustment.setImageId(id);
                            //ImageAdjustment.setImageAdjusted(false);
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
                                var edit_btns = "<div class='image_editor'><div class='image_edit_btns'><div class='' onclick='adjustImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_tune'>tune</i></div><div class='' onclick='filterImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_filter'>filter</i></div><div class='' onclick='openCrop(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_crop' >crop</i></div><div class='close_image_edit' onclick='closeEdit(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_close'>&#xE14C;</i></div></div></div>";
                                $('#image_adjust_' + id).append(edit_btns);
                                // Adjust marging top if this is the topmost image.
                                if ($('.' + parent_container + ' #cropper_' + id).attr('class').indexOf('no_image_space') >= 0) {
                                    console.log('no image space');
                                    $('#image_adjust_' + id).addClass('no_image_space_adjust');
                                }
                                // set this menu to active
                                $('#image_adjust_' + id).addClass('image_adjust_on');
                            }
                        });
                    }


                }
            });
        }
    };

    this.makeCrop = function(e, id) {
        console.log('makeCrop');
        e.preventDefault();
        e.stopPropagation();
        // Disable scrolling until the crop has been saved.
        Scroll.disable('.content_cnv');
        var parent_container = ImageAdjustment.getImageParent();
        // make the div contenteditable again.
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        //setContenteditable(cropper, true);
        var original_image = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        var crop_area = $('.crop_box.active .crop_adjust')[0];
        var source_canvas = document.getElementById('crop_src');
        // Get scale ratio of the image (as displayed which may be scaled to fit compared to the original image).
        var scale = ImageAdjustment.getScale(original_image, source_canvas);
        console.log('scale:' + scale);
        /*
        var nat_w = original_image.naturalWidth;
        var cur_w = $(source_canvas).outerWidth().toFixed(2);
        var scale = nat_w / cur_w;
        console.log(nat_w + ' : ' + cur_w + ' : ' + scale);
        */

        //var awidth = $(crop_area).width() * scale;
        var aheight = Math.round($(crop_area).outerHeight() * scale);

        // Set the crop parmater values.
        var sx = crop_area.offsetLeft * scale;
        var sy = crop_area.offsetTop * scale;
        var swidth = Math.round($(crop_area).outerWidth() * scale);
        var sheight = Math.round($(crop_area).outerHeight() * scale);
        var x = 0;
        var y = 0;
        var crop_data = { 'x': sx, 'y': sy, 'width': swidth, 'height': sheight };
        // Use ratio of swidth to browser width to find out how much sheight needs to be scaled within the browser!!!
        cropper_width = $(cropper).outerWidth().toFixed(2);
        var pad = $(cropper).outerHeight() - $(cropper).height();
        image_width = original_image.naturalWidth;
        if (swidth > cropper_width) {
            var width_scale = cropper_width / swidth;
            anim_h = ((aheight * width_scale) + pad).toFixed(2);
        } else {
            anim_h = (aheight + pad).toFixed(2);
        }

        console.log(anim_h);
        //anim_h = Math.round(anim_h);
        //anim_h+=1;
        var init_h = $(cropper).outerHeight();
        // Set the cropper height to its current height so that it can be animated.
        //console.log(init_h);
        console.log('sheight: ' + sheight);
        $(cropper).css('height', init_h);
        // If Adjusted exists hide original.
        if ($('.content_cnv #cropper_' + id + ' .adjusted').length > 0) {
            $('.content_cnv #cropper_' + id + ' .adjusted').remove();
        }
        // Hide the original image.
        adjustSrc(original_image, 'hide');
        ImageAdjustment.crop(source_canvas, crop_data).then(function(canvas) {
            // remove the crop box
            //console.log($(cropper).outerHeight());
            self.removeCrop();
            //console.log($(cropper).outerHeight());
            //console.log(anim_h);
            $(cropper).animate({ height: anim_h }, {
                duration: 300,
                easing: "easeOutExpo",
                start: function() {
                    console.log($(cropper).outerHeight());
                    self.canvasToImage(canvas, id).then(function(image) {
                        var img_new = $(image).prependTo('.content_cnv #cropper_' + id);
                        $(img_new).css('opacity', 0);
                        $(img_new).addClass('show_image');
                        //ImageAdjustment.setImageAdjustment('content_cnv', id, 'crop', crop_data);
                        //ImageAdjustment.setImageAdjusted(true);
                        showImage('.show_image').then(function(canvas) {
                            // Unset the height of the cropper.
                            //$('.content_cnv #cropper_' + id).css('height', '');
                            // Save
                            //saveCropper(cropper);

                            $(":animated").promise().done(function() {
                                //code here
                                console.log('aims finished');

                                  ImageAdjustment.setImageAdjustment('content_cnv', id, 'crop', crop_data);
                    ImageAdjustment.setImageAdjusted(true);
                    // Unset the height of the cropper.
                    $('.content_cnv #cropper_' + id).css('height', '');
                                 // Save
                    ImageAdjustment.setImageEditing(false);
                    console.log('save');
                    saveCropper(cropper);
                            });
                        });
                    });
                },
                complete: function() {
                    //
                    //ImageAdjustment.setImageAdjustment('content_cnv', id, 'crop', crop_data);
                    //ImageAdjustment.setImageAdjusted(true);
                    // Unset the height of the cropper.
                   // $('.content_cnv #cropper_' + id).css('height', '');
                    // Save
                    //ImageAdjustment.setImageEditing(false);
                    //console.log('save');
                    //saveCropper(cropper);
                    console.log('cropper anim complete');

                }
            });
        });
    };

    this.removeCrop = function() {
        $('.crop_box.active').remove();
        if ($('.temp_canvas_filtered').length > 0) {
            $('.temp_canvas_filtered').remove();
        }
        if ($('.temp_crop_hide').length > 0) {
            $('.temp_crop_hide').removeClass('hide');
            $('.temp_crop_hide').removeClass('temp_crop_hide');
        }
        $('.crop_bg').remove();
        //ImageAdjustment.setImageEditing(false);
    };

    this.cancelCrop = function(e) {
        e.preventDefault();
        e.stopPropagation();
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        setContenteditable(cropper, true);
        var anim_h;
        var image_original = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
            $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').removeClass('hide');
            adjustSrc(image_original, 'hide');
            anim_h = $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').height();
        } else {
            $(image_original).removeClass('.hide');
            anim_h = $(image_original).height();
        }
        self.removeCrop();
        ImageAdjustment.setImageEditing(false);

              $(cropper).animate({ height: anim_h }, {
                duration: 300,
                easing: "easeOutExpo",
                start: function() {
                }
            });
    };

    this.buildCrop = function(parent_container, id, target) {

        var cropper = $('.' + parent_container + ' #cropper_' + id);
        var original_image = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        // Use ratio of swidth to browser width to find out how much sheight needs to be scaled within the browser!!!

        var scale = ImageAdjustment.getScale(original_image, cropper);
        console.log(scale);
        //var nat_w = original_image.naturalWidth;
        //var cur_w = $(crop_image).outerWidth();

        //cropper_width = $(cropper).width();
        //image_width = original_image.naturalWidth;
        /*
        if (swidth > cropper_width) {
            var width_scale = cropper_width / swidth;
            anim_h = sheight * width_scale;
        } else {
            anim_h = sheight;
        }
        */

        var anim_h = original_image.naturalHeight / scale;
        var init_h = $(cropper).outerHeight();
        // Set the cropper height to its current height so that it can be animated.
        $(cropper).css('height', init_h);

        $(cropper).animate({ height: anim_h }, {
            duration: 500,
            easing: "easeOutExpo",
            start: function() {

                // If filtered image exists
                if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
                    $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').addClass('hide');
                    $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').addClass('temp_crop_hide');
                    $('.' + parent_container + ' #image_' + id).addClass('hide');
                    var new_canvas = ImageAdjustment.cloneCanvas(target);
                    var img = $(new_canvas).appendTo('.' + parent_container + ' #cropper_' + id + ' .crop_area');
                    $(img).addClass('temp_canvas_filtered');
                    var img_bg = $(target).appendTo('.' + parent_container + ' #cropper_' + id);
                    $(img_bg).addClass('crop_bg');
                    $(img).attr('id', 'crop_src');
                } else {
                    var img = $(target).appendTo('.' + parent_container + ' #cropper_' + id + ' .crop_area');
                    $(img).attr('id', 'crop_src');
                }
                $('.' + parent_container + ' #cropper_' + id + ' .crop_adjust').attr('id', 'drag');
                var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
                var crop_data;
                if (ia != undefined) {
                    crop_data = ia.crop;
                }
                var original_image = $('.content_cnv #cropper_' + id + ' #image_' + id)[0];
                //Make the DIV element draggagle:
                Drag.setUp(document.getElementById("drag"), document.getElementById("crop_src"), document.querySelector('.crop_area'));
                // Make resizable.
                Resize.makeResizableDiv('.resizers', '.crop_area', '#crop_src', original_image, crop_data, id);

            },
            complete: function() {
                //
            }
        });


    };

    this.openCrop = function(e, id) {
        var deferred = $q.defer();
        var promises = [];
        var parent_container = getParentContainer(e.target);
        ImageAdjustment.setImageParent(parent_container);
        ImageAdjustment.setImageId(id);
        ImageAdjustment.setImageEditing(true);
        var crop = $('.crop_box').clone().prependTo('.' + parent_container + ' #cropper_' + id);
        crop.addClass('active');
        $('.' + parent_container + ' #cropper_' + id + ' #make_crop').attr("onclick", 'makeCrop(event, \'' + id + '\')');
        $('.image_adjust_on').remove();
        // Create canvas with all current adjustments (uncropped).
        var image = $('.' + parent_container + ' #image_' + id)[0];
        var target = self.imageToCanvas(image);
        var source = self.imageToCanvas(image);
        var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
        // All adjustements less crop - Filter target, Filter source, Sharpen target.
        if (ia != undefined) {
            // Dont crop the image.
            ia.crop = undefined;
            var prom = ImageAdjustment.applyFilters(source, ia).then(function(result) {
                target.width = result.width;
                target.height = result.height;
                var ctx = target.getContext('2d');
                ctx.drawImage(result, 0, 0);
                deferred.resolve();
            });
            promises.push(prom);
        }
        $q.all(promises).then(function() {
            self.buildCrop(parent_container, id, target);
            deferred.resolve();
        });
        return deferred.promise;
    };

    this.filterClick = function(e, button, id, filter) {
        var parent_container = getParentContainer(e.target);
        ImageAdjustment.setImageParent(parent_container);
        // Store the selected filter in a custom attribute.
        ImageAdjustment.setImageAdjustment(parent_container, id, 'filter', filter);
        var source = $('.source_canvas')[0];
        var target = $('.target_canvas')[0];
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
        var previously_adjusted;
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
            var data = { 'id': id };
            // Get the last position of the slider.
            if (ia != undefined) {
                data.last_position = ia.sharpen;
            }
            $rootScope.$broadcast('rzSliderRender', data);
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
        // Set the cropper height to avoid jump when adding removing images.
        //$('.' + parent_container + ' #cropper_' + id).css('height', '');
        //$(cropper).css('height', init_h);  
        //var cropper = $('.' + parent_container + ' #cropper_' + id);
        //var init_h = $(cropper).outerHeight();
        // Set the cropper height to its current height so that it can be animated.
        //$(cropper).css('height', init_h);      
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
                // Target canvas
                ImageAdjustment.applyFilters(source, ia).then(function(result) {
                    target.width = result.width;
                    target.height = result.height;
                    var ctx = target.getContext('2d');
                    ctx.drawImage(result, 0, 0);
                });
                // Source canvas (all adjustments less filter)
                ia.filter = undefined;
                ImageAdjustment.applyFilters(source, ia).then(function(result) {
                    self.canvasToTempImage(result, id).then(function(image) {
                        self.buildFilters(parent_container, id, image);
                        $(target).removeClass('hide');
                        hideAdjusted(parent_container, id);
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

    this.closeFilters = function(e) {
        var deferred = $q.defer();
        var promises = [];
        var parent_container = getParentContainer(e.target);
        var id = ImageAdjustment.getImageId();
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        setContenteditable(cropper, true);
        $('.filters_active').remove();
        var prev_adjusted = $('.adjusted.hide')[0];
        var current_adjusted = $('.target_canvas.adjusted')[0];
        var current_canvas = $('.target_canvas')[0];
        var source_canvas = $('.source_canvas')[0];
        var image_original = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        // Set the cropper height to avoid jump when adding removing images.
        $('.' + parent_container + ' #cropper_' + id).css('height', $(current_canvas).height());
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
                $('.' + parent_container + ' #cropper_' + id).css('height', '');
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
            $('.' + parent_container + ' #cropper_' + id).css('height', '');
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

    this.closeEdit = function(e, id) {
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