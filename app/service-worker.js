importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.1.1/workbox-sw.js');


if (workbox) {

    let temp_ids = [];

    let sync_in_progress = false;
    let sync_data = [];

    // Event Lisiteners

    self.addEventListener('activate', function(event) {
        return self.clients.claim();
    });

    self.addEventListener("sync", function(event) {
        if (event.tag == "workbox-background-sync:api_image") {
            send_message_to_all_clients({ message: 'sync_started' });
            sync_in_progress = true;
            syncImages();
        }
    });

    // Client to Workbox

    self.addEventListener('message', function(event) {
        if (event.data === 'replayRequests' && !sync_in_progress) {
            send_message_to_all_clients({ message: 'sync_started' });
            sync_in_progress = true;
            syncImages();
        }
    });

    // Debugging

    workbox.setConfig({
        debug: true
    });

    // Messaging

    function send_message_to_sw(msg) {
        navigator.serviceWorker.controller.postMessage(msg);
    }

    function send_message_to_client(client, msg) {
        return new Promise(function(resolve, reject) {
            var msg_chan = new MessageChannel();
            msg_chan.port1.onmessage = function(event) {
                if (event.data.error) {
                    reject(event.data.error);
                } else {
                    resolve(event.data);
                }
            };
            client.postMessage(msg, [msg_chan.port2]);
        });
    }

    function send_message_to_all_clients(msg) {
        clients.matchAll().then(clients => {
            clients.forEach(client => {
                send_message_to_client(client, msg).then(m => console.log("SW Received Message: " + m));
            })
        })
    }

    // When sync is enabled (Desktop).

    const queue_image = new workbox.backgroundSync.Queue('api_image', {
        onSync: async ({ queue }) => {}
    });

    const queue = new workbox.backgroundSync.Queue('api_posts', {
        onSync: async ({ queue }) => {}
    });

    const queue_delete = new workbox.backgroundSync.Queue('api_delete', {
        onSync: async ({ queue }) => {}
    });


    processUpdates = function(sync_data) {
        // Reset
        const sd = [...sync_data];
        let updated = [];
        // Those posts which have also been updated.
        let posts_updated = [];
        // Reset sync_data.
        sync_data = [];
        console.log(sd);
        // Check for updates to POST, PUT and Images.(Return an array)
        let all_posted = sd.filter(x => x.method == "POST");
        let all_updated = sd.filter(x => x.method == "PUT");
        let all_deleted = sd.filter(x => x.method == "DELETE");
        let images_posted = sd.filter(x => x.image != undefined);
        console.log(sd);
        console.log(all_deleted);




        // Return an array of PUTs for each POST (by POST returned ._id)
        all_posted.forEach(function(element) {
            let a = all_updated.filter(x => x.returned._id == element.returned._id);
            if (a.length > 0) {
                let b = a.filter(x => x.returned._id == element.returned._id);
                posts_updated.push(b);
            }
        });
        // For each posts_updated array find the latest updated post by updatedAt date.
        posts_updated.forEach(function(arr) {
            let latest_updated = arr.sort(function(a, b) {
                var keyA = new Date(a.returned.updatedAt),
                    keyB = new Date(b.returned.updatedAt);
                // Compare the 2 dates
                if (keyA < keyB) return 1;
                if (keyA > keyB) return -1;
                return 0;
            });
            // Find the index of the latest updated card in the posted array
            // (may have been previously posted and only updated this time).
            let posted_id = (arr) => arr.returned._id == latest_updated[0].returned._id;
            let c = all_posted.findIndex(posted_id);
            // If the latest updated card is found in the posted array by id 
            // then update each posted with the latest updated content.
            if (c >= 0) {
                all_posted[c].returned = latest_updated[0].returned;
            }
        });
        // Check whether an updated exists in the posted array.
        // If it does then the post has already been updated with the update content.
        // If it doesnt then add it to the updated array.
        all_updated.forEach(function(element, index, object) {
            let updated_id = element.returned._id;
            // If not in the posted array then push to the updated array
            let found = all_posted.filter(x => x.returned._id == updated_id);
            if (found.length == 0) {
                // Check whether an update with this id already exists in the updated array.
                let exists = updated.filter(x => x.returned._id == updated_id);
                // If not then add it.
                if (exists.length == 0) {
                    updated.push(element);
                } else {
                    // If an update with this id already exists in the updated array
                    // then update the updated array with the latest updatedAt version.
                    // Find the the latest updatedAt.
                    let arr = [exists[0], element];
                    let latest_updated = arr.sort(function(a, b) {
                        var keyA = new Date(a.returned.updatedAt),
                            keyB = new Date(b.returned.updatedAt);
                        // Compare the 2 dates
                        if (keyA < keyB) return 1;
                        if (keyA > keyB) return -1;
                        return 0;
                    });
                    // Find the index of the duplicated id in the updated array.
                    let duplicate_id = (arr) => arr.returned._id == latest_updated[0].returned._id;
                    let duplicate_index = updated.findIndex(duplicate_id);
                    // Delete the duplicate from the updated array.
                    updated.splice(duplicate_index, 1);
                    // Add the latest to the updated array.
                    updated.push(latest_updated[0]);
                }

            }
        });

        // Check whether deleted was in posted or updated?
        // Cant have been in posted because temp id deletes are not fetched
        // Could have been updated
        // Could be in update array, need to remove.

        all_deleted.forEach(function(element, index, object) {
            let updated_id = element.returned._id;
            // If not in the posted array then push to the updated array
            let found = updated.filter(x => x.returned._id == updated_id);
            console.log(found[0]);

            // Find the index of the duplicated id in the updated array.
            //let duplicate_id = (element) => element.returned._id == found[0].returned._id;
            //let duplicate_index = updated.findIndex(duplicate_id);
            //console.log(duplicate_index);
        });



        return { posted: all_posted, updated: updated, deleted: all_deleted, images: images_posted };
    }


    // When sync is disabled (Mobile).

    async function syncDeletes() {
        console.log('...Synchronizing ' + queue_delete.name);
        let entry;
        let clone;
        let response;
        let assetsData;
        let requestDataFormat;
        while (entry = await queue_delete.shiftRequest()) {
            try {

                clone_1 = await entry.request.clone();
                send_message_to_all_clients({ message: 'request_updating' });
                let method = entry.request.method;
                console.log(method);
                let requestData = await clone_1;
                console.log(requestData);
                // If this card has a temp id then it has not yet
                // been created on the DB so thare is no need to 
                // send this request to the DB. Remove from the indexedDB.
                if (requestData.url.includes('temp_id')) {
                    console.log('delete temp');
                    // check whether needs to be removed from posts
                } else {
                    console.log('delete id');
                    requestDataFormat = 'requestData';
                    //requestDataFormat = JSON.parse(JSON.stringify(requestDataFormat));
                    response = await fetch(entry.request);
                    console.log(response);
                    // Get the response as JSOM.
                    assetsData = await response.json();
                    console.log(assetsData);
                    var card_data = { requested: requestDataFormat, returned: assetsData, method: method };
                    //console.log('...Replayed: ' + entry.request.url);
                    // Add the POST, PUT data to the sync_data array.
                    sync_data.push(card_data);
                }
                console.log('...Replayed: ' + entry.request.url);
            } catch (error) {
                console.error('Replay failed for request', entry.request, error);
                await queue_delete.unshiftRequest(entry);
                return;
            }
        }

        console.log(sync_data);
        // Process the data before updating the DOM and sending notifications.
        const all_requests = processUpdates(sync_data);
        console.log(all_requests);
        // Update the DOM and sending notifications.
        send_message_to_all_clients({ message: 'all_requests_updated', all_requests: all_requests });
        sync_in_progress = false;


    }


    async function syncPosts() {
        console.log('...Synchronizing ' + queue.name);
        let entry;
        let clone;
        let response;
        let requestDataFormat;
        let assetsData;
        while (entry = await queue.shiftRequest()) {
            try {
                clone_1 = await entry.request.clone();
                clone_2 = await entry.request.clone();
                console.log('...Replaying: ' + entry.request.url);
                let method = entry.request.method;
                console.log(method);
                send_message_to_all_clients({ message: 'request_updating' });
                let requestData = await clone_1.json();
                // Check whether the update was added to a card with a temp_id.
                // Cards posted offline temporarily have a temp_id.
                // If so then find the returned actual id for this post in the temp_ids array.
                if (method == 'PUT') {
                    if (requestData.card._id.includes('temp_id')) {
                        let obj = temp_ids.find(obj => obj.temp_id == requestData.card._id);
                        if (obj != undefined) {
                            updated_id = true;
                            // Change the requestData temp id to the id from the DB.
                            requestData.card._id = obj._id;
                            requestDataFormat = requestData.card;
                            // Get Fetch response.
                            response = await fetch(clone_2, { body: JSON.stringify(requestData) });
                        }
                    } else {
                        // Get Fetch response.
                        response = await fetch(clone_2);
                    }
                    // Get the response as JSOM.
                    assetsData = await response.json();
                }
                // Check whether the post was created offline with a temp_id.
                // Cards posted offline temporarily have a temp_id.
                // If so then find the returned actual id for this post in the temp_ids array.
                if (method == 'POST') {
                    requestDataFormat = requestData;
                    if (requestData._id.includes('temp_id')) {
                        let obj = temp_ids.find(obj => obj.temp_id == requestData._id);
                        if (obj == undefined) {
                            // Get Fetch response.
                            let response = await fetch(clone_2);
                            // Get the response as JSOM.
                            assetsData = await response.json();
                            // Add the returned id from the DB to the temp_ids array
                            // so that it can be looked up.
                            temp_ids.push({ temp_id: requestData._id, _id: assetsData._id });
                        }
                    }
                }
                var card_data = { requested: requestDataFormat, returned: assetsData, method: method };
                console.log('...Replayed: ' + entry.request.url);
                // Add the POST, PUT data to the sync_data array.
                sync_data.push(card_data);
                console.log(sync_data);
            } catch (error) {
                console.error('Replay failed for request', entry.request, error);
                await queue.unshiftRequest(entry);
                return;
            }
        }
        syncDeletes();


    }

    async function syncImages() {
        console.log('...Synchronizing ' + queue_image.name);
        let entry;
        let clone;
        let response;
        // Reset sync_data
        sync_data = [];
        while (entry = await queue_image.shiftRequest()) {
            try {
                clone = await entry.request.clone();
                //console.log('...Replaying: ' + entry.request.url);
                send_message_to_all_clients({ message: 'request_updating' });
                response = await fetch(entry.request);
                let assetsData = await response.json();
                //console.log('...Replayed: ' + entry.request.url);
                // Add the Image data to the sync_data array.
                let i = { image: assetsData.file };
                sync_data.push(i);
            } catch (error) {
                console.error('Replay failed for request', entry.request, error);
                await queue_image.unshiftRequest(entry);
                return;
            }
        }
        // Sync posts after images have been loaded.
        //syncPosts();
        console.log('images fin');

        syncPosts();
    }

    // Find image already stored in indexeddb.
    // Delete the existing image if it is found.
    async function deleteDelete(id) {
        let openRequest = indexedDB.open("workbox-background-sync");

        openRequest.onupgradeneeded = function() {
            // triggers if the client had no database
            // ...perform initialization...
        };

        openRequest.onerror = function() {
            //console.error("Error", openRequest.error);
        };

        openRequest.onsuccess = async function() {
            let db = openRequest.result;
            // continue to work with database using db object
            let transaction = db.transaction("requests", "readwrite");
            // get an object store to operate on it
            let requests = transaction.objectStore("requests");
            // get all requests
            let a = await requests.getAll();
            console.log(a);
            //let d = requests.get(['api_image', 1])
            a.onsuccess = async function() {
                // Get all POST and PUT with this ID and delete as the card has been deleted.
                //let obj = await a.result.find(obj => obj.metadata == id);
                let obj = await a.result.filter(x => x.metadata == id);

                console.log(obj);
                if (obj.length > 0) {
                    obj.forEach(function(element, index, object) {
                        console.log(element);
                        requests.delete(element.id);
                    });
                }
                //if (obj != undefined) {
                //requests.delete(obj.id);
                //}
            }
        };
    }

    // Find image already stored in indexeddb.
    // Delete the existing image if it is found.
    async function deleteExisting(name) {
        let openRequest = indexedDB.open("workbox-background-sync");

        openRequest.onupgradeneeded = function() {
            // triggers if the client had no database
            // ...perform initialization...
        };

        openRequest.onerror = function() {
            //console.error("Error", openRequest.error);
        };

        openRequest.onsuccess = async function() {
            let db = openRequest.result;
            // continue to work with database using db object
            let transaction = db.transaction("requests", "readwrite");
            // get an object store to operate on it
            let requests = transaction.objectStore("requests");
            // get all requests
            let a = await requests.getAll();
            //let d = requests.get(['api_image', 1])
            a.onsuccess = async function() {
                let obj = await a.result.find(obj => obj.metadata == name);
                console.log(obj);
                if (obj != undefined) {
                    requests.delete(obj.id);
                }
            }
        };
    }

    const rest_delete_fail = {
        // If the request fails then add this REST Post to the queue.
        fetchDidFail: async ({ originalRequest, request, error, event }) => {
            // No return expected.
            // NOTE: `originalRequest` is the browser's request, `request` is the
            // request after being passed through plugins with
            // `requestWillFetch` callbacks, and `error` is the exception that caused
            // the underlying `fetch()` to fail.

            // Delete this image from the indexeddb if a previous version has been stored.
            let clone = await request.clone();
            let requestData = await clone;
            console.log(requestData);
            let id = requestData.url.substring(requestData.url.lastIndexOf('/') + 1);
            console.log(id);
            //let uploads = requestData.get('uploads[]');
            deleteDelete(id);

            // adding to the Queue.
            queue_delete.pushRequest({ request: request });
        }
    }

    const rest_fail = {
        // If the request fails then add this REST Post to the queue.
        fetchDidFail: async ({ originalRequest, request, error, event }) => {
            // No return expected.
            // NOTE: `originalRequest` is the browser's request, `request` is the
            // request after being passed through plugins with
            // `requestWillFetch` callbacks, and `error` is the exception that caused
            // the underlying `fetch()` to fail.

            let clone = await request.clone();
            let requestData = await clone.json();
            console.log(requestData);
            let method = request.method;
            console.log(method);
            let id;
            if (method == "POST") {
                id = requestData._id;
            }
            if (method == "PUT") {
                id = requestData.card._id;
            }
            // adding to the Queue.
            queue.pushRequest({ request: request, metadata: id });
        }
    }

    const rest_image_fail = {
        // If the request fails then add this REST Post to the queue.
        fetchDidFail: async ({ originalRequest, request, error, event }) => {
            // No return expected.
            // NOTE: `originalRequest` is the browser's request, `request` is the
            // request after being passed through plugins with
            // `requestWillFetch` callbacks, and `error` is the exception that caused
            // the underlying `fetch()` to fail.
            // adding to the Queue.
            let clone = await request.clone();
            let requestData = await clone.formData();
            let uploads = requestData.get('uploads[]');
            // Delete this image from the indexeddb if a previous version has been stored.
            deleteExisting(uploads.name);
            queue_image.pushRequest({ request: request, metadata: uploads.name });
        }
    }

    const cachedResponseWillBeUsed = async ({ cache, request, cachedResponse }) => {
        // If there's already a match against the request URL, return it.
        if (cachedResponse) {
            return cachedResponse;
        }
        // Search for the file ignoring the query part of the url.
        var cachedFiles = await caches.match(request.url, {
            ignoreSearch: true
        });
        return cachedFiles;
    };

    // Register Routes

    workbox.routing.registerRoute(
        /\.js$/,
        new workbox.strategies.NetworkFirst()
    );

    workbox.routing.registerRoute(
        /\.css$/,
        new workbox.strategies.NetworkFirst()
    );

    workbox.routing.registerRoute(
        /\.ico$/,
        new workbox.strategies.NetworkFirst()
    );

    workbox.routing.registerRoute(
        /\.gif$/,
        new workbox.strategies.NetworkFirst()
    );

    workbox.routing.registerRoute(
        /\.jpeg$/,
        new workbox.strategies.NetworkFirst()
    );

    workbox.routing.registerRoute(
        /\.png$/,
        new workbox.strategies.NetworkFirst()
    );

    workbox.routing.registerRoute(
        new RegExp('/api/user_data'),
        new workbox.strategies.NetworkFirst()
    );

    workbox.routing.registerRoute(
        new RegExp('/views/.*\\.html'),
        new workbox.strategies.NetworkFirst({
            cacheName: 'views-cache',
            plugins: [
                { cachedResponseWillBeUsed },
            ]
        })
    );



    workbox.routing.registerRoute(
        new RegExp('/chat/get_feed'),
        new workbox.strategies.NetworkFirst({
            cacheName: 'user-feed1',
            plugins: [ { cachedResponseWillBeUsed },
            ]
        })
    );

    workbox.routing.registerRoute(
        new RegExp('/chat/update_feed'),
        new workbox.strategies.NetworkFirst({
            cacheName: 'user-feed2',
            plugins: [
                { cachedResponseWillBeUsed },
            ]
        })
    );

    workbox.routing.registerRoute(
        new RegExp('/api/cards'),
        new workbox.strategies.NetworkOnly({
            plugins: [rest_fail]
        }),
        'POST'
    );

    workbox.routing.registerRoute(
        new RegExp('/api/cards'),
        new workbox.strategies.NetworkOnly({
            plugins: [rest_fail]
        }),
        'PUT'
    );

    workbox.routing.registerRoute(
        new RegExp('/api/cards'),
        new workbox.strategies.NetworkOnly({
            plugins: [rest_delete_fail]
        }),
        'DELETE'
    );

    workbox.routing.registerRoute(
        new RegExp('chat/get_public_conversation_cards'),
        new workbox.strategies.NetworkOnly({
            plugins: [rest_fail]
        }),
        'POST'
    );

    workbox.routing.registerRoute(
        new RegExp('http://localhost:8060/upload'),
        new workbox.strategies.NetworkOnly({
            plugins: [rest_image_fail]
        }),
        'POST'
    );

    workbox.routing.registerRoute(
        new RegExp('/upload'),
        new workbox.strategies.NetworkOnly({
            plugins: [rest_image_fail]
        }),
        'POST'
    );

    workbox.routing.registerRoute(
        new RegExp('/'),
        new workbox.strategies.NetworkFirst({}),
    );

    workbox.googleAnalytics.initialize();

    workbox.precaching.precacheAndRoute([], {

    });

}