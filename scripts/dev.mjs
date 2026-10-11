// Local preview: builds (including drafts), serves dist/ and live-reloads on changes.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.env.OUT_DIR ? path.resolve(process.env.OUT_DIR) : path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 4000;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.xml': 'application/xml', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.pdf': 'application/pdf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8',
};

const reloadScript = `<script>new EventSource('/__reload').onmessage = () => location.reload();</script>`;
const clients = new Set();

// Served at "/" locally, so the 404 page uses an empty base path.
// Re-import the builder each time so edits to scripts/build.mjs apply without a restart.
const rebuild = async () => {
  try {
    const { build } = await import(`./build.mjs?t=${Date.now()}`);
    await build({ basePath: '', includeDrafts: true, extraHead: reloadScript });
  } catch (e) {
    console.error(e);
  }
};
await rebuild();

let timer;
for (const target of [process.env.CONTENT_DIR ?? 'content', 'theme', 'scripts/build.mjs', 'site.config.json']) {
  fs.watch(path.resolve(ROOT, target), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      await rebuild();
      for (const res of clients) res.write('data: reload\n\n');
    }, 150);
  });
}

// A rebuild can delete a file between the existence check and the read; end the response instead of crashing.
const send = (res, status, type, file) => {
  res.writeHead(status, { 'Content-Type': type });
  fs.createReadStream(file).on('error', () => res.end()).pipe(res);
};

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (urlPath === '/__reload') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    let file = path.join(DIST, urlPath);
    if (!file.startsWith(DIST)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!urlPath.endsWith('/')) return res.writeHead(301, { Location: `${urlPath}/` }).end();
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file)) {
      return send(res, 404, MIME['.html'], path.join(DIST, '404.html'));
    }
    send(res, 200, MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream', file);
  })
  .listen(PORT, () => console.log(`\n  Preview: http://localhost:${PORT}  (drafts shown, live reload on)\n`));
