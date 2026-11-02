// Mini serveur statique pour le dev local : node serve.mjs [port]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.argv[2]) || 5173;
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  if (!path || path.endsWith('/') || path.endsWith('\\')) path += 'index.html';
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { 'Content-Type': (types[extname(path)] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(body);
  } catch {
    res.writeHead(404).end('404');
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
