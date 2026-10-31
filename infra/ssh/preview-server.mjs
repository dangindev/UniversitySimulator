import { createServer, request } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
};
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
};

/** Private SSH preview only: never binds a public interface or serves repository files. */
export function createPreviewServer({ root, apiPort = 33101 }) {
  const staticRoot = resolve(root);
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535)
    throw new Error("Invalid loopback API port.");
  return createServer(async (req, res) => {
    for (const [key, value] of Object.entries(securityHeaders))
      res.setHeader(key, value);
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        const headers = {};
        for (const name of [
          "authorization",
          "content-type",
          "accept",
          "origin",
        ])
          if (req.headers[name]) headers[name] = req.headers[name];
        const upstream = request(
          {
            hostname: "127.0.0.1",
            port: apiPort,
            path: url.pathname + url.search,
            method: req.method,
            headers,
            timeout: 15000,
          },
          (reply) => {
            res.statusCode = reply.statusCode || 502;
            for (const name of ["content-type", "retry-after", "cache-control"])
              if (reply.headers[name]) res.setHeader(name, reply.headers[name]);
            res.setHeader("Cache-Control", "no-store");
            reply.on("error", () => res.destroy());
            reply.pipe(res);
          },
        );
        upstream.on("timeout", () =>
          upstream.destroy(new Error("API timeout.")),
        );
        upstream.on("error", () => {
          if (!res.headersSent) {
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "preview_api_unavailable",
                message: "API nội bộ chưa sẵn sàng. Hãy thử lại.",
              }),
            );
          } else res.destroy();
        });
        req.on("aborted", () => upstream.destroy());
        req.pipe(upstream);
        return;
      }
      if (!["GET", "HEAD"].includes(req.method || "GET")) {
        res.writeHead(405, { Allow: "GET, HEAD" });
        res.end();
        return;
      }
      if (url.pathname === "/healthz") {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        res.end(
          req.method === "HEAD"
            ? ""
            : '{"status":"ok","audience":"private-ssh-preview"}',
        );
        return;
      }
      let path;
      try {
        path = decodeURIComponent(url.pathname);
      } catch {
        res.writeHead(400);
        res.end();
        return;
      }
      if (
        path.includes("\0") ||
        path.includes("\\") ||
        path.split("/").some((part) => part.startsWith("."))
      ) {
        res.writeHead(403);
        res.end();
        return;
      }
      let target = resolve(staticRoot, "." + path);
      if (target !== staticRoot && !target.startsWith(staticRoot + sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      let metadata = await stat(target).catch(() => null);
      if (!metadata?.isFile()) {
        if (extname(path)) {
          res.writeHead(404);
          res.end();
          return;
        }
        target = resolve(staticRoot, "index.html");
        metadata = await stat(target);
      }
      const canonical = await realpath(target),
        canonicalRoot = await realpath(staticRoot);
      if (
        !canonical.startsWith(canonicalRoot + sep) ||
        relative(canonicalRoot, canonical)
          .split(sep)
          .some((part) => part.startsWith("."))
      ) {
        res.writeHead(403);
        res.end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": mime[extname(target)] || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": target.endsWith("index.html")
          ? "no-store"
          : "public, max-age=3600",
      });
      res.end(req.method === "HEAD" ? undefined : await readFile(target));
    } catch {
      if (!res.headersSent) {
        res.writeHead(500);
        res.end("Preview unavailable.");
      } else res.destroy();
    }
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const port = Number(process.env.PREVIEW_PORT || 33173);
  createPreviewServer({
    root: resolve("apps/web/dist"),
    apiPort: Number(process.env.PORT || 33101),
  }).listen(port, "127.0.0.1", () =>
    console.log(
      `Private University Simulator preview: http://127.0.0.1:${port}`,
    ),
  );
}
