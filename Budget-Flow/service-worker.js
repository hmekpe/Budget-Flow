const CACHE_NAME = "budget-flow-shell-v3";
const OFFLINE_URL = "/offline.html";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/offline.html",
  "/assests/budget-flow-icon.svg",
  "/pages/auth.html",
  "/pages/reset-password.html",
  "/css/auth.css",
  "/css/reset-password.css",
  "/js/auth.js",
  "/js/reset-password.js",
  "/js/pwa.js",
  "/app/index.html",
  "/app/onboarding.html",
  "/app/js/backend-integration.js",
  "/app/js/i18n.js",
  "/app/js/ui-language.js",
  "/app/js/onboarding.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (url.pathname === "/runtime-config.js") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match(OFFLINE_URL))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponse = fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkResponse;
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (error) {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || "Budget Flow";
  const options = {
    body: payload.body || "Tap to open Budget Flow.",
    icon: payload.icon || "/assests/budget-flow-icon.svg",
    badge: payload.badge || "/assests/budget-flow-icon.svg",
    tag: payload.tag || "budget-flow-notification",
    data: {
      url: payload.url || "/app/index.html#dashboard"
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/app/index.html#dashboard",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find((client) => client.url.startsWith(self.location.origin));

      if (matchingClient) {
        return matchingClient.focus().then(() => {
          if ("navigate" in matchingClient) {
            return matchingClient.navigate(targetUrl);
          }

          return matchingClient;
        });
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});
