// Service
// Each function returns a promise object 
cardApp.factory('Cards', ['$http', function($http) {
    return {
        create_card: function() {
            console.log('service create_card');
            
        return $http.get("/create_card");
            //$location.path('/create_card');
        },
        get: function() {
            return $http.get('api/cards');
        },
        create: function(carddata) {
            return $http.post('api/cards', carddata);
        },
        delete: function(id) {
            return $http.delete('api/cards/' + id);
        },
        update: function(pms) {
            console.log('update service');
            var theurl = 'api/cards/' + pms.id;
            return $http.put(theurl, pms);
        },
        search: function(input) {
            return $http.post('api/cards/search/' + input);
        }
    };
}]);