// SW módulo musica_militar · uso sin conexión (la descarga la gestiona Mesana)
const CACHE = 'pack-musica_militar-v1';
const CACHE_USO = 'uso-audio-v1';
const TIPOS = { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4' };

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

async function rango(req, res, url) {
  const h = req.headers.get('range');
  const m = h && /bytes=(\d*)-(\d*)/.exec(h);
  if (!m) return res;
  const ext = (new URL(url).pathname.split('.').pop() || '').toLowerCase();
  let tipo = res.headers.get('Content-Type') || '';
  if (!tipo || tipo.indexOf('octet-stream') >= 0) tipo = TIPOS[ext] || 'audio/mpeg';
  const buf = await res.clone().arrayBuffer();
  const len = buf.byteLength;
  let s, f;
  if (m[1] === '') { s = Math.max(0, len - parseInt(m[2], 10)); f = len - 1; }
  else { s = parseInt(m[1], 10); f = m[2] === '' ? len - 1 : Math.min(parseInt(m[2], 10), len - 1); }
  if (isNaN(s) || s >= len) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + len } });
  return new Response(buf.slice(s, f + 1), { status: 206, headers: {
    'Content-Type': tipo, 'Content-Range': 'bytes ' + s + '-' + f + '/' + len,
    'Content-Length': String(f - s + 1), 'Accept-Ranges': 'bytes' } });
}

async function audio(req) {
  const url = req.url;
  let hit = await caches.match(url, { ignoreVary: true });
  if (!hit) {
    try {
      const mismo = new URL(url).origin === self.location.origin;
      const r = await fetch(url, { mode: mismo ? 'same-origin' : 'cors' });
      if (!r.ok) return fetch(req);
      const c = await caches.open(CACHE_USO);
      await c.put(url, r.clone());
      hit = r;
    } catch (_) {
      try { return await fetch(req); } catch (__) { return Response.error(); }
    }
  }
  return rango(req, hit, url);
}

async function pagina(e) {
  const req = e.request;
  const hit = await caches.match(req, { ignoreSearch: true, ignoreVary: true });
  if (hit) {
    e.waitUntil(fetch(req).then(async (r) => { if (r && r.ok) { const c = await caches.open(CACHE); await c.put(req, r); } }).catch(() => {}));
    return hit;
  }
  try {
    const r = await fetch(req);
    if (r && r.ok) { const c = await caches.open(CACHE_USO); c.put(req, r.clone()); }
    return r;
  } catch (_) { return Response.error(); }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/\.(mp3|wav|ogg|m4a)$/i.test(url.pathname)) { e.respondWith(audio(req)); return; }
  if (url.origin === self.location.origin) e.respondWith(pagina(e));
});
