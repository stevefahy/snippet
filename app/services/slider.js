//
// Slider Service
//

cardApp.service('Slider', ['$window', '$rootScope', 'ImageAdjustment', function($window, $rootScope, ImageAdjustment) {


    this.slider_sharpen = '<rzslider rz-slider-model="slider_settings.sharpen.amount" rz-slider-options="slider_settings.sharpen.options"></rzslider>';
    this.slider_rotate = '<rzslider rz-slider-model="slider_settings.rotate.amount" rz-slider-options="slider_settings.rotate.options"></rzslider>';

    this.slider_skew_h = '<rzslider rz-slider-model="slider_settings.skew_h.amount" rz-slider-options="slider_settings.skew_h.options"></rzslider>';

$rootScope.slider_settings = {

        sharpen: {
            amount: 0,
            reset: 0,
            options: {
                floor: 0,
                ceil: 20,
                step: 0.1,
                precision: 1,
                id: 'slider-id',
                onStart: function(sharpen) {
                    //console.log('on start ' + $rootScope.slider_settings.sharpen.amount);
                },
                onChange: function(id) {
                    //console.log('on change ' + $rootScope.slider_settings.sharpen.amount);
                },
                onEnd: function(id) {
                    //console.log('on end ' + $rootScope.slider_settings.sharpen.amount);
                    ImageAdjustment.setImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'sharpen', $rootScope.slider_settings.sharpen.amount);
                    ImageAdjustment.setSharpenUpdate(ImageAdjustment.getSource(), ImageAdjustment.getTarget(), ImageAdjustment.getImageAdjustments(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId()));
                }
            }
        },

        rotate: {
            amount: 0,
            reset: 0,
            options: {
                floor: -45,
                ceil: 45,
                step: 0.1,
                precision: 1,
                id: 'slider-idt',
                onStart: function(sharpen) {
                    //console.log('on start ' + $rootScope.slider_settings.rotate.amount);
                },
                onChange: function(id) {
                    //console.log('on change ' + $rootScope.slider_settings.rotate.amount);
                    $rootScope.sliderRotateChange($rootScope.slider_settings.rotate.amount);
                },
                onEnd: function(id) {
                    //console.log('on end ' + $rootScope.slider_settings.rotate.amount);
                }
            }
        },

        skew_h: {
            amount: 0,
            reset: 0,
            options: {
                floor: -1,
                ceil: 1,
                step: 0.1,
                precision: 1,
                id: 'slider-idt',
                onStart: function(sharpen) {
                    //console.log('on start ' + $rootScope.slider_settings.rotate.amount);
                },
                onChange: function(id) {
                    //console.log('on change ' + $rootScope.slider_settings.rotate.amount);
                    $rootScope.sliderSkewHChange($rootScope.slider_settings.skew_h.amount);
                },
                onEnd: function(id) {
                    //console.log('on end ' + $rootScope.slider_settings.rotate.amount);
                }
            }
        }

    };

}]);