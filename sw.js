self.addEventListener('install', (e) => {
  console.log('Service Worker Installing...');
  e.waitUntil((async () => {
    console.log('Service Worker Installed');
  })());
});

self.addEventListener('activate', (e) => {
  console.log('Service Worker Active');
});

