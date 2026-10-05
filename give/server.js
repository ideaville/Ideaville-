import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const srcDir = path.join(__dirname, 'src');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

function resolveInside(root, urlPath) {
  const rel = decodeURIComponent(urlPath).replace(/^\/+/, '');
  if (!rel || rel.includes('\0')) return null;
  const file = path.resolve(root, rel);
  const base = path.resolve(root);
  if (file !== base && !file.startsWith(base + path.sep)) return null;
  return file;
}

function sendFile(res, file) {
  const ext = path.extname(file);
  const type = TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
}

export function createApp() {
  return http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const pathname = url.pathname;

    if (pathname.startsWith('/src/')) {
      const file = resolveInside(srcDir, pathname.slice('/src/'.length));
      if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
        sendFile(res, file);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const requested = pathname === '/' ? '/index.html' : pathname;
    const file = resolveInside(publicDir, requested);
    if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
      sendFile(res, file);
      return;
    }

    const fallback = path.join(publicDir, 'index.html');
    sendFile(res, fallback);
  });
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  const port = Number(process.env.PORT) || 4173;
  createApp().listen(port, '0.0.0.0', () => {
    console.log(`Give prototype at http://127.0.0.1:${port}`);
  });
}
