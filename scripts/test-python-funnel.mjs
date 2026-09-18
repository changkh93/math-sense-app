import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pythonAttribution, trackPython } from '../src/utils/pythonFunnel.js';
assert.equal(pythonAttribution('?utm_source=naver&utm_medium=organic&utm_campaign=python_trial&ref=private'), 'utm_source=naver&utm_medium=organic&utm_campaign=python_trial');
assert.equal(pythonAttribution('?utm_source=01012345678&utm_campaign=parent@example.com'), '');
globalThis.window = { dataLayer: [] };
trackPython('python_success', '010-1234-5678');
trackPython('private_name', 'name');
assert.deepEqual(window.dataLayer, [{event:'python_success',funnel:'python',label:''}]);
// Unknown labels, including contacts, are discarded.
delete globalThis.window;
const html = await readFile('dist/python/index.html','utf8');
assert.match(html, /<h1>/); assert.match(html, /초등 3학년/); assert.match(html, /월 15만 원/);
assert.match(html, /rel="canonical" href="https:\/\/msense.me\/python"/);
assert.match(html, /property="og:title"/); assert.match(html, /name="description"/);
assert.ok(!html.includes('<div id="root"></div>'));
console.log('PASS attribution filtering and pre-JavaScript Python HTML');
