importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.1.1/workbox-sw.js');


if (workbox) {

    let temp_ids = [];

    let sync_in_progress = false;

    // Event Lisiteners

    self.addEventListener('activate', function(event) {
        return self.clients.claim();
    });


    self.addEventListener("sync", function(event) {
        if (event.tag == "workbox-background-sync:api_image") {
            sync_in_progress = true;
            syncImages();
        }

    });

    // Client to Workbox

    self.addEventListener('message', function(event) {
        if (event.data === 'replayRequests' && !sync_in_progress) {
            syncImages();
        }
    });

    // Debugging

    workbox.setConfig({
        debug: false
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

    let sync_data = [];

    processUpdates = function(sync_data) {
        console.log('PROCESS');
        // Reset
        const sd = [...sync_data];
        let updated = [];
        // Those posts which have also been updated.
        let posts_updated = [];
        //let images_posted = [];
        //sync_data = [];
        console.log(sd);
        console.log(sync_data);
        // check for updates to created cards.
        // Return an array of POSTs
        let all_posted = sd.filter(x => x.method == "POST");
        let all_updated = sd.filter(x => x.method == "PUT");
        let images_posted = sd.filter(x => x.image != undefined);
        console.log(all_posted);
        console.log(all_updated);
        console.log(images_posted);
        // Return an array of PUTs for each POST (by POST returned ._id)
        
        all_posted.forEach(function(element) {
            console.log(element.returned._id);
            let a = all_updated.filter(x => x.returned._id == element.returned._id);
            console.log(a);
            if (a.length > 0) {
                let b = a.filter(x => x.returned._id == element.returned._id);
                posts_updated.push(b);
            }
        });
        //updated = post_updated;
       // const updated = [...post_updated];
        //console.log(posts_updated);
        // Get the latest update.


        posts_updated.forEach(function(element) {
            // For each posts updated array find the latest updated post
            let arr = element;
            console.log(arr);
            let b = arr.sort(function(a, b) {
                var keyA = new Date(a.returned.updatedAt),
                    keyB = new Date(b.returned.updatedAt);
                // Compare the 2 dates
                if (keyA < keyB) return 1;
                if (keyA > keyB) return -1;
                return 0;
            });
            console.log(b[0]);
            // Add this to the updated array
            //updated.push(b[0]);
            // Update each posted with the latest updated content.
            let posted_id = (element) => element.returned._id == b[0].returned._id;

            let c = all_posted.findIndex(posted_id);
            let d = all_updated.findIndex(posted_id);
            console.log(c);
            console.log(d);
            if (c >= 0) {
                // Update posted with the latest updated content.
                all_posted[c].returned = b[0].returned;
                // Remove update for this card from array!
                //all_updated.splice(d,1);
           // } else {
                //updated.push(b[0]);
            }
        });

        


        all_updated.forEach(function(element, index, object) {
            // Only one updae per card!

            let posted_id = element.returned._id;
            console.log(posted_id);

            // If not in the posted array then push to the updated array
            let found = all_posted.filter(x => x.returned._id == posted_id);
            console.log(found);
            if(found.length == 0){
                //object.splice(index, 1);
                updated.push(element);
            }
            
        });
        
        

        console.log(all_posted);
        console.log(updated);
        console.log(images_posted);
        return {posted:all_posted, updated:updated, images:images_posted};

    }


    // When sync is disabled (Mobile).


    async function syncPosts() {
        console.log('...Synchronizing ' + queue.name);
        let entry;
        let clone;
        let response;
        let requestDataFormat;
        while (entry = await queue.shiftRequest()) {
            try {
                clone0 = await entry.request.clone();
                clone = await entry.request.clone();
                //clone2 = await entry.request.clone();
                console.log('...Replaying: ' + entry.request.url);
                console.log(entry);
                let method = entry.request.method;
                send_message_to_all_clients({ message: 'request_updating' });

                let requestData = await clone.json();
                console.log(requestData);



                if (method == 'PUT') {
                    console.log('put');
                    if (requestData.card._id.includes('temp_id')) {
                        let obj = temp_ids.find(obj => obj.temp_id == requestData.card._id);
                        console.log(obj);
                        if (obj != undefined) {
                            updated_id = true;
                            console.log(obj);
                            // Change the requestData id.
                            requestData.card._id = obj._id;
                            requestDataFormat = requestData.card;
                            console.log(requestData);
                            response = await fetch(clone0, { body: JSON.stringify(requestData) });
                            console.log(response);
                            //assetsData = await response.json();
                            //console.log(assetsData);
                        }
                    } else {
                        response = await fetch(clone0);
                        console.log(response);
                        //assetsData = await response.json();
                        //console.log(assetsData);
                    }
                    assetsData = await response.json();
                    //assetsData = assetsData.card;
                    console.log(assetsData);
                }

                if (method == 'POST') {
                    requestDataFormat = requestData;
                    console.log('post');
                    if (requestData._id.includes('temp_id')) {
                        let obj = temp_ids.find(obj => obj.temp_id == requestData._id);
                        if (obj == undefined) {
                            let response = await fetch(clone0);
                            console.log(response);
                            assetsData = await response.json();
                            console.log(assetsData);
                            temp_ids.push({ temp_id: requestData._id, _id: assetsData._id })
                            console.log('store temp_id _id value');
                            console.log(temp_ids);

                        }
                    }
                }

                var card_data = { temp: requestData, posted: assetsData, method: method };
                var card_data2 = { requested: requestDataFormat, returned: assetsData, method: method };
                //var card_data2 = { temp: requestDataFormat, posted: assetsData, method: method };
                console.log('...Replayed: ' + entry.request.url);
                sync_data.push(card_data2);
                //send_message_to_all_clients({ message: 'post_updated', data: card_data });
            } catch (error) {
                console.error('Replay failed for request', entry.request, error);
                await queue.unshiftRequest(entry);
                return;
            }
        }
        
        sync_in_progress = false;
        console.log(sync_data);
        const all_requests = processUpdates(sync_data);
        console.log('END SYNC');
        send_message_to_all_clients({ message: 'all_requests_updated', all_requests: all_requests });
        

    }

    async function syncImages() {
        console.log('START SYNC');
        console.log('...Synchronizing ' + queue_image.name);
        let entry;
        let clone;
        let response;
        sync_data = [];
        console.log(queue_image);
        while (entry = await queue_image.shiftRequest()) {
            //while (entry = await queue_image.popRequest()) {
            try {
                clone = await entry.request.clone();
                //console.log('...Replaying: ' + entry.request.url);
                send_message_to_all_clients({ message: 'request_updating' });
                response = await fetch(entry.request);
                console.log(response);
                //let requestData = await clone.formData();
                //console.log(requestData);
                let assetsData = await response.json();
                console.log(assetsData);
                //console.log('...Replayed: ' + entry.request.url);
                let i = { image: assetsData.file };
                sync_data.push(i);
                //send_message_to_all_clients({ message: 'image_updated', data: assetsData });
            } catch (error) {
                //console.error('Replay failed for request', entry.request, error);
                await queue_image.unshiftRequest(entry);
                //await queue_image.pushRequest(entry);
                return;
            }
        }
        //send_message_to_all_clients({ message: 'all_posts_updated' });
        // Sync posts after images have been loaded.
        syncPosts();
    }

    const rest_fail = {
        // If the request fails then add this REST Post to the queue.
        fetchDidFail: async ({ originalRequest, request, error, event }) => {
            // No return expected.
            // NOTE: `originalRequest` is the browser's request, `request` is the
            // request after being passed through plugins with
            // `requestWillFetch` callbacks, and `error` is the exception that caused
            // the underlying `fetch()` to fail.
            // adding to the Queue.
            queue.pushRequest({ request: request });
        }
    }


    async function deleteExisting(name) {
        console.log('deleteExisting');
        let openRequest = indexedDB.open("workbox-background-sync");

        openRequest.onupgradeneeded = function() {
            // triggers if the client had no database
            // ...perform initialization...
        };

        openRequest.onerror = function() {
            console.error("Error", openRequest.error);
        };

        openRequest.onsuccess = async function() {
            let db = openRequest.result;
            console.log('success: ' + db);
            // continue to work with database using db object
            let transaction = db.transaction("requests", "readwrite"); // (1)
            // get an object store to operate on it
            let books = transaction.objectStore("requests"); // (2)
            // get all books
            let a = await books.getAll();
            let d = books.get(['api_image', 1])
            console.log(a);
            console.log(d);
            a.onsuccess = async function() {
                let obj = await a.result.find(obj => obj.metadata == name);
                console.log(obj);
                if (obj != undefined) {
                    books.delete(obj.id);
                }
            }
        };
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
            console.log(clone);
            //let response = await fetch(request);
            //console.log(response);
            let requestData = await clone.formData();
            let uploads = requestData.get('uploads[]');
            console.log(uploads);
            console.log(uploads.name);
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
            plugins: [
                { cachedResponseWillBeUsed },
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