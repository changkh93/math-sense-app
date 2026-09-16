const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('./studioErrorCoach.cjs');
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const context = { auth: { uid: 'synthetic-student', token: { firebase: { sign_in_provider: 'password' } } } };
const payload = { version: 1, mode: 'file', errorType: 'NameError', error: "NameError: name 'score' is not defined", line: 1, snippet: '1: print(score)' };
const advice = { explanation: '이 이름에 아직 값이 없을 수 있어요.', hint: '변수를 만든 줄을 찾아보세요.', question: '이름의 철자가 같은가요?', check: '한 곳을 고치고 다시 실행해 보세요.' };
function fixture(options = {}) {
  const docs = new Map([
    ['users/synthetic-student', options.user || { clusterAccess: { python: 'active' } }],
    ['studioCoachControl/config', { enabled: true, childDataReady: true, projectId: 'proj_msense_test', ...options.config }]
  ]);
  let chain = Promise.resolve(), calls = [], stamp = Date.UTC(2026, 8, 16);
  const snap = path => ({ data: () => docs.get(path) });
  const db = { doc: path => ({ path, get: async () => snap(path) }), runTransaction: work => {
    // Serial transactions model atomic reservation; commit only on success.
    const result = chain.then(async () => { const writes = []; const tx = { get: async ref => snap(ref.path), set: (ref, data, opts) => writes.push([ref.path, opts?.merge ? { ...docs.get(ref.path), ...data } : data]) }; await work(tx); for (const [key, value] of writes) docs.set(key, value); });
    chain = result.catch(() => {}); return result;
  } };
  const fetchImpl = async (url, request) => { calls.push({ url, request }); if (options.fail) throw new Error('secret upstream body'); return { ok: true, json: async () => options.response || { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(advice) }] }] } }; };
  const deps = { db, HttpsError, fetchImpl, getKey: () => 'synthetic-not-a-real-key', now: () => stamp };
  return { handler: createHandler(deps), coldHandler: () => createHandler(deps), docs, calls, advance: ms => { stamp += ms; } };
}
test('no unauthenticated, anonymous, guest, or inactive upstream calls', async () => {
  for (const auth of [null, { uid: 'synthetic-student', token: { firebase: { sign_in_provider: 'anonymous' } } }]) {
    const f = fixture(); await assert.rejects(f.handler(payload, { auth }), { code: 'unauthenticated' }); assert.equal(f.calls.length, 0);
  }
  for (const user of [{}, { isGuest: true, role: 'admin' }, { clusterAccess: { python: 'expired' } }]) {
    const f = fixture({ user }); await assert.rejects(f.handler(payload, context), { code: 'permission-denied' }); assert.equal(f.calls.length, 0);
  }
});
test('new project and child-data readiness are required even with a key', async () => {
  for (const config of [{ enabled: false }, { childDataReady: false }, { projectId: '' }]) {
    const f = fixture({ config }); await assert.rejects(f.handler(payload, context), { code: 'failed-precondition' }); assert.equal(f.calls.length, 0);
  }
});
test('fixed model, bounded Responses request, no identity and ephemeral cache', async () => {
  const f = fixture(), result = await f.handler(payload, context);
  assert.deepEqual(result.advice, advice);
  const { url, request } = f.calls[0], body = JSON.parse(request.body);
  assert.equal(url, 'https://api.openai.com/v1/responses'); assert.equal(body.model, 'gpt-5.6-luna'); assert.equal(body.store, false);
  assert.equal(body.max_output_tokens, 700); assert.equal(body.reasoning.effort, 'none'); assert.equal(body.text.format.strict, true);
  assert.equal(request.headers['OpenAI-Project'], 'proj_msense_test'); assert.ok(request.signal);
  assert.ok(!request.body.includes(context.auth.uid)); assert.ok(body.input.includes("'score'")); assert.equal(body.tools, undefined);
  assert.equal((await f.handler(payload, context)).cached, true); assert.equal(f.calls.length, 1);
  const ledger = JSON.stringify([...f.docs.entries()].filter(([key]) => key.startsWith('studioCoachUsage')));
  for (const secret of ['print(score)', 'NameError', 'synthetic-student', advice.hint]) assert.ok(!ledger.includes(secret));
  await assert.rejects(f.coldHandler()(payload, context), { code: 'already-exists' }); assert.equal(f.calls.length, 1);
});
test('parallel duplicate requests across instances reserve only one call', async () => {
  const f = fixture(); const results = await Promise.allSettled([f.handler(payload, context), f.coldHandler()(payload, context)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(f.calls.length, 1);
});
test('per-user/day/month caps and cooldown block before upstream', async () => {
  for (const config of [{ perUserDay: 1 }, { perDay: 1 }, { perMonth: 1 }, {}]) {
    const f = fixture({ config }); await f.handler(payload, context); if (Object.keys(config).length) f.advance(31000);
    await assert.rejects(f.handler({ ...payload, snippet: '1: print(other)' }, context), { code: 'resource-exhausted' }); assert.equal(f.calls.length, 1);
  }
});
test('reject extra controls, oversize input and malformed modes without cost', async () => {
  for (const data of [{ ...payload, model: 'other' }, { ...payload, snippet: 'x'.repeat(3201) }, { ...payload, line: -1 }, { ...payload, mode: 'chat' }]) {
    const f = fixture(); await assert.rejects(f.handler(data, context), { code: 'invalid-argument' }); assert.equal(f.calls.length, 0);
  }
});
test('upstream failures count; no fallback, retry, or error-body disclosure', async () => {
  for (const options of [{ fail: true }, { response: { status: 'incomplete' } }, { response: { status: 'completed', output: [] } }]) {
    const f = fixture(options); await assert.rejects(f.handler(payload, context), error => error.code === 'unavailable' && !error.message.includes('secret'));
    await assert.rejects(f.handler(payload, context), { code: 'already-exists' }); assert.equal(f.calls.length, 1);
  }
});
test('minimization preserves error line and removes multiline/private values', async () => {
  const { minimizeCode, parseError, makeCoachPayload, validateCoachPayload, localGuide } = await import('./studioErrorCoachPolicy.mjs');
  const source = '# STUDENT NAME\nname="Ada Example"\nsecret="""hello\nprivate@example.com\nvery secret\n"""\nprint(missing)';
  const error = parseError('Traceback\n  File "/tmp/studio/main.py", line 7, in <module>\nNameError: name \'missing\' is not defined');
  const request = makeCoachPayload(source, error);
  assert.equal(request.line, 7); assert.ok(request.snippet.includes('7: print(missing)'));
  for (const text of ['STUDENT', 'Ada', 'private@', 'very secret', 'hello']) assert.ok(!JSON.stringify(request).includes(text));
  assert.equal(minimizeCode(source).split('\n').length, source.split('\n').length); assert.deepEqual(validateCoachPayload(request), request);
  assert.match(localGuide(error)[2], /노트북/); assert.equal(parseError('연결 실패').eligible, false);
  assert.equal(makeCoachPayload('', error), null);
});

test('ambiguous earlier-cell frames never send the current cell as the failing function', async () => {
  const { parseError, makeCoachPayload } = await import('./studioErrorCoachPolicy.mjs');
  const error = parseError('  File "/tmp/studio/notebook.ipynb", line 1, in <module>\n  File "/tmp/studio/notebook.ipynb", line 2, in helper\nNameError: missing');
  assert.equal(makeCoachPayload('helper()', error, 'notebook'), null);
});

test('server adds its own syntax diagnosis to AI input without expanding the private excerpt', async () => {
  const { makeCoachPayload, parseError } = await import('./studioErrorCoachPolicy.mjs');
  const error = parseError('  File "/tmp/studio/notebook.ipynb", line 1\nSyntaxError: invalid syntax');
  const input = makeCoachPayload('from ColabTurtlePlus.Turtle import # private@example.com', error, 'notebook');
  const f = fixture(); await f.handler(input, context);
  const body = JSON.parse(f.calls[0].request.body), supplied = JSON.parse(body.input);
  assert.equal(supplied.localDiagnosis.ruleId, 'import-missing-target');
  assert.match(supplied.localDiagnosis.nextStep, /import 뒤에 \*/);
  assert.ok(!body.input.includes('private@example.com'));
  assert.match(body.instructions, /do not replace it with a generic checklist/);
  assert.equal(f.calls.length, 1);
});
