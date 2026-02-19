const CACHE_NAME = 'healthcare-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  'https://cdn.tailwindcss.com'
];

// Install - cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch - serve from cache if offline
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
});

// Background Sync - offline data sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-patients') {
    event.waitUntil(syncPatients());
  }
});

async function syncPatients() {
  const db = await openDB();
  const tx = db.transaction('offlinePatients', 'readonly');
  const store = tx.objectStore('offlinePatients');
  const patients = await getAllRecords(store);

  if (patients.length === 0) return;

  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patients })
    });

    if (response.ok) {
      const clearTx = db.transaction('offlinePatients', 'readwrite');
      clearTx.objectStore('offlinePatients').clear();
      console.log('✅ Offline data synced!');
    }
  } catch (err) {
    console.log('❌ Sync failed:', err);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('healthcareDB', 1);
    request.onupgradeneeded = e => {
      e.target.result.createObjectStore('offlinePatients', { 
        keyPath: 'id', autoIncrement: true 
      });
    };
    request.onsuccess = e => resolve(e.target.result);
    request.onerror = e => reject(e);
  });
}

function getAllRecords(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = e => resolve(e.target.result);
    request.onerror = e => reject(e);
  });
}