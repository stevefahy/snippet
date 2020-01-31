//
// ImageFilters Service
//

cardApp.service('ImageFilters', ['$rootScope', 'Format', '$q', 'ContentEditable', 'ImageAdjustment', 'ImageFunctions', 'Slider', function($rootScope, Format, $q, ContentEditable, ImageAdjustment, ImageFunctions, Slider) {

    var buildFilters = function(parent_container, id, image) {
        var filt = $('.image_filt_div');
        filt.attr('id', 'filters_' + id);
        filt.addClass('filters_active');
        // Empty the filter list from previous use.
        $('.filter_list').empty();
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

    this.open = function() {
        $('.image_adjust_on').remove();
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();
        var ia = ImageAdjustment.getImageAdjustments(parent_container, id);
        var image = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        var source = ImageFunctions.imageToCanvas(image);
        var target = ImageFunctions.imageToCanvas(image);
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
                    ImageFunctions.canvasToTempImage(result, id).then(function(image) {
                        buildFilters(parent_container, id, image);
                        $(target).removeClass('hide');
                        ImageFunctions.hideAdjusted(parent_container, id);
                    });
                });
            });
        } else {
            // Source canvas - no adjustments
            ImageFunctions.canvasToTempImage(source, id).then(function(image) {
                buildFilters(parent_container, id, image);
                $(target).removeClass('hide');
                ImageFunctions.hideOriginal(parent_container, id);
            });
        }
    };

    this.filterClick = function(e, button, id, filter) {
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();
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


    
    this.close = function() {
        var deferred = $q.defer();
        var promises = [];
        var parent_container = ImageAdjustment.getImageParent();
        console.log(parent_container);
        var id = ImageAdjustment.getImageId();
        var cropper = $('.' + parent_container + ' #cropper_' + id);
        ContentEditable.setContenteditable(cropper, true);
        $('.image_filt_div').removeClass('filters_active');
        Slider.removeSlider();
        var prev_adjusted = $('.adjusted.hide')[0];
        var current_adjusted = $('.content_cnv .target_canvas.adjusted')[0];
        var current_canvas = $('.content_cnv .target_canvas')[0];
        var source_canvas = $('.content_cnv .source_canvas')[0];
        var image_original = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        ImageFunctions.adjustSrc(image_original, 'hide');
        // Filter added.
        if (current_adjusted != undefined) {
            if (prev_adjusted != undefined) {
                $(prev_adjusted).remove();
            }
            // Save the canvas to image
            var prom = ImageFunctions.canvasToImage(current_adjusted, id).then(function(image) {
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
                ImageFunctions.adjustSrc(image_original, 'show');
            }
            $(current_canvas).remove();
            $(source_canvas).remove();
            deferred.resolve();
        }
        $q.all(promises).then(function() {
            // SAVE
            ImageAdjustment.setImageEditing(false);
//            ImageFunctions.saveCropper($('.' + parent_container + ' #cropper_' + id));
            deferred.resolve();
        });
        return deferred.promise;
    };
    

}]);