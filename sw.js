/* Queijaria — service worker.
   IMPORTANTE: ao dar deploy, suba o número aqui JUNTO com o APP_VER do index.html. */
const CACHE = "queijaria-shell-v86";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg", "./logo.png"];
// arquivos que devem SEMPRE buscar a versão nova ao abrir (rede primeiro)
const SEMPRE_NOVO = ["/index.html", "/sw.js", "/"];

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
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  const url = new URL(req.url);
  const ehNavegacao = req.mode === "navigate";
  const ehSempreNovo = SEMPRE_NOVO.some((p) => url.pathname.endsWith(p));

  if (ehNavegacao || ehSempreNovo) {
    // REDE PRIMEIRO: pega sempre a versão mais nova; se estiver offline, usa o cache.
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  // demais estáticos (logo, ícone, manifest): cache primeiro, atualiza por trás.
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
