import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const port = Number(process.env.PORT || 5173);
const apiTarget = new URL(process.env.API_TARGET || "http://localhost:8080");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    });
    res.end(data);
  });
}

function proxy(req, res) {
  const request = http.request({
    hostname: apiTarget.hostname,
    port: Number(apiTarget.port || 80),
    path: req.url,
    method: req.method,
    headers: req.headers,
  }, proxyRes => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  });
  request.on("error", () => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "API server unavailable" }));
  });
  req.pipe(request);
}

const server = http.createServer((req, res) => {
  const url = req.url || "/";
  if (url.startsWith("/api/") || url === "/api") {
    proxy(req, res);
    return;
  }
  const cleanPath = decodeURIComponent(url.split("?")[0]).replace(/^\/+/, "");
  const requestedPath = path.normalize(path.join(distDir, cleanPath));
  if (requestedPath.startsWith(distDir) && fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) {
    sendFile(res, requestedPath);
    return;
  }
  sendFile(res, path.join(distDir, "index.html"));
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Quillhive web listening on port ${port}`);
});
