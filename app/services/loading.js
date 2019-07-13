//
// Loading Service
//

cardApp.service('Loading', ['$rootScope', 'ImageAdjustment', '$templateRequest', '$sce', function($rootScope, ImageAdjustment, $templateRequest, $sce) {

    this.addSpinner = function(image) {
        var parent_container = ImageAdjustment.getImageParent();
        var id = ImageAdjustment.getImageId();
        var cropper = $('.' + parent_container + ' #cropper_' + id)[0];
        var cropper_width = $(cropper).outerWidth().toFixed(2);
        var spinner_w = image.width;
        var spinner_h = image.height;
        if (image.width > cropper_width) {
            spinner_w = cropper_width;
            var spinner_scale = image.width / cropper_width;
            spinner_h = image.height / spinner_scale;
        }
        // Import the loading spinner html.
        var spinner = $sce.getTrustedResourceUrl('/views/loading_spinner.html');
        $templateRequest(spinner).then(function(template) {
            $(template).prependTo('.content_cnv #cropper_' + id);
            $('.loading_spinner').css('width', spinner_w);
            $('.loading_spinner').css('height', spinner_h);
        });
    };

}]);