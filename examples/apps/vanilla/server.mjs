/**
 * A static file server, deliberately boring.
 *
 * The example has no bundler and no dev-tool integration, so this is the whole
 * development environment: serve the project directory, map a handful of file
 * extensions to MIME types, and fall back to `index.html` for `/`.
 *
 * It serves the project root *including* `node_modules`, which is what makes
 * `/node_modules/@themvora/core/dist/prepaint.js` reachable without a copy step.
 * A production deployment does not do that — see the README for the two files
 * to copy into the build output instead.
 *
 * Usage: node server.mjs [--port 5205]
 */
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

const portArgument = process.argv.indexOf("--port");
const port = Number(
  portArgument !== -1 ? process.argv[portArgument + 1] : process.env.PORT ?? 5205,
);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const requested = decodeURIComponent(url.pathname);

  // `normalize` collapses `..` before the prefix check, so a traversal attempt
  // resolves inside the root or not at all.
  const relative = normalize(requested).replace(/^([/\\])+/, "");
  let filePath = join(root, relative);

  if (!filePath.startsWith(root + sep) && filePath !== root) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  if (!existsSync(filePath)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    // No caching: this is a review fixture, and a stale `prepaint.js` would make
    // a package change look like it had no effect.
    "cache-control": "no-store",
  });

  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Themvora vanilla example → http://127.0.0.1:${port}`);
});
