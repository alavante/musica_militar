// SW MESANA (pack sin conexión)
const CACHE_NAME = 'mesana-v70';
const ASSETS = ["./", "./index.html", "./manifest.json", "./privacidad.html", "./Escudo_Armas_Juan_Sebastian_Elcano.png", "./badge_1_chifle.png", "./badge_2_buques.png", "./badge_3_izado.png", "./badge_4_autoridades.png", "./badge_5_musica.png", "./badge_6_tierra.png", "./escudo_elcano_header.png", "./icon-192.png", "./icon-512.png", "./logo.jpg"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('mesana-') && k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    const red = fetch(req).then((r) => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE_NAME).then((c) => c.put(req, cp)); } return r; }).catch(() => null);
    return hit || red.then((r) => r || caches.match('./index.html'));
  }));
});
