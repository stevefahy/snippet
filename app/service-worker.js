importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js');

if (workbox) {
    console.log("Yay! Workbox is loaded 🎉");

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
    /*
        workbox.routing.registerRoute(
            new RegExp('/api/users/search_id/5c5886b4d1df733200ca7974'),
            new workbox.strategies.NetworkFirst()
        );
        */
    /*
    const bgSyncPlugin = new workbox.backgroundSync.Plugin('queueExample', {
      maxRetentionTime: 24 * 60 // Retry for max of 24 Hours
    });

    workbox.routing.registerRoute(
      '/api/users/search_id/5c5886b4d1df733200ca7974',
      new workbox.strategies.NetworkFirst({
        plugins: [bgSyncPlugin]
      }),
      'POST'
    );
    */

    /*
    workbox.routing.registerRoute(
        // Customize this pattern as needed.
        new RegExp('^/chat/get_feed/'),
        new workbox.strategies.NetworkFirst({
            cacheName: 'sharepoint-assets',
            plugins: [
                new workbox.expiration.Plugin({ maxEntries: 1 }),
            ],
        })
    );
    */

    /*
    const bgSyncPlugin = new workbox.backgroundSync.Plugin('queueExample', {
      maxRetentionTime: 24 * 60 // Retry for max of 24 Hours
    });

    workbox.routing.registerRoute(
      new RegExp('/chat/get_feed/.*'),
      new workbox.strategies.NetworkFirst({
        plugins: [bgSyncPlugin]
      }),
      'POST'
    );
    */

    const showNotification = () => {
        console.log('Posts sent to server');
/*
        self.registration.showNotification('Post Sent', {
            body: 'You are back online and your post was successfully sent!',
            icon: 'assets/icon/256.png',
            badge: 'assets/icon/32png.png'
        });
        */

    };

    self.addEventListener("sync", function(event) {
        console.log("firing sync: " + event.tag);
        console.log(event);
        if (event.tag == "workbox-background-sync:myQueueName") {
         console.log("sync event fired");
         //showNotification();
        // event.waitUntil(fetchGeneric());
        }
    });



    const bgSyncPlugin = new workbox.backgroundSync.Plugin('myQueueName', {
        //maxRetentionTime: 24 * 60, // Retry for max of 24 Hours (specified in minutes)

        // the new bit
        /*
        callbacks: {
            queueDidReplay: showNotification
        }
        */

       callbacks: {
      queueDidReplay: showNotification
    }

        /*
        onSync: async (obj) => {
            console.log('YAY!');
            showNotification();
            // Do something with queue...
        }
        */


    });


    /*
    showNotification2 = function() {
        console.log('Fixed!');
    };
    */

    /*
    const bgSyncPlugin2 = new workbox.backgroundSync.Queue(
        'myQueueName', {
            callbacks: {
                queueDidReplay: showNotification
            }
        }
    );
    */

    /*
    const bgSyncPlugin2 = new workbox.backgroundSync.Plugin('myQueueName', {
        maxRetentionTime: 24 * 60,
        onSync: async (obj) => {
            console.log('FINALLY');
            //const queue = obj.queue;
            // Do something with queue...
        }
    });
    */

    workbox.routing.registerRoute(
        new RegExp('/api/cards'),
        new workbox.strategies.NetworkOnly({
            plugins: [bgSyncPlugin]
        }),
        'POST'
    );

    //bgSyncPlugin2.replayRequests();

    /*
        const queue = new workbox.backgroundSync.Queue('myQueueName');

        self.addEventListener('fetch', (event) => {
            // Clone the request to ensure it's safe to read when
            // adding to the Queue.
            const promiseChain = fetch(event.request.clone())
                .catch((err) => {
                    return queue.pushRequest({ request: event.request });
                });

            event.waitUntil(promiseChain);
        });
        */



    workbox.routing.registerRoute(
        new RegExp('/'),
        new workbox.strategies.NetworkFirst()
    );

    /*
        workbox.routing.registerRoute(
            new RegExp('/api/users/search_id/5c5886b4d1df733200ca7974'),
            new workbox.strategies.NetworkFirst()
        );
        */



    /*
    workbox.precaching.precacheAndRoute([
      { url: '/' },
       { url: '/api/users/search_id/*' },
      // ... other entries ...
    ]);
    */



    workbox.googleAnalytics.initialize();

    workbox.precaching.precacheAndRoute([]);


} else {
    console.log("Boo! Workbox didn't load 😬");
}