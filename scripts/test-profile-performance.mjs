import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { profileQueryOptions, withProfileTimeout } from '../src/utils/profileQueryOptions.js';

// Exercise the actual page and its query/visibility hooks. Only service I/O,
// navigation and unrelated navigation/ship visuals are replaced with fixtures.
const require = createRequire(import.meta.url);
Error.stackTraceLimit = 0;
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const observers = new Set();
globalThis.IntersectionObserver = class {
  constructor(callback) { this.callback = callback; observers.add(this); }
  observe(node) { this.node = node; }
  disconnect() { observers.delete(this); }
};
const reads = [];
let bookshelfResolve;
const makeDoc = (id, data) => ({ id, exists: () => true, data: () => data });
const runtime = globalThis.__profileRuntime = {
  uid: 'owner',
  auth: { user: { uid: 'owner' }, userData: { publicDisplayName: '테스트 탐험가', crystals: 123 }, loading: false },
  async getDoc(path) { reads.push(path); return makeDoc(path.split('/').at(-1), { publicDisplayName: '다른 탐험가' }); },
  async getDocs(q) { reads.push(q); return { docs: [] }; },
  callable() { reads.push('bookshelf'); return new Promise(resolve => { bookshelfResolve = resolve; }); },
};
const result = await build({
  entryPoints: ['src/pages/Community/PublicProfile.jsx'], bundle: true, write: false,
  format: 'esm', platform: 'node', loader: { '.css': 'empty' },
  plugins: [{ name: 'profile-fixtures', setup(b) {
    b.onResolve({ filter: /\.css$/ }, args => ({ path: args.path, namespace: 'empty' }));
    b.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({ contents: '' }));
    b.onResolve({ filter: /^(react|react-dom|framer-motion|lucide-react|@tanstack\/react-query)(\/.*)?$/ }, args => ({ path: import.meta.resolve(args.path), external: true }));
    b.onResolve({ filter: /\.(png|jpg|svg)$/ }, args => ({ path: args.path, namespace: 'image' }));
    b.onLoad({ filter: /.*/, namespace: 'image' }, () => ({ contents: 'export default "https://example.invalid/fixture.png"' }));
    b.onResolve({ filter: /firebase$|firebase\/firestore$|firebase\/functions$|useAuth$|react-router-dom$|SpaceNavbar$|StarField$|ModularShip$|formatUtils$|CertificatePreview$|CometBadge$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => {
      if (path === 'firebase/firestore') return { contents: `
        export const collection = (_, ...parts) => parts.join('/');
        export const doc = collection;
        export const where = (...args) => ({where:args});
        export const orderBy = (...args) => ({orderBy:args});
        export const limit = count => ({limit:count});
        export const query = (path,...constraints) => ({path,constraints});
        export const documentId = () => '__name__';
        export const startAfter = (...args) => ({startAfter:args});
        export const Timestamp = {fromMillis: value => value};
        export const getDoc = path => globalThis.__profileRuntime.getDoc(path);
        export const getDocs = q => globalThis.__profileRuntime.getDocs(q);
        export const onSnapshot = () => { throw Error('Profile must not subscribe to awards'); };
      ` };
      if (path === 'firebase/functions') return { contents: 'export const httpsCallable = () => (...args) => globalThis.__profileRuntime.callable(...args);' };
      if (path.endsWith('/firebase')) return { contents: 'export const db = {}; export const functions = {};' };
      if (path.endsWith('useAuth')) return { contents: 'export const useAuth = () => globalThis.__profileRuntime.auth;' };
      if (path === 'react-router-dom') return { contents: 'export const useParams = () => ({uid:globalThis.__profileRuntime.uid}); export const useNavigate = () => () => {};' };
      if (path.endsWith('formatUtils')) return { contents: 'export const parseInlineFormatting = value => value;' };
      return { contents: 'export default function Stub() { return null; }' };
    });
    b.onResolve({ filter: /^[^./]/ }, args => ({ path: pathToFileURL(require.resolve(args.path)).href, external: true }));
  } }],
});
const { default: PublicProfile } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const client = new QueryClient();
let root;
const mount = async () => {
  root = createRoot(document.getElementById('root'));
  await render();
};
const render = async () => act(async () => {
  root.render(React.createElement(QueryClientProvider, { client }, React.createElement(React.StrictMode, null, React.createElement(PublicProfile))));
});
const settle = async () => act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
const text = () => document.body.textContent;
const show = async predicate => act(async () => {
  for (const observer of [...observers]) if (predicate(observer.node)) observer.callback([{ isIntersecting: true }]);
});

await mount();
assert.match(text(), /테스트 탐험가/);
assert.equal(reads.length, 0, 'Own identity uses existing auth document; offscreen sections cost no reads, even in StrictMode');
assert.doesNotMatch(text(), /총 기록 시간/, 'Do not render inaccurate empty history statistics');

