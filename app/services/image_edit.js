//
// ImageEdit Service
//

cardApp.service('ImageEdit', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', 'ImageAdjustment', 'Drag', 'Resize', 'Keyboard', 'Scroll', 'Slider', 'ImageManipulate', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal, ImageAdjustment, Drag, Resize, Keyboard, Scroll, Slider, ImageManipulate) {

    var ua = navigator.userAgent;
    var self = this;
    var mobile = false;
    var temp_save = false;
    // Used for rotating a cropping image(s).
    var canvas_original;
    var crop_area_original;
    var ctx_crop_bg;
    var ctx_crop_src;
    var ctx_original;

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
            deferred.resolve();
        });
        return deferred.promise;
    };

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
        $('.pending').addClass('active');
        $('.pending').removeClass('pending');
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
                                var edit_btns = "<div class='image_editor'><div class='image_edit_btns'><div class='' onclick='testImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_tune'>adjust</i></div>  <div class='' onclick='adjustImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_tune'>tune</i></div><div class='' onclick='filterImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_filter'>filter</i></div><div class='' onclick='openCrop(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_crop' >crop</i></div><div class='close_image_edit' onclick='closeEdit(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_close'>&#xE14C;</i></div></div></div>";
                                $('#image_adjust_' + id).append(edit_btns);
                                // Adjust marging top if this is the topmost image.
                                if ($('.' + parent_container + ' #cropper_' + id).attr('class').indexOf('no_image_space') >= 0) {
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
        e.preventDefault();
        e.stopPropagation();
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
        console.log(scale);
        console.log(Math.round($(crop_area).outerWidth()));
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
        var init_h = $(cropper).outerHeight();
        // Set the cropper height to its current height so that it can be animated.
        $(cropper).css('height', init_h);
        // If Adjusted exists hide original.
        if ($('.content_cnv #cropper_' + id + ' .adjusted').length > 0) {
            $('.content_cnv #cropper_' + id + ' .adjusted').remove();
        }
        // Hide the original image.
        adjustSrc(original_image, 'hide');
        console.log(crop_data);
        ImageAdjustment.crop(source_canvas, crop_data).then(function(canvas) {
            console.log(canvas);
            // remove the crop box
            self.removeCrop();
            // remove the slider
            self.removeSlider();
            // Animate the cropped image onto screen.
            $(cropper).animate({ height: anim_h }, {
                duration: 300,
                easing: "easeOutExpo",
                start: function() {
                    self.canvasToImage(canvas, id).then(function(image) {
                        var img_new = $(image).prependTo('.content_cnv #cropper_' + id);
                        $(img_new).css('opacity', 0);
                        $(img_new).addClass('show_image');
                        showImage('.show_image').then(function(canvas) {
                            $(":animated").promise().done(function() {
                                // animation finished
                                ImageAdjustment.setImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'crop', crop_data);
                                ImageAdjustment.setImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'rotate', $rootScope.slider_settings.rotate.amount);
                                ImageAdjustment.setImageAdjusted(true);
                                // Unset the height of the cropper.
                                //$('.content_cnv #cropper_' + id).css('height', '');
                                // Save
                                ImageAdjustment.setImageEditing(false);
                                saveCropper(cropper);
                            });
                        });
                    });
                },
                complete: function() {
                   // $(cropper).css('height', 'unset');
                }
            });
        });
    };

    this.removeSlider = function() {
        if ($('.rzslider').length > 0) {
            $('.rzslider').remove();
        }
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
    };

    this.cancelCrop = function(e) {
        e.preventDefault();
        e.stopPropagation();
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        setContenteditable(cropper, true);
        var io = ImageAdjustment.getImageOriginal(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId());

        var anim_h;
        var anim_w;
        var image_original = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        var scale = ImageAdjustment.getScale(image_original, cropper);
        if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
            $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').removeClass('hide');
            adjustSrc(image_original, 'hide');
            anim_h = $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').height();
            anim_w = $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').width();
            console.log(anim_w);
        } else {
            console.log(scale);

            $(image_original).removeClass('hide');
            //anim_h = $(image_original).height();
            //anim_w = $(image_original).width();
            anim_h = (io.nat_height / scale).toFixed(2);
            console.log(anim_h);
            anim_w = io.nat_width;
            console.log(anim_w);
        }
        self.removeCrop();
        self.removeSlider();
        ImageAdjustment.setImageEditing(false);
        // Animate bck to the existing image (original or adjusted).
        $(cropper).animate({ height: anim_h }, {
            duration: 300,
            easing: "easeOutExpo",
            start: function() {},
            complete: function() {
                $(cropper).css('height', '');
            }
        });
    };

    this.buildCrop = function(parent_container, id, target) {
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        var original_image = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        var scale = ImageAdjustment.getScale(original_image, cropper);
        //var anim_h = (original_image.naturalHeight / scale).toFixed(2);


        var anim_h = original_image.naturalHeight / scale;
        console.log(anim_h);
        var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
        if (ia != undefined) {
            if (ia.rotated == '90' || ia.rotated == '270') {
                anim_h = original_image.naturalWidth;
                console.log(anim_h);
            }
        }

        console.log(anim_h);
        var init_h = $(cropper).outerHeight();
        // Set the cropper height to its current height so that it can be animated.
        $(cropper).css('height', init_h);
        // Animate the cropper tool onscreen
        $(cropper).animate({ height: anim_h }, {
            duration: 500,
            easing: "easeOutExpo",
            start: function() {
                $('.' + parent_container + ' #image_' + id).addClass('hide');
                var new_canvas_src = ImageAdjustment.cloneCanvas(target);
                var new_canvas_bg = ImageAdjustment.cloneCanvas(target);
                var new_canvas_perspective = ImageAdjustment.cloneCanvas(target);
                $(new_canvas_src).addClass('hide');
                $(new_canvas_bg).addClass('hide');
                var img = $(new_canvas_src).appendTo('.' + parent_container + ' #cropper_' + id + ' .crop_area');
                $(img).addClass('temp_canvas_filtered');
                var img_bg = $(new_canvas_bg).appendTo('.' + parent_container + ' #cropper_' + id);
                $(img_bg).addClass('crop_bg');
                $(img).attr('id', 'crop_src');
                $('.' + parent_container + ' #cropper_' + id + ' .crop_adjust').attr('id', 'drag');
                //var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
                // Set up Perspective
                ImageAdjustment.perspectiveInit(new_canvas_perspective).then(function(p) {
                    ImageAdjustment.perspective_setup(p.cvso_lo.width, p.cvso_lo.height, p.cvso_hi.width, p.cvso_hi.height).then(function(result) {
                        p.start_values = result;
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
                        var crop_data;
                        if (ia != undefined) {
                            crop_data = ia.crop;
                            if (ia.rotate != undefined) {
                                $rootScope.slider_settings.rotate.amount = ia.rotate;
                                // rotate the image(s).
                                self.sliderRotateChange(ia.rotate);
                            }
                        }
                        var original_image = $('.content_cnv #cropper_' + id + ' #image_' + id)[0];
                        //Make the DIV element draggagle:
                        Drag.setUp(document.getElementById("drag"), document.getElementById("crop_src"), document.querySelector('.crop_area'));
                        // Make resizable.
                        Resize.makeResizableDiv('.resizers', '.crop_area', '#crop_src', original_image, crop_data, id);
                        hideImages(parent_container, id);
                    });
                });
            },
            complete: function() {
                //
                $(cropper).css('height', '');
            }
        });
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
            //rotate_val = ia.rotate;
            //ia.rotated = undefined;
            //perspective_val = ia.perspective;
            //ia.perspective = undefined;
        }

        ImageAdjustment.applyFilters(image, ia).then(function(new_image) {
            canvas_original = ImageAdjustment.cloneCanvas(new_image);
            crop_area_original = ImageAdjustment.cloneCanvas(new_image);
            console.log(canvas_original);


            $('.content_cnv #cropper_' + ImageAdjustment.getImageId()).css('maxWidth', new_image.width + 'px');
            //            $('.content_cnv #cropper_' + ImageAdjustment.getImageId()).css('height', new_image.height + 'px');
            // check whether rotated.
            var p = ImageAdjustment.getPerspective();
            console.log(p);

            /*
            var ctx1 = $('.crop_bg')[0].getContext('2d');
            var ctx2 = $('#crop_src')[0].getContext('2d');
            $('.crop_bg')[0].width = canvas_original.width;
            $('.crop_bg')[0].height = canvas_original.height;
            $('#crop_src')[0].width = canvas_original.width;
            $('#crop_src')[0].height = canvas_original.height;
            // Transform the context so that the image is centred like it is for the rotate function.
            ctx1.setTransform(1, 0, 0, 1, p.cvso_hi.width / 2, p.cvso_hi.height / 2);
            ctx2.setTransform(1, 0, 0, 1, p.cvso_hi.width / 2, p.cvso_hi.height / 2);
            ctx1.drawImage(canvas_original, -p.cvso_hi.width / 2, -p.cvso_hi.height / 2);
            ctx2.drawImage(canvas_original, -p.cvso_hi.width / 2, -p.cvso_hi.height / 2);
            p.ctxd1 = ctx1;
            p.ctxd2 = ctx2;
            */


            //ctx1.drawImage(canvas_original, -p.cvso_hi.width / 2, -p.cvso_hi.height / 2);
            //ctx2.drawImage(canvas_original, -p.cvso_hi.width / 2, -p.cvso_hi.height / 2); 
            //console.log(rotate_val);
            //if (p.ctxo_hi.canvas.width != canvas_original.width) {
            //if (p.rotated != ia.rotated) {
            if (false) {
                console.log('set up perspective');
                // Set up Perspective
                ImageAdjustment.perspectiveInit(canvas_original).then(function(p) {
                    console.log(p);
                    ImageAdjustment.perspective_setup(p.cvso_lo.width, p.cvso_lo.height, p.cvso_hi.width, p.cvso_hi.height).then(function(result) {
                        p.start_values = result;
                        var ctx1 = $('.crop_bg')[0].getContext('2d');
                        var ctx2 = $('#crop_src')[0].getContext('2d');

                        $('.crop_bg')[0].width = canvas_original.width;
                        $('.crop_bg')[0].height = canvas_original.height;
                        $('#crop_src')[0].width = canvas_original.width;
                        $('#crop_src')[0].height = canvas_original.height;


                        // Transform the context so that the image is centred like it is for the rotate function.
                        ctx1.setTransform(1, 0, 0, 1, p.cvso_hi.width / 2, p.cvso_hi.height / 2);
                        ctx2.setTransform(1, 0, 0, 1, p.cvso_hi.width / 2, p.cvso_hi.height / 2);

                        ctx1.drawImage(canvas_original, -p.cvso_hi.width / 2, -p.cvso_hi.height / 2);
                        ctx2.drawImage(canvas_original, -p.cvso_hi.width / 2, -p.cvso_hi.height / 2);
                        p.ctxd1 = ctx1;
                        p.ctxd2 = ctx2;
                        /*           
         ctx1.width = p.cvso_hi.width;
            ctx1.height = p.cvso_hi.height;
            ctx2.width = p.cvso_hi.width;
            ctx2.height = p.cvso_hi.height;
             ctx1.drawImage(p.cvso_hi,  ctx1.width/2, ctx1.height/2);
            ctx2.drawImage(p.cvso_hi, ctx2.width/2, ctx2.height/2);   
*/


                        p.rotated = ia.rotated;
                        //ImageAdjustment.setPerspective(p);
                        ImageAdjustment.setPerspective(p);

                        // if (ia != undefined) {
                        //if (perspective_val != undefined) {
                        //$rootScope.slider_settings.perspective_v.amount = ia.perspective.vertical;
                        //$rootScope.slider_settings.perspective_h.amount = ia.perspective.horizontal;
                        //ImageAdjustment.quickPerspectiveChange(perspective_val.vertical, perspective_val.horizontal, 'high');
                        //}

                        //if(rotated_val != undefined){
                        //ImageAdjustment.quickRotate(ctx1, canvas_original, rotate_val);
                        //ImageAdjustment.quickRotate(ctx2, canvas_original, rotate_val);
                        //}


                        //}
                        /*
                        if (ia != undefined) {
                            if (ia.perspective != undefined) {
                                $rootScope.slider_settings.perspective_v.amount = ia.perspective.vertical;
                                $rootScope.slider_settings.perspective_h.amount = ia.perspective.horizontal;
                                ImageAdjustment.quickPerspectiveChange(ia.perspective.vertical, ia.perspective.horizontal, 'high');
                            }
                        }
                        */
                    });
                });
            } else {
                /*
                                  var ctx1 = $('.crop_bg')[0].getContext('2d');
                        var ctx2 = $('#crop_src')[0].getContext('2d');
                        // Transform the context so that the image is centred like it is for the rotate function.
                        //ctx1.setTransform(1, 0, 0, 1, p.cvso_hi.width / 2, p.cvso_hi.height / 2);
                        //ctx2.setTransform(1, 0, 0, 1, p.cvso_hi.width / 2, p.cvso_hi.height / 2);

              
            // var crop_bg = $('.crop_bg')[0];
       // var crop_src = $('#crop_src')[0];

             // console.log(result);
            ctx1.height = new_image.height;
            ctx1.width = new_image.width;
            ctx2.height = new_image.height;
            ctx2.width = new_image.width;
            //ctx1 = crop_bg.getContext('2d');
            ctx1.drawImage(new_image, 0, 0);
            //ctx2 = crop_src.getContext('2d');
            ctx2.drawImage(new_image, 0, 0);    
            */
            }
            //var h = $rootScope.slider_settings.perspective_h.amount;
            /*
                                // Set up Perspective
                ImageAdjustment.perspectiveInit(new_canvas_perspective).then(function(p) {
                    ImageAdjustment.perspective_setup(p.cvso_lo.width, p.cvso_lo.height, p.cvso_hi.width, p.cvso_hi.height).then(function(result) {
                        p.start_values = result;
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
                    });
                });
                */
        });

    };

    this.sliderRotateChange = function(value) {
        ImageAdjustment.quickRotate(ctx_crop_bg, canvas_original, value);
        ImageAdjustment.quickRotate(ctx_crop_src, crop_area_original, value);
    };

    var storePerspectiveValue = function(direction, value) {
        var opposite_dir;
        if (direction == 'horizontal') {
            opposite_dir = 'vertical';
        } else {
            opposite_dir = 'horizontal';
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
    var reversed = false;
    var reverse = function(ctx, x, y) {
        var canvas = document.createElement('canvas');
        canvas.width = ctx.canvas.width;
        canvas.height = ctx.canvas.height;
        var ctx2 = canvas.getContext('2d');
        var imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        // Traverse every row and flip the pixels
        for (i = 0; i < imageData.height; i++) {
            // We only need to do half of every row since we're flipping the halves
            for (j = 0; j < imageData.width / 2; j++) {
                var index = (i * 4) * imageData.width + (j * 4);
                var mirrorIndex = ((i + 1) * 4) * imageData.width - ((j + 1) * 4);
                for (var q = 0; q < 4; q++) {
                    var temp = imageData.data[index + q];
                    imageData.data[index + q] = imageData.data[mirrorIndex + q];
                    imageData.data[mirrorIndex + q] = temp;
                }
            }
        }
        ctx2.putImageData(imageData, 0, 0);
        ctx.drawImage(ctx2.canvas, x, y);
        return ctx2;
    };

    this.flipH = function(e) {
        console.log('flipH');
        e.preventDefault();
        e.stopPropagation();
        var flip_h = ImageAdjustment.getImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'flip_h');
        var ctx1 = $('.crop_bg')[0].getContext('2d');
        var ctx2 = $('#crop_src')[0].getContext('2d');
        if (!flip_h) {
            ImageAdjustment.setImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'flip_h', 'true');
        } else {
            ImageAdjustment.removeImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'flip_h');
        }
        var p = ImageAdjustment.getPerspective();
        var h = $rootScope.slider_settings.perspective_h.amount;
        var v = $rootScope.slider_settings.perspective_v.amount;
        ImageAdjustment.quickFlipH(p.ctxd.getContext('2d'), 0, 0);
        ImageAdjustment.quickFlipH(p.ctxo_hi, 0, 0);
        ImageAdjustment.quickFlipH(p.ctxo_lo, 0, 0);
        ImageAdjustment.flipH(ctx1.canvas, 0, 0).then(function(result) {
            ctx1.drawImage(result, 0, 0);
            ImageAdjustment.quickPerspectiveChange(v, h, 'high');
        });
        ImageAdjustment.flipH(ctx2.canvas, 0, 0).then(function(result) {
            ctx2.drawImage(result, 0, 0);
            ImageAdjustment.quickPerspectiveChange(v, h, 'high');
        });
        self.sliderRotateUpdate();
    };

    var setUpRotated = function(angle) {
        var image_original = $('.' + ImageAdjustment.getImageParent() + ' #cropper_' + ImageAdjustment.getImageId() + ' #image_' + ImageAdjustment.getImageId())[0];
        var source = self.imageToCanvas(image_original);
        var crop_bg = $('.crop_bg')[0];
        var crop_src = $('#crop_src')[0];
        //$('.content_cnv #cropper_' + ImageAdjustment.getImageId()).css('maxWidth', '');
        var ia = ImageAdjustment.getImageAdjustments(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId());
        console.log(ia);
        var stored_perspective = ia.perspective;
        var stored_rotate = ia.rotate;
        stored_rotated = ia.rotated;
        ia.crop = undefined;
        ia.perspective = undefined;
        ia.rotate = undefined;
        ImageAdjustment.applyFilters(source, ia).then(function(canvas_originaly) {
            //ImageAdjustment.rotated(source, angle).then(function(result) {
            console.log(canvas_original);
            canvas_original = canvas_originaly;
            crop_area_original = canvas_originaly;
            var p = ImageAdjustment.getPerspective();

            // Transform the context so that the image is centred like it is for the rotate function.
            /*ctx1.setTransform(1, 0, 0, 1, p.cvso_hi.width / 2, p.cvso_hi.height / 2);
            ctx2.setTransform(1, 0, 0, 1, p.cvso_hi.width / 2, p.cvso_hi.height / 2);
            ctx1.drawImage(result, -p.cvso_hi.width / 2, -p.cvso_hi.height / 2);
            ctx2.drawImage(result, -p.cvso_hi.width / 2, -p.cvso_hi.height / 2);
            p.ctxd1 = ctx1;
            p.ctxd2 = ctx2;*/

            $('.crop_bg')[0].width = canvas_original.width;
            $('.crop_bg')[0].height = canvas_original.height;
            $('#crop_src')[0].width = canvas_original.width;
            $('#crop_src')[0].height = canvas_original.height;
            $('.content_cnv #cropper_' + ImageAdjustment.getImageId()).css('maxWidth', canvas_original.width + 'px');
            $('.content_cnv #cropper_' + ImageAdjustment.getImageId()).css('height', '');
            //$('.content_cnv #cropper_' + ImageAdjustment.getImageId()).css('maxWidth', '');

            /*
                        var ctx1 = $('.crop_bg')[0].getContext('2d');
                        var ctx2 = $('#crop_src')[0].getContext('2d');
                        $('.crop_bg')[0].width = result.width;
                        $('.crop_bg')[0].height = result.height;
                        $('#crop_src')[0].width = result.width;
                        $('#crop_src')[0].height = result.height;
                        // Transform the context so that the image is centred like it is for the rotate function.
                        ctx1.setTransform(1, 0, 0, 1, p.cvso_hi.width / 2, p.cvso_hi.height / 2);
                        ctx2.setTransform(1, 0, 0, 1, p.cvso_hi.width / 2, p.cvso_hi.height / 2);
                        ctx1.drawImage(result, -p.cvso_hi.width / 2, -p.cvso_hi.height / 2);
                        ctx2.drawImage(result, -p.cvso_hi.width / 2, -p.cvso_hi.height / 2);
                        //p.ctxd1 = ctx1;
                        //p.ctxd2 = ctx2;
            */
            if (true) {
                console.log('set up perspective');
                // Set up Perspective
                ImageAdjustment.perspectiveInit(canvas_original).then(function(p) {
                    console.log(p);
                    ImageAdjustment.perspective_setup(p.cvso_lo.width, p.cvso_lo.height, p.cvso_hi.width, p.cvso_hi.height).then(function(result) {
                        p.start_values = result;

                        // ImageAdjustment.quickRotate(ctx_crop_bg, canvas_original, value);
                        //ImageAdjustment.quickRotate(ctx_crop_src, crop_area_original, value);
                        ctx_crop_bg = $('.crop_bg')[0].getContext('2d');
                        ctx_crop_src = $('#crop_src')[0].getContext('2d');

                        $('.crop_bg')[0].width = canvas_original.width;
                        $('.crop_bg')[0].height = canvas_original.height;
                        $('#crop_src')[0].width = canvas_original.width;
                        $('#crop_src')[0].height = canvas_original.height;
                        // Transform the context so that the image is centred like it is for the rotate function.
                        var w = p.cvso_hi.width;
                        var h = p.cvso_hi.height;
                        if (stored_rotated == '90') {
                            console.log('DO 90');
                            // w = p.cvso_hi.height;
                            // h = p.cvso_hi.width;
                        }
                        ctx_crop_bg.setTransform(1, 0, 0, 1, w / 2, h / 2);
                        ctx_crop_src.setTransform(1, 0, 0, 1, w / 2, h / 2);
                        ctx_crop_bg.drawImage(canvas_original, -canvas_original.width / 2, -canvas_original.height / 2);
                        ctx_crop_src.drawImage(canvas_original, -canvas_original.width / 2, -canvas_original.height / 2);
                        p.ctxd1 = ctx_crop_bg;
                        p.ctxd2 = ctx_crop_src;
                        p.rotated = ia.rotated;
                        ImageAdjustment.setPerspective(p);


                        //if (ia != undefined) {
                        if (stored_perspective != undefined) {
                            $rootScope.slider_settings.perspective_v.amount = stored_perspective.vertical;
                            $rootScope.slider_settings.perspective_h.amount = stored_perspective.horizontal;
                            ImageAdjustment.quickPerspectiveChange(stored_perspective.vertical, stored_perspective.horizontal, 'high');
                            //self.sliderRotateUpdate();
                        }
                        console.log(stored_rotate);
                        if (stored_rotate != undefined) {
                            latest_rotate = $rootScope.slider_settings.rotate.amount; // = stored_rotate;
                            // rotate the image(s).
                            self.sliderRotateChange(latest_rotate);
                        }
                        //}
                        self.sliderRotateUpdate();
                    });
                });
                //self.sliderRotateUpdate();
            }


            //p.rotated = ia.rotated;
            //ImageAdjustment.setPerspective(p);
            //ImageAdjustment.setPerspective(p);
            //ctx1.drawImage(result, 0, 0);
            //ctx2.drawImage(result, 0, 0);

            console.log(ImageAdjustment.getImageId());
            // $('.content_cnv #cropper_' + ImageAdjustment.getImageId()).css('maxWidth', result.height + 'px');

            // $('.content_cnv #cropper_' + ImageAdjustment.getImageId()).css('height', result.width + 'px');
            var crop_data;
            if (ia != undefined) {
                crop_data = ia.crop;
            }
            console.log(crop_data);
            //var crop_data = undefined;
            // Make resizable.
            Resize.makeResizableDiv('.resizers', '.crop_area', '#crop_src', image_original, crop_data, ImageAdjustment.getImageId());


        });

    };

    this.rotateImage = function(e, dir) {
        e.preventDefault();
        e.stopPropagation();
        console.log('rotateImage: ' + dir);
        var ia = ImageAdjustment.getImageAdjustments(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId());

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

        var p = ImageAdjustment.getPerspective();
        var h = $rootScope.slider_settings.perspective_h.amount;
        var v = $rootScope.slider_settings.perspective_v.amount;
        ImageAdjustment.setImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'rotated', angle);
        if (ia != undefined) {
            if (ia.perspective != undefined) {
                //ImageAdjustment.quickRotated(p.ctxd.getContext('2d'), angle);
                //ImageAdjustment.quickRotated(p.ctxo_hi, angle);
                //ImageAdjustment.quickRotated(p.ctxo_lo, angle);
                //ImageAdjustment.quickPerspectiveChange(v, h, 'high');
                setUpRotated(angle);
            } else {
                setUpRotated(angle);
            }
        } else {
            setUpRotated(angle);
        }
        // self.sliderRotateUpdate();
    };


    this.flip = function(e, dir) {
        console.log('flip: ' + dir);
        var flip_dir;
        if (dir == 'h') {
            flip_dir = 'flip_h';
        } else {
            flip_dir = 'flip_v';
        }
        e.preventDefault();
        e.stopPropagation();
        var flipped = ImageAdjustment.getImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), flip_dir);
        console.log(flipped);
        var ctx1 = $('.crop_bg')[0].getContext('2d');
        var ctx2 = $('#crop_src')[0].getContext('2d');
        if (!flipped) {
            console.log('set: ' + flip_dir);
            ImageAdjustment.setImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), flip_dir, 'true');
        } else {
            console.log('remove: ' + flip_dir);
            ImageAdjustment.removeImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), flip_dir);
        }
        var p = ImageAdjustment.getPerspective();
        var h = $rootScope.slider_settings.perspective_h.amount;
        var v = $rootScope.slider_settings.perspective_v.amount;
        if (dir == 'h') {

            //ImageAdjustment.quickFlipH(p.ctxd.getContext('2d'), 0, 0);
            ImageAdjustment.quickFlipH(p.ctxo_hi, 0, 0);
            ImageAdjustment.quickFlipH(p.ctxo_lo, 0, 0);
            //ImageAdjustment.flipH(ctx1.canvas, 0,0).then(function(result) {
            //  ctx1.drawImage(result, 0, 0);

            /*
                         var cur = $rootScope.slider_settings.rotate.amount;
                        $rootScope.slider_settings.rotate.amount = cur*-1;
                        self.sliderRotateChange($rootScope.slider_settings.rotate.amount);
                       */
            ImageAdjustment.quickPerspectiveChange(v, h, 'high');

            //});
            //ImageAdjustment.flipH(ctx2.canvas, 0,0).then(function(result) {
            //   ctx2.drawImage(result, 0, 0);
            // ImageAdjustment.quickPerspectiveChange(v, h, 'high');
            //}); 
        } else {

            //ImageAdjustment.quickFlipV(p.ctxd.getContext('2d'), 0, 0);
            ImageAdjustment.quickFlipV(p.ctxo_hi, 0, 0);
            ImageAdjustment.quickFlipV(p.ctxo_lo, 0, 0);
            //ImageAdjustment.flipV(ctx1.canvas, true).then(function(result) {
            // ctx1.drawImage(result, 0, 0);

            /*
                        var cur = $rootScope.slider_settings.rotate.amount;
                        $rootScope.slider_settings.rotate.amount = cur*-1;
                        self.sliderRotateChange($rootScope.slider_settings.rotate.amount);
                        
                        */
            ImageAdjustment.quickPerspectiveChange(v, h, 'high');
            // });
            // ImageAdjustment.flipV(ctx2.canvas, true).then(function(result) {
            //  ctx2.drawImage(result, 0, 0);
            // ImageAdjustment.quickPerspectiveChange(v, h, 'high');
            // });          
        }

        self.sliderRotateUpdate();
    };

    this.openRotate = function(e) {
        e.preventDefault();
        e.stopPropagation();
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();
        // Only open if it has not already been opened.
        console.log($('.' + parent_container + ' .rzslider').length);
        if ($('.' + parent_container + ' .rzslider').length <= 0) {
            var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
            var data_r = { 'id': id, 'type': 'rotate' };
            var data_p_v = { 'id': id, 'type': 'perspective_v' };
            var data_p_h = { 'id': id, 'type': 'perspective_h' };
            data_r.last_position = $rootScope.slider_settings.rotate.reset;
            data_p_v.last_position = $rootScope.slider_settings.perspective_v.reset;
            data_p_h.last_position = $rootScope.slider_settings.perspective_h.reset;
            // Get the last position of the slider.
            if (ia != undefined) {
                if (ia.rotate != undefined) {
                    data_r.last_position = ia.rotate;
                }
                if (ia.perspective != undefined) {
                    data_p_v.last_position = ia.perspective.vertical;
                    data_p_h.last_position = ia.perspective.horizontal;
                }
            }
            addSlider(Slider.slider_rotate, parent_container, id, data_r);
            addSlider(Slider.slider_perspective_v, parent_container, id, data_p_v);
            addSlider(Slider.slider_perspective_h, parent_container, id, data_p_h);
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

    this.openCrop = function(e, id) {
        var deferred = $q.defer();
        var promises = [];
        var parent_container = getParentContainer(e.target);
        ImageAdjustment.setImageParent(parent_container);
        ImageAdjustment.setImageId(id);
        ImageAdjustment.setImageEditing(true);
        var crop = $('.crop_box').clone().prependTo('.' + parent_container + ' #cropper_' + id);
        crop.addClass('pending');
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
            // Dont rotate the image
            ia.rotate = undefined;
            // Dont add perspective to the image
            ia.perspective = undefined;
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

    this.sliderTestChange = function(value) {
        console.log(value);
        //ImageAdjustment.quickPerspectiveChange(v, value, quality);
        var ctx_source = $('.source_canvas')[0].getContext('2d');
        var ctx_target = $('.target_canvas')[0].getContext('2d');
        //Get data for the entire image
        var data = ctx_source.getImageData(0, 0, ctx_source.canvas.width, ctx_source.canvas.height);
        //JSManipulate.lensdistortion.filter(data, { refraction: 3.0, radius: 75 });
        //JSManipulate.exposure2.filter(data, { amount: value });
        //JSManipulate.brightness.filter(data, { amount: value });
        //JSManipulate.gamma.filter(data, { amount: value });
        //JSManipulate.exposure2.filter(data, { amount: value });
        //Now finally put the data back into the context, which will render
        //the manipulated image on the page.

        //JSManipulate.exposure2.filter(data, { amount: value });
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
        var current_adjusted = $('.target_canvas.adjusted')[0];
        var current_canvas = $('.target_canvas')[0];
        var source_canvas = $('.source_canvas')[0];
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