// SW pack sin conexión · módulo musica_militar
const VERSION = 'v1';
const PREFIX = 'pack-musica_militar-';
const CACHE = PREFIX + VERSION;
const CACHE_USO = 'uso-audio-v1'; // compartido: lo ya reproducido se queda guardado
const LOCAL = [
 "./",
 "./index.html",
 "./badge_5_musica.png",
 "./img/BANDAMUSICA.jpg",
 "./img/BANDERAS.jpg",
 "./img/CHFLE.jpg",
 "./img/GDIA.jpg",
 "./img/JCIr.jpg",
 "./img/PARADAMILITAR02.jpg",
 "./img/TEAR.jpg",
 "./img/banderaespana.jpg",
 "./img/check_BLANCOjpg.jpg",
 "./img/check_GRISjpg.jpg",
 "./img/check_it.jpg",
 "./img/check_it_GRIS.jpg",
 "./img/cornetas.jpg",
 "./img/fondoazul.jpg",
 "./audio/ALTO.mp3",
 "./audio/ATENCION.mp3",
 "./audio/DEFRENTE.mp3",
 "./audio/DERECHA.mp3",
 "./audio/DESCANSO.mp3",
 "./audio/DISCRECCION.mp3",
 "./audio/FIN_DISCRECCION.mp3",
 "./audio/FIRMES.mp3",
 "./audio/IZQUIERDA.mp3",
 "./audio/LLAMADA_MANDOS.mp3",
 "./audio/SOBRE EL HOMBRO DERECHO.mp3"
];
const REMOTE = [];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const todo = [...LOCAL, ...REMOTE];
    for (let i = 0; i < todo.length; i += 6) {
      await Promise.all(todo.slice(i, i + 6).map(async (u) => {
        const req = new Request(u);
        if (await c.match(req, { ignoreVary: true })) return;
        const r = await fetch(new Request(u, { cache: 'reload' }));
        if (!r.ok) throw new Error(u + ' ' + r.status);
        await c.put(req, r);
      }));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const TIPOS = { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4' };

async function rango(req, res, url) {
  const ext = (new URL(url).pathname.split('.').pop() || '').toLowerCase();
  let tipo = res.headers.get('Content-Type') || '';
  if (!tipo || tipo.indexOf('octet-stream') >= 0) tipo = TIPOS[ext] || 'audio/mpeg';
  const h = req.headers.get('range');
  const m = h && /bytes=(\d*)-(\d*)/.exec(h);
  if (!m) return res;
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

async function swr(e) {
  const req = e.request;
  const c = await caches.open(CACHE);
  const hit = await c.match(req, { ignoreSearch: true, ignoreVary: true });
  const red = fetch(req).then((r) => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
  if (hit) { e.waitUntil(red); return hit; }
  const r = await red;
  if (r) return r;
  return (await c.match('./', { ignoreSearch: true })) || Response.error();
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/\.(mp3|wav|ogg|m4a)$/i.test(url.pathname)) { e.respondWith(audio(req)); return; }
  if (url.origin === self.location.origin) { e.respondWith(swr(e)); }
});
