import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const dom = new JSDOM('<div id="root"></div>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const result = await build({
  entryPoints: ['src/components/ProfileShipAvatar.jsx'], bundle: true, write: false,
  format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' },
  plugins: [{ name: 'fixtures', setup(b) {
    b.onResolve({ filter: /^react(\/.*)?$/ }, args => ({ path: import.meta.resolve(args.path), external: true }));
    b.onResolve({ filter: /\/ModularShip$/ }, () => ({ path: 'ship', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export default function Ship(){return "SHIP"}' }));
  } }],
});
const { default: Avatar } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const root = createRoot(document.getElementById('root'));
const render = src => act(async () => root.render(React.createElement(Avatar, { src, displayName: '테스트' })));
await render('');
assert.equal(document.querySelector('img'), null);
assert.match(document.body.textContent, /SHIP/);
await render('https://example.invalid/photo.jpg');
assert.equal(document.querySelector('.is-ready'), null, 'Keep ship until image loads');
const img = document.querySelector('img');
Object.defineProperty(img, 'naturalWidth', { value: 720 });
await act(async () => img.dispatchEvent(new dom.window.Event('load')));
assert.ok(document.querySelector('.is-ready'), 'Crossfade only loaded photos');
await act(async () => img.dispatchEvent(new dom.window.Event('error')));
assert.equal(document.querySelector('.is-ready'), null);
assert.equal(document.querySelector('img'), null);
assert.match(document.body.textContent, /SHIP/, 'Failure retains ship');
await render('https://example.invalid/replacement.jpg');
assert.equal(document.querySelector('.is-ready'), null, 'Changed URL resets readiness');
assert.ok(document.querySelector('img'));
await render('javascript:alert(1)');
assert.equal(document.querySelector('img'), null);
await act(async () => root.unmount());
console.log('PASS profile/ship avatar: loading, success, failure, replacement and unsafe URL');
