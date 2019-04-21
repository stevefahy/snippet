//
// ImageEdit Service
//

cardApp.service('ImageEdit', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', 'ImageAdjustment', 'Drag', 'Resize', 'Keyboard', 'Scroll', '$compile', '$mdCompiler', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal, ImageAdjustment, Drag, Resize, Keyboard, Scroll, $compile, $mdCompiler) {

    var ua = navigator.userAgent;
    var self = this;
    var mobile = false;
    var temp_save = false;

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
                                var edit_btns = "<div class='image_editor'><div class='image_edit_btns'><div class='' onclick='adjustImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_tune'>tune</i></div><div class='' onclick='filterImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_filter'>filter</i></div><div class='' onclick='openCrop(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_crop' >crop</i></div><div class='close_image_edit' onclick='closeEdit(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_close'>&#xE14C;</i></div></div></div>";
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
        ImageAdjustment.crop(source_canvas, crop_data).then(function(canvas) {
            // remove the crop box
            self.removeCrop();
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
                                ImageAdjustment.setImageAdjustment('content_cnv', id, 'crop', crop_data);
                                ImageAdjustment.setImageAdjusted(true);
                                // Unset the height of the cropper.
                                $('.content_cnv #cropper_' + id).css('height', '');
                                // Save
                                ImageAdjustment.setImageEditing(false);
                                saveCropper(cropper);
                            });
                        });
                    });
                },
                complete: function() {}
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
        // Animate bck to the existing image (original or adjusted).
        $(cropper).animate({ height: anim_h }, {
            duration: 300,
            easing: "easeOutExpo",
            start: function() {}
        });
    };

    this.buildCrop = function(parent_container, id, target) {
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        var original_image = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        var scale = ImageAdjustment.getScale(original_image, cropper);
        var anim_h = original_image.naturalHeight / scale;
        var init_h = $(cropper).outerHeight();
        // Set the cropper height to its current height so that it can be animated.
        $(cropper).css('height', init_h);
        // Animate the cropper tool onscreen
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

/*
    function rotate(angle, canvas_original) {
        var scale = 4;
        var y_scale = 0
        var x_scale = 0;
        var canvas = $('.crop_bg')[0];
        var context = canvas.getContext('2d');
        context.webkitImageSmoothingEnabled = false;
        context.mozImageSmoothingEnabled = false;
        context.imageSmoothingEnabled = false;

        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
        // Clear the canvas
        context.clearRect(0, 0, canvasWidth, canvasHeight);

        context.save();

        // Move registration point to the center of the canvas
        context.translate(canvasWidth / 2, canvasWidth / 2);
        // Rotate 1 degree
        context.rotate(angle * Math.PI / 180);
        // Move registration point back to the top left corner of canvas
        context.translate(-canvasWidth / 2, -canvasWidth / 2);

        context.drawImage(canvas_original, (angle*x_scale), (angle*y_scale), canvas_original.width +  (angle*scale), canvas_original.height  +  (angle*scale));

        context.restore();


    }
*/

    function drawBestFit(ctx, angle, image){

               var  w = image.width;
     var h = image.height;
    var cw = w / 2;  // half canvas width and height
    var ch = h / 2;

        var iw = image.width / 2;  // half image width and height
        var ih = image.height / 2;
        // get the length C-B
        var dist = Math.sqrt(Math.pow(cw,2) + Math.pow(ch,2));
        // get the angle A
        var diagAngle = Math.asin(ch/dist);

        // Do the symmetry on the angle
        a1 = ((angle % (Math.PI *2))+ Math.PI*4) % (Math.PI * 2);
        if(a1 > Math.PI){
            a1 -= Math.PI;
        }
        if(a1 > Math.PI/2 && a1 <= Math.PI){
            a1 = (Math.PI/2) - (a1-(Math.PI/2));
        }
        // get angles A1, A2
        var ang1 = Math.PI/2 - diagAngle - Math.abs(a1);
        var ang2 = Math.abs(diagAngle - Math.abs(a1));
        // get lenghts C-E and C-F
        var dist1 = Math.cos(ang1) * dist;
        var dist2 = Math.cos(ang2) * dist;
        // get the max scale
        var scale = Math.max(dist2/(iw),dist1/(ih));
        // create the transform
        var dx = Math.cos(angle) * scale;
        var dy = Math.sin(angle) * scale; 
        ctx.setTransform(dx, dy, -dy, dx, cw, ch);
        ctx.drawImage(image, -iw, - ih);


        // draw outline of image half size
        /*
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2 * (1/scale);
        ctx.strokeRect(-iw / 2, -ih / 2, iw, ih);
        */

        // reset the transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // draw outline of canvas half size
        /*
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;
        ctx.strokeRect(cw - cw / 2, ch - ch / 2, cw, ch) ;
        */

    }

/*
function drawToFitRotated(ctx, angle, image){
    angle = angle /100;
    var dist = Math.sqrt(Math.pow(ctx.canvas.width /2, 1.9 ) + Math.pow(ctx.canvas.height / 2, 1.9));
    var imgDist = Math.min(image.width, image.height) / 2;
    var minScale = dist / imgDist;
    var dx = Math.cos(angle) * minScale;
    var dy = Math.sin(angle) * minScale; 
    ctx.setTransform(dx, dy, -dy, dx, ctx.canvas.width / 2, ctx.canvas.height / 2);
    ctx.drawImage(image, -image.width / 2, - image.height / 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}
*/

    this.sliderRotateChange = function() {
        console.log('src: ' + $rootScope.SliderDTO.value);
        var canvas = $('.crop_bg')[0];
        var ctx = canvas.getContext('2d');

        var canvas2 = $('#crop_src')[0];
        var ctx2 = canvas2.getContext('2d');


        //var img = ImageAdjustment.cloneCanvas(canvas);
        //var img = ImageAdjustment.cloneCanvas(canvas);
       //rotate($rootScope.SliderDTO.value, canvas_original);

 
       
       drawBestFit(ctx, $rootScope.SliderDTO.value/100, canvas_original);
       drawBestFit(ctx2, $rootScope.SliderDTO.value/100, crop_area_original);
//drawToFitRotated(ctx, $rootScope.SliderDTO.value, canvas_original);
        /*
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate($rootScope.SliderDTO.value);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
        */

        //ctx.clearRect(0, 0, canvas.width, canvas.height);

        //ctx.setTransform(1, 0, 0, 1, canvas.width / 2, canvas.height / 2); // set position of image center
        //ctx.rotate($rootScope.SliderDTO.value * Math.PI / 180); // rotate
        //ctx.drawImage(img, -img.width / 2, -img.height / 2); // draw image offset so its center is at x,y
        //ctx.setTransform(1, 0, 0, 1, 0, 0); // restore default transform

    };

    var canvas_original;
   /* var w;
    var h;
    var cw;  // half canvas width and height
    var ch;*/
    var crop_area_original;


    this.openRotate = function(e) {
        e.preventDefault();
        e.stopPropagation();
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();

        $rootScope.SliderDTO = {
            value: 0,
            min: -45,
            max: 45,
            step: .01
        };

        var model = "SliderDTO.value";
        var min = "{{SliderDTO.min}}";
        var max = "{{SliderDTO.max}}";
        var step = "{{SliderDTO.step}}";
        var change = "sliderRotateChange()";

        var myElement = '<div class="md_slider hide" id="slider"><md-slider-container><md-slider ng-change="' + change + '" step= "' + step + '" min="' + min + '" max="' + max + '" ng-model="' + model + '" aria-label="red" id="" class="md-warn"></md-slider><md-input-container><input type="number" ng-model="SliderDTO.value" aria-label="red" aria-controls="red-slider"></md-input-container></md-slider-container></div>';
        addMSlider(myElement, parent_container, id);

        var canvas = $('.crop_bg')[0];
        var canvas_2 = $('#crop_src')[0];
        canvas_original = ImageAdjustment.cloneCanvas(canvas);
        crop_area_original = ImageAdjustment.cloneCanvas(canvas_2);
console.log(crop_area_original);
   /*      w = canvas_original.width;
    h = canvas_original.height;
    cw = w / 2;  // half canvas width and height
    ch = h / 2;*/
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