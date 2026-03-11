/* ════════════════════════════════════════════
   SERVICE-WORKER.JS — Offline PWA support
════════════════════════════════════════════ */
const CACHE_NAME = 'typewriter-v3';

const PRECACHE = [
  './',
  './index.html',
  './css/app.css',
  './css/paper.css',
  './css/analyzer.css',
  './js/vendor/purify.min.js',
  './js/vendor/purify.min.js.map',
  './js/vendor/compromise.min.js',
  './js/vendor/typo.js',
  './js/vendor/en_US.dic',
  './js/vendor/en_US.aff',
  './js/main.js',
  './js/editor.js',
  './js/filesystem.js',
  './js/markdown.js',
  './js/analyzer.js',
  './js/spellcheck.js',
  './js/grammar.js',
  './js/stats.js',
  './js/ui.js',
  './js/state.js',
  './js/config.js',
  './js/analysis-worker.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME)
        .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isLocal = url.origin === self.location.origin;

  if (isLocal) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        })
      )
    );
  } else {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
