/* webworker ww_db.js */

var db;

if (!indexedDB) {
    console.log('This browser doesn\'t support IndexedDB');
} else {
    console.log('indexedD supported');
}


int_idb_conversations = function() {
    console.log('CREATE IDB');
    // Let us open our database
    var request = indexedDB.open("conversations", 3);

    request.onerror = function(event) {
        //console.log('error: ' + event);
        let msg = { message: "IDB_OPENED", data: false };
        self.postMessage(msg);
    };
    request.onsuccess = function(event) {
        //console.log('success: ' + event);
        db = event.target.result;
        let msg = { message: "IDB_OPENED", data: true };
        self.postMessage(msg);
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        // Create an objectStore to hold information about our customers. We're
        // going to use "ssn" as our key path because it's guaranteed to be
        // unique - or at least that's what I was told during the kickoff meeting.
        var objectStore = db.createObjectStore("latestcards", { keyPath: "_id" });
        // Create an index to search customers by name. We may have duplicates
        // so we can't use a unique index.
        objectStore.createIndex("_id", "_id", { unique: false });
        // Use transaction oncomplete to make sure the objectStore creation is 
        // finished before adding data into it.
        objectStore.transaction.oncomplete = function(event) {
            // Store values in the newly created objectStore.
            var customerObjectStore = db.transaction("latestcards", "readwrite").objectStore("latestcards");
        };
    };

}

function updateConversation(obj) {
    let msg = { message: "conversationsLatestCard", data: obj }
    self.postMessage(msg);
}

getAllConversationsLatestCard = function() {
    var transaction = db.transaction(["latestcards"], "readwrite");
    var objectStore = transaction.objectStore("latestcards");
    objectStore.getAll().onsuccess = function(event) {
        updateConversation(event.target.result);
    };
}

conversationsLatestCardAdd = function(card) {
    var transaction = db.transaction(["latestcards"], "readwrite");
    // Do something when all the data is added to the database.
    transaction.oncomplete = function(event) {
        //console.log("All done!");
    };

    transaction.onerror = function(event) {
        //console.log('error');
    };

    var objectStore = transaction.objectStore("latestcards");

    var request1 = objectStore.get(card._id);
    request1.onsuccess = function(event) {
        var request;
        // Put this updated object back into the database.
        if (event.target.result != undefined) {
        	// Update
        	// Get the old value that we want to update
            let update = event.target.result;
            update.data = card.data;
            request = objectStore.put(update);
        } else {
        	// Add
            request = objectStore.add(card);
        }

        request.onerror = function(event) {
            // Do something with the error
            //console.log('not updated');
        };
        request.onsuccess = function(event) {
            // Success - the data is updated!
            //console.log('updated');
            getAllConversationsLatestCard();
        };
    };


    /*request1.onerror = function(event) {
        console.log('didnt exist - added');
        // getAllConversationsLatestCard();

        var request = objectStore.add(card);
        request.onsuccess = function(event) {
            console.log('added');
            getAllConversationsLatestCard();
        };
    };*/

}

/*
conversationsLatestCardUpdate = function(card) {
    var transaction = db.transaction(["latestcards"], "readwrite");
    console.log(card);
    // Do something when all the data is added to the database.
    transaction.oncomplete = function(event) {
        console.log("All done!");
    };

    transaction.onerror = function(event) {
        // Don't forget to handle errors!
    };

    var objectStore = transaction.objectStore("latestcards");
    var request = objectStore.get(card._id);
    //var request = objectStore.add(card);
    request.onsuccess = function(event) {
        console.log(event);
        // Get the old value that we want to update
        var data = event.target.result;
        // update the value(s) in the object that you want to change
        console.log(event.target.result);
        let update = event.target.result;
        update.data = card.data;


        // Put this updated object back into the database.
        var requestUpdate = objectStore.put(update);


        requestUpdate.onerror = function(event) {
            // Do something with the error
            console.log('not updated');
        };
        requestUpdate.onsuccess = function(event) {
            // Success - the data is updated!
            console.log('updated');
            getAllConversationsLatestCard();
        };


    };
}
*/

/*
updateCacheConversations = function(conversations) {
    // Get the current cache for the feed
    return caches.open('conversation').then(async function(cache) {
        return cache.keys().then(function(requests) {
            var urls = requests.map(function(request) {
                return request;
            });
            console.log(urls);
            // Find the first cache item (create and update are the most recent)
            //let found_url = urls.find(x => x.url.includes('last_card=0'));
            //console.log(found_url);
            return caches.match(urls[0]).then(async function(cacheResponse) {
                console.log(cacheResponse);
                // Found it in the cache
                if (cacheResponse) {
                    // Get the original response
                    let response_json = await cacheResponse.json();
                    console.log(response_json);

                    let headers = { "status": 200, headers: { "Content-Type": "application/json; charset=utf-8", "Response-Type": "basic" } }
                    let blob_headers = { type: 'basic' };
                    var blob = new Blob([JSON.stringify(conversations)], blob_headers);
                    let new_response = new Response(blob, headers);
                    cache.put(urls[0], new_response);
                }
            });
        });
    });
}
*/

// Receive message from main file
self.onmessage = function(e) {
    if (e.data.message == "int_idb_conversations") {
        console.log(e.data.message);
        int_idb_conversations();
    }

    if (e.data.message == "conversationsLatestCardAdd") {
        conversationsLatestCardAdd(e.data.data);
    }
    // Update and delete
    if (e.data.message == "conversationsLatestCardUpdate") {
        conversationsLatestCardUpdate(e.data.data);
    }
}