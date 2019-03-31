//
// Resize Service
//
cardApp.service('Resize', [ 'Drag', 'ImageAdjustment',  function(Drag, ImageAdjustment) {
    
    var ua = navigator.userAgent;
    var mobile = false;
    if (ua.indexOf('AndroidApp') >= 0) {
        mobile = true;
    }

    this.makeResizableDiv = function(div, id) {
        // TODO - element and elmnt dupes?
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
            // TODO - make get scale a function or imagedjustment service function.
            // Get the scale ratio
            var orig_image = $('.content_cnv #cropper_' + id + ' #image_' + id)[0];
            nat_w = orig_image.naturalWidth;
            var crop_image = document.getElementById('crop_src');
            cur_w = $(crop_image).outerWidth();
            var scale = nat_w / cur_w;

            elmnt.style.width = ia.crop.width / scale + 'px';
            elmnt.style.height = ia.crop.height / scale + 'px';
            elmnt.style.top = ia.crop.y / scale + 'px';
            elmnt.style.left = ia.crop.x / scale + 'px';

            per_top = ia.crop.y / scale;
            per_left = ia.crop.x / scale;
            per_bottom = $('#crop_src').outerHeight() - (per_top + $('.crop_adjust').outerHeight());
            per_right = $('#crop_src').outerWidth() - (per_left + $('.crop_adjust').outerWidth());

        } else {
            // Not previously cropped. Set crop box to a default size.
            per_top = elmnt.offsetTop;
            per_left = elmnt.offsetLeft;
            per_bottom = $('#crop_src').outerHeight() - (per_top + $('.crop_adjust').outerHeight());
            per_right = $('#crop_src').outerWidth() - (per_left + $('.crop_adjust').outerWidth());
        console.log(per_top + ' : ' + per_left + ' : ' + per_bottom + ' : ' + per_right);
        }
        // Set the clip path for the crop area.
        $('.crop_box.active .crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";

        for (var i = 0, len = resizers.length; i < len; i++) {
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
                $('.content_cnv').css('overflow-y', 'unset');
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
    }

}]);