//
// Slider Service
//

cardApp.service('Slider', ['$window', '$rootScope', 'ImageAdjustment', function($window, $rootScope, ImageAdjustment) {

    this.slider_sharpen = '<div class="slider_outer" id="s_sharpen"><div class="slider_s_icon"><i class="material-icons light">details</i></div><rzslider rz-slider-model="slider_settings.sharpen.amount" rz-slider-options="slider_settings.sharpen.options"></rzslider></div>';
    this.slider_rotate = '<div class="slider_outer" id="s_rotate"><div class="slider_r_icon"><i class="material-icons light rotate">autorenew</i></div><rzslider rz-slider-model="slider_settings.rotate.amount" rz-slider-options="slider_settings.rotate.options"></rzslider></div>';
    this.slider_perspective_v = '<div class="slider_outer" id="s_perspective_v"><div class="slider_p_v_icon"><img class="graphic-icons" src="/assets/images/perspective_w.png"></div><rzslider rz-slider-model="slider_settings.perspective_v.amount" rz-slider-options="slider_settings.perspective_v.options" id="slider_p_v"></rzslider></div>';
    this.slider_perspective_h = '<div class="slider_outer" id="s_perspective_h"><div class="slider_p_h_icon"><img class="graphic-icons" src="/assets/images/perspective_w.png"></div><rzslider rz-slider-model="slider_settings.perspective_h.amount" rz-slider-options="slider_settings.perspective_h.options" id="slider_p_h"></rzslider></div>';
    this.slider_test = '<div class="slider_outer" id="s_test"><div class="slider_t_icon"><i class="material-icons light rotate">adjust</i></div><rzslider rz-slider-model="slider_settings.test.amount" rz-slider-options="slider_settings.test.options"></rzslider></div>';
    
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
                    ImageAdjustment.quickSharpen(ImageAdjustment.getSource(), ImageAdjustment.getTarget(), ImageAdjustment.getImageAdjustments(ImageAdjustment.getImageParent(), ImageAdjustment.getImageId()));
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
                translate: function(value) {
                    return value + '&deg;';
                },
                onStart: function() {
                    //console.log('on start ' + amount);
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
        },

        test: {
            amount: 0,
            reset: 0,
            options: {
                floor: -2,
                ceil: 2,
                step: 0.00001,
                precision: 5,
                id: 'slider-idt',
                onStart: function() {
                    //console.log('on start ' + amount);
                },
                onChange: function(id, amount) {
                    //console.log('on change ' + amount);
                    sliderTestChange(amount);
                },
                onEnd: function(id, amount) {
                    //console.log('on end ' + amount);
                    sliderTestChange(amount);
                }
            }
        }

    };

    this.reset = function() {
        //$rootScope.slider_settings
        for (var key in $rootScope.slider_settings) {
            if ($rootScope.slider_settings.hasOwnProperty(key)) {
                console.log(key, $rootScope.slider_settings[key]);
                $rootScope.slider_settings[key].amount = $rootScope.slider_settings[key].reset;
                console.log(key, $rootScope.slider_settings[key]);
            }
        }
        console.log($rootScope.slider_settings);
    };

}]);