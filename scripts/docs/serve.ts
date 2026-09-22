import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv', '.zip': 'application/zip', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

/** Minimal static file server (the multi-file Allure report cannot be opened via file://). */
export function serveDir(dir: string, port: number): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = path.join(dir, urlPath);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(dir) || !fs.existsSync(file)) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}
