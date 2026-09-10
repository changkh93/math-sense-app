import assert from 'node:assert/strict';
import test from 'node:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { readRecoverableContentQuery } from '../src/utils/recoverableContentQuery.js';

const queryKey = ['clusters'];
const courses = [{ docId: 'math', name: '수학' }, { docId: 'python', name: '파이썬' }];
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(t) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  t.after(() => client.clear());
  let resolve, reject, reads = 0;
  const source = new Promise((yes, no) => { resolve = yes; reject = no; });
  const options = {
    queryKey, staleTime: 1800000,
    queryFn: () => readRecoverableContentQuery({
      queryClient: client, queryKey, timeoutMs: 15,
      read: () => { reads++; return source; },
    }),
  };
  return { client, options, resolve, reject, reads: () => reads };
}

test('original timeout wrapper loses a late successful response (incident regression)', async () => {
  let resolve;
  const source = new Promise(yes => { resolve = yes; });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  try {
    const result = client.fetchQuery({ queryKey, queryFn: () => new Promise((yes, no) => {
      const timer = setTimeout(() => no(new Error('timeout')), 15);
      source.then(yes, no).finally(() => clearTimeout(timer));
    }) });
    await assert.rejects(result, /timeout/);
    resolve(courses);
    await tick();
    assert.equal(client.getQueryState(queryKey).status, 'error');
    assert.equal(client.getQueryData(queryKey), undefined);
  } finally { client.clear(); }
});

test('late response automatically recovers a mounted observer after UI deadline', async t => {
  const f = fixture(t);
  const observer = new QueryObserver(f.client, f.options);
  const states = [];
  const unsubscribe = observer.subscribe(result => states.push(result.status));
  t.after(unsubscribe);
  await assert.rejects(f.client.fetchQuery(f.options), { code: 'content/deadline-exceeded' });
  assert.equal(observer.getCurrentResult().isError, true);
  f.resolve(courses);
  await tick();
  assert.deepEqual(observer.getCurrentResult().data, courses);
  assert.equal(observer.getCurrentResult().isError, false);
  assert.ok(states.includes('error') && states.includes('success'));
  assert.equal(f.reads(), 1);
});

test('manual retry after deadline reuses pending SDK read', async t => {
  const f = fixture(t);
  await assert.rejects(f.client.fetchQuery(f.options));
  const retry = f.client.fetchQuery(f.options);
  await tick();
  assert.equal(f.reads(), 1);
  f.resolve(courses);
  assert.deepEqual(await retry, courses);
  assert.equal(f.client.getQueryState(queryKey).status, 'success');
});

test('healthy cache avoids another read and no late callback is required', async t => {
  const f = fixture(t);
  const result = f.client.fetchQuery(f.options);
  f.resolve(courses);
  assert.deepEqual(await result, courses);
  assert.deepEqual(await f.client.fetchQuery(f.options), courses);
  assert.equal(f.reads(), 1);
});

test('real SDK failure is preserved and subsequent retry starts a new read', async t => {
  const f = fixture(t);
  const result = f.client.fetchQuery(f.options);
  f.reject(Object.assign(new Error('denied'), { code: 'permission-denied' }));
  await assert.rejects(result, { code: 'permission-denied' });
  const recovered = await f.client.fetchQuery({ ...f.options, queryFn: () => readRecoverableContentQuery({
    queryClient: f.client, queryKey, read: async () => courses,
  }) });
  assert.deepEqual(recovered, courses);
});

test('late failure is handled without unhandled rejection', async t => {
  const f = fixture(t);
  await assert.rejects(f.client.fetchQuery(f.options));
  f.reject(new Error('network unavailable'));
  await tick();
  assert.equal(f.client.getQueryState(queryKey).status, 'error');
});

test('removed query is not resurrected by a delayed response', async t => {
  const f = fixture(t);
  await assert.rejects(f.client.fetchQuery(f.options));
  f.client.removeQueries({ queryKey });
  f.resolve(courses);
  await tick();
  assert.equal(f.client.getQueryState(queryKey), undefined);
});

test('late response cannot overwrite a newer catalog edit', async t => {
  const f = fixture(t);
  await assert.rejects(f.client.fetchQuery(f.options));
  const newer = [{ docId: 'new', name: '새 코스' }];
  f.client.setQueryData(queryKey, newer);
  f.resolve(courses);
  await tick();
  assert.deepEqual(f.client.getQueryData(queryKey), newer);
});
