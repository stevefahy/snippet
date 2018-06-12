cardApp.controller("loginCtrl", ['$scope', '$rootScope', '$animate', function($scope, $rootScope, $animate) {

	$scope.pageClass = '';
	console.log('login');
	$rootScope.dataLoading = false;

	$animate.enabled(false);

}]);