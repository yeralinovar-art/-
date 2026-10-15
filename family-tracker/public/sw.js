// Service worker «Семьи»: кэш статики, офлайн-страница и push-напоминания.
const VERSION = "v2";
const STATIC_CACHE = `static-${VERSION}`;
// Последние открытые страницы — чтобы без сети показать сохранённую версию.
// При выходе из аккаунта приложение очищает этот кэш.
const PAGES_CACHE = "pages-v1";
const MAX_PAGES = 40;
const PRECACHE = ["/offline", "/icons/192.png", "/icons/512.png"];
const NO_CACHE_PAGES = ["/login", "/onboarding", "/auth", "/offline", "/api"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Сборка Next.js: имена файлов содержат хэш, поэтому можно брать из кэша.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Страницы: из сети (и сохраняем копию); без сети — сохранённая копия или заглушка.
  if (request.mode === "navigate") {
    const cacheable = !NO_CACHE_PAGES.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"));
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (cacheable && response.ok && !response.redirected && response.type === "basic") {
            const copy = response.clone();
            event.waitUntil(savePage(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(PAGES_CACHE);
          return (
            (await cache.match(request, { ignoreVary: true })) ||
            (await cache.match(request, { ignoreVary: true, ignoreSearch: true })) ||
            (await caches.match("/offline"))
          );
        }),
    );
  }
});

async function savePage(request, response) {
  const cache = await caches.open(PAGES_CACHE);
  await cache.put(request, response);
  const keys = await cache.keys();
  // Самые старые — в начале списка.
  for (const old of keys.slice(0, Math.max(0, keys.length - MAX_PAGES))) await cache.delete(old);
}

// Выход из аккаунта: страница просит забыть сохранённые копии.
self.addEventListener("message", (event) => {
  if (event.data === "clear-pages") event.waitUntil(caches.delete(PAGES_CACHE));
});

// Push-напоминания: показываем уведомление, по нажатию открываем нужный раздел.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Семья", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Семья", {
      body: data.body || "",
      tag: data.tag,
      icon: "/icons/192.png",
      badge: "/icons/192.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
