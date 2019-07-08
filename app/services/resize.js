//
// Resize Service
//

cardApp.service('Resize', ['Drag', 'ImageAdjustment', 'Scroll', function(Drag, ImageAdjustment, Scroll) {

    var ua = navigator.userAgent;
    var mobile = false;
    if (ua.indexOf('AndroidApp') >= 0) {
        mobile = true;
    }

    var checkEdges = function(crop_box, l, r, t, b) {
        if (t == 0) {
            $(crop_box).addClass('crop_top_max');
        } else {
            $(crop_box).removeClass('crop_top_max');
        }
        if (l == 0) {
            $(crop_box).addClass('crop_left_max');
        } else {
            $(crop_box).removeClass('crop_left_max');
        }
        if (b == 0) {
            $(crop_box).addClass('crop_bottom_max');
        } else {
            $(crop_box).removeClass('crop_bottom_max');
        }
        if (r == 0) {
            $(crop_box).addClass('crop_right_max');
        } else {
            $(crop_box).removeClass('crop_right_max');
        }
    };

    this.makeResizableDiv = function(crop_box, cropping_box, cropping_area, cropping_source, cropping_original_image, crop_data, id) {
        var crop_box_container = document.querySelector(crop_box);
        var crop_box = document.querySelector(cropping_box);
        var resizers = document.querySelectorAll(cropping_box + ' .resizer');
        var crop_area = document.querySelector(cropping_area);
        var crop_source = document.querySelector(cropping_source);
        var original_image = cropping_original_image;
        var MIN_CROP_SIZE = 40;
        var original_width = 0;
        var original_height = 0;
        var original_x = 0;
        var original_y = 0;
        var original_mouse_x = 0;
        var original_mouse_y = 0;
        var offset_top;
        var offset_left;

        var bound_r;
        var bound_l;
        var bound_b;
        var bound_w;
        var bound_h;

        var per_top;
        var per_left;
        var per_bottom;
        var per_right;

        var previously_cropped = false;

        if (crop_data != undefined) {
            previously_cropped = true;
        }

        $('.' + ImageAdjustment.getImageParent() + ' #cropper_' + ImageAdjustment.getImageId() + ' .resizable').addClass('active');

        if (previously_cropped) {
            // Get scale ratio of the image (as displayed which may be scaled to fit compared to the original image).
            var scale = ImageAdjustment.getScale(original_image, crop_source);
            crop_box.style.width = crop_data.width / scale + 'px';
            crop_box.style.height = crop_data.height / scale + 'px';
            crop_box.style.top = crop_data.y / scale + 'px';
            crop_box.style.left = crop_data.x / scale + 'px';
            per_top = Math.round(crop_data.y / scale);
            per_left = Math.round(crop_data.x / scale);
            per_bottom = Math.round($(crop_source).outerHeight() - (per_top + $(crop_box).outerHeight()));
            per_right = Math.round($(crop_source).outerWidth() - (per_left + $(crop_box).outerWidth()));
        } else {
            // Not previously cropped. Set crop box to a default size.
            var init_width = $(crop_source).width();
            var init_height = $(crop_source).height();
            crop_box.style.width = (init_width / 2) + 'px';
            crop_box.style.height = (init_height / 2) + 'px';
            crop_box.style.top = (init_height / 4) + 'px';
            crop_box.style.left = (init_width / 4) + 'px';
            per_top = crop_box.offsetTop;
            per_left = crop_box.offsetLeft;
            per_bottom = $(crop_source).outerHeight() - (per_top + $(crop_box).outerHeight());
            per_right = $(crop_source).outerWidth() - (per_left + $(crop_box).outerWidth());
        }

        // Check whether any of the sides of the crop box are touching the extremity of the image.
        checkEdges(crop_box, per_left, per_right, per_top, per_bottom);

        // Set the clip path for the crop area.
        $(crop_area)[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";


        //$(crop_box_container).addClass('active');

        for (var i = 0, len = resizers.length; i < len; i++) {
            const currentResizer = resizers[i];
            if (!mobile) {
                currentResizer.addEventListener("mousedown", sizeMouseDown, true);
            } else {
                currentResizer.addEventListener("touchstart", sizeMouseDown, false);
            }

            function sizeMouseDown(e) {
                // Stop scroll
                Scroll.disable('.content_cnv');
                // Change the colour of the borders of the crop box on touch.
                $(crop_box).addClass('active_resize');
                // Stop Drag
                Drag.stopDragElement();
                var cropper_loc = $(crop_box).closest('.cropper_cont');
                offset_top = $(cropper_loc).offset().top;
                offset_left = $(cropper_loc).offset().left;
                if (offset_left > 0) {
                    bound_r = crop_source.getBoundingClientRect().right - offset_left;
                }
                bound_r = crop_source.getBoundingClientRect().right;
                bound_l = crop_source.getBoundingClientRect().left;
                bound_b = crop_source.getBoundingClientRect().bottom - offset_top;
                bound_w = $(crop_source).outerWidth();
                bound_h = $(crop_source).outerHeight();
                original_width = parseFloat(getComputedStyle(crop_box, null).getPropertyValue('width').replace('px', ''));
                original_height = parseFloat(getComputedStyle(crop_box, null).getPropertyValue('height').replace('px', ''));
                original_x = crop_box.getBoundingClientRect().left;
                original_y = crop_box.getBoundingClientRect().top;
                original_right = crop_box.getBoundingClientRect().right;

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

                var height;
                var left;
                var top;
                var width;
                var bottom;

                var per_top;
                var per_left;
                var per_bottom;
                var per_right;

                var calc_top;
                var calc_left;

                if (currentResizer.classList.contains('bottom-middle')) {

                    if (!mobile) {
                        height = original_height + (e.pageY - original_mouse_y);
                        bottom = e.pageY - offset_top;
                    } else {
                        height = original_height + (e.touches[0].pageY - original_mouse_y);
                        bottom = e.touches[0].pageY - offset_top;
                    }
                    if ((height + crop_box.offsetTop) > bound_b) {
                        height = bound_b - crop_box.offsetTop;
                    }
                    if (height > MIN_CROP_SIZE) {
                        crop_box.style.height = height + 'px';
                        per_top = crop_box.offsetTop;
                        per_left = crop_box.offsetLeft;
                        per_bottom = Math.round($(crop_source).outerHeight() - (per_top + $(crop_box).outerHeight()));
                        per_right = Math.round($(crop_source).outerWidth() - (per_left + $(crop_box).outerWidth()));
                        $(crop_area)[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
                    }

                } else if (currentResizer.classList.contains('top-middle')) {

                    if (!mobile) {
                        height = original_height - (e.pageY - original_mouse_y);
                        top = original_y + (e.pageY - original_mouse_y) - offset_top;
                    } else {
                        height = original_height - (e.touches[0].pageY - original_mouse_y);
                        top = original_y + (e.touches[0].pageY - original_mouse_y) - offset_top;
                    }
                    left = original_x - offset_left;
                    if (top < 0) {
                        top = 0;
                    }
                    if (height > bound_h) {
                        height = bound_h;
                    }
                    if (height > MIN_CROP_SIZE) {
                        crop_box.style.top = top + 'px';
                        // maintain bottom position
                        if (height > original_height + (original_y - offset_top)) {
                            height = original_height + (original_y - offset_top);
                        }
                        crop_box.style.height = height + 'px';
                        per_top = top;
                        per_left = left;
                        per_bottom = Math.round($(crop_source).outerHeight() - (per_top + $(crop_box).outerHeight()));
                        per_right = Math.round($(crop_source).outerWidth() - (per_left + $(crop_box).outerWidth()));
                        $(crop_area)[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
                    }

                } else if (currentResizer.classList.contains('right-middle')) {

                    left = original_x - offset_left;
                    if (!mobile) {
                        width = original_width + (e.pageX - original_mouse_x);
                    } else {
                        width = original_width + (e.touches[0].pageX - original_mouse_x);
                    }
                    if (left + width > bound_r) {
                        width = bound_w - left;
                    }
                    if (width > MIN_CROP_SIZE) {
                        crop_box.style.width = width + 'px';
                        crop_box.style.left = left + 'px';
                        per_top = crop_box.offsetTop;
                        per_left = left;
                        per_bottom = Math.round($(crop_source).outerHeight() - (per_top + $(crop_box).outerHeight()));
                        per_right = Math.round($(crop_source).outerWidth() - (per_left + $(crop_box).outerWidth()));
                        $(crop_area)[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
                    }
                } else if (currentResizer.classList.contains('left-middle')) {

                    if (!mobile) {
                        width = (original_width - (e.pageX - original_mouse_x));
                        left = original_x + (e.pageX - original_mouse_x) - offset_left;
                    } else {
                        width = (original_width - (e.touches[0].pageX - original_mouse_x));
                        left = original_x + (e.touches[0].pageX - original_mouse_x) - offset_left;
                    }
                    if (left < 0) {
                        width = width + left;
                        left = 0;
                    }
                    if (width > MIN_CROP_SIZE) {
                        crop_box.style.width = width + 'px';
                        crop_box.style.left = left + 'px';
                        per_top = crop_box.offsetTop;
                        per_left = left;
                        per_bottom = Math.round($(crop_source).outerHeight() - (per_top + $(crop_box).outerHeight()));
                        per_right = Math.round($(crop_source).outerWidth() - (per_left + $(crop_box).outerWidth()));
                        $(crop_area)[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
                    }

                } else if (currentResizer.classList.contains('bottom-left')) {

                    if (!mobile) {
                        height = original_height + (e.pageY - original_mouse_y);
                        width = original_width - (e.pageX - original_mouse_x);
                    } else {
                        height = original_height + (e.touches[0].pageY - original_mouse_y);
                        width = original_width - (e.touches[0].pageX - original_mouse_x);
                    }
                    if ((height + crop_box.offsetTop) > bound_b) {
                        height = bound_b - crop_box.offsetTop;
                    }
                    if (height > MIN_CROP_SIZE) {
                        crop_box.style.height = height + 'px';
                    }
                    if (width > MIN_CROP_SIZE) {
                        if (!mobile) {
                            calc_left = original_x + (e.pageX - original_mouse_x) - offset_left;
                        } else {
                            calc_left = original_x + (e.touches[0].pageX - original_mouse_x) - offset_left;
                        }
                        if (calc_left < 0) {
                            width = width + calc_left;
                            calc_left = 0;
                        }
                        crop_box.style.width = width + 'px';
                        crop_box.style.left = calc_left + 'px';
                    }
                    per_top = crop_box.offsetTop;
                    per_left = calc_left;
                    per_bottom = Math.round($(crop_source).outerHeight() - (per_top + $(crop_box).outerHeight()));
                    per_right = Math.round(($(crop_source).outerWidth()) - (per_left + ($(crop_box).outerWidth())));
                    $(crop_area)[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";

                } else if (currentResizer.classList.contains('top-right')) {

                    if (!mobile) {
                        width = original_width + (e.pageX - original_mouse_x);
                        height = original_height - (e.pageY - original_mouse_y);
                    } else {
                        width = original_width + (e.touches[0].pageX - original_mouse_x);
                        height = original_height - (e.touches[0].pageY - original_mouse_y);
                    }
                    left = original_x - offset_left;
                    if (left + width > bound_r) {
                        width = bound_r - left - offset_left;
                    }
                    if (left > bound_w) {
                        width = bound_w;
                    }
                    if (height > bound_h) {
                        height = bound_h;
                    }
                    if (left < 0) {
                        left = 0 - offset_left;
                    }
                    crop_box.style.left = left + 'px';
                    if (width > MIN_CROP_SIZE) {
                        crop_box.style.width = width + 'px';
                    }
                    if (height > MIN_CROP_SIZE) {
                        if (!mobile) {
                            calc_top = original_y + (e.pageY - original_mouse_y) - offset_top;
                        } else {
                            calc_top = original_y + (e.touches[0].pageY - original_mouse_y) - offset_top;
                        }
                        if (calc_top < 0) {
                            calc_top = 0;
                        }
                        crop_box.style.top = calc_top + 'px';
                        // maintain bottom position
                        if (height > original_height + (original_y - offset_top)) {
                            height = original_height + (original_y - offset_top);
                        }
                        crop_box.style.height = height + 'px';
                    }
                    per_top = calc_top;
                    per_left = left;
                    per_bottom = Math.round($(crop_source).outerHeight() - (per_top + $(crop_box).outerHeight()));
                    per_right = Math.round($(crop_source).outerWidth() - (per_left + $(crop_box).outerWidth()));
                    $(crop_area)[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";

                } else if (currentResizer.classList.contains('top-left')) {

                    if (!mobile) {
                        width = original_width - (e.pageX - original_mouse_x);
                        height = original_height - (e.pageY - original_mouse_y);
                    } else {
                        width = original_width - (e.touches[0].pageX - original_mouse_x);
                        height = original_height - (e.touches[0].pageY - original_mouse_y);
                    }
                    if (width > bound_w) {
                        width = bound_w;
                    }
                    if (height > bound_h) {
                        height = bound_h;
                    }
                    if (width > MIN_CROP_SIZE) {
                        crop_box.style.width = width + 'px';
                        if (!mobile) {
                            calc_left = original_x + (e.pageX - original_mouse_x) - bound_l;
                        } else {
                            calc_left = original_x + (e.touches[0].pageX - original_mouse_x) - bound_l;
                        }
                        if (calc_left < 0) {
                            calc_left = 0;
                        }
                        left = calc_left;
                        crop_box.style.left = left + 'px';
                    }
                    if (height > MIN_CROP_SIZE) {
                        if (!mobile) {
                            calc_top = original_y + (e.pageY - original_mouse_y) - offset_top;
                        } else {
                            calc_top = original_y + (e.touches[0].pageY - original_mouse_y) - offset_top;
                        }
                        if (calc_top < 0) {
                            calc_top = 0;
                        }
                        crop_box.style.top = calc_top + 'px';
                        // maintain bottom position
                        if (height > original_height + (original_y - offset_top)) {
                            height = original_height + (original_y - offset_top);
                        }
                        crop_box.style.height = height + 'px';
                    }
                    per_top = calc_top;
                    per_left = left;
                    per_bottom = Math.round($(crop_source).outerHeight() - (per_top + $(crop_box).outerHeight()));
                    per_right = Math.round($(crop_source).outerWidth() - (per_left + $(crop_box).outerWidth()));
                    $(crop_area)[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";

                } else if (currentResizer.classList.contains('bottom-right')) {

                    if (!mobile) {
                        width = original_width + (e.pageX - original_mouse_x);
                        height = original_height + (e.pageY - original_mouse_y);
                        top = original_y - offset_top;
                    } else {
                        width = original_width + (e.touches[0].pageX - original_mouse_x);
                        height = original_height + (e.touches[0].pageY - original_mouse_y);
                        top = original_y - offset_top;
                    }
                    left = original_x - offset_left;
                    if (left + width > bound_r) {
                        width = bound_r - left - offset_left;
                    }
                    if (width > MIN_CROP_SIZE) {
                        crop_box.style.width = width + 'px';
                        if (!mobile) {
                            crop_box.style.left = left + 'px';
                        } else {
                            crop_box.style.left = left + 'px';
                        }
                    }
                    if ((height + crop_box.offsetTop) > bound_b) {
                        height = bound_b - crop_box.offsetTop;
                    }
                    if (height > MIN_CROP_SIZE) {
                        crop_box.style.height = height + 'px';
                        if (!mobile) {
                            crop_box.style.top = top + 'px';
                        } else {
                            crop_box.style.top = top + 'px';
                        }
                    }
                    per_top = crop_box.offsetTop;
                    per_left = left;
                    if (per_left < 0) {
                        per_left = 0 - offset_left;
                    }
                    per_bottom = Math.round($(crop_source).outerHeight() - (per_top + $(crop_box).outerHeight()));
                    per_right = Math.round($(crop_source).outerWidth() - (per_left + ($(crop_box).outerWidth())));
                    $(crop_area)[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
                }

                checkEdges(crop_box, per_left, per_right, per_top, per_bottom);

            }

            function stopResize() {
                // Reenable scroll
                Scroll.enable('.content_cnv');
                $(crop_box).removeClass('active_resize');
                if (!mobile) {
                    document.removeEventListener('mousemove', resize);
                    document.removeEventListener('mouseup', stopResize);
                    Drag.resume();
                } else {
                    currentResizer.removeEventListener("touchmove", resize, false);
                    Drag.resume();
                }
            }
        }
    };

}]);