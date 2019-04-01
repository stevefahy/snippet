//
// Cropper Service
//

cardApp.service('Cropp', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', 'ImageAdjustment', 'Drag', 'Resize', 'Keyboard', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal, ImageAdjustment, Drag, Resize, Keyboard) {

    var ua = navigator.userAgent;
    var self = this;
    var cropper;
    var image;
    var crop_in_progress;
    var reduce_height = false;
    var decrease_percent = 0;
    var mobile = false;

    var JPEG_COMPRESSION = 0.7;

    $rootScope.crop_on = false;

    if (cropper != undefined) {
        cropper.destroy();
    }

    if (ua.indexOf('AndroidApp') >= 0) {
        mobile = true;
    }

    removeTempCanvas = function(id) {
        $('.temp_canvas_filtered').remove();
        if ($('#image_filtered_' + id).length > 0) {
            $('#image_filtered_' + id).removeClass('hide');
        } else {
            $('#image_' + id).removeClass('hide');
        }
    };

    this.canvasToTempImage = function(canvas, id) {
        var deferred = $q.defer();
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
                img_new.src = 'fileuploads/images/' + result.file + '?' + new Date();
                img_new.className = 'adjusted';
                img_new.id = 'image_filtered_' + id;
                img_new.onload = function() {
                    deferred.resolve(this);
                };
            });
        });
        return deferred.promise;
    };

    imageToCanvas = function(image) {
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
        var data = { width: image.naturalWidth, height: image.naturalHeight };
        $(canvas).attr('data-image', JSON.stringify(data));
        return canvas;
    };

    var image_edited = false;
    // TODO - make getting parent container a function.
    this.editImage = function(scope, id) {
                        if ($(scope).closest('div.ce').attr('editable') == 'true') {
                    $(scope).closest('div.ce').attr('contenteditable', 'false');
                }
        //unbindScroll();
        ImageAdjustment.setImageAdjusted(false);
        var parent_container;
        // Get the context of the image (content_cnv or card_create_container)
        if ($(scope).parents('div.card_create_container').length > 0) {
            parent_container = 'card_create_container';
        } else {
            parent_container = 'content_cnv';
        }
        if (principal.isValid()) {
            UserData.checkUser().then(function(result) {
                // Turn off content saving.
                Format.setImageEditing(true);
                // Store editImage
                
                var stored_clck = $('.' + parent_container + ' #cropper_' + id).attr("onclick");
                self.setEditClick(stored_clck, parent_container, id);
                $('.' + parent_container + ' #cropper_' + id).attr("onclick", null);
                
                // Only do this here? Check if data-src exists, if not create it.
                // restore image
                var src = $('.' + parent_container + ' #image_' + id).attr('data-src');
                if (src == undefined) {
                    var src_original = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id).attr('src');
                    $('.' + parent_container + ' #cropper_' + id + ' #image_' + id).attr('data-src', src_original);
                    //$('.' + parent_container + ' #image_' + id).attr('src', src_original);
                } else {
                    $('.' + parent_container + ' #image_' + id).attr('src', src);
                }
                
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
                        $(ia).attr('id', 'image_adjust_' + id);
                        ia.insertBefore('.' + parent_container + ' #cropper_' + id);

                        //$('#image_adjust_' + id).css('visibility', 'visible');
                        //$('#image_adjust_' + id).css('position', 'relative');
                        var edit_btns = "<div class='image_editor'><div class='image_edit_btns'><div class='' onclick='adjustImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_tune'>tune</i></div><div class='' onclick='filterImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_filter'>filter</i></div><div class='' onclick='openCrop(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_crop' >crop</i></div><div class='close_image_edit' onclick='closeEdit(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_close'>&#xE14C;</i></div></div><div class='crop_edit'><div class='set_crop' onclick='setCrop(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_accept'>&#xe876;</i></div></div></div>";
                        // set this to active
                        //$('#image_adjust_' + id).addClass('image_adjust_on');
                        $('#image_adjust_' + id).append(edit_btns);
                        // Adjust marging top if this is the topmost image.
                        if ($('.' + parent_container + ' #cropper_' + id).attr('class').indexOf('no_image_space') >= 0) {
                            $('#image_adjust_' + id).addClass('no_image_space_adjust');
                        }
                        // set this to active
                        $('#image_adjust_' + id).addClass('image_adjust_on');
                    }
                }
            });
        }
    };

    this.setEditClick = function(val, container, id) {
        this.click_val = val;
        this.container = container;
        this.id = id;
    };

    this.restoreEditClick = function() {
        $('.' + this.container + ' #cropper_' + this.id).attr("onclick", this.click_val);
    };

    this.destroyCrop = function() {
        // TODO
        // remove the crop box ?
        //self.removeCrop();
    };

    this.makeCrop = function(e, id) {
        e.preventDefault();
        e.stopPropagation();
        // TODO ImageAdjustment function Get the scale ratio
        var orig_image = $('.content_cnv #cropper_' + id + ' #image_' + id)[0];
        nat_w = orig_image.naturalWidth;
        var crop_image = document.getElementById('crop_src');
        cur_w = $(crop_image).outerWidth();
        var scale = nat_w / cur_w;
        var crop_area = $('.crop_box.active .crop_adjust')[0];
        var sx = crop_area.offsetLeft * scale;
        var sy = crop_area.offsetTop * scale;
        var swidth = $(crop_area).outerWidth() * scale;
        var sheight = $(crop_area).outerHeight() * scale;
        var x = 0;
        var y = 0;
        var source_canvas = document.getElementById('crop_src');
        var cropped_canvas = document.createElement("canvas");
        cropped_canvas.width = swidth;
        cropped_canvas.height = sheight;
        var ctx = cropped_canvas.getContext('2d');
        ctx.drawImage(source_canvas, sx, sy, swidth, sheight, 0, 0, swidth, sheight);
        // img, sx, sy, swidth, sheight, x, y, width, height
        self.canvasToImage(cropped_canvas, id).then(function(image) {
            // If Adjusted exists hide original.
            if ($('.content_cnv #cropper_' + id + ' .adjusted').length > 0) {
                $('.content_cnv #cropper_' + id + ' .adjusted').remove();
            }
            // remove the crop box
            self.removeCrop();
            // add the new image
            var img_new = $(image).prependTo('.content_cnv #cropper_' + id);
            var crop_data = { 'x': sx, 'y': sy, 'width': swidth, 'height': sheight };
            ImageAdjustment.setImageAdjustment('content_cnv', id, 'crop', crop_data);
            ImageAdjustment.setImageAdjusted(true);
            var image_original = $('.content_cnv #cropper_' + id + ' #image_' + id)[0];
            self.adjustSrc(image_original, 'hide');
            // SAVE    
            $('.content_cnv #cropper_' + id).closest('div.ce').attr('contenteditable', 'true');
            Format.setImageEditing(false);
            $('.content_cnv #cropper_' + id).closest('div.ce').focus();
            $('.content_cnv #cropper_' + id).closest('div.ce').blur();

        });
    };

    this.removeCrop = function() {
        $('.crop_box.active').remove();
        if ($('.temp_canvas_filtered').length > 0) {
            $('.temp_canvas_filtered').remove();
        }
        if ($('.temp_crop_hide').length > 0) {
            //$('.temp_crop_hide').css('display', 'unset');
            $('.temp_crop_hide').removeClass('hide');
            $('.temp_crop_hide').removeClass('temp_crop_hide');
        }
        $('.crop_bg').remove();
        self.restoreEditClick();
    };

    this.cancelCrop = function(e) {
        e.preventDefault();
        e.stopPropagation();
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();
        var image_original = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
            $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').removeClass('hide');
            self.adjustSrc(image_original, 'hide');
        } else {
            $(image_original).removeClass('.hide');
        }


        self.removeCrop();
    };

    this.buildCrop = function(parent_container, id, target) {
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
        //Make the DIV element draggagle:
        Drag.setUp(document.getElementById("drag"));
        // Make resizable.
        Resize.makeResizableDiv('.resizers', id);
    };

    // openCrop - composeFilter target, composeFilter source, setSharpen(target, source(canvas of orig))
    this.openCrop = function(e, id) {
        console.log('openCrop');
        var deferred = $q.defer();
        var promises = [];
        var parent_container;
        // Get the context of the image (content_cnv or card_create_container)
        if ($(e.target).parents('div.card_create_container').length > 0) {
            parent_container = 'card_create_container';
        } else {
            parent_container = 'content_cnv';
        }
        ImageAdjustment.setImageParent(parent_container);
        ImageAdjustment.setImageId(id);
        var crop = $('.crop_box').clone().prependTo('.' + parent_container + ' #cropper_' + id);
        crop.addClass('active');
        $('.' + parent_container + ' #cropper_' + id + ' #make_crop').attr("onclick", 'makeCrop(event, \'' + id + '\')');
        $('.image_adjust_on').remove();
        // Create canvas with all current adjustments (uncropped).
        var image = $('.' + parent_container + ' #image_' + id)[0];
        var target = imageToCanvas(image);
        var source = imageToCanvas(image);
        var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
        // All adjustements less crop - Filter target, Filter source, Sharpen target.
        /*
        if (ia != undefined) {
            var prom = ImageAdjustment.composeFilter(target, ia['filter'])
                .then(function() {
                    return ImageAdjustment.composeFilter(source, ia['filter']);
                }).then(function() {
                    return ImageAdjustment.setSharpen(parent_container, id, target, source, ia['sharpen']);
                });
            promises.push(prom);
        }
        $q.all(promises).then(function() {
            self.buildCrop(parent_container, id, target);
            deferred.resolve();
        });
        */

        if (ia != undefined) {
            // Dont crop the image.
            ia.crop = undefined;
            var prom = ImageAdjustment.applyFilters(source, ia).then(function(result) {
                target.width = result.width;
                target.height = result.height;
                var ctx = target.getContext('2d');
                ctx.drawImage(result, 0, 0);

                //self.buildCrop(parent_container, id, target);
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
        var parent_container;
        // Get the context of the image (content_cnv or card_create_container)
        if ($(e.target).parents('div.card_create_container').length > 0) {
            parent_container = 'card_create_container';
        } else {
            parent_container = 'content_cnv';
        }
        ImageAdjustment.setImageParent(parent_container);
        // Store the selected filter in a custom attribute.
        ImageAdjustment.setImageAdjustment(parent_container, id, 'filter', filter);
        var source = $('.source_canvas')[0];
        var target = $('.target_canvas')[0];
        $(target).addClass('adjusted');
        /*
        // Restore the orignal with all adjustments less filter.
        var ctx = target.getContext('2d');
        ctx.filter = "none";
        ctx.drawImage(source, 0, 0);
        // Apply the new filter.
        // filterClick - composeFilter(target)
        ImageAdjustment.composeFilter(target, filter);
        */

        var ia = ImageAdjustment.getImageAdjustments(parent_container, id);

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
        // all adjustments minus sharpen applied?
        var parent_container;
        // Get the context of the image (content_cnv or card_create_container)
        if ($(e.target).parents('div.card_create_container').length > 0) {
            parent_container = 'card_create_container';
        } else {
            parent_container = 'content_cnv';
        }
        $('.image_adjust_on').remove();
        if ($('.' + parent_container + ' #cropper_' + id + ' .image_adjust_div').length <= 0) {
            var filt = $('.image_adjust_div').clone().insertAfter('.' + parent_container + ' #cropper_' + id);
            filt.attr('id', 'adjust_' + id);
            filt.css('position', 'relative');
            filt.addClass('filters_active');
            filt.css('visibility', 'visible');
            // TODO - function to handle all adjustments minus filter.
            ImageAdjustment.setImageId(id);
            ImageAdjustment.setImageParent(parent_container);
            var data = { 'id': id };
            // Get the last position of the slider.
            var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
            if (ia != undefined) {
                // TODO store as slider pos.
                data.last_position = ia.sharpen;
            }
            $rootScope.$broadcast('rzSliderRender', data);
        }
        var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
        var image = $('.' + parent_container + ' #image_' + id)[0];
        //if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
        //    previously_adjusted = $('.' + parent_container + ' #cropper_' + id + ' img.adjusted')[0];
        //}

        //hideAdjusted(parent_container, id);
        var target = imageToCanvas(image);
        var source = imageToCanvas(image);
        target.setAttribute('id', 'temp_canvas_filtered_' + id);
        target.setAttribute('class', 'target_canvas');
        source.setAttribute('class', 'source_canvas');

        $(source).addClass('hide');
        $(target).addClass('hide');

        $(target).insertBefore('.' + parent_container + ' #image_' + id);
        $(source).insertBefore('.' + parent_container + ' #image_' + id);
        //$('.' + parent_container + ' #cropper_' + id + ' #image_' + id).addClass('hide');

        ImageAdjustment.setSource(source);
        ImageAdjustment.setTarget(target);

        //if (ia != undefined) {
        ImageAdjustment.applyFilters(source, ia).then(function(result) {
            console.log(result);
            target.width = result.width;
            target.height = result.height;
            var ctx = target.getContext('2d');
            ctx.drawImage(result, 0, 0);
            //var r = $(result).insertBefore('.' + parent_container + ' #image_' + id);
            //$(r).addClass('apply_filters');
            //$('.' + parent_container + ' #cropper_' + id + ' #image_' + id).addClass('hide');
            //$(previously_adjusted).addClass('hide');
            //$(image).addClass('hide');
            hideOriginal(parent_container, id);
            hideAdjusted(parent_container, id);
            $(target).removeClass('hide');
        });
        //}

        /*
        if (ia != undefined) {
            // adjustImage
            // var target = imageToCanvas(image);
            // var source = imageToCanvas(image);
            // - setSharpen(target, source, composeFilter(target), composeFilter(source), applyCrop(target), applyCrop(source)
            console.log('sharpen: ' + ia['sharpen']);
            ImageAdjustment.setSharpen(parent_container, id, target, source, ia['sharpen'])
                .then(function() {
                    return ImageAdjustment.composeFilter(target, ia['filter'])
                }).then(function() {
                    return ImageAdjustment.composeFilter(source, ia['filter'])
                }).then(function() {
                    return ImageAdjustment.applyCrop(target, ia['crop'])
                }).then(function() {
                    return ImageAdjustment.applyCrop(source, ia['crop'])
                });
        }
        */
        // If there is already an adjusted image then hide it.

        e.stopPropagation();
    };

    hideAdjusted = function(parent_container, id) {
        // If there is already an adjusted image then hide it.
        if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
            $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').addClass('hide');
        }
    };

    hideOriginal = function(parent_container, id) {
        // Hide the original image.
        $('.' + parent_container + ' #cropper_' + id + ' #image_' + id).addClass('hide');
        var image_original = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        self.adjustSrc(image_original, 'hide');

    };

    this.buildFilters = function(parent_container, id, image) {
        var filt = $('.image_filt_div').clone().insertAfter('.' + parent_container + ' #cropper_' + id);
        filt.attr('id', 'filters_' + id);
        filt.css('position', 'relative');
        filt.addClass('filters_active');
        filt.css('visibility', 'visible');
        for (var i in filter_array) {
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
            $(title).html(filter_array[i].filter_name);
            $(title).appendTo($(outmost));
            $(outer).removeAttr('class');
            $(outer).addClass('cropper_cont');
            $(outer).addClass('filter_thumb');
            $(outer).addClass(filter_array[i].filter_css_name);
            $(outer).attr('onClick', 'filterClick(event, this, "' + id + '", "' + filter_array[i].filter_css_name + '")');
        }
        // Set the cropper height to avoid jump when adding removing images.
        $('.' + parent_container + ' #cropper_' + id).css('height', '');
    };

    // filterImage - setSharpen target, setSharpen source, composeFilter target, applyCrop target, applyCrop source.
    this.filterImage = function(e, id) {
        var parent_container;
        // Get the context of the image (content_cnv or card_create_container)
        if ($(e.target).parents('div.card_create_container').length > 0) {
            parent_container = 'card_create_container';
        } else {
            parent_container = 'content_cnv';
        }
        $('.image_adjust_on').remove();
        ImageAdjustment.setImageId(id);
        // Hide the original image.
        //$('.' + parent_container + ' #cropper_' + id + ' #image_' + id).addClass('hide');
        if ($('.' + parent_container + ' #cropper_' + id + ' .image_filt_div').length <= 0) {
            var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
            var image = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
            var source = imageToCanvas(image);
            var target = imageToCanvas(image);
            // Set the cropper height to avoid jump when adding removing images.
            //$('.' + parent_container + ' #cropper_' + id).css('height', $(target).height());
            //var canvas_source_copy = imageToCanvas(image);
            $(source).addClass('source_canvas');
            //$(source).addClass('hide');
            $(target).addClass('target_canvas');
            $(target).addClass('hide');
            var source2 = $(source).prependTo('.content_cnv #cropper_' + id)[0];
            var target2 = $(target).prependTo('.content_cnv #cropper_' + id)[0];


            //$(target).addClass('hide');

            if (ia != undefined) {
                // Target canvas
                ImageAdjustment.applyFilters(source, ia).then(function(result) {
                    target.width = result.width;
                    target.height = result.height;
                    var ctx = target.getContext('2d');
                    ctx.drawImage(result, 0, 0);


                });
                // Source canvas
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

            /*
            if (ia != undefined) {
                ImageAdjustment.setSharpen(parent_container, id, target, source, ia['sharpen'])
                    .then(function() {
                        return ImageAdjustment.setSharpen(parent_container, id, source, source, ia['sharpen'])
                    }).then(function() {
                        return ImageAdjustment.composeFilter(target, ia['filter']);
                    }).then(function() {
                        return ImageAdjustment.applyCrop(target, ia['crop']);
                    }).then(function() {
                        return ImageAdjustment.applyCrop(source, ia['crop']);
                    }).then(function() {
                        self.canvasToTempImage(source, id).then(function(image) {
                            self.buildFilters(parent_container, id, image);
                        });
                    });
            } else {
                self.canvasToTempImage(source, id).then(function(image) {
                    self.buildFilters(parent_container, id, image);
                });
            }*/

        }
        e.stopPropagation();
    };

    this.closeFilters = function(e) {
        var deferred = $q.defer();
        var promises = [];
        var parent_container;
        // Get the context of the image (content_cnv or card_create_container)
        if ($(e.target).parents('div.card_create_container').length > 0) {
            parent_container = 'card_create_container';
        } else {
            parent_container = 'content_cnv';
        }
        // Hide original image
        var id = ImageAdjustment.getImageId();
        $('.' + parent_container + ' #' + e.target.id).closest('div.ce').attr('contenteditable', 'true');
        $('.filters_active').remove();
        // no adjustement made. no previously adjusted - show original image
        // no adjustement made. prev adjusted exists - show prev adjusted.
        // adjustement made. no prev adjusted exists canvas to image
        // adjustement made. prev adjusted exists remove then canvas to image.
        // Get previously adjusted.
        var prev_adjusted = $('.adjusted.hide')[0];
        var current_adjusted = $('.target_canvas.adjusted')[0];
        var current_canvas = $('.target_canvas')[0];
        var source_canvas = $('.source_canvas')[0];
        var image_original = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        // Set the cropper height to avoid jump when adding removing images.
        $('.' + parent_container + ' #cropper_' + id).css('height', $(current_canvas).height());
        self.adjustSrc(image_original, 'hide');
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
                self.adjustSrc(image_original, 'show');
            }
            $(current_canvas).remove();
            $(source_canvas).remove();
            $('.' + parent_container + ' #cropper_' + id).css('height', '');
            deferred.resolve();
        }
        $q.all(promises).then(function() {
            self.restoreEditClick();
            // SAVE
            //Format.setImageEditing(false);

            Format.setImageEditing(true);
            //$('.' + parent_container + ' #cropper_' + id).closest('div.ce').focus();
            //$('.' + parent_container + ' #cropper_' + id).closest('div.ce').blur();
            console.log( $('.' + parent_container + ' #cropper_' + id).closest('div.card_temp'));
            $('.' + parent_container + ' #cropper_' + id).closest('div.card_temp').focus();
            //$('#hidden_input_container').focus();
            
            //$timeout(function() {
                $('.' + parent_container + ' #cropper_' + id).closest('div.ce').focus();
                $('.' + parent_container + ' #cropper_' + id).closest('div.ce').blur();
            //}, 1000);



            deferred.resolve();
        });
        e.stopPropagation();
        return deferred.promise;
    };

    this.closeEdit = function(e, id) {
        var parent_container;
        // Get the context of the image (content_cnv or card_create_container)
        if ($(e.target).parents('div.card_create_container').length > 0) {
            parent_container = 'card_create_container';
        } else {
            parent_container = 'content_cnv';
        }
        e.stopPropagation();
        //console.log(Format.getImageEditing());
        $('.' + parent_container + ' #' + e.target.id).closest('div.ce').attr('contenteditable', 'true');
        $('.image_adjust_on').remove();
        $('.' + parent_container + ' #cropper_' + id).removeClass('cropping');
        removeTempCanvas(id);
        self.restoreEditClick();

        if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
            hideOriginal(parent_container, id);
        }

        Format.setImageEditing(false);
        console.log(ImageAdjustment.getImageAdjusted());
        if (ImageAdjustment.getImageAdjusted()) {
            // SAVE       
            //$('.' + parent_container + ' #cropper_' + id).closest('div.ce').focus();
            //$('.' + parent_container + ' #cropper_' + id).closest('div.ce').blur();
            ImageAdjustment.setImageAdjusted(false);
        } 
        //bindScroll();
    };

    this.adjustSrc = function(image, state) {
        // restore image
        var datsrc = $(image).attr('data-src');
        var src_original = $(image).attr('src');
        var hide_image = '/assets/images/transparent.gif';
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

}]);