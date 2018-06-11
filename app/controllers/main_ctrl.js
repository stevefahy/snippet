cardApp.controller("MainCtrl", ['$scope', function($scope) {

	console.log('MainCtrl');
	$scope.dataLoading = false;

	 $scope.$on('$viewContentLoaded', function(){
    //Here your view content is fully loaded !!
    console.log('view loaded');
  });

}]);