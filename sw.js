// RECEPTURA academy — service worker v3.1.7
// Стратегия: HTML — «сеть вперёд» (новая версия видна сразу после деплоя),
// иконки и статика — «кэш вперёд». Офлайн работает в обоих случаях.
const CACHE = "receptura-v317";
const FILES = ["./", "./index.html", "./manifest.json",
  "./icons/icon-72.png", "./icons/icon-96.png", "./icons/icon-128.png", "./icons/icon-144.png",
  "./icons/icon-152.png", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-384.png",
  "./icons/icon-512.png", "./icons/icon-512-maskable.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(FILES.map(f => c.add(f))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

function isHtml(req) {
  return req.mode === "navigate" ||
         (req.headers.get("accept") || "").includes("text/html");
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // HTML: сначала сеть, потом кэш (чтобы обновление подхватывалось мгновенно)
  if (isHtml(req)) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // Остальное: сначала кэш, потом сеть
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(res => {
      if (res && res.status === 200 && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
