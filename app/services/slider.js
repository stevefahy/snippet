//
// Slider Service
//

cardApp.service('Slider', ['$window', '$rootScope', function($window, $rootScope) {


    this.slider_sharpen = '<rzslider rz-slider-model="slider_settings.sharpen.amount" rz-slider-options="slider_settings.sharpen.options"></rzslider>';
    this.slider_rotate = '<rzslider rz-slider-model="slider_settings.rotate.amount" rz-slider-options="slider_settings.rotate.options"></rzslider>';

    this.slider_skew_h = '<rzslider rz-slider-model="slider_settings.skew_h.amount" rz-slider-options="slider_settings.skew_h.options"></rzslider>';


}]);