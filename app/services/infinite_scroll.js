//
// Infinite Scroll Service
//

cardApp.service('InfiniteScroll', ['$rootScope', '$q', 'Conversations', function($rootScope, $q, Conversations) {

	var self = this;

	var cards_top = [];
	var cards = [];
	var cards_bottom = [];

	var MAX_CARDS = 60;

    this.checkNext = function() {
        var id = Conversations.getConversationId();
        if (Conversations.getConversationType() == 'feed') {
            if ($scope.cards_temp.length < MIN_TEMP) {
                getFollowing('$lt');
            }
        } else if (Conversations.getConversationType() == 'private') {
            if ($scope.cards_temp.length < MIN_TEMP) {
                getCards(id);
            }
        } else if (Conversations.getConversationType() == 'public') {
            if ($scope.cards_temp.length < MIN_TEMP) {
                getPublicCards(id);
            }
        }
    };

	this.addMoreBottom = function() {
        var deferred = $q.defer();
        
        return deferred.promise;
    };

}]);