await show(node => node.className === 'public-profile-deferred');
await settle();
assert.match(text(), /테스트 탐험가/);
assert.equal(reads.filter(item => item === 'bookshelf').length, 1, 'One pending bookshelf request does not hold the header');
assert.ok(reads.some(item => item.path === 'monthlyEvaluationAwards'));
assert.ok(reads.some(item => item.path === 'scholarshipAwards'));
await act(async () => bookshelfResolve({ data: { books: [], hasMore: false } }));
await settle();

await show(node => node.className.includes('public-profile-answers'));
await settle();
const answerQuery = reads.find(item => item.path === 'answers');
assert.ok(answerQuery.constraints.some(item => item.limit === 5));
assert.ok(answerQuery.constraints.some(item => item.orderBy?.join() === 'createdAt,desc'));

const beforeHistory = reads.length;
await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === '학습 통계와 개념 지도 보기').click());
await settle();
assert.match(text(), /총 기록 시간/);
assert.equal(reads.length - beforeHistory, 3, 'Full history and refinement are fetched only on deliberate expansion');

const beforeRevisit = reads.length;
await act(async () => root.unmount());
await mount();
await show(() => true);
await settle();
assert.equal(reads.length, beforeRevisit, 'Warm revisit reuses all fresh section caches');

runtime.uid = 'private';
runtime.getDoc = async path => { reads.push(path); return makeDoc('private', { publicDisplayName: '비공개 사용자', publicProfileEnabled: false }); };
await render(); await settle();
assert.match(text(), /공개 설정이 꺼져/);
assert.doesNotMatch(text(), /테스트 탐험가/);
const privateReads = reads.length;
await show(() => true); await settle();
assert.equal(reads.length, privateReads, 'Private profile never requests supplements');

runtime.uid = 'foreign';
runtime.getDoc = async path => { reads.push(path); return makeDoc('foreign', { publicDisplayName: '다른 탐험가' }); };
runtime.callable = async () => { reads.push('failed-bookshelf'); throw Error('offline'); };
await render(); await settle();
assert.match(text(), /다른 탐험가/);
await show(() => true); await settle();
assert.match(text(), /책장을 불러오지 못했습니다/);
assert.match(text(), /다른 탐험가/);
assert.equal(reads.filter(item => item === 'failed-bookshelf').length, 1, 'No automatic retry/fallback storm for another user');
assert.ok(!reads.some(item => typeof item === 'string' && item === 'users/foreign/history'));
assert.doesNotMatch(text(), /총 기록 시간/);

runtime.callable = async () => ({ data: { books: [{ id: 'recovered', title: '회복된 책장', status: 'reading' }] } });
await act(async () => [...document.querySelectorAll('.public-profile-section-status')]
  .find(node => node.textContent.includes('책장을 불러오지 못했습니다')).querySelector('button').click());
await settle();
assert.match(text(), /회복된 책장/, 'Only the failed section retries and recovers');

let resolveOldIdentity;
runtime.uid = 'slow-old';
runtime.getDoc = path => { reads.push(path); return new Promise(resolve => { resolveOldIdentity = resolve; }); };
await render(); await settle();
assert.doesNotMatch(text(), /다른 탐험가/, 'Route transition clears previous identity immediately');
runtime.uid = 'new-target';
runtime.getDoc = async path => { reads.push(path); return makeDoc('new-target', { publicDisplayName: '새 프로필' }); };
await render(); await settle();
await act(async () => resolveOldIdentity(makeDoc('slow-old', { publicDisplayName: '늦은 이전 프로필' })));
await settle();
assert.match(text(), /새 프로필/);
assert.doesNotMatch(text(), /늦은 이전 프로필/, 'Late response cannot overwrite current target');

runtime.auth = { user: { uid: 'new-viewer' }, userData: {}, loading: false };
const beforeAccount = reads.length;
await render(); await settle();
assert.ok(reads.length > beforeAccount, 'New viewer cannot reuse previous viewer cache');

await act(async () => root.unmount());
client.clear();
const cache = new QueryClient();
let loads = 0;
const options = profileQueryOptions('viewer', 'target', 'identity', async () => ++loads);
await Promise.all([cache.fetchQuery(options), cache.fetchQuery(options)]);
await cache.fetchQuery(options);
assert.equal(loads, 1, 'Concurrent reads and fresh cache hits are deduplicated');
cache.setQueryData(options.queryKey, 10, { updatedAt: Date.now() - 61_000 });
await cache.fetchQuery(options);
assert.equal(loads, 2, 'Expired identity cache refreshes');
await assert.rejects(withProfileTimeout(new Promise(() => {}), 5), /연결이 지연/);
cache.clear();
dom.window.close();
console.log('PASS profile: immediate header, offscreen gating, cached revisit, bounded ordered answers, deferred owner history, private/account isolation, independent failure, request deduplication and timeout.');
