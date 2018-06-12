cardApp.controller("MainCtrl", ['$scope', function($scope) {

	console.log('MainCtrl');
	$rootScope.dataLoading = false;

	 $scope.$on('$viewContentLoaded', function(){
    //Here your view content is fully loaded !!
    console.log('view loaded');
  });

}]);