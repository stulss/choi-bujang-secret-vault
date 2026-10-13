// 11단계 설치형 웹앱 서비스 워커: 오프라인 안내 화면만 저장합니다.
// /api/* 응답, 메모, 토큰, 기기 키는 저장하지 않습니다. 오프라인일 때 화면 이동만 offline.html로 보냅니다.
const CACHE = 'vault-shell-v1';
const SHELL = ['/offline.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
  }
});
