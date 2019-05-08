//
// Slider Service
//

cardApp.service('Slider', ['$window', '$rootScope', 'ImageAdjustment', function($window, $rootScope, ImageAdjustment) {

    this.slider_sharpen = '<rzslider rz-slider-model="slider_settings.sharpen.amount" rz-slider-options="slider_settings.sharpen.options"></rzslider>';
    this.slider_rotate = '<rzslider rz-slider-model="slider_settings.rotate.amount" rz-slider-options="slider_settings.rotate.options"></rzslider>';
    this.slider_perspective_v = '<rzslider rz-slider-model="slider_settings.perspective_v.amount" rz-slider-options="slider_settings.perspective_v.options"></rzslider>';
    this.slider_perspective_h = '<rzslider rz-slider-model="slider_settings.perspective_h.amount" rz-slider-options="slider_settings.perspective_h.options"></rzslider>';

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
                onStart: function() {
                    //console.log('on start ' + amount);
                },
                onChange: function() {
                    //console.log('on change ' + amount);
                },
                onEnd: function(id, amount) {
                    //console.log('on end ' + $rootScope.slider_settings.sharpen.amount);
                    ImageAdjustment.setImageAdjustment(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId(), 'sharpen', amount);
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
                step: 0.001,
                precision: 1,
                id: 'slider-idt',
                onStart: function() {
                    //console.log('on start ' + amount);
                    //sliderRotateUpdate();
                },
                onChange: function(id, amount) {
                    //console.log('on change ' + amount);
                    sliderRotateChange(amount);
                },
                onEnd: function() {
                    //console.log('on end ' + amount);
                }
            }
        },

        perspective_v: {
            amount: 0,
            reset: 0,
            options: {
                floor: -100,
                ceil: 100,
                step: 1,
                precision: 1,
                id: 'slider-idt',
                onStart: function() {
                    //console.log('on start ' + amount);
                    sliderPerspectiveUpdate();
                },
                onChange: function(id, amount) {
                    //console.log('on change ' + amount);
                    sliderperspectiveVChange(amount, 'low');
                },
                onEnd: function(id, amount) {
                    //console.log('on end ' + amount);
                     sliderperspectiveVChange(amount, 'high');
                }
            }
        },

        perspective_h: {
            amount: 0,
            reset: 0,
            options: {
                floor: -100,
                ceil: 100,
                step: 1,
                precision: 1,
                id: 'slider-idt',
                onStart: function() {
                    //console.log('on start ' + amount);
                    sliderPerspectiveUpdate();
                },
                onChange: function(id, amount) {
                    //console.log('on change ' + amount);
                    sliderperspectiveHChange(amount, 'low');
                },
                onEnd: function(id, amount) {
                    //console.log('on end ' + amount);
                    sliderperspectiveHChange(amount, 'high');
                }
            }
        }

    };

}]);