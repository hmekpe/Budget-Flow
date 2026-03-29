const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const AUTH_FRONTEND_ROOT = path.join(ROOT_DIR, "Budget-Flow");
const FEATURE_FRONTEND_ROOT = path.join(
  ROOT_DIR,
  "Budget-Flow-feature-ohene",
  "Budget-Flow-feature-ohene"
);

const PRIMARY_PORT = 5500;
const LEGACY_FEATURE_PORT = 5501;
const FEATURE_PREFIX = "/app";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp"
};

function getMimeType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function normalizeRequestPath(requestPath) {
  const safePath = decodeURIComponent(requestPath).split("?")[0].split("#")[0];
  return safePath || "/";
}

function resolveFilePath(rootDir, requestPath) {
  const normalizedPath = normalizeRequestPath(requestPath);
  const relativePath = normalizedPath === "/" ? "/index.html" : normalizedPath;
  const resolvedPath = path.resolve(path.join(rootDir, `.${relativePath}`));
  const resolvedRoot = path.resolve(rootDir);

  if (!resolvedPath.startsWith(resolvedRoot)) {
    return null;
  }

  if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
    return path.join(resolvedPath, "index.html");
  }

  return resolvedPath;
}

function sendFile(rootDir, requestPath) {
  const filePath = resolveFilePath(rootDir, requestPath);

  if (!filePath) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!fs.existsSync(filePath)) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(Bun.file(filePath), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": getMimeType(filePath)
    }
  });
}

function getFeatureRequestPath(pathname) {
  if (pathname === FEATURE_PREFIX) {
    return "/";
  }

  if (pathname.startsWith(`${FEATURE_PREFIX}/`)) {
    return pathname.slice(FEATURE_PREFIX.length) || "/";
  }

  return null;
}

const workflowServer = Bun.serve({
  port: PRIMARY_PORT,
  fetch(request) {
    const url = new URL(request.url);
    const featureRequestPath = getFeatureRequestPath(url.pathname);

    if (featureRequestPath !== null) {
      return sendFile(FEATURE_FRONTEND_ROOT, featureRequestPath);
    }

    return sendFile(AUTH_FRONTEND_ROOT, url.pathname);
  }
});

const legacyFeatureServer = Bun.serve({
  port: LEGACY_FEATURE_PORT,
  fetch(request) {
    const url = new URL(request.url);
    return sendFile(FEATURE_FRONTEND_ROOT, url.pathname);
  }
});

console.log(`Workflow frontend available at http://localhost:${workflowServer.port}`);
console.log(`Auth page: http://localhost:${workflowServer.port}/pages/auth.html`);
console.log(`Feature app: http://localhost:${workflowServer.port}/app/index.html#dashboard`);
console.log(
  `Legacy feature-only port kept for compatibility at http://localhost:${legacyFeatureServer.port}/index.html`
);
