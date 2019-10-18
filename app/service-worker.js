importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.1.1/workbox-sw.js');

if (workbox) {
    console.log("Yay! Workbox is loaded 🎉");



    self.addEventListener('activate', function(event) {
        console.log('Claiming control');
        return self.clients.claim();
    });

    self.addEventListener('fetch', event => {
        console.log('url: ' + event.request.url);

        // Clone the request to ensure it's safe to read when
        // adding to the Queue.


    });


    /*
        self.addEventListener('fetch', (event) => {
            // Clone the request to ensure it's safe to read when
            // adding to the Queue.
            console.log(event);
            const promiseChain = fetch(event.request.clone())
                .catch((err) => {
                    console.log('PUSHING');
                   // return queue.pushRequest({ request: event.request });
                });

            event.waitUntil(promiseChain);
        });
        */



    // Debugging
    workbox.setConfig({
        debug: true
    });

    const queue = new workbox.backgroundSync.Queue('myQueueName');



    async function firstAsync() {
        console.log('...Synchronizing ' + queue.name);
        //await queue.replayRequests();
        let entry;
        while (entry = await queue.shiftRequest()) {
            try {
                console.log('...Replaying: ' + entry.request.url);
                send_message_to_all_clients('post_updating');
                await fetch(entry.request);
                console.log('...Replayed: ' + entry.request.url);

            } catch (error) {
                console.error('Replay failed for request', entry.request, error);
                await queue.unshiftRequest(entry);
                return;
            }
        }
        send_message_to_all_clients('post_updated');
        console.log('Replay complete!');
    }



    /*
        const queue = new workbox.backgroundSync.Queue('myQueueName', {
            maxRetentionTime: 60 * 24 * 30,
            onSync: async ({ queue }) => {
                console.log('...Synchronizing ' + queue.name);
                //await queue.replayRequests();
                let entry;
                while (entry = await queue.shiftRequest()) {
                    try {
                        console.log('...Replaying: ' + entry.request.url);
                        send_message_to_all_clients('post_updating');
                        await fetch(entry.request);
                        console.log('...Replayed: ' + entry.request.url);

                    } catch (error) {
                        console.error('Replay failed for request', entry.request, error);
                        await queue.unshiftRequest(entry);
                        return;
                    }
                }
                send_message_to_all_clients('post_updated');
                console.log('Replay complete!');
            }
        });
        */

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
        new RegExp('/api/user_data'),
        new workbox.strategies.NetworkFirst()
    );



    self.addEventListener("sync", function(event) {
        console.log("firing sync: " + event.tag);
        console.log(event);
        if (event.tag == "workbox-background-sync:myQueueName") {
            console.log("sync event fired");
        }
    });

    //client to SW
    self.addEventListener('message', function(event) {
        console.log("SW Received Message: " + event.data);
        if (event.data === 'replayRequests') {
            console.log('replayRequests');
            //queue.replayRequests();
            firstAsync();


        }

    });



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

            //client.postMessage("SW Says: '" + msg + "'", [msg_chan.port2]);
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

    const myPlugin = {
        fetchDidFail: async ({ originalRequest, request, error, event }) => {
            // No return expected.
            // NOTE: `originalRequest` is the browser's request, `request` is the
            // request after being passed through plugins with
            // `requestWillFetch` callbacks, and `error` is the exception that caused
            // the underlying `fetch()` to fail.
            console.log('push2');
            // adding to the Queue.
            queue.pushRequest({ request: request });
        }
    }

    /*
    const bgSyncPlugin = new workbox.backgroundSync.Plugin('myqueue', {
        maxRetentionTime: 24 * 60,
        onSync: async ({ queue }) => {
            console.log('...Synchronizing ' + queue.name);
            let entry;
            while (entry = await queue.shiftRequest()) {
                try {
                    console.log('...Replaying: ' + entry.request.url);
                    send_message_to_all_clients('post_updating');
                    await fetch(entry.request);
                    console.log('...Replayed: ' + entry.request.url);

                } catch (error) {
                    console.error('Replay failed for request', entry.request, error);
                    await queue.unshiftRequest(entry);
                    return;
                }
            }
            send_message_to_all_clients('post_updated');
            console.log('Replay complete!');
        }
    });
    */



    const cachedResponseWillBeUsed = async ({ cache, request, cachedResponse }) => {
        // If there's already a match against the request URL, return it.
        if (cachedResponse) {
            console.log(cachedResponse);
            return cachedResponse;
        }
        var cachedFiles = await caches.match(request.url, {
            ignoreSearch: true
        });
        return cachedFiles;
    };

    workbox.routing.registerRoute(
        new RegExp('/chat/get_feed'),
        new workbox.strategies.NetworkFirst({
            cacheName: 'chatty-feed',
            plugins: [
                { cachedResponseWillBeUsed },
            ]
        })
    );
    /*
        workbox.routing.registerRoute(
            new RegExp('/api/cards'),
            new workbox.strategies.NetworkOnly({
                plugins: [bgSyncPlugin]
            }),
            'POST'
        );
        */

    workbox.routing.registerRoute(
        new RegExp('/api/cards'),
        new workbox.strategies.NetworkOnly({
            plugins: [myPlugin]
        }),
        'POST'
    );

    workbox.routing.registerRoute(
        new RegExp('/'),
        new workbox.strategies.NetworkFirst({}),
    );

    workbox.googleAnalytics.initialize();

    workbox.precaching.precacheAndRoute([]);

} else {
    console.log("Boo! Workbox didn't load 😬");
}