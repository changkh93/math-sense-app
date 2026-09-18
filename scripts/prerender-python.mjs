// All public entry pages are rendered from the same React content served to visitors.
import { createServer } from 'vite';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { publicSeo } from '../src/utils/publicSeo.js';
const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null, ws: false }, appType: 'custom' });
try {
  const template = await readFile('dist/index.html', 'utf8');
  // SPA fallback must not inherit the homepage's content or canonical.
  await writeFile('dist/spa.html', template);
  const assets = await readdir('dist/assets');
  for (const [path, module, css, props] of [
    ['/', '/src/components/PublicHomeIntro.jsx', null, {}],
    ['/trial', '/src/pages/PublicApplication.jsx', 'PublicApplication', { fixedType: 'trial' }],
    ['/python', '/src/pages/PythonEducation.jsx', 'PythonEducation', {}],
  ]) {
    const { default: Component } = await server.ssrLoadModule(module);
    const body = renderToString(createElement(MemoryRouter, { initialEntries: [path] }, createElement(Component, props)));
    const { title, description } = publicSeo[path];
    const url = `https://msense.me${path}`;
    const head = `<meta name="description" content="${description}"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:url" content="${url}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:image" content="https://msense.me/python-showcase/game-poster.webp">`;
    const styles = css ? assets.filter(f => f.startsWith(`${css}-`) && f.endsWith('.css')) : [];
    if (!body.includes('<h1>') || (css && !styles.length)) throw new Error(`Missing content/style: ${path}`);
    const html = template.replace('<title>Meta Sense</title>', `<title>${title}</title>${head}${styles.map(f => `<link rel="stylesheet" href="/assets/${f}">`).join('')}`).replace('<div id="root"></div>', `<div id="root">${body}</div><noscript>학습 도구와 신청 양식은 JavaScript가 필요합니다. <a href="https://pf.kakao.com/_xfxkGDn">메타센스 카카오 상담</a></noscript>`);
    const dir = path === '/' ? 'dist' : `dist${path}`;
    await mkdir(dir, { recursive: true });
    await writeFile(`${dir}/index.html`, html);
    console.log(`Prerendered ${path}: content, title, description, canonical, OG`);
  }
} finally { await server.close(); }
