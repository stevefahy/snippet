//
// Cropper Service
//

cardApp.service('Cropp', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', 'ImageAdjustment', 'Drag', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal, ImageAdjustment, Drag) {

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
        var parent_container = ImageAdjustment.getImageParent();
        // Work out the available height.
        var avail_height = $(window).height() - ($('.header').height() + $('.create_container').height() + $('.footer').height());
        if (avail_height < $('.' + id).height()) {
            // work out the proportionate width needed to fit the height
            decrease_percent = (avail_height / $('.' + id).height());
            var decreased_width = ($('.' + id).width() * decrease_percent);
            // Set the height of the container
            var wrapper = $('.' + parent_container + ' #cropper_' + id)[0];
            wrapper.style.width = decreased_width + 'px';
            reduce_height = true;
            var cont_data = { 'height': 0, 'width': decreased_width };
            // Custom attribute for storing image reduction data.
            $('.' + parent_container + ' .' + id).attr('reduce-data', JSON.stringify(cont_data));
        }
    };


    /*Make resizable div by Hung Nguyen*/

    function makeResizableDiv(div, id) {
        var element = document.querySelector(div);
        var resizers = document.querySelectorAll(div + ' .resizer');
        var minimum_size = 20;
        var original_width = 0;
        var original_height = 0;
        var original_x = 0;
        var original_y = 0;
        var original_mouse_x = 0;
        var original_mouse_y = 0;
        var offset_top;

        var elmnt = document.getElementById("drag");
        //console.log(JSON.stringify($(elmnt).attr('id')));
        // Set the initial clip path.

        var ia = ImageAdjustment.getImageAdjustments('content_cnv', id);
        var per_top;
        var per_left;
        var per_bottom;
        var per_right;
        var previously_cropped = false;
        if (ia != undefined) {
            if (ia.crop != undefined) {
                previously_cropped = true;
            }
        }

        if (previously_cropped) {
            console.log(ia);

            //ia.crop = crop_data;
            // TODO - make get scale a function or imagedjustment service function.
            // Get the scale ratio
            var orig_image = $('.content_cnv #cropper_' + id + ' #image_' + id)[0];
            console.log(orig_image);
            nat_w = orig_image.naturalWidth;
            //nat_h = orig_image.naturalHeight;
            console.log(nat_w);
            var crop_image = document.getElementById('crop_src');
            cur_w = $(crop_image).outerWidth();
            cur_h = $(crop_image).outerHeight();
            console.log(cur_w);
            var scale = nat_w / cur_w;
            console.log(scale);
            console.log(ia.crop.y);

            elmnt.style.width = ia.crop.width / scale + 'px';
            elmnt.style.height = ia.crop.height / scale + 'px';
            elmnt.style.top = ia.crop.y / scale + 'px';
            elmnt.style.left = ia.crop.x / scale + 'px';

            per_top = ia.crop.y / scale;
            per_left = ia.crop.x / scale;
            per_bottom = $('#crop_src').outerHeight() - (per_top + $('.crop_adjust').outerHeight());
            per_right = $('#crop_src').outerWidth() - (per_left + $('.crop_adjust').outerWidth());



        } else {
            console.log('no adjustments');
            per_top = elmnt.offsetTop;
            per_left = elmnt.offsetLeft;
            per_bottom = $('#crop_src').outerHeight() - (per_top + $('.crop_adjust').outerHeight());
            per_right = $('#crop_src').outerWidth() - (per_left + $('.crop_adjust').outerWidth());
            //$('.crop_box.active .crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
        }

        $('.crop_box.active .crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";


        //$timeout(function() {

        //$('.crop_box.active .crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
        console.log($('.crop_box.active .crop_area'));
        //}, 100);
        for (let i = 0; i < resizers.length; i++) {
            const currentResizer = resizers[i];
            if (!mobile) {
                currentResizer.addEventListener("mousedown", sizeMouseDown, true);
            } else {
                currentResizer.addEventListener("touchstart", sizeMouseDown, false);
            }

            function sizeMouseDown(e) {
                // Stop scroll
                $('.content_cnv').css('overflow-y', 'hidden');
                // Stop Drag
                Drag.stopDragElement();

                original_width = parseFloat(getComputedStyle(element, null).getPropertyValue('width').replace('px', ''));
                original_height = parseFloat(getComputedStyle(element, null).getPropertyValue('height').replace('px', ''));
                original_x = element.getBoundingClientRect().left;
                original_y = element.getBoundingClientRect().top;

                var cropper_loc = $(element).closest('.cropper_cont');
                offset_top = $(cropper_loc).offset().top;

                if (!mobile) {
                    original_mouse_x = e.pageX;
                    original_mouse_y = e.pageY;
                } else {
                    original_mouse_x = e.touches[0].pageX;
                    original_mouse_y = e.touches[0].pageY;
                }
                if (!mobile) {
                    document.addEventListener('mousemove', resize);
                    document.addEventListener('mouseup', stopResize);
                } else {
                    currentResizer.addEventListener("touchmove", resize, false);
                    currentResizer.addEventListener("touchend", stopResize, true);
                }

            }

            function resize(e) {
                console.log('resize');
                //if (currentResizer.classList.contains('bottom-right')) {
                if (currentResizer.classList.contains('bottom-middle')) {
                    var width;
                    var height;
                    var top;
                    if (!mobile) {
                        height = original_height + (e.pageY - original_mouse_y);
                    } else {
                        height = original_height + (e.touches[0].pageY - original_mouse_y);
                    }
                    if (height > minimum_size) {
                        element.style.height = height + 'px';

                        var per_top = elmnt.offsetTop;
                        var per_left = elmnt.offsetLeft;
                        var per_bottom = $('#crop_src').height() - (per_top + $('.crop_adjust').height());
                        var per_right = $('#crop_src').width() - (per_left + $('.crop_adjust').width());
                        $('.crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";


                        //self.clipImage('crop_src', 'coords');

                    }
                } else if (currentResizer.classList.contains('top-middle')) {
                    var width;
                    var height;
                    var top;
                    if (!mobile) {
                        height = (original_height - (e.pageY - original_y));
                        top = e.pageY - offset_top;
                    } else {
                        height = (original_height - (e.touches[0].pageY - original_y));
                        top = e.touches[0].pageY - offset_top;
                    }
                    if (height > minimum_size) {
                        element.style.height = height + 'px';
                        element.style.top = top + 'px';

                        var per_top = elmnt.offsetTop;
                        var per_left = elmnt.offsetLeft;
                        var per_bottom = $('#crop_src').height() - (per_top + $('.crop_adjust').height());
                        var per_right = $('#crop_src').width() - (per_left + $('.crop_adjust').width());
                        $('.crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
                    }


                } else if (currentResizer.classList.contains('right-middle')) {
                    var width;
                    var height;
                    var top;
                    if (!mobile) {
                        width = (original_width + (e.pageX - original_x) - original_width);
                        left = original_x;
                    } else {
                        width = (original_width + (e.touches[0].pageX - original_x) - original_width);
                        left = original_x;
                    }
                    if (width > minimum_size) {
                        element.style.width = width + 'px';
                        element.style.left = left + 'px';
                        var per_top = elmnt.offsetTop;
                        var per_left = elmnt.offsetLeft;
                        var per_bottom = $('#crop_src').height() - (per_top + $('.crop_adjust').height());
                        var per_right = $('#crop_src').width() - (per_left + $('.crop_adjust').width());
                        $('.crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
                    }

                } else if (currentResizer.classList.contains('left-middle')) {
                    var width;
                    var height;
                    var top;
                    if (!mobile) {
                        width = (original_width - (e.pageX - original_mouse_x));
                        left = original_x + (e.pageX - original_mouse_x);
                    } else {
                        width = (original_width - (e.touches[0].pageX - original_mouse_x));
                        left = original_x + (e.touches[0].pageX - original_mouse_x);
                    }
                    if (width > minimum_size) {
                        element.style.width = width + 'px';
                        element.style.left = left + 'px';

                        var per_top = elmnt.offsetTop;
                        var per_left = elmnt.offsetLeft;
                        var per_bottom = $('#crop_src').height() - (per_top + $('.crop_adjust').height());
                        var per_right = $('#crop_src').width() - (per_left + $('.crop_adjust').width());
                        $('.crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
                    }


                } else if (currentResizer.classList.contains('bottom-left')) {
                    if (!mobile) {
                        const height = original_height + (e.pageY - original_mouse_y);
                        const width = original_width - (e.pageX - original_mouse_x);
                    } else {
                        const height = original_height + (e.touches[0].pageY - original_mouse_y);
                        const width = original_width - (e.touches[0].pageX - original_mouse_x);
                    }

                    if (height > minimum_size) {
                        element.style.height = height + 'px';
                    }
                    if (width > minimum_size) {
                        element.style.width = width + 'px';
                        if (!mobile) {
                            element.style.left = original_x + (e.pageX - original_mouse_x) + 'px';
                        } else {
                            element.style.left = original_x + (e.touches[0].pageX - original_mouse_x) + 'px';
                        }
                    }
                } else if (currentResizer.classList.contains('top-right')) {
                    if (!mobile) {
                        const width = original_width + (e.pageX - original_mouse_x);
                        const height = original_height - (e.pageY - original_mouse_y);
                    } else {
                        const width = original_width + (e.touches[0].pageX - original_mouse_x);
                        const height = original_height - (e.touches[0].pageY - original_mouse_y);
                    }

                    if (width > minimum_size) {
                        element.style.width = width + 'px';
                    }
                    if (height > minimum_size) {
                        element.style.height = height + 'px';
                        if (!mobile) {
                            element.style.top = original_y + (e.pageY - original_mouse_y) + 'px';
                        } else {
                            element.style.top = original_y + (e.touches[0].pageY - original_mouse_y) + 'px';
                        }
                    }
                } else {
                    console.log('HERE');
                    if (!mobile) {
                        const width = original_width - (e.pageX - original_mouse_x);
                        const height = original_height - (e.pageY - original_mouse_y);
                    } else {
                        const width = original_width - (e.touches[0].pageX - original_mouse_x);
                        const height = original_height - (e.touches[0].pageY - original_mouse_y);
                    }

                    if (width > minimum_size) {
                        element.style.width = width + 'px';
                        if (!mobile) {
                            element.style.left = original_x + (e.pageX - original_mouse_x) + 'px';
                        } else {
                            element.style.left = original_x + (e.touches[0].pageX - original_mouse_x) + 'px';
                        }

                    }
                    if (height > minimum_size) {
                        element.style.height = height + 'px';
                        if (!mobile) {
                            element.style.top = original_y + (e.pageY - original_mouse_y) + 'px';
                        } else {
                            element.style.top = original_y + (e.touches[0].pageY - original_mouse_y) + 'px';
                        }

                    }
                }
            }

            function stopResize() {
                console.log('stopResize');
                $('.content_cnv').css('overflow-y', 'unset');
                if (!mobile) {
                    // window.removeEventListener('mousemove', resize);
                    document.removeEventListener('mousemove', resize);

                    //document.addEventListener('mousemove', resize);
                    document.removeEventListener('mouseup', stopResize);
                    Drag.resume();
                } else {
                    currentResizer.removeEventListener("touchmove", resize, false);
                    Drag.resume();
                }

            }
        }
    }


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
    }

    /*
        this.clipImage = function(trgt, coords) {
            var c = document.getElementById(trgt);
            console.log(c);
            var ctx = c.getContext("2d");

            var orig = cloneCanvas(c);
            console.log(orig);
            //var img = document.getElementById(image);
            ctx.drawImage(orig, 90, 130, 50, 60, 10, 10, 50, 60);
        }
        */

    /*
    this.docropImage = function(parent_container, id, sx, sy, swidth, sheight) {
        var deferred = $q.defer();
        //var source_canvas = document.getElementById(id);
        var source_canvas = $('.' + parent_container + ' #image_' + id)[0];
        console.log(source_canvas);
        var cropped_canvas = document.createElement("canvas");
        cropped_canvas.width = swidth;
        cropped_canvas.height = sheight;
        var ctx = cropped_canvas.getContext('2d');
        ctx.drawImage(source_canvas, sx, sy, swidth, sheight, 0, 0, swidth, sheight);
        // img, sx, sy, swidth, sheight, x, y, width, height
        self.canvasToImage(cropped_canvas, id).then(function(image) {
            console.log(image);
            console.log(image.naturalWidth + ' : ' + image.naturalHeight);
            //image.width = image.naturalWidth;
            //image.height = image.naturalHeight;
            deferred.resolve(image);
        });
        return deferred.promise;
    }
    */


    this.makeCrop = function(e, id) {
        e.preventDefault();
        e.stopPropagation();
        console.log('makeCrop');

        // Get the scale ratio
        var orig_image = $('.content_cnv #cropper_' + id + ' #image_' + id)[0];
        console.log(orig_image);
        nat_w = orig_image.naturalWidth;
        //nat_h = orig_image.naturalHeight;
        console.log(nat_w);
        var crop_image = document.getElementById('crop_src');
        cur_w = $(crop_image).outerWidth();
        cur_h = $(crop_image).outerHeight();
        console.log(cur_w);
        var scale = nat_w / cur_w;
        console.log(scale);

        var crop_area = $('.crop_box.active .crop_adjust')[0];
        console.log($(crop_area).outerWidth());
        var sx = crop_area.offsetLeft * scale;
        console.log(sx);
        var sy = crop_area.offsetTop * scale;
        console.log(sy);
        var swidth = $(crop_area).outerWidth() * scale;
        var sheight = $(crop_area).outerHeight() * scale;
        console.log(swidth);
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
            console.log(image);
            // remove the current adjusted image.
            //$('.content_cnv #cropper_' + id + ' .adjusted').remove();
            // If Adjusted exists hide original.
            if ($('.content_cnv #cropper_' + id + ' .adjusted').length > 0) {
                //    $('.content_cnv #cropper_' + image_id + ' #image_' + image_id).attr('src', '/assets/images/transparent.gif');
                //$('.content_cnv #cropper_' + image_id + ' #image_' + image_id).css('display', 'none');
                $('.content_cnv #cropper_' + id + ' .adjusted').remove();
            }
            // remove the crop box
            //$('.crop_box.active').remove();
            self.removeCrop();

            // add the new image
            var img_new = $(image).prependTo('.content_cnv #cropper_' + id);

            var crop_data = { 'x': sx, 'y': sy, 'width': swidth, 'height': sheight };
            //console.log($('.content_cnv #image_' + id).attr('adjustment-data'));

            ImageAdjustment.setImageAdjustment('content_cnv', id, 'crop', crop_data);


            //$('.content_cnv #cropper_' + id + ' #image_' + id).attr('src', '/assets/images/transparent.gif');
            //$('.content_cnv #cropper_' + id + ' #image_' + id).css('display', 'none');

            var image_original = $('.content_cnv #cropper_' + id + ' #image_' + id)[0];
            self.adjustSrc(image_original, 'hide');

            //$(img_new).css('display', 'none');

            // SAVE    
            $('.content_cnv #cropper_' + id).closest('div.ce').attr('contenteditable', 'true');
            Format.setImageEditing(false);
            console.log('SAVE');
            console.log($('.content_cnv #cropper_' + id).closest('div.ce'));
            $('.content_cnv #cropper_' + id).closest('div.ce').focus();
            $('.content_cnv #cropper_' + id).closest('div.ce').blur();

        });
    }

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
    }

    this.cancelCrop = function(e) {
        e.preventDefault();
        e.stopPropagation();

        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();
        var image_original = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        self.adjustSrc(image_original, 'hide');

        self.removeCrop();

    };

    this.setEditClick = function(val, container, id) {
        this.click_val = val;
        this.container = container;
        this.id = id;
    }

    /*
    this.getCropClick = function() {
        return this.click_val;
    }
    */

    this.restoreEditClick = function() {
        $('.' + this.container + ' #cropper_' + this.id).attr("onclick", this.click_val);
    }

    this.buildCrop = function(parent_container, id, target) {
        console.log('buildCrop');
        // If filtered image exists
        if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
            $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').addClass('hide');
            $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').addClass('temp_crop_hide')
            $('.' + parent_container + ' #image_' + id).addClass('hide');

            var new_canvas = self.cloneCanvas(target);
            console.log(new_canvas);
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
        makeResizableDiv('.resizers', id);
    }

    this.openCrop = function(e, id) {
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
        //console.log(parent_container);
        $('.' + parent_container + ' #cropper_' + id + ' #make_crop').attr("onclick", 'makeCrop(event, \'' + id + '\')');
        $('.image_adjust_on').remove();

        // Store editImage
        //var stored_clck = $('.' + parent_container + ' #cropper_' + id).attr("onclick");
        //self.setEditClick(stored_clck, parent_container, id);
        //$('.' + parent_container + ' #cropper_' + id).attr("onclick", null);
        //$('.' + parent_container + ' #cropper_' + id).attr("onclick",stored_clck);

        // Create canvas with all current adjustments (uncropped).
        var image = $('.' + parent_container + ' #image_' + id)[0];
        var target = imageToCanvas(image);
        var source = imageToCanvas(image);
        console.log(target);
        var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
        //if (ia != undefined) {
        //   self.applyFilter(canvas, ia.filter);
        //}
        /*
        for (var i in ia) {
            if (i == 'filter') {
                self.applyFilter(canvas, ia[i]);
                // Apply any other image adjustments
                if (i == 'sharpen') {
                    ImageAdjustment.setSharpen(parent_container, id, target, ImageAdjustment.getSource(), ia[i]);
                }

                if (i == 'crop') {
                    //ImageAdjustment.setSharpen(parent_container, id, target, ImageAdjustment.getSource(), );
                    //self.docropImage(parent_container, id, sx, sy, swidth, sheight).then(function(image) {
                    //ImageAdjustment.crop(parent_container, id, target, ImageAdjustment.getSource(), ia[i]);
                }

            }
        }
        */
        // All adjustements less crop
        if (ia != undefined) {
            var save;
            /*
            ImageAdjustment.crop(parent_container, id, target, image, ia['crop'])
                .then(function() {
                    return ImageAdjustment.crop(parent_container, id, source, image, ia['crop']);
                }).then(function() {
                    */
            //save = self.cloneCanvas(source[0]);
            //save = $('.source_canvas').clone();
            //save2 = self.cloneCanvas(source[0]);
            var prom = ImageAdjustment.composeFilter(target, ia['filter'])
                .then(function() {
                    return ImageAdjustment.composeFilter(source, ia['filter']);
                }).then(function() {
                    return ImageAdjustment.setSharpen(parent_container, id, target, source, ia['sharpen'])
                }).then(function() {
                    // $('.source_canvas').remove();
                    //var source = $(canvas_source_copy).prependTo('.content_cnv #cropper_' + id);
                    //$(source).addClass('source_canvas');
                    //var source2 = $(save2).prependTo('.content_cnv #cropper_' + id);
                    // $(source2).addClass('source_canvas_delete');
                    // return ImageAdjustment.setSharpen(parent_container, id, source[0], source2[0], ia['sharpen'])
                }).then(function() {
                    //$('.source_canvas_delete').remove();
                });

            promises.push(prom);

        }
        /*
        if (ia != undefined) {

            if (ia['filter']) {
                console.log('apply filter');
                var prom = self.composeFilter(target, ia['filter']).then(function(result) {
                    console.log('filter applied');
                });
                promises.push(prom);
            }

            if (ia['sharpen']) {
                ImageAdjustment.setSharpen(parent_container, id, target, image, ia['sharpen']);
            }
        }
        */


        $q.all(promises).then(function() {
            console.log('adjustments applied - buildCrop');
            self.buildCrop(parent_container, id, target);
            deferred.resolve();
        });
        return deferred.promise;

        /*
        // Create canvas with all current adjustments (uncropped).
        self.adjustedCanvas(parent_container, id).then(function(canvas) {
            // Turn the canvas into an image.
            //self.canvasToImage(canvas, id).then(function(image) {
            // If filtered image exists
            if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
                $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').css('display', 'none');
                $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').addClass('temp_crop_hide')
                $('.' + parent_container + ' #image_' + id).css('display', 'none');

                //var img = $(canvas).clone().appendTo('.' + parent_container + ' #cropper_' + id + ' .crop_area');

                var new_canvas = self.cloneCanvas(canvas);
                var img = $(new_canvas).appendTo('.' + parent_container + ' #cropper_' + id + ' .crop_area');
                $(img).addClass('temp_canvas_filtered');

                var img_bg = $(canvas).appendTo('.' + parent_container + ' #cropper_' + id);
                $(img_bg).addClass('crop_bg');
                $(img).attr('id', 'crop_src');
            } else {
                var img = $(canvas).appendTo('.' + parent_container + ' #cropper_' + id + ' .crop_area');
                $(img).attr('id', 'crop_src');
            }


            $('.' + parent_container + ' #cropper_' + id + ' .crop_adjust').attr('id', 'drag');


            //Make the DIV element draggagle:
            Drag.setUp(document.getElementById("drag"));
            // Make resizable.
            makeResizableDiv('.resizers', id);

            // });
        });
        */



    };

    /*
    this.cancelCrop = function() {
        console.log($('.crop_box.active'));
       //$('.crop_box.active').remove();
    };
    */



    /*
        this.openCrop = function(e, id) {
            var parent_container;
            // Get the context of the image (content_cnv or card_create_container)
            if ($(e.target).parents('div.card_create_container').length > 0) {
                parent_container = 'card_create_container';
            } else {
                parent_container = 'content_cnv';
            }
            ImageAdjustment.setImageParent(parent_container);
            var img_height;
            // If filtered image exists
            if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
                $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').css('display', 'none');
                $('.' + parent_container + ' #image_' + id).css('display', 'inline');
                img_height = $('.' + parent_container + ' #image_' + id).height();
                // Get the filter and set it to cropper
                var filter = $('.' + parent_container + ' #image_' + id).attr('adjustment-data');
                $('.' + parent_container + ' #cropper_' + id).addClass(filter);
            }
            $('.image_edit_btns').css('display', 'none');
            $('.crop_edit').css('display', 'flex');
            $rootScope.crop_on = true;
            var wrapper = $('.' + parent_container + ' #cropper_' + id)[0];
            $(wrapper).addClass('cropping');
            wrapper.style.maxWidth = '';
            wrapper.style.cssFloat = 'none';

            if ($('.' + parent_container + ' #cropper_' + id).attr('class').indexOf('no_image_space') >= 0) {
                $('.' + parent_container + ' #image_adjust_' + id).addClass('no_image_space_adjust_crop');
            }

            // Turn off contenteditable for this card
            var card = $(wrapper).parent().closest('div').attr('id');
            $('#' + card).attr('contenteditable', 'false');
            // Manually set the container width and height.
            var win_width = $(window).width();
            var stored_image = $('.' + parent_container + ' #image_' + id).attr('image-data');
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
                    $('.' + parent_container + ' #cropper_' + id + ' .cropper-canvas').addClass(filter);
                    $('.' + parent_container + ' #cropper_' + id + ' .cropper-view-box').addClass(filter);
                    $('.' + parent_container + ' #cropper_' + id).removeClass(filter);
                }
            };

            // Check for stored crop data
            var stored = $('.' + parent_container + ' #image_' + id).attr('crop-data');
            var reduced = $('.' + parent_container + ' #image_' + id).attr('reduce-data');

            if (reduced != undefined) {
                // Set the height of the container
                var wrapper = $('.' + parent_container + ' #cropper_' + id)[0];
                var d = JSON.parse(reduced);
                var decreased_width = d.width;
                reduce_height = true;
            }
            // Previously cropped.
            if (stored != undefined) {
                options.data = JSON.parse(stored);
                image = $('.' + parent_container + ' #image_' + id)[0];
                cropper = new Cropper(image, options, {});
            } else {
                // New Crop
                resetContainer(id);
                image = $('.' + parent_container + ' #image_' + id)[0];
                var init_img_width = $('.' + parent_container + ' #image_' + id).width();
                // If image smaller than screen width then reduce container width
                if (init_img_width < win_width) {
                    $('.' + parent_container + ' #cropper_' + id).css('width', init_img_width);
                }

                cropper = new Cropper(image, options, {
                    crop(event) {
                        var wrapper = $('.' + parent_container + ' #cropper_' + id)[0];
                        wrapper.style.width = '';
                    }
                });
            }
        };
    */
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

    this.canvasToTempImage = function(canvas, id){
        var deferred = $q.defer();
        var deferred = $q.defer();
        var dataUrl = canvas.toDataURL('image/jpeg', JPEG_COMPRESSION);
        var image = document.createElement('img');
        image.src = dataUrl;
        deferred.resolve(image);
        return deferred.promise;
    }

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
                    console.log('NEW IMAGE ON SERVER!');
                    console.log(this);
                    deferred.resolve(this);
                    //$('#temp_canvas_filtered_' + id).remove();
                    // Remove current filter.
                    //if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
                    //    $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').remove();
                    //}
                    // Get image Styles
                    //var cssStyleParsed = getStyles(id);
                    //$(this).attr("style", cssStyleParsed);
                    //$('.' + parent_container + ' .cropper_cont #temp_image_filtered_' + id).remove();
                    //$(this).insertBefore('.' + parent_container + ' .cropper_cont #image_' + id);
                    // SAVE
                    //Format.setImageEditing(false);
                    //$('.' + parent_container + ' #cropper_' + id).closest('div.ce').focus();
                    //$('.' + parent_container + ' #cropper_' + id).closest('div.ce').blur();
                };
            });
        });

        return deferred.promise;
    };

    this.saveImage = function(id, parent_container) {
        console.log('saveImage');
        var canv = $('canvas.temp_canvas_filtered').attr('id');
        if (canv != undefined) {
            id = canv.substr(21, canv.length - 20);
            var canvasFilter = document.getElementById('temp_canvas_filtered_' + id);

            self.canvasToImage(canvasFilter, id).then(function(image) {
                $('#temp_canvas_filtered_' + id).remove();
                // Remove current filter.
                if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
                    $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').remove();
                }
                // Get image Styles
                var cssStyleParsed = getStyles(id);
                $(image).attr("style", cssStyleParsed);
                $('.' + parent_container + ' .cropper_cont #temp_image_filtered_' + id).remove();
                $(image).insertBefore('.' + parent_container + ' .cropper_cont #image_' + id);
                // SAVE
                Format.setImageEditing(false);
                $('.' + parent_container + ' #cropper_' + id).closest('div.ce').focus();
                $('.' + parent_container + ' #cropper_' + id).closest('div.ce').blur();
            });
            /*
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
                        if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
                            $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').remove();
                        }
                        // Get image Styles
                        var cssStyleParsed = getStyles(id);
                        $(this).attr("style", cssStyleParsed);
                        $('.' + parent_container + ' .cropper_cont #temp_image_filtered_' + id).remove();
                        $(this).insertBefore('.' + parent_container + ' .cropper_cont #image_' + id);
                        // SAVE
                        Format.setImageEditing(false);
                        $('.' + parent_container + ' #cropper_' + id).closest('div.ce').focus();
                        $('.' + parent_container + ' #cropper_' + id).closest('div.ce').blur();
                    };
                });
            });
            */
        }
    };

    /*
    this.applyFilter = function(canvas, filter) {

        console.log(canvas);
        var current_canvas = self.cloneCanvas(canvas);
        var ctx = canvas.getContext('2d');
        var filter_data = getFilter(filter);
        console.log(filter_data);
        if (filter_data.filter != undefined) {
            ctx.filter = filter_data.filter;
        }
        ctx.drawImage(current_canvas, 0, 0, current_canvas.width, current_canvas.height);
        // Get image Styles
        //var cssStyleParsed = getStyles(id);
        //$(canvasFilter).attr("style", cssStyleParsed);
        //canvasFilter.setAttribute('id', 'temp_canvas_filtered_' + id);
        //canvas.setAttribute('class', 'resize-drag temp_canvas_filtered');
        //return canvasFilter;
    };
    */


    this.composeFilter = function(target, filter) {
        var deferred = $q.defer();

        filterLayers(target, filter).then(function(canvas) {
            console.log(canvas);
            //var w = original_image.naturalWidth;
            //var h = original_image.naturalHeight;


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
            ctx.drawImage(target, 0, 0, w, h);
            // Get image Styles
            //var cssStyleParsed = getStyles(id);
            //$(canvasFilter).attr("style", cssStyleParsed);
            //canvasFilter.setAttribute('id', 'temp_canvas_filtered_' + id);
            //canvasFilter.setAttribute('class', 'resize-drag temp_canvas_filtered');
            console.log('composeFilter fin');
            deferred.resolve(canvas);
        });
        return deferred.promise;
    };


    this.createFilter = function(parent_container, id, filter) {
        var deferred = $q.defer();

        convertImageToCanvas($('.' + parent_container + ' #image_' + id)[0], filter, id).then(function(canvas) {
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

        //var ia = ImageAdjustment.getImageAdjustments(parent_container, id);

        var source = $('.source_canvas')[0];
        var target = $('.target_canvas')[0];

        $(target).addClass('adjusted');
    
        //if (ia != undefined) {
            // Restore the orignal with all adjustments less filter.
            var ctx = target.getContext('2d');
            ctx.filter = "none";
            ctx.drawImage(source, 0, 0, );
            // Apply the new filter.
            ImageAdjustment.composeFilter(target, filter);
        //}
        if (button != 'button') {
            e.stopPropagation();
        }
    };

    removeTempCanvas = function(id) {
        $('.temp_canvas_filtered').remove();
        if ($('#image_filtered_' + id).length > 0) {
            //$('#image_filtered_' + id).css('display', 'unset');
            $('#image_filtered_' + id).removeClass('hide');
        } else {
            //$('#image_' + id).css('display', 'unset');
            $('#image_' + id).removeClass('hide');
        }
    };

    getStyles = function(id) {
        var parent_container = ImageAdjustment.getImageParent();
        // If Adjusted exists Get its Style.
        if ($('.' + parent_container + ' #cropper_' + id + ' .adjusted').length >= 0) {
            var cssStyle = $('.' + parent_container + ' #image_' + id).attr("style");
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

    //imageToCanvas = function(parent_container, id) {
    imageToCanvas = function(image) {

        // restore image
        //var src = $('.' + parent_container + ' #image_' + id).attr('data-src');
        //$('.' + parent_container + ' #image_' + id).attr('src', src);
        var src = $(image).attr('data-src');
        if (src != undefined) {
            $(image).attr('src', src);
        }

        // Use the original image
        //var image_id = 'image_' + id;
        //var image = $('.' + parent_container + ' #' + image_id)[0];
        var canvas = document.createElement('canvas');

        //canvas.width = image.width;
        //canvas.height = image.height;


        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        console.log(image.width);
        console.log(image.naturalWidth);

        var ctx = canvas.getContext('2d');
        //ctx.drawImage(image, 0, 0, image.width, image.height);
        ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);
        var data = { width: image.naturalWidth, height: image.naturalHeight };
        $(canvas).attr('data-image', JSON.stringify(data));
        return canvas;

    };

    this.applyAdjustments = function(parent_container, id, target, ia) {
        console.log(ia);
        var deferred = $q.defer();
        // Loop through all image adjustments.
        for (var i in ia) {
            // The filter adjustment is handled separately.
            if (i != 'filter') {
                // Apply any other image adjustments
                if (i == 'sharpen') {
                    ImageAdjustment.setSharpen(parent_container, id, target, ImageAdjustment.getSource(), ia[i]);
                }

                if (i == 'crop') {
                    //ImageAdjustment.setSharpen(parent_container, id, target, ImageAdjustment.getSource(), );
                    //self.docropImage(parent_container, id, sx, sy, swidth, sheight).then(function(image) {
                    //ImageAdjustment.crop(parent_container, id, target, ImageAdjustment.getSource(), ia[i]);
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

    this.adjustedCanvas = function(parent_container, id) {
        var deferred = $q.defer();

        //var canvas = imageToCanvas(parent_container, id);
        var image = $('.' + parent_container + ' #image_' + id)[0];
        var canvas = imageToCanvas(image);

        canvas.setAttribute('id', 'temp_canvas_filtered_' + id);
        canvas.setAttribute('class', 'resize-drag temp_canvas_filtered');
        // Get image Styles
        cssStyleParsed = getStyles(id);
        // Apply original style to the new canvas.
        canvas.setAttribute("style", cssStyleParsed);
        // Get image-adjustments object
        var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
        // If this image has any adjustments.
        if (ia != undefined) {
            // If there is a filter applied.
            if (ia.filter != undefined) {
                // Create a canvas with the filter effect and return the canvas.
                self.createFilter(parent_container, id, ia.filter).then(function(canvasFilter) {
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(canvasFilter, 0, 0);
                    ImageAdjustment.setSource(canvasFilter);
                    ImageAdjustment.setTarget(canvas);
                    // Apply other image adjustments to the filtered canvas.
                    self.applyAdjustments(parent_container, id, canvas, ia).then(function(result) {
                        // Add the adjusted canvas and hide the original image.
                        //$(canvas).insertBefore('.' + parent_container + ' #image_' + id);
                        //$('.' + parent_container + ' #cropper_' + id + ' .adjusted').css('display', 'none');
                        deferred.resolve(canvas);
                    });
                });
            } else {
                // No Filter but other image adjustments.
                var source_image = $('.' + parent_container + ' #image_' + id)[0];
                ImageAdjustment.setSource(source_image);
                ImageAdjustment.setTarget(canvas);
                self.applyAdjustments(parent_container, id, canvas, ia).then(function(result) {
                    deferred.resolve(canvas);
                });
                //$(canvas).insertBefore('.' + parent_container + ' #image_' + id);
                //$('.' + parent_container + ' #cropper_' + id + ' .adjusted').css('display', 'none');
            }
        } else {
            // Not previously adjusted.
            // Use the original image as the source.
            //$(canvas).insertBefore('.' + parent_container + ' #image_' + id);
            //$('.' + parent_container + ' #cropper_' + id + ' #image_' + id).css('display', 'none');
            var source_image = $('.' + parent_container + ' #image_' + id)[0];
            ImageAdjustment.setSource(source_image);
            ImageAdjustment.setTarget(canvas);
            deferred.resolve(canvas);
        }
        return deferred.promise;
    };

    this.settingsImage = function(parent_container, id) {
        //var canvas = imageToCanvas(parent_container, id);
        var image = $('.' + parent_container + ' #image_' + id)[0];
        var canvas = imageToCanvas(image);

        canvas.setAttribute('id', 'temp_canvas_filtered_' + id);
        canvas.setAttribute('class', 'resize-drag temp_canvas_filtered');
        // Get image Styles
        cssStyleParsed = getStyles(id);
        // Apply original style to the new canvas.
        canvas.setAttribute("style", cssStyleParsed);
        // Get image-adjustments object
        var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
        // If this image has any adjustments.
        if (ia != undefined) {
            // If there is a filter applied.
            if (ia.filter != undefined) {
                // Create a canvas with the filter effect and return the canvas.
                self.createFilter(parent_container, id, ia.filter).then(function(canvasFilter) {
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(canvasFilter, 0, 0);
                    ImageAdjustment.setSource(canvasFilter);
                    ImageAdjustment.setTarget(canvas);
                    // Apply other image adjustments to the filtered canvas.
                    self.applyAdjustments(parent_container, id, canvas, ia).then(function(result) {
                        // Add the adjusted canvas and hide the original image.
                        $(canvas).insertBefore('.' + parent_container + ' #image_' + id);
                        $('.' + parent_container + ' #cropper_' + id + ' .adjusted').css('display', 'none');
                    });
                });
            } else {
                // No Filter but other image adjustments.
                var source_image = $('.' + parent_container + ' #image_' + id)[0];
                ImageAdjustment.setSource(source_image);
                ImageAdjustment.setTarget(canvas);
                self.applyAdjustments(parent_container, id, canvas, ia);
                $(canvas).insertBefore('.' + parent_container + ' #image_' + id);
                $('.' + parent_container + ' #cropper_' + id + ' .adjusted').css('display', 'none');
            }
        } else {
            // Not previously adjusted.
            // Use the original image as the source.
            $(canvas).insertBefore('.' + parent_container + ' #image_' + id);
            $('.' + parent_container + ' #cropper_' + id + ' #image_' + id).css('display', 'none');
            var source_image = $('.' + parent_container + ' #image_' + id)[0];
            ImageAdjustment.setSource(source_image);
            ImageAdjustment.setTarget(canvas);
        }
    };

    this.adjustImage = function(e, id) {

        // the source should not be the original but a copy with all adjustments minus sharpen applied?

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
        var target = imageToCanvas(image);
        var source = imageToCanvas(image);
        target.setAttribute('id', 'temp_canvas_filtered_' + id);
        target.setAttribute('class', 'target_canvas');
        source.setAttribute('class', 'source_canvas');
        //.target_canvas.adjusted
        // Not previously adjusted.
        // Use the original image as the source.
        $(target).insertBefore('.' + parent_container + ' #image_' + id);
        $(source).insertBefore('.' + parent_container + ' #image_' + id);
        $('.' + parent_container + ' #cropper_' + id + ' #image_' + id).addClass('hide');
        //var source_image = $('.' + parent_container + ' #image_' + id)[0];
        $(source).addClass('hide');

        ImageAdjustment.setSource(source);
        ImageAdjustment.setTarget(target);

        if (ia != undefined) {
            console.log('sharpen: ' + ia['sharpen']);
            ImageAdjustment.setSharpen(parent_container, id, target, source, ia['sharpen'])
                .then(function() {
                    console.log('filter: ' + ia['filter']);
                    return ImageAdjustment.composeFilter(target, ia['filter'])
                }).then(function() {
                    console.log('filter: ' + ia['filter']);
                    return ImageAdjustment.composeFilter(source, ia['filter'])
                }).then(function() {
                    console.log(ia);
                    console.log('crop: ' + ia['crop']);
                    return ImageAdjustment.applyCrop(target, ia['crop'])
                }).then(function() {
                    return ImageAdjustment.applyCrop(source, ia['crop'])
                });;
        }

        // If there is already an adjusted image then hide it.
        console.log($('.' + parent_container + ' #cropper_' + id + ' img.adjusted'));
        if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
            $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').addClass('hide');
        }
        e.stopPropagation();
    };

    /*
    this.adjustImage = function(e, id) {
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
        // TODO - function to handle all adjustments minus filter.
        this.settingsImage(parent_container, id);
        e.stopPropagation();
    };
    */

    this.cropImage = function(e, id) {
        var parent_container;
        // Get the context of the image (content_cnv or card_create_container)
        if ($(e.target).parents('div.card_create_container').length > 0) {
            parent_container = 'card_create_container';
        } else {
            parent_container = 'content_cnv';
        }
        $('.image_adjust_on').remove();
        if ($('.' + parent_container + ' #cropper_' + id + ' .image_adjust_div').length <= 0) {
            /*
            var filt = $('.image_adjust_div').clone().insertAfter('.' + parent_container + ' #cropper_' + id);
            filt.attr('id', 'adjust_' + id);
            filt.css('position', 'relative');
            filt.addClass('filters_active');
            filt.css('visibility', 'visible');
            */
            // TODO - function to handle all adjustments minus filter.
            ImageAdjustment.setImageId(id);
            ImageAdjustment.setImageParent(parent_container);
            /*
            var data = { 'id': id };
            // Get the last position of the slider.
            var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
            if (ia != undefined) {
                // TODO store as slider pos.
                data.last_position = ia.sharpen;
            }
            $rootScope.$broadcast('rzSliderRender', data);
            */
        }
        // TODO - function to handle all adjustments minus filter.
        this.settingsImage(parent_container, id);
        e.stopPropagation();
    };

    /*
    this.filterImage = function(e, id) {
        var parent_container;
        // Get the context of the image (content_cnv or card_create_container)
        if ($(e.target).parents('div.card_create_container').length > 0) {
            parent_container = 'card_create_container';
        } else {
            parent_container = 'content_cnv';
        }
        $('.image_adjust_on').remove();
        if ($('.' + parent_container + ' #cropper_' + id + ' .image_filt_div').length <= 0) {
            var temp = $('.' + parent_container + ' #cropper_' + id).clone();
            // If there is a filtered image then remove it.
            if ($('.' + parent_container + ' #cropper_' + id + ' .adjusted').length >= 0) {
                temp.find('img.adjusted').remove();
                temp.find('img').css('display', 'unset');
                // Change the id so that it is different to the original image.
                temp.find('img').removeAttr('id');
            }
            // If there are temp_image_filtered then remove.
            if ($('.' + parent_container + ' #cropper_' + id + ' .temp_image_filtered').length >= 0) {
                temp.find('img.temp_image_filtered').remove();
            }
            temp.addClass('temp');
            temp.find('.filter_div img').unwrap();
            var filt = $('.image_filt_div').clone().insertAfter('.' + parent_container + ' #cropper_' + id);
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
    */

    this.buildFilters = function(parent_container, id, image) {
        var filt = $('.image_filt_div').clone().insertAfter('.' + parent_container + ' #cropper_' + id);
        filt.attr('id', 'filters_' + id);
        filt.css('position', 'relative');
        filt.addClass('filters_active');
        filt.css('visibility', 'visible');
        //$(temp).removeAttr('onclick');
        //$(temp).removeAttr('id');
        for (var i in filter_array) {
            var outmost = document.createElement('div');
            var outer = document.createElement('div');
            $(outer).appendTo(outmost);
            $(outmost).appendTo('#filters_' + id + ' .filters_container .filter_list');
            $(outmost).addClass('filter_container');
            //var current = temp.clone();
            //var current = temp;

            var current = document.createElement('img');
            current.src = image.src;

            //var container_div = document.createElement('div');
            //current = $(current).appendTo($(container_div));
            //current = image;

            $(current).appendTo($(outer));
            var title = document.createElement('div');
            $(title).addClass('filter_title');
            $(title).html(filter_array[i].filter_name);
            $(title).appendTo($(outmost));
            /*
            $(current).removeAttr('class');
            $(current).addClass('cropper_cont');
            $(current).addClass('filter_thumb');
            $(current).addClass(filter_array[i].filter_css_name);
            $(current).attr('onClick', 'filterClick(event, this, "' + id + '", "' + filter_array[i].filter_css_name + '")');
            */
            $(outer).removeAttr('class');
            $(outer).addClass('cropper_cont');
            $(outer).addClass('filter_thumb');
            $(outer).addClass(filter_array[i].filter_css_name);
            $(outer).attr('onClick', 'filterClick(event, this, "' + id + '", "' + filter_array[i].filter_css_name + '")');
        }

    };



    this.filterImage = function(e, id) {
        console.log('filterImage');
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
        $('.' + parent_container + ' #cropper_' + id + ' #image_' + id).addClass('hide');

        if ($('.' + parent_container + ' #cropper_' + id + ' .image_filt_div').length <= 0) {
            console.log('here');
            var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
            var image = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
            var canvas_target = imageToCanvas(image);
            var canvas_source = imageToCanvas(image);
            var canvas_source_copy = imageToCanvas(image);
            var source = $(canvas_source).prependTo('.content_cnv #cropper_' + id)[0];
            $(source).addClass('source_canvas');

            var target = $(canvas_target).prependTo('.content_cnv #cropper_' + id)[0];
            $(target).addClass('target_canvas');
            if (ia != undefined) {
                var save;
                /*
                ImageAdjustment.crop(parent_container, id, target, image, ia['crop'])
                    .then(function() {
                        return ImageAdjustment.crop(parent_container, id, source, image, ia['crop']);
                    }).then(function() {
                        //save = self.cloneCanvas(source[0]);
                        //save = $('.source_canvas').clone();
                        //save2 = self.cloneCanvas(source[0]);
                        return ImageAdjustment.composeFilter(target, ia['filter']);
                    }).then(function() {
                        return ImageAdjustment.composeFilter(source, ia['filter']);
                    }).then(function() {
                        return ImageAdjustment.setSharpen(parent_container, id, target, source, ia['sharpen'])
                    }).then(function() {
                        $('.source_canvas').remove();
                        var source = $(canvas_source_copy).prependTo('.content_cnv #cropper_' + id);
                        $(source).addClass('source_canvas');
                        //var source2 = $(save2).prependTo('.content_cnv #cropper_' + id);
                        // $(source2).addClass('source_canvas_delete');
                        // return ImageAdjustment.setSharpen(parent_container, id, source[0], source2[0], ia['sharpen'])
                    }).then(function() {
                        //$('.source_canvas_delete').remove();
                    });
                    */
                /*
                if (ia['crop'] != undefined) {
                    target.width = ia['crop'].width;
                    target.height = ia['crop'].height;
                }
                ImageAdjustment.composeFilter(target, ia['filter'])
                    .then(function() {
                        return ImageAdjustment.composeFilter(source, ia['filter']);
                        //}).then(function() {
                        //    return ImageAdjustment.composeFilter(target, ia['filter']);
                    }).then(function() {
                        return ImageAdjustment.setSharpen(parent_container, id, target, source, ia['sharpen'])
                    }).then(function() {
                        $('.source_canvas').remove();
                        var source = $(canvas_source_copy).prependTo('.content_cnv #cropper_' + id);
                        $(source).addClass('source_canvas');
                        //var source2 = $(save2).prependTo('.content_cnv #cropper_' + id);
                        // $(source2).addClass('source_canvas_delete');
                        // return ImageAdjustment.setSharpen(parent_container, id, source[0], source2[0], ia['sharpen'])
                    }).then(function() {
                        //$('.source_canvas_delete').remove();
                    });
                */

                console.log('sharpen: ' + ia['sharpen']);
                ImageAdjustment.setSharpen(parent_container, id, target, source, ia['sharpen'])
                    .then(function() {
                        console.log('filter: ' + ia['filter']);
                        return ImageAdjustment.setSharpen(parent_container, id, source, source, ia['sharpen'])
                    }).then(function() {
                        console.log('filter: ' + ia['filter']);
                        return ImageAdjustment.composeFilter(target, ia['filter'])
                        //}).then(function() {
                        //console.log('filter: ' + ia['filter']);
                        // return ImageAdjustment.composeFilter(source, ia['filter'])
                    }).then(function() {
                        console.log(ia);
                        console.log('crop: ' + ia['crop']);
                        return ImageAdjustment.applyCrop(target, ia['crop'])
                    }).then(function() {
                        return ImageAdjustment.applyCrop(source, ia['crop'])
                    }).then(function() {
                        console.log('buildFilters');
                        self.canvasToTempImage(source, id).then(function(image) {
                            self.buildFilters(parent_container, id, image);
                        });
                    })
            } else {
                console.log('buildFilters');
                self.canvasToTempImage(source, id).then(function(image) {
                    self.buildFilters(parent_container, id, image);
                });
            }


            // If there is already an adjusted image then hide it.
            if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
                $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').addClass('hide');
            }

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

        //$('.' + parent_container + ' #cropper_' + id + ' #image_' + id).css('display', 'none');
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
        console.log(prev_adjusted);
        //$('.' + parent_container + ' #cropper_' + id + ' #image_' + id).attr('src', '/assets/images/transparent.gif');
        // Set the cropper height to avoid jump when adding removing images.
        console.log($(current_canvas).height());
        $('.' + parent_container + ' #cropper_' + id).css('height', $(current_canvas).height());

        //var ia = ImageAdjustment.getImageAdjustments(parent_container, id);

        //if(ia != undefined){
        //   ImageAdjustment.crop(parent_container, id, current_canvas, image_original, ia['crop']); 
        //}

        self.adjustSrc(image_original, 'hide');
        // Filter added.
        if (current_adjusted != undefined) {
            console.log('filter added');
            if (prev_adjusted != undefined) {
                $(prev_adjusted).remove();
            }
            // Save the canvas to image
            //self.saveImage('id', parent_container);
            var prom = self.canvasToImage(current_adjusted, id).then(function(image) {
                console.log(image);
                var img_new = $(image).prependTo('.content_cnv #cropper_' + id);
                $(current_canvas).remove();
                $(source_canvas).remove();
                $('.' + parent_container + ' #cropper_' + id).css('height', '');
                console.log('image created');
                deferred.resolve();
            });
            promises.push(prom);

        } else {
            // No filter added
            console.log('no filter added');
            if (prev_adjusted != undefined) {
                // Restore existing adjusted image.
                $(prev_adjusted).removeClass('hide');

            } else {
                console.log('RESTORE!');
                // Restore original image.
                $('.' + parent_container + ' #cropper_' + id + ' #image_' + id).removeClass('hide');
                self.adjustSrc(image_original, 'show');
            }
            $(current_canvas).remove();
            $(source_canvas).remove();
            $('.' + parent_container + ' #cropper_' + id).css('height', '');
            console.log('image restored');
                deferred.resolve();
        }


        $q.all(promises).then(function() {
            console.log('all done');
            // DONT SAVE UNTIL EVERYTHING DONE!
        self.restoreEditClick();
        // SAVE
        Format.setImageEditing(false);
        $timeout(function() {
        $('.' + parent_container + ' #cropper_' + id).closest('div.ce').focus();
        $('.' + parent_container + ' #cropper_' + id).closest('div.ce').blur();
            },1000);
            deferred.resolve();
        });

        //$('.' + parent_container + ' #cropper_' + id + ' #image_' + id).addClass('hide');
        // Save the canvas to image
        //self.saveImage('id', parent_container);

        // DONT SAVE UNTIL EVERYTHING DONE!
        /*
        self.restoreEditClick();
        // SAVE
        Format.setImageEditing(false);
        $('.' + parent_container + ' #cropper_' + id).closest('div.ce').focus();
        $('.' + parent_container + ' #cropper_' + id).closest('div.ce').blur();
        */
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
        $('.' + parent_container + ' #' + e.target.id).closest('div.ce').attr('contenteditable', 'true');
        $('.image_adjust_on').remove();
        $('.' + parent_container + ' #cropper_' + id).removeClass('cropping');
        removeTempCanvas(id);
        self.restoreEditClick();
        // SAVE       
        Format.setImageEditing(false);
        $('.' + parent_container + ' #cropper_' + id).closest('div.ce').focus();
        $('.' + parent_container + ' #cropper_' + id).closest('div.ce').blur();
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
            console.log('HIDE');
            console.log(image);
            // hide
            //$(image).attr('data-src', src_original);
            $(image).attr('src', hide_image);
            $(image).addClass('hide');
        } else {
            // show
            $(image).attr('src', datsrc);
        }
    }

    // TODO - make getting parent container a function.
    this.editImage = function(scope, id) {
        var parent_container;
        // Get the context of the image (content_cnv or card_create_container)
        if ($(scope).parents('div.card_create_container').length > 0) {
            parent_container = 'card_create_container';
        } else {
            parent_container = 'content_cnv';
        }
        if (principal.isValid()) {
            UserData.checkUser().then(function(result) {

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
                    $('.' + parent_container + ' #image_' + id).attr('src', src_original);
                } else {
                    $('.' + parent_container + ' #image_' + id).attr('src', src);
                }

                //var cropper_height = $('.' + parent_container + ' #cropper_' + id).outerHeight();
                //console.log(cropper_height);

                //$('.' + parent_container + ' #cropper_' + id).css('height',  cropper_height);
                // Turn off content saving.
                Format.setImageEditing(true);
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
                        ia.insertBefore('.' + parent_container + ' #cropper_' + id);
                        $(ia).attr('id', 'image_adjust_' + id);
                        $('#image_adjust_' + id).css('visibility', 'visible');
                        $('#image_adjust_' + id).css('position', 'relative');
                        var edit_btns = "<div class='image_editor'><div class='image_edit_btns'><div class='' onclick='adjustImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_tune'>tune</i></div><div class='' onclick='filterImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_filter'>filter</i></div><div class='' onclick='openCrop(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_crop' >crop</i></div><div class='close_image_edit' onclick='closeEdit(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_close'>&#xE14C;</i></div></div><div class='crop_edit'><div class='set_crop' onclick='setCrop(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_accept'>&#xe876;</i></div></div></div>";
                        //var edit_btns = "<div class='image_editor'><div class='image_edit_btns'><div class='' onclick='adjustImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_tune'>tune</i></div><div class='' onclick='filterImage(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_filter'>filter</i></div><div class='' onclick='openCrop(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_crop' >crop</i></div><div class='close_image_edit' onclick='closeEdit(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_close'>&#xE14C;</i></div></div><div class='crop_edit'><div class='set_crop' onclick='setCrop(event,\"" + id + "\")'><i class='material-icons image_edit' id='ie_accept'>&#xe876;</i></div></div></div>";
                        // set this to active
                        $('#image_adjust_' + id).addClass('image_adjust_on');
                        $('#image_adjust_' + id).append(edit_btns);
                        // Adjust marging top if this is the topmost image.
                        if ($('.' + parent_container + ' #cropper_' + id).attr('class').indexOf('no_image_space') >= 0) {
                            $('#image_adjust_' + id).addClass('no_image_space_adjust');
                        }
                    }
                }
            });
        }
    };

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

    function filterLayers(canvas, filter) {
        var deferred = $q.defer();
        console.log(canvas);
        var dataimage = $(canvas).attr('data-image');
        dataimage = JSON.parse(dataimage);
        var w = dataimage.width;
        var h = dataimage.height;
        console.log(w + ' : ' + h);

        var targetCtx = canvas.getContext('2d');

        var filter_data = getFilter(filter);
        // Convert image to canvas
        var topImage = canvas;
        var topCanvas = document.createElement("canvas");
        topCanvas.width = w;
        topCanvas.height = h;
        var topCtx = topCanvas.getContext('2d');
        topCtx.drawImage(topImage, 0, 0, w, h);
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
                deferred.resolve(result);
            });
        } else {
            targetCtx.drawImage(topCanvas, 0, 0, w, h);
            deferred.resolve(topCanvas);
        }
        return deferred.promise;
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
                // radial gradient, gradient_percent
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

    /*
    this.setCrop = function(event, image_id) {
        var parent_container;
        // Get the context of the image (content_cnv or card_create_container)
        if ($(event.target).parents('div.card_create_container').length > 0) {
            parent_container = 'card_create_container';
        } else {
            parent_container = 'content_cnv';
        }
        ImageAdjustment.setImageParent(parent_container);
        var cur_filter = $("." + parent_container + " #image_" + image_id).attr('adjustment-data');
        getData = function() {
            var stored_image_data = cropper.getImageData();
            var stored_data = cropper.getData();
            $("." + parent_container + " #image_" + image_id).attr('crop-data', JSON.stringify(stored_data));
            $("." + parent_container + " #image_" + image_id).attr('image-data', JSON.stringify(stored_image_data));
            var gcd = cropper.getCanvasData();
            var gd = cropper.getData();
            var gcbd = cropper.getCropBoxData();
            // Set the height of the container
            var wrapper = $('.' + parent_container + ' #cropper_' + image_id)[0];
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
            $("." + parent_container + " #image_" + image_id).attr('cbd-data', JSON.stringify(cbd));
            var win_width = $(window).width();
            if (stored_image_data.naturalWidth < win_width) {
                zoom_amount = stored_image_data.naturalWidth / (cbd.right - cbd.left);
            } else {
                zoom_amount = win_width / (cbd.right - cbd.left);
                var height = (cbd.bottom - cbd.top) * zoom_amount;
            }
            // Add class to show that this image has been cropped
            $("." + parent_container + " #image_" + image_id).addClass("cropped");
            // set this card to contenteditable true.
            var card = $(wrapper).parent().closest('div').attr('id');
            $('#' + card).attr('contenteditable', 'true');
            // Get image Styles
            var cssStyleParsed = getStyles(image_id);
            $('.' + parent_container + ' #cropper_' + image_id + ' .adjusted').attr("style", cssStyleParsed);
            // If Adjusted exists hide original.
            if ($('.' + parent_container + ' #cropper_' + image_id + ' .adjusted').length > 0) {
                $('.' + parent_container + ' #cropper_' + image_id + ' #image_' + image_id).attr('src', '/assets/images/transparent.gif');
                $("." + parent_container + ' #cropper_' + image_id + " #image_" + image_id).css('display', 'none');
            }
            cropper.destroy();
            $rootScope.crop_on = false;
            closeEdit(event, image_id);
        };
        getData();

        $timeout(function() {
            // After image
            Format.setImageEditing(false);
            var dir;
            if ($rootScope.top_down) {
                dir = 'top';
            } else {
                dir = 'bottom';
            }
            $rootScope.$broadcast("items_changed", dir);
        }, 0);
    };
    */

}]);