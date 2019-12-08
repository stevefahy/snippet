/* webworker ww_db.js */

var db;

if (!indexedDB) {
    //console.log('This browser doesn\'t support IndexedDB');
} else {
    //console.log('indexedD supported');
}


int_idb_conversations = function() {
    //console.log('Create IDB conversations');
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
        // Create an objectStore to hold information.
        var objectStore = db.createObjectStore("latestcards", { keyPath: "_id" });
        // Create an index to search gy id.
        objectStore.createIndex("_id", "_id", { unique: false });
        // Use transaction oncomplete to make sure the objectStore creation is 
        // finished before adding data into it.
        objectStore.transaction.oncomplete = function(event) {
            // Store values in the newly created objectStore.
            var customerObjectStore = db.transaction("latestcards", "readwrite").objectStore("latestcards");
        };
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
            //console.log('not updated');
        };
        request.onsuccess = function(event) {
            //console.log('updated');
        };
    };

}

// Receive message from main file
self.onmessage = function(e) {

    if (e.data.message == "int_idb_conversations") {
        int_idb_conversations();
    }

    // Add, Update, delete
    if (e.data.message == "conversationsLatestCardAdd") {
        conversationsLatestCardAdd(e.data.data);
    }

}