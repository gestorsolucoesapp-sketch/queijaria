/* Queijaria — service worker.
   IMPORTANTE: ao dar deploy, suba o número aqui JUNTO com o APP_VER do index.html,
   senão o PWA continua servindo a versão velha. */
const CACHE = "queijaria-shell-v35";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg", "./logo.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) =>
      Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // Só cuidamos de GET do mesmo domínio (o app-shell). Supabase e CDN passam direto pra rede.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // stale-while-revalidate: responde do cache na hora e atualiza por trás.
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((hit) => {
        const rede = fetch(req).then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        }).catch(() => hit);
        return hit || rede;
      })
    )
  );
});
