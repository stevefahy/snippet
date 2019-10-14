importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.1.1/workbox-sw.js');

if (workbox) {
    console.log("Yay! Workbox is loaded 🎉");

    self.addEventListener('activate', function(event) {
        console.log('Claiming control');
        return self.clients.claim();
    });

    self.addEventListener('fetch', event => {
        console.log('url: ' + event.request.url);
    });

    // Debugging
    workbox.setConfig({
        debug: true
    });


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
  
    const bgSyncPlugin = new workbox.backgroundSync.Plugin('my-queue', {
        maxRetentionTime: 24 * 60,
        onSync: async ({ queue }) => {
            console.log('...Synchronizing ' + queue.name);
            let entry;
            while (entry = await queue.shiftRequest()) {
                try {
                    console.log('...Replaying: ' + entry.request.url);
                    console.log(entry);
                    await fetch(entry.request);
                    console.log('...Replayed: ' + entry.request.url);
                } catch (error) {
                    console.error('Replay failed for request', entry.request, error);
                    await queue.unshiftRequest(entry);
                    return;
                }
            }
            console.log('Replay complete!');
        }
    });

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

    workbox.routing.registerRoute(
        new RegExp('/api/cards'),
        new workbox.strategies.NetworkOnly({
            plugins: [bgSyncPlugin]
        }),
        'POST'
    );

    workbox.routing.registerRoute(
        new RegExp('/'),
        new workbox.strategies.NetworkFirst({
        }),
    );

    workbox.googleAnalytics.initialize();

    workbox.precaching.precacheAndRoute([]);

} else {
    console.log("Boo! Workbox didn't load 😬");
}