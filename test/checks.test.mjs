import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import handler from '../api/checks.js';
import { runAttackChecks } from '../src/attack-check.mjs';
import { ATTACKS_41_NOTE, CASE_IDS, checksReport, runCase } from '../src/checks.mjs';

// 가짜 응답만 씁니다. 실제 배포 주소나 원본 API를 호출하지 않습니다.
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const APP = 'https://example-app.vercel.app';

function call(query, method = 'GET') {
  return new Promise((resolve, reject) => {
    const out = { headers: {} };
    Promise.resolve(handler({ method, query, headers: {} }, {
      setHeader: (key, value) => { out.headers[key.toLowerCase()] = value; },
      status(code) { out.status = code; return { json(body) { out.body = body; resolve(out); } }; },
    })).catch(reject);
  });
}

// 배포를 흉내 내는 가짜 fetch: /api/checks?case=… 는 진짜 점검 API 처리기로 응답합니다.
function fakeDeployment(overrides = {}) {
  const calls = [];
  const impl = async (url, init = {}) => {
    const u = new URL(String(url));
    calls.push({ url: u, init });
    if (overrides[u.pathname]) return overrides[u.pathname]();
    if (u.pathname === '/api/checks' && u.searchParams.has('case')) {
      const out = await call({ case: u.searchParams.get('case') });
      return new Response(JSON.stringify(out.body), { status: out.status });
    }
    if (u.pathname === '/data.json') return new Response('{"notes":[]}', { status: 200 });
    if (u.pathname === '/') return new Response("crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])", { status: 200 });
    return new Response('{"error":"UNAUTHORIZED"}', { status: 401 });
  };
  return { impl, calls };
}

