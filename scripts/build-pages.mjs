import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = '/Polaroid-Me-Portfolio';
const source = path.resolve('dist');
const output = path.resolve('_site');
await rm(output, { recursive: true, force: true });
await cp(source, output, { recursive: true });

async function rewrite(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await rewrite(file); continue; }
    if (!/\.(?:html|css|js|json|svg)$/.test(entry.name)) continue;
    let text = await readFile(file, 'utf8');
    for (const folder of ['assets', 'public', 'js', 'styles', 'vendor']) {
      text = text.replaceAll(`/${folder}/`, `${base}/${folder}/`);
    }
    for (const page of ['professional-projects.html', 'certification-achievement.html', 'life-journey.html', 'project-pdf-viewer.html']) {
      text = text.replaceAll(`/${page}`, `${base}/${page}`);
    }
    text = text.replaceAll(`.${base}/`, './');
    if (entry.name.endsWith('.js')) {
      text = text.replaceAll('location.pathname', `location.pathname.replace(/^\\/Polaroid-Me-Portfolio(?=\\/)/, '')`);
      text = text.replaceAll("'/?page=boxes'", `'${base}/?page=boxes'`);
      text = text.replaceAll("target: '/'", `target: '${base}/'`);
      text = text.replaceAll("location.assign('/')", `location.assign('${base}/')`);
      if (entry.name === 'global-menu.js') {
        text = text.replace("return '/?page=boxes';", `return '${base}/?page=boxes';`);
        text = text.replace("return path === '/' ? '/' : `${path}.html`;", "return path === '/' ? '/Polaroid-Me-Portfolio/' : `/Polaroid-Me-Portfolio${path}.html`;");
      }
      if (entry.name === 'mobile-history.js') {
        text = text.replace("accessories:'/'", `accessories:'${base}/'`);
        for (const page of ['professional-projects.html', 'certification-achievement.html', 'life-journey.html']) {
          text = text.replace(`path==='${base}/${page}'`, `path==='/${page}'`);
        }
      }
    }
    if (text !== await readFile(file, 'utf8')) await writeFile(file, text);
  }
}
await rewrite(output);
const pdf = path.join(output, 'project-pdf-viewer.html');
let viewer = await readFile(pdf, 'utf8');
viewer = viewer.replace("url.pathname.startsWith('/assets/projects/')", `url.pathname.startsWith('${base}/assets/projects/')`);
await writeFile(pdf, viewer);
await writeFile(path.join(output, '.nojekyll'), '');
console.log(`GitHub Pages output: ${output}`);
