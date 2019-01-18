//
// UserService Service
//

cardApp.service('UserService', ['Users', function(Users) {

    // Find User
    this.findUser = function(id, callback) {
        var user_found;
        Users.search_id(id)
            .then(function(res) {
                if (res.data.error) {
                    user_found = res.data.error;
                } else if (res.data.success) {
                    user_found = res.data.success;

                }
                return callback(user_found);
            })
            .catch(function(error) {
                console.log(error);
            });
    };
    
}]);