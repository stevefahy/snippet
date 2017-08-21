// Service
// Each function returns a promise object 
cardApp.factory('Cards', ['$http', function($http) {
    return {
        /*
        upload: function(input) {
            return $http.post('api/cards/photo/' + input);
        },
        */
        upload: function() {
            return $http.post('upload');
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
            var theurl = 'api/cards/' + pms.id;
            return $http.put(theurl, pms);
        },
        search: function(input) {
            return $http.post('api/cards/search/' + input);
        }

    };
}]);
