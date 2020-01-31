//
// ImageFunctions Service
//

cardApp.service('ImageFunctions', ['$rootScope', 'Format', '$q', 'ContentEditable', 'ImageAdjustment', function($rootScope, Format, $q, ContentEditable, ImageAdjustment) {

    var self = this;
    var temp_save = false;

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

    this.canvasToImage = function(canvas, id) {
        var deferred = $q.defer();
        var dataUrl = canvas.toDataURL('image/jpeg', JPEG_COMPRESSION);
        Format.dataURItoBlob(dataUrl).then(function(blob) {
            blob.name = 'image_filtered_' + id + '.jpg';
            blob.renamed = true;
            Format.prepImage([blob], function(result) {
                if ($rootScope.online) {
                    var img_new = new Image();
                    img_new.src = IMAGES_URL + result.file + '?' + new Date();
                    img_new.className = 'adjusted';
                    img_new.id = 'image_filtered_' + id;
                    img_new.onload = function() {
                        deferred.resolve(this);
                    };
                } else {
                    // Offline (use blob and save original-image-name)
                    var img_new = new Image();
                    img_new.src = result.file;
                    img_new.className = 'adjusted';
                    img_new.id = 'image_filtered_' + id;
                    img_new.setAttribute('original-image-name', result.original_image);
                    deferred.resolve(img_new);
                }

            });
        });
        return deferred.promise;
    };

    this.canvasToTempImage = function(canvas, id) {
        var deferred = $q.defer();
        var dataUrl = canvas.toDataURL('image/jpeg', JPEG_COMPRESSION);
        var image = document.createElement('img');
        image.src = dataUrl;
        deferred.resolve(image);
        return deferred.promise;
    };

    this.adjustSrc = function(image, state) {
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

    this.saveCropper = function(cropper) {
        console.log('saveCropper');
        var deferred = $q.defer();
        // Turn on contenteditable for this card before saving
        ContentEditable.setContenteditable($(cropper)[0], true);
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

    this.hideAdjusted = function(parent_container, id) {
        // If there is already an adjusted image then hide it.
        if ($('.' + parent_container + ' #cropper_' + id + ' img.adjusted').length > 0) {
            $('.' + parent_container + ' #cropper_' + id + ' img.adjusted').addClass('hide');
        }
    };

    this.hideOriginal = function(parent_container, id) {
        // Hide the original image.
        $('.' + parent_container + ' #cropper_' + id + ' #image_' + id).addClass('hide');
        var image_original = $('.' + parent_container + ' #cropper_' + id + ' #image_' + id)[0];
        self.adjustSrc(image_original, 'hide');
    };

}]);