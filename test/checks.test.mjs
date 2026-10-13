import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runAttackChecks } from '../src/attack-check.mjs';
import {
  ATTACKS_41_NOTE, ENGINE, MAX_REQUESTS, checksReport, createReadOnlyFetch, runChecks, summarizeChecks, toAttempts,
} from '../src/checks.mjs';

// 가짜 응답만 씁니다. 실제 배포 주소나 원본 API를 호출하지 않습니다.
const config = {
  step: 12, publicAppUrl: 'https://example-app.vercel.app', sampleMarker: 'SAMPLE_NOTE_1',
  originalApiUrl: 'https://example-origin.supabase.co/rest/v1/notes', anonKey: 'anon_public_key_value',
};

function fakeFetch(overrides = {}) {
  const calls = [];
  const impl = async (url, init = {}) => {
    const target = new URL(url);
    calls.push({ method: init.method, path: `${target.host}${target.pathname}${target.search}`, init });
    const key = `${target.pathname}`;
    if (overrides[key]) return new Response(overrides[key].body ?? '{}', { status: overrides[key].status });
    if (target.hostname.includes('origin')) return new Response('{}', { status: 401 });
    if (key === '/data.json') return new Response('{"notes":[]}', { status: 200 });
    if (key === '/manifest.webmanifest') return new Response('{"name":"앱","display":"standalone"}', { status: 200 });
    if (key === '/') return new Response("crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])", { status: 200 });
    if (key === '/api/notes/export') return new Response('{}', { status: 404 });
    return new Response('{}', { status: 401 });
  };
  return { impl, calls };
}

test('읽기 전용 요청기는 GET·HEAD 외 요청과 상한을 넘는 요청을 보내기 전에 거부한다', async () => {
  const { impl, calls } = fakeFetch();
  const guarded = createReadOnlyFetch(impl, 2);
  await assert.rejects(guarded('https://example-app.vercel.app/api/restore', { method: 'POST' }), /READ_ONLY_VIOLATION POST/u);
  await assert.rejects(guarded('https://example-app.vercel.app/api/notes', { method: 'put' }), /READ_ONLY_VIOLATION PUT/u);
  assert.equal(calls.length, 0);
  await guarded('https://example-app.vercel.app/a');
  await guarded('https://example-app.vercel.app/b', { method: 'HEAD' });
  await assert.rejects(guarded('https://example-app.vercel.app/c'), /REQUEST_LIMIT 2/u);
  assert.equal(calls.length, 2);
  assert.equal(guarded.count(), 2);
  assert.equal(MAX_REQUESTS, 24);
});

test('12단계 점검은 GET·HEAD만, 점검 하나에 요청 1건, 24건 이하로 보낸다', async () => {
  const { impl, calls } = fakeFetch();
  const records = await runChecks(config, { fetchImpl: impl });
  assert.ok(records.length >= 1 && records.length <= 20);
  assert.ok(calls.length <= MAX_REQUESTS);
  assert.ok(calls.every(c => ['GET', 'HEAD'].includes(c.method)), calls.map(c => c.method).join(','));
  assert.equal(calls.length, records.filter(r => r.source === 'http' && r.result !== 'not_run').length);
  assert.equal(new Set(records.map(r => r.attackId)).size, records.length);
  assert.ok(calls.every(c => c.init.redirect === 'error'));
});

test('쓰기가 필요한 복구 점검은 보내지 않고 not_run이며, 나머지는 기대대로다', async () => {
  const { impl, calls } = fakeFetch();
  const records = await runChecks(config, { fetchImpl: impl });
  const restore = records.find(r => r.attackId === 'restore_unauthenticated_blocked');
  assert.deepEqual([restore.result, restore.observed], ['not_run', 'not_run']);
  assert.equal(calls.some(c => c.path.includes('/api/restore')), false);
  for (const r of records.filter(item => item.result !== 'not_run')) {
    assert.ok(['blocked', 'allowed'].includes(r.result), `${r.attackId} ${r.observed}`);
  }
  assert.equal(records.find(r => r.attackId === 'unauthenticated_api_blocked').observed, 'HTTP 401');
  assert.equal(records.find(r => r.attackId === 'unregistered_device_denied').observed, 'deny; device_not_registered');
  assert.equal(records.find(r => r.attackId === 'pwa_manifest_served').result, 'allowed');
});

