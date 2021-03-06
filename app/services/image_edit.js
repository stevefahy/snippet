//
// ImageEdit Service
//

cardApp.service('ImageEdit', ['$window', '$rootScope', '$timeout', '$q', '$http', 'Users', 'Cards', 'Conversations', 'replaceTags', 'socket', 'Format', 'FormatHTML', 'General', 'UserData', 'principal', 'ImageAdjustment', 'Drag', 'Resize', 'Keyboard', 'Scroll', 'Slider', 'ImageManipulate', '$templateRequest', '$sce', 'Debug', 'ImageFunctions', 'Loading', 'CropRotate', 'ContentEditable', 'ImageFilters', function($window, $rootScope, $timeout, $q, $http, Users, Cards, Conversations, replaceTags, socket, Format, FormatHTML, General, UserData, principal, ImageAdjustment, Drag, Resize, Keyboard, Scroll, Slider, ImageManipulate, $templateRequest, $sce, Debug, ImageFunctions, Loading, CropRotate, ContentEditable, ImageFilters) {

    var self = this;

    // Helper functions

    // Get the context of the image (content_cnv or card_create_container)
    var getParentContainer = function(scope) {
        var parent_container;
        if ($(scope).parents('div.card_create_container').length > 0) {
            parent_container = 'card_create_container';
        } else {
            parent_container = PARENTCONTAINER;
        }
        return parent_container;
    };

    // Image Edit menu.

    this.editImage = function(scope, id) {
        var parent_container = getParentContainer(scope);
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        var editable = $(cropper).closest('.resize-container').attr('editing');
        if (editable == 'true') {
            ContentEditable.setContenteditable($(cropper)[0], false);
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
                    var card_expanded = $(cropper).closest('div.card_temp').attr('expanded');
                    if ($(scope).closest('div.resize-container').attr('editable') == 'true' && card_expanded == 'true') {
                        // If this image is not already being edited then allow it to be edited.
                        if (!ImageAdjustment.getImageEditing()) {
                            // Turn off content saving.
                            ImageAdjustment.setImageEditing(true);
                            ImageAdjustment.setImageId(id);
                            ImageAdjustment.setImageAdjusted(false);
                            // Save any changes made to this card in case the user navigates away from conversations before finishing editing image.
                            temp_save = true;
                            ImageFunctions.saveCropper(cropper).then(function() {
                                // Turn off contenteditable for this card.
                                ContentEditable.setContenteditable($(cropper)[0], false);
                                var image = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
                                // restore image so that it can be accessed as a source.
                                ImageFunctions.adjustSrc(image, 'show');
                                // Only open editing if not already open.
                                if ($('#image_adjust_' + id).length <= 0) {
                                    // Close existing
                                    $('.image_adjust_on').remove();
                                    $('.filters_active').remove();
                                    // Add the image edit menu.
                                    var ia = $('.image_adjust').clone();
                                    $(ia).attr('id', 'image_adjust_' + id);
                                    ia.insertBefore('.' + parent_container + ' #cropper_' + id);
                                    var user_title_image = $(scope).closest('div.resize-container').find('.user_image_title');
                                    var card_title_image = $(scope).closest('div.resize-container').find('.card_title');
                                    if (user_title_image.length > 0) {
                                        $(user_title_image).css('visibility', 'hidden');
                                        $(card_title_image).css('visibility', 'hidden');
                                    }
                                    // Import the edit_btns html.
                                    var edit_btns = $sce.getTrustedResourceUrl('/views/edit_btns.html');
                                    $templateRequest(edit_btns).then(function(template) {
                                        var eb = $('#image_adjust_' + id).append(template);
                                        $(eb).find('.at').attr("onclick", 'addTitle(event, \'' + id + '\')');
                                        $(eb).find('.ti').attr("onclick", 'testImage(event, \'' + id + '\')');
                                        $(eb).find('.ai').attr("onclick", 'adjustImage(event, \'' + id + '\')');
                                        $(eb).find('.fi').attr("onclick", 'openFilters(event, \'' + id + '\')');
                                        $(eb).find('.ois').attr("onclick", 'openCropRotate(event, \'' + id + '\')');
                                        $(eb).find('.di').attr("onclick", 'deleteImage(event, \'' + id + '\')');
                                        $(eb).find('.close_image_edit').attr("onclick", 'closeImageEdit(\'' + id + '\')');
                                        // set this menu to active
                                        $('#image_adjust_' + id).addClass('image_adjust_on');
                                    });
                                }
                            });
                        }
                    }
                });
            }
        }
    };

    this.updateTitle = function(id) {
        var user_title_image = $('#' + id + ' .user_image_title');
        var card_title_image = $('#' + id + ' .card_title');
        //card_title 
        if (user_title_image.length > 0) {
            $(user_title_image).css('visibility', '');
            $(card_title_image).css('visibility', '');
        }
    }

    this.deleteImage = function(e, id) {
        var parent_container = PARENTCONTAINER;
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        ContentEditable.setContenteditable(cropper, true);
        $('.image_adjust_on').remove();
        ImageAdjustment.setImageEditing(false);
        ImageAdjustment.setImageAdjusted(false);
        $(cropper)[0].remove();
    }

    this.closeImageEdit = function(id) {
        var parent_container = PARENTCONTAINER;
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        var card_id = $('.' + parent_container + ' #cropper_' + id).closest('div.card_temp').attr('id');
        ContentEditable.setContenteditable(cropper, true);
        $('.image_adjust_on').remove();
        if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
            ImageFunctions.hideOriginal(parent_container, id);
        }
        ImageAdjustment.setImageEditing(false);
        if (ImageAdjustment.getImageAdjusted()) {
            ImageAdjustment.setImageAdjusted(false);
        }
    };

    // CropRotate

    this.openCropRotate = function(e, id) {
        //var image;
        var parent_container = getParentContainer(e.target);
        ImageAdjustment.setImageParent(parent_container);
        ImageAdjustment.setImageId(id);
        ImageAdjustment.setImageEditing(true);
        CropRotate.open();
    };

    // adjustImage 

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
        var target = ImageFunctions.imageToCanvas(image);
        var source = ImageFunctions.imageToCanvas(image);
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
            ImageFunctions.hideOriginal(parent_container, id);
            ImageFunctions.hideAdjusted(parent_container, id);
            $(target).removeClass('hide');
        });
        e.stopPropagation();
    };

    // ImageFilters

    this.openFilters = function(e, id) {
        var parent_container = getParentContainer(e.target);
        ImageAdjustment.setImageId(id);
        ImageAdjustment.setImageParent(parent_container);
        ImageFilters.open();
        e.stopPropagation();
    };

    this.closeFilters = function() {
        var parent_container = PARENTCONTAINER;
        var id = ImageAdjustment.getImageId();
        ImageFilters.close();
    };

    // testImage

    this.sliderTestChange = function(value) {
        var ctx_source = $('.content_cnv .source_canvas')[0].getContext('2d');
        var ctx_target = $('.content_cnv .target_canvas')[0].getContext('2d');
        //Get data for the entire image
        var data = ctx_source.getImageData(0, 0, ctx_source.canvas.width, ctx_source.canvas.height);
        ImageManipulate.exposure2.filter(data, { amount: value });
        ctx_target.putImageData(data, 0, 0);
    };

    // Set image title as one object.
    this.setImageTitle = function(parent_container, id, values) {
        if (values == undefined) {
            // If the image title object is empty then remove the title-data attribute.
            $('.' + parent_container + ' #image_' + id).removeAttr('title-data');
        } else {
            // Custom attribute for storing title.
            $('.' + parent_container + ' #image_' + id).attr('title-data', values);
        }
    };

    this.getImageTitle = function(parent_container, id) {
        var title_data;
        // Custom attribute for storing image adjustments.
        var td = $('.' + parent_container + ' #image_' + id).attr('title-data');
        if (td != undefined) {
            title_data = td;
        }
        return title_data;
    };

    this.submitTitle = function(event, id) {
        var data = $('.content_cnv #title_' + id + ' .add_title_text').text();
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        var it = self.setImageTitle(PARENTCONTAINER, id, data);
        self.cancelTitle();
    }

    this.cancelTitle = function(event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        $('.image_title_div.title_active').remove();
    }

    this.addTitle = function(e, id) {
        var parent_container = getParentContainer(e.target);
        ImageAdjustment.setImageId(id);
        ImageAdjustment.setImageParent(parent_container);
        var image = $('.' + parent_container + ' #image_' + id)[0];
        if ($('.' + parent_container + ' .title_active').length <= 0) {
            var filt = $('.image_title_div').clone().insertBefore('.' + parent_container + ' #cropper_' + id);
            filt.attr('id', 'title_' + id);
            filt.addClass('title_active');
            $(filt).find('#submit_title').attr("onclick", 'submitTitle(event, \'' + id + '\')');
            var title = self.getImageTitle(PARENTCONTAINER, id);
            if (title != undefined) {
                $('.title_active .add_title_text').html(title);
            }
        }
    }

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
        var target = ImageFunctions.imageToCanvas(image);
        var source = ImageFunctions.imageToCanvas(image);
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
            ImageFunctions.hideOriginal(parent_container, id);
            ImageFunctions.hideAdjusted(parent_container, id);
            $(target).removeClass('hide');
        });
        e.stopPropagation();
    };

}]);