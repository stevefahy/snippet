importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.1.1/workbox-sw.js');


if (workbox) {

    // Event Lisiteners

    self.addEventListener('activate', function(event) {
        return self.clients.claim();
    });

    self.addEventListener("sync", function(event) {
        if (event.tag == "workbox-background-sync:api_image") {
            //syncImages();
        }

    });

    // Client to Workbox

    self.addEventListener('message', function(event) {
        if (event.data === 'replayRequests') {
            //syncImages();
            syncPosts();
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


    // When sync is disabled (Mobile).

    async function syncPosts() {
        console.log('...Synchronizing ' + queue.name);
        let entry;
        let clone;
        let response;
        while (entry = await queue.shiftRequest()) {
            try {
                clone = await entry.request.clone();
                console.log('...Replaying: ' + entry.request.url);
                console.log(entry);
                //if(entry.request.method == "PUT"){

                //}
                let method = entry.request.method;
                send_message_to_all_clients({ message: 'post_updating' });
                response = await fetch(entry.request);
                //console.log(response);
                let requestData = await clone.json();
                //console.log(requestData);
                let assetsData = await response.json();
                //console.log(assetsData);
                var card_data = { temp: requestData, posted: assetsData, method: method };
                //console.log('...Replayed: ' + entry.request.url);
                send_message_to_all_clients({ message: 'post_updated', data: card_data });
            } catch (error) {
                //console.error('Replay failed for request', entry.request, error);
                await queue.unshiftRequest(entry);
                return;
            }
        }
        send_message_to_all_clients({ message: 'all_posts_updated' });
        syncImages();
    }

    async function syncImages() {
        console.log('...Synchronizing ' + queue_image.name);
        let entry;
        let clone;
        let response;
        //queue_image.reverse(); 
        console.log(queue_image);
        //let new_queue = await queue_image.getAll();
       // console.log(new_queue);

        // take off last item
        //while (entry = await queue_image.popRequest()) {
            // push to first
           // console.log('ADJUST');
            //console.log(entry);
            //await queue_image.unshiftRequest(entry);

        //}
        
        while (entry = await queue_image.shiftRequest()) {
        //while (entry = await queue_image.popRequest()) {
            try {
                clone = await entry.request.clone();
                //console.log('...Replaying: ' + entry.request.url);
                send_message_to_all_clients({ message: 'post_updating' });
                response = await fetch(entry.request);
                //console.log(response);
                //let requestData = await clone.formData();
                //console.log(requestData);
                let assetsData = await response.json();
                console.log(assetsData);
                //console.log('...Replayed: ' + entry.request.url);
                send_message_to_all_clients({ message: 'image_updated', data: assetsData });
            } catch (error) {
                //console.error('Replay failed for request', entry.request, error);
                await queue_image.unshiftRequest(entry);
                //await queue_image.pushRequest(entry);
                return;
            }
        }
        send_message_to_all_clients({ message: 'all_posts_updated' });
        // Sync posts after images have been loaded.
        //syncPosts();
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

    const rest_image_fail = {
        // If the request fails then add this REST Post to the queue.
        fetchDidFail: async ({ originalRequest, request, error, event }) => {
            // No return expected.
            // NOTE: `originalRequest` is the browser's request, `request` is the
            // request after being passed through plugins with
            // `requestWillFetch` callbacks, and `error` is the exception that caused
            // the underlying `fetch()` to fail.
            // adding to the Queue.
            queue_image.pushRequest({ request: request });
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