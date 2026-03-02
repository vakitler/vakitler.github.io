const STATIC_CACHE = 'vakitler-static-v2';
const RUNTIME_CACHE = 'vakitler-runtime-v2';
const API_CACHE = 'vakitler-api-v2';
const API_ORIGIN = 'https://ezanvakti.emushaf.net';
const API_CACHE_TTL_MS = 30 * 60 * 1000;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const allowList = [STATIC_CACHE, RUNTIME_CACHE, API_CACHE];

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all([
        ...keys.filter((key) => !allowList.includes(key)).map((key) => caches.delete(key)),
        cleanupExpiredApiCache()
      ])
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (requestUrl.origin === API_ORIGIN) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (requestUrl.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  event.respondWith(fetch(request));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function handleNavigationRequest(request) {
  try {
    return await fetch(request);
  } catch {
    const fallback = await caches.match('/index.html');
    if (fallback) return fallback;

    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, await withFetchedAtHeader(networkResponse));
    }
    return networkResponse;
  } catch {
    const cachedResponse = await getValidApiCache(request);
    if (cachedResponse) return cachedResponse;

    return new Response(JSON.stringify({ error: 'Offline cache unavailable' }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  const networkResponse = await fetch(request);
  if (networkResponse && networkResponse.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

async function withFetchedAtHeader(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-fetched-at', String(Date.now()));

  const body = await response.clone().blob();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function getValidApiCache(request) {
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);
  if (!cachedResponse) return null;

  const fetchedAt = Number(cachedResponse.headers.get('sw-fetched-at') || '0');
  const isExpired = !fetchedAt || Date.now() - fetchedAt > API_CACHE_TTL_MS;

  if (isExpired) {
    await cache.delete(request);
    return null;
  }

  return cachedResponse;
}

async function cleanupExpiredApiCache() {
  const cache = await caches.open(API_CACHE);
  const requests = await cache.keys();

  await Promise.all(requests.map(async (request) => {
    const cachedResponse = await cache.match(request);
    if (!cachedResponse) return;

    const fetchedAt = Number(cachedResponse.headers.get('sw-fetched-at') || '0');
    if (!fetchedAt || Date.now() - fetchedAt > API_CACHE_TTL_MS) {
      await cache.delete(request);
    }
  }));
}
