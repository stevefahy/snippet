//
// Resize Service
//
cardApp.service('Resize', ['Drag', 'ImageAdjustment', function(Drag, ImageAdjustment) {

    // TODO 
    // min size
    // limit to bounds (also drag);

    var ua = navigator.userAgent;
    var mobile = false;
    if (ua.indexOf('AndroidApp') >= 0) {
        mobile = true;
    }

    this.makeResizableDiv = function(div, id) {
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
            var original_image = $('.content_cnv #cropper_' + id + ' #image_' + id)[0];
            var crop_image = document.getElementById('crop_src');
            // Get scale ratio of the image (as displayed which may be scaled to fit compared to the original image).
            var scale = ImageAdjustment.getScale(original_image, crop_image);

            element.style.width = ia.crop.width / scale + 'px';
            element.style.height = ia.crop.height / scale + 'px';
            element.style.top = ia.crop.y / scale + 'px';
            element.style.left = ia.crop.x / scale + 'px';

            per_top = ia.crop.y / scale;
            per_left = ia.crop.x / scale;
            per_bottom = $('#crop_src').outerHeight() - (per_top + $('.crop_adjust').outerHeight());
            per_right = $('#crop_src').outerWidth() - (per_left + $('.crop_adjust').outerWidth());

        } else {
            // Not previously cropped. Set crop box to a default size.
            per_top = element.offsetTop;
            per_left = element.offsetLeft;
            per_bottom = $('#crop_src').outerHeight() - (per_top + $('.crop_adjust').outerHeight());
            per_right = $('#crop_src').outerWidth() - (per_left + $('.crop_adjust').outerWidth());
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

                var cropper_loc = $(element).closest('.cropper_cont');
                offset_top = $(cropper_loc).offset().top;
                offset_left = $(cropper_loc).offset().left;
                console.log(offset_left);

                var crop_area = document.querySelector('.crop_area');
                bound_r = crop_area.getBoundingClientRect().right;
                bound_l = crop_area.getBoundingClientRect().left;
                bound_t = crop_area.getBoundingClientRect().top - offset_top;
                bound_b = crop_area.getBoundingClientRect().bottom - offset_top;
                bound_w = $(crop_area).outerWidth();
                bound_h = $(crop_area).outerHeight();
                bound_offset_top = $(crop_area).offset().top;
                bound_offset_left = $(crop_area).offset().left;

                console.log(bound_l + ' : ' + bound_r + ' : ' + bound_t + ' : ' + bound_b);
                console.log('w: ' + bound_w);
                original_width = parseFloat(getComputedStyle(element, null).getPropertyValue('width').replace('px', ''));
                original_height = parseFloat(getComputedStyle(element, null).getPropertyValue('height').replace('px', ''));
                original_x = element.getBoundingClientRect().left;
                original_y = element.getBoundingClientRect().top;
                original_offset_left = $(element).offset().left;

                original_bottom = element.getBoundingClientRect().bottom;
                console.log(original_bottom);

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
                console.log('t: ' + (e.pageY - offset_top) + ' l: ' + (e.pageX - original_x) + ' r: ' + (e.pageX - original_x));
                if (currentResizer.classList.contains('bottom-middle')) {
                    var width;
                    var height;
                    var top;
                    var bottom;
                    if (!mobile) {
                        height = original_height + (e.pageY - original_mouse_y);
                        bottom = e.pageY - offset_top;
                    } else {
                        height = original_height + (e.touches[0].pageY - original_mouse_y);
                        bottom = e.touches[0].pageY - offset_top;
                    }
                    if ((height + element.offsetTop) > bound_b) {
                        height = bound_b - element.offsetTop;
                    }
                    if (height > minimum_size) {
                        element.style.height = height + 'px';
                        var per_top = element.offsetTop;
                        var per_left = element.offsetLeft;
                        var per_bottom = $('#crop_src').outerHeight() - (per_top + $('.crop_adjust').outerHeight());
                        var per_right = $('#crop_src').outerWidth() - (per_left + $('.crop_adjust').outerWidth());
                        $('.crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
                    }
                } else if (currentResizer.classList.contains('top-middle')) {
                    var width;
                    var height;
                    var top;
                    if (!mobile) {
                        height = (original_height - (e.pageY - original_y));
                        top = e.pageY - offset_top;
                        //top = (original_height - (e.pageY - original_y));
                    } else {
                        height = (original_height - (e.touches[0].pageY - original_y));
                        top = e.touches[0].pageY - offset_top;
                    }
                    //if(height)
                    if (top < 0) {
                        top = 0;
                    }
                    if (height > bound_h) {
                        height = bound_h;
                    }
                    // maintain bottom position
                    if (height > original_height + (original_y - offset_top)) {
                        height = original_height + (original_y - offset_top);
                    }
                    if (height > minimum_size) {
                        element.style.height = height + 'px';
                        element.style.top = top + 'px';
                        //var per_top = element.offsetTop;
                        var per_top = top;
                        var per_left = element.offsetLeft;
                        var per_bottom = $('#crop_src').outerHeight() - (per_top + $('.crop_adjust').outerHeight());
                        var per_right = $('#crop_src').outerWidth() - (per_left + $('.crop_adjust').outerWidth());
                        $('.crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
                    }
                } else if (currentResizer.classList.contains('right-middle')) {
                    var width;
                    var height;
                    var top;
console.log(original_x);
left = original_x - offset_left;
                    if (!mobile) {
                       // width = (original_width + (e.pageX - original_x) - original_width);
                         width = original_width + (e.pageX - original_mouse_x);
                    } else {
                        //width = (original_width + (e.touches[0].pageX - original_x) - original_width);
                         width = original_width + (e.touches[0].pageX - original_mouse_x);
                    }
                    if (left < 0) {
                        //left = 0;
                    }
                    if (left + width > bound_r) {
                        //width = bound_r - left;
                        width = bound_w-left;
                    }




                    if (width > minimum_size) {
                        element.style.width = width + 'px';
                        element.style.left = left + 'px';
                        var per_top = element.offsetTop;
                        //var per_left = element.offsetLeft;
                        var per_left = left;
                        var per_bottom = $('#crop_src').outerHeight() - (per_top + $('.crop_adjust').outerHeight());
                        var per_right = Math.round($('#crop_src').outerWidth() - (per_left + $('.crop_adjust').outerWidth()));
                        $('.crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
                    }
                } else if (currentResizer.classList.contains('left-middle')) {
                    var width;
                    var height;
                    var top;
                    if (!mobile) {
                        width = (original_width - (e.pageX - original_mouse_x));
                        left = original_x + (e.pageX - original_mouse_x) - offset_left;
                    } else {
                        width = (original_width - (e.touches[0].pageX - original_mouse_x));
                        left = original_x + (e.touches[0].pageX - original_mouse_x);
                    }
                    if (left < 0) {
                        width = width + left;
                      //  width = original_width;
                        left = 0;
                    }


                    if (width > minimum_size) {
                        
                        element.style.width = width + 'px';
                        
                        element.style.left = left + 'px';
                        var per_top = element.offsetTop;
                        //var per_left = element.offsetLeft;
                        var per_left = left;
                        var per_bottom = $('#crop_src').outerHeight() - (per_top + $('.crop_adjust').outerHeight());
                        var per_right = Math.round($('#crop_src').outerWidth() - (per_left + $('.crop_adjust').outerWidth()));
                        $('.crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
                    }
                } else if (currentResizer.classList.contains('bottom-left')) {
                    var width;
                    var height;
                    var top;
                    if (!mobile) {
                        height = original_height + (e.pageY - original_mouse_y);
                        width = original_width - (e.pageX - original_mouse_x);
                    } else {
                        height = original_height + (e.touches[0].pageY - original_mouse_y);
                        width = original_width - (e.touches[0].pageX - original_mouse_x);
                    }
                    if ((height + element.offsetTop) > bound_b) {
                        height = bound_b - element.offsetTop;
                    }
                    if (height > minimum_size) {
                        element.style.height = height + 'px';
                    }
                    // maintain right
                    console.log(bound_r + ' : ' + bound_w);
                    //if (width > original_width + (original_x - offset_left)) {
                        //width = original_width + (original_x - offset_left);
                    //}

                    if (width > minimum_size) {

                        if (!mobile) {
                            calc_left = original_x + (e.pageX - original_mouse_x) - offset_left;
                        } else {
                            calc_left = original_x + (e.touches[0].pageX - original_mouse_x) - offset_left;
                        }

                        if (calc_left < 0) {
                            width = width + calc_left;
                            calc_left = 0;
                        }
                        element.style.width = width + 'px';
                        element.style.left = calc_left + 'px';

                    }
                    var per_top = element.offsetTop;
                    var per_left = element.offsetLeft;
                    var per_bottom = $('#crop_src').outerHeight() - (per_top + $('.crop_adjust').outerHeight());
                    var per_right = $('#crop_src').outerWidth() - (per_left + $('.crop_adjust').outerWidth());
                    $('.crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
                } else if (currentResizer.classList.contains('top-right')) {
                    // Fix top left and top right extending bottom too far.
                    var width;
                    var height;
                    var top;
                    var calc_top;
                    if (!mobile) {
                        width = original_width + (e.pageX - original_mouse_x);
                        height = original_height - (e.pageY - original_mouse_y);
                    } else {
                        width = original_width + (e.touches[0].pageX - original_mouse_x);
                        height = original_height - (e.touches[0].pageY - original_mouse_y);
                    }
                    left = original_x;
                    if (left + width > bound_r) {
                        width = bound_r - left;
                    }
                    if (left > bound_w) {
                        width = bound_w;
                    }
                    if (height > bound_h) {
                        height = bound_h;
                    }
                    //if (left < 0) {
                    //    left = 0;
                    //}
                    if (width > minimum_size) {
                        element.style.width = width + 'px';
                    }
                    if (height > minimum_size) {
                        if (!mobile) {
                            calc_top = original_y + (e.pageY - original_mouse_y) - offset_top;
                        } else {
                            calc_top = original_y + (e.touches[0].pageY - original_mouse_y) - offset_top;
                        }
                        if (calc_top < 0) {
                            calc_top = 0;
                            

                        } 
                        element.style.top = calc_top + 'px';
                        // maintain bottom position
                        if (height > original_height + (original_y - offset_top)) {
                            height = original_height + (original_y - offset_top);
                        }
                        element.style.height = height + 'px';

                    }
                    var per_top = element.offsetTop;
                    var per_left = left - offset_left;
                    var per_bottom = $('#crop_src').outerHeight() - (per_top + $('.crop_adjust').outerHeight());
                    var per_right = Math.round($('#crop_src').outerWidth() - (per_left + $('.crop_adjust').outerWidth()));
                    //var per_right = bound_w - width;
                    $('.crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
                } else if (currentResizer.classList.contains('top-left')) {
                    var width;
                    var height;
                    var top;
                    var calc_top;
                    var right;
                    console.log(original_height + ' : ' + (original_y - offset_top));

                    //console.log(original_y + ' : ' + bound_h);
                    //console.log(bound_offset_left + ' : ' + bound_w);
                    //console.log(bound_t + ' : ' + bound_h);
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
                    console.log(height);

                    if (width > minimum_size) {
                        element.style.width = width + 'px';

                        if (!mobile) {
                            calc_left = original_x + (e.pageX - original_mouse_x) - bound_l;
                        } else {
                            calc_left = original_x + (e.touches[0].pageX - original_mouse_x);
                        }
                        if (calc_left < 0) {
                            calc_left = 0;
                        }
                        left = calc_left;
                        element.style.left = left + 'px';

                        //element.style.right = original_x + original_width + 'px';
                    }
                    if (height > minimum_size) {
                        if (!mobile) {
                            calc_top = original_y + (e.pageY - original_mouse_y) - offset_top;
                        } else {
                            calc_top = original_y + (e.touches[0].pageY - original_mouse_y) - offset_top;
                        }
                        if (calc_top < 0) {
                            calc_top = 0;
                        }

                        //} else {
                        // element.style.top = 0 + 'px';
                        //}
                        element.style.top = calc_top + 'px';
                        //if(calc_top > 0){
                        // maintain bottom position
                        if (height > original_height + (original_y - offset_top)) {
                            height = original_height + (original_y - offset_top);
                        }
                        element.style.height = height + 'px';

                        //}




                    }
                    var per_top = calc_top; //element.offsetTop;
                    var per_left = left;
                    var per_bottom = $('#crop_src').outerHeight() - (per_top + $('.crop_adjust').outerHeight());
                    var per_right = $('#crop_src').outerWidth() - (per_left + $('.crop_adjust').outerWidth());
                    //var per_right = bound_w - (per_left + bound_w);
                    $('.crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
                } else if (currentResizer.classList.contains('bottom-right')) {
                    var width;
                    var height;
                    var top;
                    if (!mobile) {
                         width = original_width + (e.pageX - original_mouse_x) + offset_left;
                       // width = original_width + (e.pageX - original_x) - original_width;
                        height = original_height + (e.pageY - original_mouse_y);
                        //left = original_x;
                        top = original_y - offset_top;
                    } else {
                        //width = original_width + (e.touches[0].pageX - original_x) - original_width;
                        width = original_width + (e.touches[0].pageX - original_mouse_x) + offset_left;
                        height = original_height + (e.touches[0].pageY - original_mouse_y);
                        //left = original_x;
                        top = original_y - offset_top;
                    }

                    left = original_x - offset_left;
                    if (left + width > bound_r) {
                        width = bound_r - left;
                    }

                    if (width > minimum_size) {
                        element.style.width = width + 'px';
                        if (!mobile) {
                           // element.style.left = left + 'px';
                        } else {
                            //element.style.left = left + 'px';
                        }
                    }
                    if ((height + element.offsetTop) > bound_b) {
                        height = bound_b - element.offsetTop;
                    }
                    if (height > minimum_size) {
                        element.style.height = height + 'px';
                        if (!mobile) {
                            element.style.top = top + 'px';
                        } else {
                            element.style.top = top + 'px';
                        }
                    }
                    var per_top = element.offsetTop;
                    var per_left = left;
                    var per_bottom = $('#crop_src').outerHeight() - (per_top + $('.crop_adjust').outerHeight());
                    var per_right = Math.round($('#crop_src').outerWidth() - (per_left + $('.crop_adjust').outerWidth()) + offset_left);
                    $('.crop_area')[0].style.clipPath = "inset(" + per_top + "px " + per_right + "px " + per_bottom + "px " + per_left + "px)";
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
    };

}]);