async function withFetch(impl, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

const byId = attempts => Object.fromEntries(attempts.map(a => [a.attackId, a]));

test('점검 코드는 다른 파일을 불러오지 않는 한 파일이고, 그 파일 하나만 있어도 돈다', async () => {
  const source = await readFile(new URL('../src/attack-check.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bimport\b|\brequire\s*\(/u);
  // 옆에 다른 파일이 없는 곳(data: 주소)에서 불러와도 실행됩니다.
  const isolated = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const attempts = await withFetch(fakeDeployment().impl, () => isolated.runAttackChecks(APP));
  assert.ok(attempts.length > 0);
});

test('runner처럼 배포 주소 문자열로 불러도 설정 객체로 불러도 같고, 잘못된 주소는 거부한다', async () => {
  const { impl } = fakeDeployment();
  const fromUrl = await withFetch(impl, () => runAttackChecks(APP));
  const fromConfig = await withFetch(impl, () => runAttackChecks({ step: 12, publicAppUrl: APP }));
  assert.deepEqual(fromConfig, fromUrl);
  for (const bad of [undefined, 'http://example-app.vercel.app', 'https://x.example/', `${APP}/path`, { publicAppUrl: 'nope' }]) {
    await assert.rejects(runAttackChecks(bad), /publicAppUrl/u);
  }
});

test('배포 주소 한 곳에 GET만, 점검 하나에 요청 한 번, 24건 이하로 보내고 runner가 관측할 표시를 붙인다', async () => {
  const { impl, calls } = fakeDeployment();
  const attempts = await withFetch(impl, () => runAttackChecks(APP));
  assert.ok(attempts.length >= 1 && attempts.length <= 20);
  assert.ok(calls.length <= 24);
  const sent = attempts.filter(a => a.result !== 'not_run');
  assert.equal(calls.length, sent.length);
  for (const c of calls) {
    assert.equal(c.url.origin, APP);
    assert.equal(c.init.method, 'GET');
    assert.equal(c.init.redirect, 'manual');
  }
  assert.deepEqual(calls.map(c => c.init.alephEvidence.caseId).sort(), sent.map(a => a.attackId).sort());
  assert.equal(calls.some(c => c.url.pathname.startsWith('/api/restore')), false);
  assert.equal(new Set(attempts.map(a => a.attackId)).size, attempts.length);
  for (const a of attempts) assert.deepEqual(Object.keys(a).sort(), ['attackId', 'expected', 'observed', 'result', 'stage']);
});

test('observed에는 대조 가능한 값만 있고, 보내지 않은 점검은 observed·result가 not_run이다', async () => {
  const attempts = await withFetch(fakeDeployment().impl, () => runAttackChecks(APP));
  for (const a of attempts) {
    assert.match(a.observed, /^(not_run|HTTP \d{3}(; jsonReady=(true|false))?(; jsonArrayLength=\d+)?)$/u, a.attackId);
    assert.equal(a.result === 'not_run', a.observed === 'not_run', a.attackId);
    assert.ok(['blocked', 'breached', 'not_run'].includes(a.result), a.attackId);
    assert.ok(Number.isInteger(a.stage) && a.stage >= 1 && a.stage <= 12, a.attackId);
    assert.ok(a.expected.length > 0 && a.expected.length <= 300, a.attackId);
  }
  assert.deepEqual(attempts.filter(a => a.result === 'not_run').map(a => a.attackId).sort(),
    ['approved_device_note_list', 'original_api_direct_access_blocked', 'restore_unauthenticated_blocked']);
  const sent = attempts.filter(a => a.result !== 'not_run');
  assert.ok(sent.every(a => a.result === 'blocked'), sent.filter(a => a.result !== 'blocked').map(a => `${a.attackId} ${a.observed}`).join(', '));
  assert.equal(byId(attempts).unauthenticated_api_blocked.observed, 'HTTP 401');
  assert.equal(byId(attempts).unregistered_device_denied.observed, 'HTTP 200; jsonReady=true');
});

test('응답이 기대와 다르면 breached, 응답을 받지 못하면 not_run이다', async () => {
  const leaked = await withFetch(fakeDeployment({
    '/api/notes': () => new Response('[{"title":"가상"}]', { status: 200 }),
    '/data.json': () => new Response('{"sampleMarker":"SAMPLE_NOTE_1","notes":[{"title":"가상"}]}', { status: 200 }),
    '/api/ops': () => { throw new TypeError('network'); },
  }).impl, () => runAttackChecks(APP));
  const got = byId(leaked);
  assert.deepEqual([got.unauthenticated_api_blocked.result, got.unauthenticated_api_blocked.observed], ['breached', 'HTTP 200; jsonArrayLength=1']);
  assert.deepEqual([got.data_json_notes_cleared.result, got.data_json_notes_cleared.observed], ['breached', 'HTTP 200']);
  assert.deepEqual([got.ops_summary_unauthenticated_blocked.result, got.ops_summary_unauthenticated_blocked.observed], ['not_run', 'not_run']);

  const notReady = await withFetch(fakeDeployment({
    '/api/checks': () => new Response('{"ready":false}', { status: 200 }),
  }).impl, () => runAttackChecks(APP));
  const viaCase = notReady.filter(a => CASE_IDS.includes(a.attackId));
  assert.equal(viaCase.length, CASE_IDS.length);
  assert.ok(viaCase.every(a => a.result === 'breached' && a.observed === 'HTTP 200; jsonReady=false'));
});

test('/api/checks?case=… 는 고정된 가상 입력만 실행하고, 지금 학생 코드에서는 모두 ready=true다', async () => {
  for (const id of CASE_IDS) {
    const out = await call({ case: id });
    assert.equal(out.status, 200, id);
    assert.equal(out.body.ready, true, `${id} ${out.body.observed}`);
    assert.equal(out.body.engine, 'ALEPH SDP 엔진');
    assert.equal(out.body.engineEnforced, 'not_run');
  }
  assert.equal((await call({ case: 'unauthenticated_api_blocked' })).status, 400);
  assert.equal((await call({ case: 'constructor' })).status, 400);
  assert.equal((await call({ case: ['unregistered_device_denied'] })).status, 400);
  assert.equal(await runCase('__proto__'), null);
});

test('점검 코드가 묻는 case 이름은 서버의 가상 입력 표와 같다', async () => {
  const { impl, calls } = fakeDeployment();
  await withFetch(impl, () => runAttackChecks(APP));
  const asked = calls.filter(c => c.url.pathname === '/api/checks').map(c => c.url.searchParams.get('case')).sort();
  assert.deepEqual(asked, [...CASE_IDS].sort());
});

test('/api/checks는 runAttackChecks 결과를 그대로 돌려주고 수치는 그 결과를 한 번씩 센다', async () => {
  const config = JSON.parse(await readFile(new URL('../aleph.config.json', import.meta.url), 'utf8'));
  const { impl } = fakeDeployment();
  const [record, direct] = await withFetch(impl, async () => [await call({}), await runAttackChecks(config.publicAppUrl)]);
  assert.equal(record.status, 200);
  assert.equal(record.headers['cache-control'], 'no-store');
  assert.equal(record.body.schema, 'byteback.checks.v1');
  assert.deepEqual(record.body.attempts, direct);
  const count = result => direct.filter(a => a.result === result).length;
  assert.deepEqual([record.body.total, record.body.blocked, record.body.failed, record.body.notRun],
    [direct.length, count('blocked'), count('breached'), count('not_run')]);
  assert.equal(record.body.total, record.body.blocked + record.body.failed + record.body.notRun);
  assert.equal(record.body.attacks41, ATTACKS_41_NOTE);
  assert.doesNotMatch(JSON.stringify(record.body), /sb_publishable_|sb_secret|Bearer |"(title|body|content)"\s*:/u);
});

test('/api/checks는 GET·HEAD 외 요청을 405로 거부하고 점검을 실행하지 않는다', async () => {
  let called = 0;
  const out = await withFetch(async () => { called += 1; return new Response('{}', { status: 200 }); }, () => call({}, 'POST'));
  assert.equal(out.status, 405);
  assert.equal(called, 0);
});

test('보고서 수치는 같은 이름으로 한 번씩만 있다', () => {
  const report = checksReport([
    { attackId: 'a', result: 'blocked' }, { attackId: 'b', result: 'breached' }, { attackId: 'c', result: 'not_run' },
  ], { checkedAt: 't' });
  assert.deepEqual([report.total, report.blocked, report.failed, report.notRun], [3, 1, 1, 1]);
  const text = JSON.stringify(report);
  // 수치 키(이름 뒤에 콜론)만 셉니다. attempts 안의 result 값 "blocked"는 키가 아닙니다.
  for (const key of ['"total":', '"blocked":', '"failed":', '"notRun":']) assert.equal(text.split(key).length - 1, 1, key);
});
