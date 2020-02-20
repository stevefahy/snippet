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
                // return true to stop error message.
                return true;
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

    workbox.precaching.precacheAndRoute([
  {
    "url": "assets/images/add_people.png",
    "revision": "9d533ce4e23a00ed0ae3859d91ccb264"
  },
  {
    "url": "assets/images/bee_64.png",
    "revision": "eed1dd1e87b2972321707f457522c4c4"
  },
  {
    "url": "assets/images/bee_65_30.png",
    "revision": "ae47b45be0c3a9cc6f8e888513e87189"
  },
  {
    "url": "assets/images/bee_65.png",
    "revision": "a3eba38ee87a2a44623ac796cd77634c"
  },
  {
    "url": "assets/images/cb_check.png",
    "revision": "984d518520855bf885640d2861a1e05c"
  },
  {
    "url": "assets/images/gradient.png",
    "revision": "7dde21da1942ed3191447a81b1df93bb"
  },
  {
    "url": "assets/images/hr9.png",
    "revision": "b11f951915f5e54c8fbb5afe134d13af"
  },
  {
    "url": "assets/images/icons8-Bee-26.png",
    "revision": "4ca588ae8c6e68cbfc232de317280cd5"
  },
  {
    "url": "assets/images/people.png",
    "revision": "16272edc5393d5d5a312d51f2f259d6b"
  },
  {
    "url": "assets/images/perspective_cube_w_48dp.png",
    "revision": "cfdde1deb1f55a8d2730977a1077c1ba"
  },
  {
    "url": "assets/images/perspective_h_w_48dp.png",
    "revision": "620cfdfd9cf0a0393e5b24f1b26085c7"
  },
  {
    "url": "assets/images/perspective_v_w_48dp.png",
    "revision": "64a93e859ef0488921917d921a3a1808"
  },
  {
    "url": "assets/images/transparent.png",
    "revision": "9591c410148e6883727c5339fd1c02cd"
  },
  {
    "url": "configs/auth.js",
    "revision": "5fb895f8e4f039c820328a9825ce036e"
  },
  {
    "url": "configs/config.js",
    "revision": "5d336195135e3839a80aa8a49f793274"
  },
  {
    "url": "configs/fcm.js",
    "revision": "5ce35c06ea201423afccb4ffa6b26892"
  },
  {
    "url": "configs/filters_config.js",
    "revision": "6f7c0b5a4431399f250905c3a7d1763c"
  },
  {
    "url": "configs/passport.js",
    "revision": "3a6df02912cb38275b1c881424e9b563"
  },
  {
    "url": "configs/urls.js",
    "revision": "573e07a517fe5dec02a8792f9ca6ad9d"
  },
  {
    "url": "controllers/card_ctrl.js",
    "revision": "fd579dd3056125454245f4471c30ac7e"
  },
  {
    "url": "controllers/cardcreate_ctrl.js",
    "revision": "06783bd0f67b14b8f018893dfb799103"
  },
  {
    "url": "controllers/contacts_ctrl.js",
    "revision": "a2f1acd789576577721d5f2aa966deaa"
  },
  {
    "url": "controllers/conversation_ctrl.js",
    "revision": "dc0571e851009feef3697081ba046c6a"
  },
  {
    "url": "controllers/conversations_ctrl.js",
    "revision": "6bac791277a39a6a00836fc060da2bfb"
  },
  {
    "url": "controllers/debug_ctrl.js",
    "revision": "11789addd55cb313627540b82f7172aa"
  },
  {
    "url": "controllers/footer_ctrl.js",
    "revision": "52a6e3b9c8c8ef24b4800f5bdbb38d9b"
  },
  {
    "url": "controllers/group_ctrl.js",
    "revision": "eaaee3dcb44eee4f0b279df9357bd95e"
  },
  {
    "url": "controllers/header_ctrl.js",
    "revision": "577f8c5fbf8ce7edfcb2c30f6a769e46"
  },
  {
    "url": "controllers/join_ctrl.js",
    "revision": "6a21d06e204291443d7be9870fa3ce01"
  },
  {
    "url": "controllers/login_ctrl.js",
    "revision": "1406b7b1f829710a77746078adaa7220"
  },
  {
    "url": "controllers/main_ctrl.js",
    "revision": "b05c84d08d44707ddaff26d78ce500dd"
  },
  {
    "url": "controllers/usersetting_ctrl.js",
    "revision": "4386b7fc37d17159d7ad8dd7673827a8"
  },
  {
    "url": "directives/directives.js",
    "revision": "5b215ab5a549a9e43ee27834a4f4279f"
  },
  {
    "url": "factories/factories.js",
    "revision": "4326d28ded2c16c5476ea5efa6117008"
  },
  {
    "url": "factories/local_db.js",
    "revision": "9c667e8aca9d9f5638c736ef7045a374"
  },
  {
    "url": "filters/filters.js",
    "revision": "320948beab5b9d1ce605b5401e625d77"
  },
  {
    "url": "indexa.html",
    "revision": "c73cec5498826aa43bce2f500df96956"
  },
  {
    "url": "js/angular_moment.js",
    "revision": "9782d9786bfb852471abdd236d8e9672"
  },
  {
    "url": "js/angular-jwt.js",
    "revision": "20b4a8c03265120b6dfe747c14ad1069"
  },
  {
    "url": "js/angular/angular-animate.1.7.9.min.js",
    "revision": "27f99adb5bb52506c79ba671b821e69d"
  },
  {
    "url": "js/angular/angular-cookies.min.1.7.9.js",
    "revision": "6c50fcc39500af451b488dab61e48c36"
  },
  {
    "url": "js/angular/angular-resource.1.7.9.min.js",
    "revision": "8a666aa56ae986c8519810d962d8b429"
  },
  {
    "url": "js/angular/angular-route.1.7.9.min.js",
    "revision": "226a84274f8120a918041c42ece0c3e5"
  },
  {
    "url": "js/angular/angular-sanitize.1.7.9.min.js",
    "revision": "a46a4db9b49b88fe8c2aab470b278fbe"
  },
  {
    "url": "js/angular/angular.1.7.9.min.js",
    "revision": "f37e693975b5344d0d0682883311075a"
  },
  {
    "url": "js/bootstrap/bootstrap.4.3.1.min.js",
    "revision": "28d8f9807a6a9642b279d39101e261db"
  },
  {
    "url": "js/bootstrap/popper.1.14.7.min.js",
    "revision": "ef54b575cf25ba4719d9739bd6cd133f"
  },
  {
    "url": "js/exif.js",
    "revision": "bb882034f8ea66b2ad6c0f06adcc2e91"
  },
  {
    "url": "js/jquery/jquery-3.4.1.min.js",
    "revision": "2f772fed444d5489079f275bd01e26cc"
  },
  {
    "url": "js/jquery/jquery.ui.1.12.1.min.js",
    "revision": "7ea717799ef7fa610f53ea03784ff68e"
  },
  {
    "url": "js/moment.config.js",
    "revision": "480b04c4dc35c25ca25be072e5016434"
  },
  {
    "url": "js/moment.min.js",
    "revision": "2ca656d29bd6f1ab8c812b1cf2d3d295"
  },
  {
    "url": "js/ng-img-crop.js",
    "revision": "2a8b0215f45edcbf106d8cb1721b73ae"
  },
  {
    "url": "js/perspective.js",
    "revision": "9ade5dc5090db211d83b9a2314bed606"
  },
  {
    "url": "js/rzslider.js",
    "revision": "2f1d8ee6543809f3ae4a1862c49a60d7"
  },
  {
    "url": "js/scrollintoviewifneeded.js",
    "revision": "790e20f9e84dbc13e9d21de68a25681b"
  },
  {
    "url": "js/velocity.min.js",
    "revision": "2eaec1e91fe400cb493b2a18267343ed"
  },
  {
    "url": "models/card.js",
    "revision": "3fd5adfa0a65f2ca4453688ee119289b"
  },
  {
    "url": "models/conversation.js",
    "revision": "af19458a9de0f947583670883d6ca128"
  },
  {
    "url": "models/invite.js",
    "revision": "6bb56ded8e0965548a1b207cd24cb678"
  },
  {
    "url": "models/user.js",
    "revision": "ff801c4dd8aafb20c774f0215967d7ef"
  },
  {
    "url": "modules/app.js",
    "revision": "dcb0ea590a2ba2a4c8567742c0de606b"
  },
  {
    "url": "routes/routes.js",
    "revision": "fb930331358c40cf6b938b0bf472c3ac"
  },
  {
    "url": "service-worker.js",
    "revision": "8a27f2b3bfb831577f35b3ff1c52ed8b"
  },
  {
    "url": "services/content_editable.js",
    "revision": "b4535e844c4048834285eb1e52e56ed0"
  },
  {
    "url": "services/crop_rotate.js",
    "revision": "c356a344c3c7bddd85e86d6854126510"
  },
  {
    "url": "services/database.js",
    "revision": "ba4b3590020a5680523acb8cae1c6c22"
  },
  {
    "url": "services/debug.js",
    "revision": "cd1651a0a1cf1517cd2c3b5ad8cae044"
  },
  {
    "url": "services/drag.js",
    "revision": "7774cc81d9d143f9ef847a4609a90b0a"
  },
  {
    "url": "services/edit.js",
    "revision": "8765acc6119f2750d8f1fa15f3e598de"
  },
  {
    "url": "services/format_html.js",
    "revision": "808c1cf619c9bcdd56b35d23995f745d"
  },
  {
    "url": "services/format.js",
    "revision": "5edb3981987e9696f3ef78c2482f6824"
  },
  {
    "url": "services/general.js",
    "revision": "723136766b96e269ef17ea2565ad6120"
  },
  {
    "url": "services/image_adjustment.js",
    "revision": "fc14dcb4efc230b8c0e1a38d081c9be7"
  },
  {
    "url": "services/image_edit.js",
    "revision": "40e3346de76a221a76322ebaa8b09bb0"
  },
  {
    "url": "services/image_filters.js",
    "revision": "221f4f6f06e7ce216c5adf9973a6fc79"
  },
  {
    "url": "services/image_functions.js",
    "revision": "627e3c845f1403e3117179401b6d1851"
  },
  {
    "url": "services/image_manipulate.js",
    "revision": "c7abbe1ce9a3b75476a64ccb63303144"
  },
  {
    "url": "services/keyboard.js",
    "revision": "52d07f2c0fbc570672999473b472e3f5"
  },
  {
    "url": "services/loading.js",
    "revision": "40e6b7a676ca62d49d0783d2cf5b9b47"
  },
  {
    "url": "services/replace_tags.js",
    "revision": "d4665d616781d288e03028d7dbc3cf83"
  },
  {
    "url": "services/resize.js",
    "revision": "5954cea27bca8aa13f1a9b476456348b"
  },
  {
    "url": "services/scroll.js",
    "revision": "a943fe8b7bc11ea025a3f74f3291aa0b"
  },
  {
    "url": "services/slider.js",
    "revision": "9bc779184c4aaee82b82b8fa66550430"
  },
  {
    "url": "socket.io/socket.io.js",
    "revision": "e1d5904149bb2f5d90a03ec537d3ea62"
  },
  {
    "url": "style/bootstrap/bootstrap.min.css",
    "revision": "23feb4fcd158ee79d9d0c56a5517f4aa"
  },
  {
    "url": "style/customstyle.css",
    "revision": "707bb7285a36fa1b0aae1dd14bedf6cd"
  },
  {
    "url": "style/instagram.css",
    "revision": "9cf7b92233d015f5719aba6b4344809a"
  },
  {
    "url": "style/jquery/jquery-ui.base.min.css",
    "revision": "b2f794b2ff16e69147d761f7f3a88fcc"
  },
  {
    "url": "style/ng-img-crop.css",
    "revision": "1505a7e9fd54bf243410c00df5c27d68"
  },
  {
    "url": "style/rzslider.css",
    "revision": "f64b354fa187e356e40b21b70a994355"
  },
  {
    "url": "views/alert.html",
    "revision": "53f5b07f3e38b65ea6fbcef910514bec"
  },
  {
    "url": "views/card_create.html",
    "revision": "b8bbf528c092e1c8a11fcae2ae40e13b"
  },
  {
    "url": "views/card.html",
    "revision": "86471e0e82a2c3b78f02006559373b6b"
  },
  {
    "url": "views/contacts.html",
    "revision": "6fd7ebb0624306b88168220f8fdc9532"
  },
  {
    "url": "views/conversation.html",
    "revision": "826ab3361225fb92f3216748142d5c60"
  },
  {
    "url": "views/conversations.html",
    "revision": "8275d6b1a04d32a57f8a1b98a80b9a0d"
  },
  {
    "url": "views/debug.html",
    "revision": "fc6965fede63ff9e3ed7b772d24edff8"
  },
  {
    "url": "views/edit_btns.html",
    "revision": "d0d432fd195aa14166404087a91f4642"
  },
  {
    "url": "views/footer.html",
    "revision": "d60cc7ce824560248da90c5b6a982dff"
  },
  {
    "url": "views/group.html",
    "revision": "c1fde222e42039e0fc300b99ad523ad2"
  },
  {
    "url": "views/header_contacts.html",
    "revision": "dbf9c85880009e320971750f65d5bf12"
  },
  {
    "url": "views/header_conv.html",
    "revision": "2add3367c6a895d825459d8a8a6d717a"
  },
  {
    "url": "views/header_group.html",
    "revision": "4b72cb8c085bffe76a334d19aa680d7a"
  },
  {
    "url": "views/header_settings.html",
    "revision": "18d58882beb16ecce938e6327652c98f"
  },
  {
    "url": "views/header.html",
    "revision": "66b97940e634854fa2f849039431f359"
  },
  {
    "url": "views/join.html",
    "revision": "911047ae9167d58e376e1a8ee52dbe68"
  },
  {
    "url": "views/loading_spinner.html",
    "revision": "da03f5246195078787f1cef5b2329575"
  },
  {
    "url": "views/login.html",
    "revision": "ee415d18c1aa5292680e55e5449c5eec"
  },
  {
    "url": "views/offline.html",
    "revision": "155861678f0c1ed07d58d896088e0a25"
  },
  {
    "url": "views/spinner.html",
    "revision": "7e83301b3d5ebc102a853bbb62c2f712"
  },
  {
    "url": "views/user_setting.html",
    "revision": "d4edb77cf8070f188bfe583139bf98a4"
  },
  {
    "url": "workers/ww_db.js",
    "revision": "8ff329d298956e16a4a24e4682315ab9"
  }
], {

    });

}