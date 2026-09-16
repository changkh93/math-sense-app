const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('./studioErrorCoach.cjs');
class HttpsError extends Error { constructor(code, message, details) { super(message); this.code = code; this.details = details; } }
const context = { auth: { uid: 'synthetic-student', token: { firebase: { sign_in_provider: 'password' } } } };
const legacyPayload = { version: 1, mode: 'file', errorType: 'NameError', error: "NameError: name 'score' is not defined", line: 1, snippet: '1: print(score)' };
const payload = { version: 2, finding: 'none', mode: 'file', errorType: 'NameError', reason: 'undefined-name', line: 1, start: 1, rows: [[['v', 1]]], name: ['v', 1] };
const advice = { explanation: '이 이름에 아직 값이 없을 수 있어요.', hint: '변수를 만든 줄을 찾아보세요.', question: '이름의 철자가 같은가요?', check: '한 곳을 고치고 다시 실행해 보세요.' };
function fixture(options = {}) {
  const docs = new Map([
    ['users/synthetic-student', options.user || { clusterAccess: { python: 'active' } }],
    ['studioCoachControl/config', { enabled: true, structureDataReady: true, projectId: 'proj_msense_test', ...options.config }]
  ]);
  let chain = Promise.resolve(), calls = [], stamp = Date.UTC(2026, 8, 16);
  const snap = path => ({ data: () => docs.get(path) });
  const db = { doc: path => ({ path, get: async () => snap(path) }), runTransaction: work => {
    // Serial transactions model atomic reservation; commit only on success.
    const result = chain.then(async () => { const writes = []; const tx = { get: async ref => snap(ref.path), set: (ref, data, opts) => writes.push([ref.path, opts?.merge ? { ...docs.get(ref.path), ...data } : data]) }; await work(tx); for (const [key, value] of writes) docs.set(key, value); });
    chain = result.catch(() => {}); return result;
  } };
  const fetchImpl = async (url, request) => { calls.push({ url, request }); if (options.fail) throw new Error('secret upstream body'); return { ok: true, json: async () => options.response || { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(advice) }] }] } }; };
  const deps = { db, HttpsError, fetchImpl, getKey: () => 'synthetic-not-a-real-key', now: () => stamp, recordAdvice: options.recordAdvice };
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
test('new project and structural-data readiness are required even with a key', async () => {
  for (const [config, reason] of [[{ enabled: false }, 'coach-disabled'], [{ structureDataReady: false }, 'structure-not-ready'], [{ projectId: '' }, 'connection-not-ready']]) {
    const f = fixture({ config }); await assert.rejects(f.handler(payload, context), { code: 'failed-precondition', details: { reason } }); assert.equal(f.calls.length, 0);
  }
});
test('fixed model, bounded Responses request, no identity and ephemeral cache', async () => {
  const f = fixture(), result = await f.handler(payload, context);
  assert.deepEqual(result.advice, advice);
  const { url, request } = f.calls[0], body = JSON.parse(request.body);
  assert.equal(url, 'https://api.openai.com/v1/responses'); assert.equal(body.model, 'gpt-5.6-luna'); assert.equal(body.store, false);
  assert.equal(body.max_output_tokens, 700); assert.equal(body.reasoning.effort, 'none'); assert.equal(body.text.format.strict, true);
  assert.equal(request.headers['OpenAI-Project'], 'proj_msense_test'); assert.ok(request.signal);
  assert.ok(!request.body.includes(context.auth.uid)); assert.ok(body.input.includes("variable_1")); assert.ok(!body.input.includes("score")); assert.equal(body.tools, undefined);
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
    await assert.rejects(f.handler({ ...payload, name: ['v', 2] }, context), { code: 'resource-exhausted' }); assert.equal(f.calls.length, 1);
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
test('legacy snippets are rejected even with previous childDataReady enabled', async () => {
  const f = fixture({ config: { childDataReady: true } });
  await assert.rejects(f.handler(legacyPayload, context), { code: 'invalid-argument' });
  assert.equal(f.calls.length, 0);
});
test('server sends only reconstructed code; private markers never reach OpenAI or usage ledger', async () => {
  const { makeCoachPayload, parseError } = await import('./studioErrorCoachPolicy.mjs');
  const input = makeCoachPayload('from ColabTurtlePlus.Turtle import *\n학생이름 = "김철수@example.com"\n거북이 = Turtle\n거북이.forward(100)', parseError('  File "/tmp/studio/개인파일.py", line 4\nTypeError: Turtle.forward() missing 1 required positional argument: \'distance\''));
  const f = fixture(); await f.handler(input, context);
  const body = JSON.parse(f.calls[0].request.body), supplied = JSON.parse(body.input);
  assert.match(supplied.snippet, /variable_2 = Turtle/);
  assert.match(supplied.snippet, /variable_2.forward\(number_1\)/);
  for (const marker of ['학생이름', '김철수', 'example.com', '거북이', '개인파일', '100', 'distance']) assert.ok(!body.input.includes(marker), marker);
  assert.match(body.instructions, /missing constructor parentheses/);
  assert.equal(f.calls.length, 1);
});

test('optional learning capture receives only canonical tokens and cannot discard valid paid advice', async () => {
  const seen=[];
  const f=fixture({recordAdvice:async value=>{seen.push(value);throw new Error('storage unavailable')}});
  const result=await f.handler({...payload,learningConsent:true},context);
  assert.deepEqual(result.advice,advice);assert.equal(seen.length,1);assert.equal(seen[0].consent,true);
  assert.deepEqual(seen[0].payload,payload);assert.ok(!JSON.stringify(seen).includes('synthetic-student'));
  await f.handler({...payload,learningConsent:true},context);assert.equal(seen.length,1);assert.equal(f.calls.length,1);
  const invalid=fixture();await assert.rejects(invalid.handler({...payload,learningConsent:'yes'},context),{code:'invalid-argument'});assert.equal(invalid.calls.length,0);
});
