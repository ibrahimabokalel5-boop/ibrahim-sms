/*
 * Service Worker - Digital Services Hub PWA
 * تخزين الملفات الثابتة محلياً والعمل بسرعة فائقة
 */
const CACHE_NAME = 'digital-hub-v2.5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap'
];

// مرحلة التثبيت - حفظ الملفات الأساسية في الكاش
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell & assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('[SW] Cache add warning:', err));
    }).then(() => self.skipWaiting())
  );
});

// مرحلة التفعيل - مسح الكاشات القديمة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[SW] Removing old cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// اعتراض الطلبات واستراتيجية Network First للـ API و Cache First للثوابت
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // طلبات الـ API يجب دائماً جلبها من الشبكة
  if (url.pathname.startsWith('/api') || event.request.method !== 'GET') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: "لا يوجد اتصال بالإنترنت حالياً" }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // باقي الملفات: الكاش مع التحديث في الخلفية (Stale-While-Revalidate)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
