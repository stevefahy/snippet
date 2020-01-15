importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.1.1/workbox-sw.js');


if (workbox) {

    let temp_ids = [];

    let sync_data = [];

    // Event Lisiteners

    self.addEventListener('activate', function(event) {
        return self.clients.claim();
    });

    self.addEventListener('install', (event) => {
        const urls = [
            '/views/alert.html',
            '/views/card.html',
            '/views/card_create.html',
            '/views/contacts.html',
            '/views/conversation.html',
            '/views/conversations.html',
            '/views/debug.html',
            '/views/edit_btns.html',
            '/views/footer.html',
            '/views/group.html',
            '/views/header.html',
            '/views/header_contacts.html',
            '/views/header_conv.html',
            '/views/header_group.html',
            '/views/header_settings.html',
            '/views/join.html',
            '/views/loading_spinner.html',
            '/views/login.html',
            '/views/offline.html',
            '/views/spinner.html',
            '/views/user_setting.html',
            '/assets/images/favicon.ico'
        ];
        const cacheName = workbox.core.cacheNames.runtime;
        event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(urls)));
    });

    // Update cache with offline card
    async function updateLatestCard(id, card, operation, conversation_type) {
        // Get the current cache for the feed
        // remove the new_card value.
        delete card.new_card;
        delete card.$$hashKey;

        return caches.open('chat-get_conversation_latest_card').then(async function(cache) {
            return cache.keys().then(function(requests) {
                var urls = requests.map(function(request) {
                    return request;
                });
                // Find the first cache item (create and update are the most recent)
                let found_url = urls.find(x => x.url.includes(id));
                return caches.match(found_url).then(async function(cacheResponse) {
                    // Found it in the cache
                    if (cacheResponse) {
                        // Get the original response
                        let response_json = await cacheResponse.json();
                        let headers = { "status": 200, headers: { "Content-Type": "application/json; charset=utf-8", "Response-Type": "basic" } }
                        let blob_headers = { type: 'basic' };
                        var blob = new Blob([JSON.stringify(card)], blob_headers);
                        let new_response = new Response(blob, headers);
                        cache.put(found_url, new_response);
                        await updateFeed(card, operation, conversation_type);
                        return response_json;
                    }
                });
            })
        });
    }

    // Update cache.
    async function updateFeed(card_param, operation, conversation_type) {
        let id;
        let card;
        if (operation == "delete") {
            id = card_param._id;
            card = card_param.data;
        } else {
            id = card_param._id;
            card = card_param;
        }
        // remove the new_card value.
        delete card.new_card;
        delete card.$$hashKey;
        let cache_name;
        let cache_arr = [];
        switch (conversation_type) {
            case 'feed':
                cache_name = 'chat-get_feed';
                cache_arr.push({ name: cache_name, conversation_type: conversation_type });
                break;
            case 'public':
                cache_name = 'chat-get_public_conversation_cards';
                cache_arr.push({ name: cache_name, conversation_type: conversation_type }, { name: 'chat-get_feed', conversation_type: 'feed' });
                break;
            case 'private':
                cache_name = 'chat-get_conversation_cards';
                cache_arr.push({ name: cache_name, conversation_type: conversation_type });
                break;
        }
        await cache_arr.map(async function(myCache) {
            return caches.open(myCache.name).then(async function(cache) {
                return cache.keys().then(function(requests) {
                    var urls = requests.map(function(request) {
                        return request;
                    });
                    // Find the first cache item (create and update are the most recent)
                    let query_0 = 'last_card=0';
                    let query_1 = '';
                    if (myCache.conversation_type == 'private') {
                        query_1 = card.conversationId;
                    }
                    let found_url = urls.find(x => x.url.includes(query_0) && x.url.includes(query_1));
                    return caches.match(found_url).then(async function(cacheResponse) {
                        // Found it in the cache
                        if (cacheResponse) {
                            // Get the original response
                            let response_json = await cacheResponse.json();
                            //console.log(JSON.stringify(response_json));
                            let arr;
                            if (myCache.conversation_type == 'feed') {
                                arr = response_json['cards'];
                            } else if (myCache.conversation_type == 'public') {
                                arr = response_json;
                            } else if (myCache.conversation_type == 'private') {
                                arr = response_json;
                            }
                            let card_exists = (arr) => arr._id == id;
                            let card_index = arr.findIndex(card_exists);
                            if (operation == 'create_update') {
                                if (card_index >= 0) {
                                    card.original_content = card.content;
                                    arr[card_index] = card;
                                } else {
                                    arr.push(card);
                                }
                            }
                            if (operation == 'delete') {
                                if (card_index >= 0) {
                                    arr.splice(card_index, 1);
                                }
                            }
                            let headers = { "status": 200, headers: { "Content-Type": "application/json; charset=utf-8", "Response-Type": "basic" } }
                            let blob_headers = { type: 'basic' };
                            var blob = new Blob([JSON.stringify(response_json)], blob_headers);
                            let new_response = new Response(blob, headers);
                            caches.open(myCache.name).then(function(cache) {
                                cache.put(found_url, new_response);
                            });
                            return response_json;
                        }
                    });
                });
            });
        })
    }

    // Client to Workbox

    self.addEventListener('message', async function(event) {

        if (event.data.message === 'replayRequests') {
            send_message_to_all_clients({ message: 'sync_started' });
            syncImages();
        }

        if (event.data.message === "card_create_update") {
            let operation = event.data.object.operation;
            let conversation_type = event.data.object.conversation_type;
            await updateFeed(event.data.object.card, operation, conversation_type);
        }

        if (event.data.message === "updatelatestcard") {
            updateLatestCard(event.data.object.id, event.data.object.card, event.data.object.operation, event.data.object.conversation_type);
        }

    });

    // Debugging

    workbox.setConfig({
        debug: false
    });

    // Messaging

    function send_message_to_client(client, msg) {
        return new Promise(function(resolve, reject) {
            var msg_chan = new MessageChannel();
            msg_chan.port1.onmessage = function(event) {
                if (event.data.error) {
                    reject(event.data.error);
                } else {
                    resolve(event.data);
                }
                return Promise.resolve("Dummy response to keep the console quiet");
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
        // Check for updates to POST, PUT and Images.(Return an array)
        let all_posted = sd.filter(x => x.method == "POST");
        let all_updated = sd.filter(x => x.method == "PUT");
        let all_deleted = sd.filter(x => x.method == "DELETE");
        let images_posted = sd.filter(x => x.image != undefined);
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
        return { posted: all_posted, updated: updated, deleted: all_deleted, images: images_posted };
    }

    // When sync is disabled (Mobile).

    async function syncDeletes() {
        //console.log('...Synchronizing ' + queue_delete.name);
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
                let requestData = await clone_1;
                // If this card has a temp id then it has not yet
                // been created on the DB so thare is no need to 
                // send this request to the DB. Remove from the indexedDB.
                if (requestData.url.includes('temp_id')) {
                    // check whether needs to be removed from posts
                } else {
                    requestDataFormat = 'requestData';
                    response = await fetch(entry.request);
                    // Get the response as JSOM.
                    assetsData = await response.json();
                    var card_data = { requested: requestDataFormat, returned: assetsData, method: method };
                    //console.log('...Replayed: ' + entry.request.url);
                    // Add the DELETE data to the sync_data array.
                    sync_data.push(card_data);
                }
                //console.log('...Replayed: ' + entry.request.url);
            } catch (error) {
                //console.error('Replay failed for request', entry.request, error);
                await queue_delete.unshiftRequest(entry);
                return;
            }
        }
        // Process the data before updating the DOM and sending notifications.
        const all_requests = processUpdates(sync_data);
        // Update the DOM and sending notifications.
        send_message_to_all_clients({ message: 'all_requests_updated', all_requests: all_requests });
    }

    async function syncPosts() {
        //console.log('...Synchronizing ' + queue.name);
        let entry;
        let clone;
        let response;
        let requestDataFormat;
        let assetsData;
        while (entry = await queue.shiftRequest()) {
            try {
                clone_1 = await entry.request.clone();
                clone_2 = await entry.request.clone();
                //console.log('...Replaying: ' + entry.request.url);
                let method = entry.request.method;
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
                    // Get the response as JSON.
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
                //console.log('...Replayed: ' + entry.request.url);
                // Add the POST, PUT data to the sync_data array.
                sync_data.push(card_data);
            } catch (error) {
                //console.error('Replay failed for request', entry.request, error);
                await queue.unshiftRequest(entry);
                return;
            }
        }
        syncDeletes();
    }

    async function syncImages() {
        //console.log('...Synchronizing ' + queue_image.name);
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
                //console.error('Replay failed for request', entry.request, error);
                await queue_image.unshiftRequest(entry);
                return;
            }
        }
        // Sync posts after images have been loaded.
        syncPosts();
    }

    // Get all POST and PUT with this ID and delete as the card has been deleted.
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
            a.onsuccess = async function() {
                // Get all POST and PUT with this ID and delete as the card has been deleted.
                let obj = await a.result.filter(x => x.metadata == id);
                if (obj.length > 0) {
                    obj.forEach(function(element, index, object) {
                        requests.delete(element.id);
                    });
                }
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
            a.onsuccess = async function() {
                let obj = await a.result.find(obj => obj.metadata == name);
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

            // Get all POST and PUT with this ID and delete as the card has been deleted.
            let clone = await request.clone();
            let requestData = await clone;
            let id = requestData.url.substring(requestData.url.lastIndexOf('/') + 1);
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
            let method = request.method;
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

    const route_plugin = {
        cacheWillUpdate: async ({ request, response, event }) => {
            // Return `response`, a different Response object or null
            return response;
        },
        cacheDidUpdate: async ({ cacheName, request, oldResponse, newResponse, event }) => {
            // No return expected
            // Note: `newResponse.bodyUsed` is `true` when this is called,
            // meaning the body has already been read. If you need access to
            // the body of the fresh response, use a technique like:
            //const freshResponse = await caches.match(request, {cacheName});
            //let response_json = await freshResponse.json();
        },
        cacheKeyWillBeUsed: async ({ request, mode }) => {
            // request is the Request object that would otherwise be used as the cache key.
            // mode is either 'read' or 'write'.
            // Return either a string, or a Request whose url property will be used as the cache key.
            // Returning the original request will make this a no-op.
        },
        cachedResponseWillBeUsed: async ({ cacheName, request, matchOptions, cachedResponse, event }) => {
            // Return `cachedResponse`, a different Response object or null

            var cachedFiles = await cacheName.match(request.url, {
                //ignoreSearch: true
            });

            if (cachedFiles) {
                return cachedFiles;
            }

            // If there's already a match against the request URL, return it.
            if (cachedResponse) {
                return cachedResponse;
            }

            if (!cachedFiles && !cachedResponse) {
                //return cachedResponse;
                //console.log('NOTHING CACHED');
                send_message_to_all_clients({ message: 'nothing_cached' });
            }

        },
        requestWillFetch: async ({ request }) => {
            // Return `request` or a different Request
            return request;

        },
        fetchDidFail: async ({ originalRequest, request, error, event }) => {
            // No return expected.
            // NOTE: `originalRequest` is the browser's request, `request` is the
            // request after being passed through plugins with
            // `requestWillFetch` callbacks, and `error` is the exception that caused
            // the underlying `fetch()` to fail.
        },
        fetchDidSucceed: async ({ request, response }) => {
            // Return `response` to use the network response as-is,
            // or alternatively create and return a new Response object.
            return response;
        }
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
        new RegExp('/chat/get_feed'),
        new workbox.strategies.NetworkFirst({
            cacheName: 'chat-get_feed',
            plugins: [
                route_plugin
            ]
        })
    );

    workbox.routing.registerRoute(
        new RegExp('/chat/get_conversation_cards'),
        new workbox.strategies.NetworkFirst({
            cacheName: 'chat-get_conversation_cards',
            plugins: [
                route_plugin
            ]
        })
    );

    workbox.routing.registerRoute(
        new RegExp('/chat/get_public_conversation_cards'),
        new workbox.strategies.NetworkFirst({
            cacheName: 'chat-get_public_conversation_cards',
            plugins: [
                route_plugin
            ]
        })
    );

    workbox.routing.registerRoute(
        new RegExp('/api/conversations/'),
        new workbox.strategies.NetworkFirst({
            cacheName: 'api-conversations',
            plugins: [
                route_plugin,
            ]
        })
    );

    workbox.routing.registerRoute(
        new RegExp('/chat/conversations'),
        new workbox.strategies.NetworkFirst({
            cacheName: 'chat-conversations',
            plugins: [
                route_plugin,
            ]
        })
    );

    workbox.routing.registerRoute(
        new RegExp('/chat/conversation'),
        new workbox.strategies.NetworkFirst({
            cacheName: 'chat-conversation',
            plugins: [
                route_plugin
            ]
        })
    );

    workbox.routing.registerRoute(
        new RegExp('/chat/conversation_id'),
        new workbox.strategies.NetworkFirst({
            cacheName: 'chat-conversation_id',
            plugins: [
                route_plugin
            ]
        })
    );


    workbox.routing.registerRoute(
        new RegExp('/chat/get_conversation_latest_card/'),
        new workbox.strategies.NetworkFirst({
            cacheName: 'chat-get_conversation_latest_card',
            plugins: [
                route_plugin
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