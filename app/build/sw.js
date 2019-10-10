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
    "revision": "f44c948c75ac5fb649d1eb9cd57a6677"
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
    "revision": "b85597d223fb1ef35ff2f44a258d49ef"
  },
  {
    "url": "controllers/cardcreate_ctrl.js",
    "revision": "39f6a673228b5dda4649ea5816a18b42"
  },
  {
    "url": "controllers/contacts_ctrl.js",
    "revision": "3d0b5fc772b7513adc9026d58f075742"
  },
  {
    "url": "controllers/conversation_ctrl.js",
    "revision": "4bfd23894cda3ccfce4f6016e33878ae"
  },
  {
    "url": "controllers/conversations_ctrl.js",
    "revision": "c8e7276b3c09507bffc125483c9f778e"
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
    "revision": "96d0ae04df8d4d78116985948d183203"
  },
  {
    "url": "controllers/usersetting_ctrl.js",
    "revision": "4386b7fc37d17159d7ad8dd7673827a8"
  },
  {
    "url": "directives/directives.js",
    "revision": "ce471a0874be7dd778dd872a7c777a2f"
  },
  {
    "url": "factories/factories.js",
    "revision": "89b3dd8e96b2f88c75f0026980b33601"
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
    "revision": "e59677ec3d54bd7c53662a3f6cf18fe7"
  },
  {
    "url": "js/angular_moment.js",
    "revision": "a4636560ae4460aa57b93706db6a788d"
  },
  {
    "url": "js/angular-cookies.min_1.6.9.js",
    "revision": "7d01657d4fb5a95aedf51c8a1900ccde"
  },
  {
    "url": "js/angular-jwt.js",
    "revision": "20b4a8c03265120b6dfe747c14ad1069"
  },
  {
    "url": "js/exif.js",
    "revision": "bb882034f8ea66b2ad6c0f06adcc2e91"
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
    "revision": "01a015c60ae0ed174abda567f3484166"
  },
  {
    "url": "routes/routes.js",
    "revision": "c11671cc474830d088f3c11a8340f52d"
  },
  {
    "url": "service-worker.js",
    "revision": "7caa08123d0b4ebc3a7f96f5a68265d5"
  },
  {
    "url": "services/content_editable.js",
    "revision": "7380e4d3572d8c0e82e8a571c8f1f8da"
  },
  {
    "url": "services/crop_rotate.js",
    "revision": "23793d0384d92d63b55057cf77b8cdf5"
  },
  {
    "url": "services/database.js",
    "revision": "1e8ff9b936f22403bcf936f4eb61cd5d"
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
    "revision": "3f6c185a33f8bff95f6e17cf64ad94e2"
  },
  {
    "url": "services/format_html.js",
    "revision": "808c1cf619c9bcdd56b35d23995f745d"
  },
  {
    "url": "services/format.js",
    "revision": "b52ba90427f2d2d588d6d15873f613fe"
  },
  {
    "url": "services/general.js",
    "revision": "723136766b96e269ef17ea2565ad6120"
  },
  {
    "url": "services/image_adjustment.js",
    "revision": "2779cf2fdfb1e3bf8be72a2c0afefa5c"
  },
  {
    "url": "services/image_edit.js",
    "revision": "05d7cd72ebad29176472d0a6b1030596"
  },
  {
    "url": "services/image_filters.js",
    "revision": "cb2a8a37ea31f85e08abc8ed0f4a1a8d"
  },
  {
    "url": "services/image_functions.js",
    "revision": "e2f1ec1bdd7ecd0913c3c37e4055e20f"
  },
  {
    "url": "services/image_manipulate.js",
    "revision": "c7abbe1ce9a3b75476a64ccb63303144"
  },
  {
    "url": "services/keyboard.js",
    "revision": "f85a7bb3c9c5c2ee446ca766b5ec2f35"
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
    "url": "style/customstyle.css",
    "revision": "bb8cd1616c4d7c087a24b4468062597f"
  },
  {
    "url": "style/instagram.css",
    "revision": "9cf7b92233d015f5719aba6b4344809a"
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
    "url": "views/card_create.html",
    "revision": "d509a07a7231a2537c31ea6308ee2a1a"
  },
  {
    "url": "views/card.html",
    "revision": "d2e895c092f85732a3d84761056c316f"
  },
  {
    "url": "views/contacts.html",
    "revision": "6fd7ebb0624306b88168220f8fdc9532"
  },
  {
    "url": "views/conversation.html",
    "revision": "758abba94106e54cd12053ecf31cf037"
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
    "revision": "be325c1293de72221cd9b5a9904eaaf1"
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
    "revision": "0c49eb6b1142dd76461c77b3451dc62b"
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
    "url": "views/spinner.html",
    "revision": "7e83301b3d5ebc102a853bbb62c2f712"
  },
  {
    "url": "views/user_setting.html",
    "revision": "d4edb77cf8070f188bfe583139bf98a4"
  }
]);


} else {
    console.log("Boo! Workbox didn't load 😬");
}