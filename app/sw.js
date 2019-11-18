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
    "revision": "b0df764548feb6e106753e47a28958b8"
  },
  {
    "url": "controllers/contacts_ctrl.js",
    "revision": "a2f1acd789576577721d5f2aa966deaa"
  },
  {
    "url": "controllers/conversation_ctrl.js",
    "revision": "86d59ff6c4bbe87513407d9179f4c8b6"
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
    "revision": "f8543e23b8ae8b5b256a6c0dc27e4800"
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
    "revision": "7afbefe300897bca2b2eb4e8071665e4"
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
    "revision": "26b65c1b9d1760154dc26e48a01ac29a"
  },
  {
    "url": "js/angular_moment.js",
    "revision": "9782d9786bfb852471abdd236d8e9672"
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
    "revision": "dcb0ea590a2ba2a4c8567742c0de606b"
  },
  {
    "url": "routes/routes.js",
    "revision": "936a8af052a907ec9ade912325d186fc"
  },
  {
    "url": "service-worker.js",
    "revision": "40dad5a16bc86e4f81b05b67eaf8169d"
  },
  {
    "url": "service-workerONLINEADJUSTED.js",
    "revision": "163cdd6faef42418ae24874afe232bb3"
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
    "revision": "8f2dd5b424084f314a491cfc0ac17c50"
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
    "revision": "d3c227ad1f06c96e680563a2bc6b2ca5"
  },
  {
    "url": "services/general.js",
    "revision": "723136766b96e269ef17ea2565ad6120"
  },
  {
    "url": "services/image_adjustment.js",
    "revision": "0eb652adedee73d698adf0007bf579f4"
  },
  {
    "url": "services/image_edit.js",
    "revision": "05d7cd72ebad29176472d0a6b1030596"
  },
  {
    "url": "services/image_filters.js",
    "revision": "6c3fc5d3e0014b1b2be36e9236ca8419"
  },
  {
    "url": "services/image_functions.js",
    "revision": "56c00018a946041a360c593abbb6f7aa"
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
    "revision": "b9ea2432ea3aef56c6ea23745dbce51e"
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
    "url": "views/alert.html",
    "revision": "53f5b07f3e38b65ea6fbcef910514bec"
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
    "revision": "0dd483c07655f5e5d8e12f001c163069"
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
], {

    });

}