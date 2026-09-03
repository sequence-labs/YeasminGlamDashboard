const CACHE_PREFIX = "glam-studio-shell";
const CACHE_VERSION = "v1";
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const scopeUrl = new URL(self.registration.scope);

const scopedUrl = (path = "") => new URL(path, scopeUrl).toString();
const APP_SHELL = [
  scopedUrl("manifest.webmanifest"),
  scopedUrl("favicon.svg"),
  scopedUrl("icons/apple-touch-icon.png"),
  scopedUrl("icons/app-icon-192.png"),
  scopedUrl("icons/app-icon-512.png"),
  scopedUrl("icons/app-icon-maskable-512.png"),
];

function discoverBuiltAssets(html) {
  const assets = new Set();
  const attributePattern = /\b(?:src|href)=["']([^"']+)["']/g;
  for (const match of html.matchAll(attributePattern)) {
    const url = new URL(match[1], scopeUrl);
    if (url.origin === self.location.origin && url.pathname.startsWith(`${scopeUrl.pathname}assets/`)) {
      assets.add(url.toString());
    }
  }
  return [...assets];
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const shellResponse = await fetch(scopedUrl(), { cache: "reload" });
  if (!shellResponse.ok || shellResponse.type !== "basic") {
    throw new Error("The current app shell could not be fetched.");
  }

  const builtAssets = discoverBuiltAssets(await shellResponse.clone().text());
  const requiredUrls = [...APP_SHELL, ...builtAssets];
  const requiredResponses = await Promise.all(requiredUrls.map(async (url) => {
    const response = await fetch(url, { cache: "reload" });
    if (!response.ok || response.type !== "basic") {
      throw new Error(`A required public shell asset could not be fetched: ${url}`);
    }
    return [url, response];
  }));

  await cache.put(scopedUrl(), shellResponse);
  await Promise.all(requiredResponses.map(([url, response]) => cache.put(url, response)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isPublicStaticAsset(url) {
  if (!url.pathname.startsWith(scopeUrl.pathname)) return false;
  const relativePath = url.pathname.slice(scopeUrl.pathname.length);
  return (
    relativePath.startsWith("assets/") ||
    relativePath.startsWith("icons/") ||
    relativePath.startsWith("service-menus/") ||
    relativePath === "favicon.svg" ||
    relativePath === "manifest.webmanifest"
  );
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(scopedUrl(), response.clone());
    }
    return response;
  } catch {
    return (await caches.match(scopedUrl())) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok && response.type === "basic") {
        void cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached || Response.error());

  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.includes("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isPublicStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
