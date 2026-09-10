import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync } from 'node:fs';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let resolveRead;
let reads = 0;
globalThis.__catalogTestRead = () => {
  reads++;
  return new Promise(resolve => { resolveRead = resolve; });
};
const output = new URL(`.course-catalog-ui-${process.pid}.mjs`, import.meta.url);
const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
const root = createRoot(document.getElementById('root'));
try {
  const bundled = await build({
    stdin: { contents: `export {useClusters} from './src/hooks/useContent.js'; export {default as ClusterSelector} from './src/components/Space/ClusterSelector.jsx';`, resolveDir: process.cwd() },
    bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic',
    external: ['react', 'react-dom', '@tanstack/react-query'],
    plugins: [{ name: 'catalog-service-fixture', setup(b) {
      b.onResolve({ filter: /(?:^firebase\/|\/firebase$)/ }, args => ({ path: args.path, namespace: 'service' }));
      b.onLoad({ filter: /.*/, namespace: 'service' }, () => ({ contents: `
        export const db = {}, functions = {}, storage = {};
        export const getDocs = () => globalThis.__catalogTestRead();
        export const collection = (...x) => x;
        export const query = (...x) => x;
        export const orderBy = (...x) => x;
        export const where = () => {}, doc = () => {}, getDoc = () => {},
          setDoc = () => {}, deleteDoc = () => {}, writeBatch = () => {},
          serverTimestamp = () => {}, ref = () => {}, deleteObject = () => {}, httpsCallable = () => {};
      ` }));
    } }],
  });
  writeFileSync(output, bundled.outputFiles[0].text);
  const { useClusters, ClusterSelector } = await import(output.href);
  let enabled = false;
  function Harness() {
    const q = useClusters({ enabled });
    return React.createElement(ClusterSelector, {
      clusters: q.data || [], loading: q.isLoading, error: q.isError,
      errorCode: q.error?.code, retrying: q.isFetching, onRetry: () => q.refetch(),
    });
  }
  const render = () => root.render(React.createElement(QueryClientProvider, { client }, React.createElement(Harness)));
  await act(async () => { render(); });
  assert.equal(reads, 0, 'auth-disabled catalog must not read');
  enabled = true;
  await act(async () => { render(); });
  assert.equal(reads, 1);
  assert.match(document.body.textContent, /동기화하는 중/);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 10100)); });
  assert.match(document.body.textContent, /연결이 지연되고 있습니다/);
  const retry = [...document.querySelectorAll('button')].find(b => b.textContent === '다시 시도');
  assert.ok(retry);
  await act(async () => { retry.click(); await new Promise(resolve => setTimeout(resolve, 20)); });
  assert.equal(reads, 1, 'retry must keep original Firestore read');
  assert.match(document.body.textContent, /동기화하는 중/);
  assert.equal(document.body.contains(retry), false, 'initial retry returns to loading instead of leaving a clickable error button');
  await act(async () => {
    resolveRead({ docs: ['중등수학', '고전 읽기', '파이썬', '초등수학'].map((name, i) => ({ id: `course-${i}`, data: () => ({ name, order: i }) })) });
    await new Promise(resolve => setTimeout(resolve, 30));
  });
  assert.equal(document.querySelector('[role="alert"]'), null);
  for (const name of ['중등수학', '고전 읽기', '파이썬', '초등수학']) assert.ok(document.body.textContent.includes(name));
  console.log('Actual useClusters + ClusterSelector: auth gate, 10s delay, retry deduplication, loading state and late four-course recovery passed.');
} finally {
  await act(async () => root.unmount());
  client.clear();
  dom.window.close();
  try { unlinkSync(output); } catch { /* Build may have failed before file creation. */ }
  delete globalThis.__catalogTestRead;
}
