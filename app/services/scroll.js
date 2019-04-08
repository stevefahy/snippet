//
// Scroll Service
//
cardApp.service('Scroll', function() {

	this.enable = function(target){
		$(target).css('overflow-y', 'unset');
	};

	this.disable = function(target){
		$(target).css('overflow-y', 'hidden');
	};

});