test('observed에는 설명 문장이 없고 사실 값만 있다', async () => {
  const { impl } = fakeFetch();
  const records = await runChecks(config, { fetchImpl: impl });
  for (const r of records) {
    assert.doesNotMatch(r.observed, /[가-힣]/u, `${r.attackId}: ${r.observed}`);
    assert.match(r.observed, /^(HTTP \d{3}(; .+)?|not_run|allow|deny|step_up|observe|propose_revocation|verified|stopped|B->A|error)/u, r.attackId);
    assert.ok(r.expected.length > 0 && r.expected.length <= 300);
  }
});

test('기대와 다른 응답은 failed로 남고 요약에 한 번만 센다', async () => {
  const { impl } = fakeFetch({ '/api/notes': { status: 200, body: '[]' }, '/api/ops': { status: 404 } });
  const records = await runChecks(config, { fetchImpl: impl });
  // 가짜 응답은 경로 /api/notes 전체(목록, ?id= 단건)에 적용되므로 두 점검이 함께 실패합니다.
  const failed = records.filter(r => r.result === 'failed').map(r => r.attackId).sort();
  assert.deepEqual(failed, ['ops_summary_unauthenticated_blocked', 'unauthenticated_api_blocked', 'unauthenticated_single_note_blocked']);
  const s = summarizeChecks(records);
  assert.equal(s.total, records.length);
  assert.equal(s.blocked + s.allowed + s.failed + s.notRun, s.total);
  assert.equal(s.failed, 3);
  assert.equal(s.notRun, 1);
});

test('판정기·탐지·정책 점검은 학생 코드 실행으로 표시하고 엔진 집행은 not_run이다', async () => {
  const { impl } = fakeFetch();
  const records = await runChecks(config, { fetchImpl: impl });
  const rules = records.filter(r => r.source !== 'http');
  assert.ok(rules.length > 0);
  for (const r of rules) {
    assert.equal(r.engine, ENGINE);
    assert.equal(r.engine, 'ALEPH SDP 엔진');
    assert.equal(r.engineEnforced, 'not_run');
    assert.match(r.sourceLabel, /^학생 /u);
  }
  assert.ok(records.filter(r => r.source === 'http').every(r => r.engineEnforced === undefined));
});

test('제출 묶음(12단계)과 /api/checks의 attempts는 같은 목록에서 나온 같은 값이다', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = fakeFetch().impl;
    const bundle = await runAttackChecks(config);
    assert.ok(bundle.every(item => Object.keys(item).sort().join(',') === 'attackId,expected,observed'));

    const { default: handler } = await import('../api/checks.js');
    let status;
    let body;
    const cwd = process.cwd;
    process.cwd = () => new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1');
    try {
      await handler({ method: 'GET', headers: {} }, {
        setHeader() {},
        status(value) { status = value; return { json(value) { body = value; } }; },
      });
    } finally {
      process.cwd = cwd;
    }
    assert.equal(status, 200);
    assert.equal(body.schema, 'byteback.checks.v1');
    assert.deepEqual(toAttempts(body.attempts), bundle);
    const s = summarizeChecks(body.attempts);
    for (const key of ['total', 'blocked', 'allowed', 'failed', 'notRun']) assert.equal(body[key], s[key], key);
    assert.equal(body.attacks41, ATTACKS_41_NOTE);
    assert.equal(body.engine, 'ALEPH SDP 엔진');
    assert.doesNotMatch(JSON.stringify(body), /anon_public_key_value|sb_secret|Bearer /u);
  } finally {
    globalThis.fetch = original;
  }
});

test('/api/checks는 GET·HEAD 외 요청을 405로 거부하고 점검을 실행하지 않는다', async () => {
  const original = globalThis.fetch;
  let called = 0;
  try {
    globalThis.fetch = async () => { called += 1; return new Response('{}', { status: 200 }); };
    const { default: handler } = await import('../api/checks.js');
    let status;
    await handler({ method: 'POST', headers: {} }, {
      setHeader() {},
      status(value) { status = value; return { json() {} }; },
    });
    assert.equal(status, 405);
    assert.equal(called, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test('보고서 수치는 같은 이름으로 한 번씩만 있다', () => {
  const report = checksReport([
    { attackId: 'a', result: 'blocked' }, { attackId: 'b', result: 'allowed' }, { attackId: 'c', result: 'not_run' },
  ], { checkedAt: 't' });
  assert.deepEqual([report.total, report.blocked, report.allowed, report.failed, report.notRun], [3, 1, 1, 0, 1]);
  const text = JSON.stringify(report);
  // 수치 키(이름 뒤에 콜론)만 셉니다. attempts 안의 result 값 "blocked"는 키가 아닙니다.
  for (const key of ['"total":', '"blocked":', '"allowed":', '"failed":', '"notRun":']) assert.equal(text.split(key).length - 1, 1, key);
});
