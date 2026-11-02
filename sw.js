/* 8-BIT SUBS · service worker: offline önbellek */
var CACHE = '8bit-subs.v2';
var ASSETS = [
  './', 'index.html', 'style.css', 'icon.svg', 'manifest.webmanifest',
  'js/core.js', 'js/views.js', 'js/main.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok) c.put(req, res.clone());
          return res;
        }).catch(function () { return null; }); // hit varken arka plan yenileme hatası sessiz
        // Ağ hata verirse önbelleğe düş
        return hit || net.then(function (r) { return r || new Response('offline', { status: 503 }); });
      });
    })
  );
});
