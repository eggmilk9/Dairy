const CACHE = 'diary-v3';
const STATIC = [
  './icon.png', './icon-192.png', './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
];

// 설치: 아이콘·라이브러리만 미리 캐시
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

// 활성화: 이전 캐시 전부 삭제
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isHTML = e.request.destination === 'document'
    || url.pathname.endsWith('.html')
    || url.pathname.endsWith('/');

  if (isHTML) {
    // HTML은 항상 네트워크 우선 → 업데이트가 즉시 반영됨
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
    );
  } else {
    // 아이콘·JS 라이브러리는 캐시 우선 (빠름)
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (!res || res.status !== 200 || res.type === 'opaque') return res;
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        });
      })
    );
  }
});
