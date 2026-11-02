// Recopie la coquille commune (head, nav, loader, scripts) d'index.html vers les autres pages.
// Chaque page garde son bloc <!-- page-meta --> (titre, description, canonique, Open Graph) et son <main>.
// Usage : node tools/sync-shell.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const pages = ['projets.html', 'apropos.html', 'contact.html'];
const META = /  <!-- page-meta -->[\s\S]*?<!-- \/page-meta -->/;

const split = (html) => {
  const start = html.indexOf('  <main');
  const end = html.indexOf('</main>') + '</main>'.length;
  return { before: html.slice(0, start), main: html.slice(start, end), after: html.slice(end) };
};

const shell = split(readFileSync(root + 'index.html', 'utf8'));

for (const page of pages) {
  const html = readFileSync(root + page, 'utf8');
  const meta = html.match(META)[0];
  const { main } = split(html);
  writeFileSync(root + page, shell.before.replace(META, () => meta) + main + shell.after);
  console.log('ok', page);
}
