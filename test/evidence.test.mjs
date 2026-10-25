import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectEvidence, renderMarkdown, summarize } from '../src/evidence.mjs';

// 가짜 fetch만 씁니다. 실제 배포 주소나 원본 API를 호출하지 않습니다.
const config = {
  publicAppUrl: 'https://example-app.vercel.app', sampleMarker: 'SAMPLE_NOTE_1',
  originalApiUrl: 'https://example-origin.supabase.co/rest/v1/notes', anonKey: 'anon_public_key_value',
};

function fakeFetch(overrides = {}) {
  const calls = [];
  const impl = async (url, init = {}) => {
    const target = new URL(url);
    const key = `${init.method || 'GET'} ${target.pathname}${target.search}`;
    calls.push({ key, init });
    const hit = overrides[key] ?? overrides[`${init.method || 'GET'} ${target.pathname}`];
    const base = (() => {
      if (target.hostname.includes('origin')) return { status: 401, body: '{}' };
      if (target.pathname === '/aleph.json') return { status: 200, body: '{"commit":"abcdef1234567890"}' };
      if (target.pathname === '/manifest.webmanifest') return { status: 200, body: '{"name":"앱"}' };
      if (target.pathname === '/data.json') return { status: 200, body: '{"notes":[]}' };
      if (target.pathname === '/aleph.config.json') return { status: 200, body: '{"step":11}' };
      if (target.pathname === '/' || target.pathname === '/offline.html') return { status: 200, body: '<html>화면</html>' };
      if (target.pathname === '/api/restore' && init.method === 'HEAD') return { status: 405, body: '' };
      if (target.pathname === '/api/notes/export') return { status: 404, body: '{}' };
      return { status: 401, body: '{}' };
    })();
    const { status, body, throws, noId } = { ...base, ...hit };
    if (throws) throw Object.assign(new Error('boom'), { name: 'TypeError' });
    return new Response(body, { status, headers: noId ? {} : { 'x-vercel-id': `icn1::test-${calls.length}` } });
  };
  return { impl, calls };
}

const fixedNow = () => new Date('2026-10-13T10:00:00.000Z');
const run = async (overrides) => {
  const { impl, calls } = fakeFetch(overrides);
  return { evidence: await collectEvidence(config, { fetchImpl: impl, now: fixedNow }), calls };
};

test('정상 요청 허용과 금지 요청 거부가 모두 요청 ID·시각과 함께 남는다', async () => {
  const { evidence } = await run();
  const http = evidence.rows.filter(r => r.source === 'live_http');
  assert.ok(http.some(r => r.kind === 'normal' && r.result === 'pass'));
  assert.ok(http.some(r => r.kind === 'forbidden' && r.result === 'pass'));
  for (const r of http) {
    assert.equal(r.result, 'pass', `${r.id} ${r.actual}`);
    assert.match(r.requestId, /^icn1::test-\d+$/u);
    assert.equal(r.checkedAt, '2026-10-13T10:00:00.000Z');
  }
  assert.equal(evidence.deployedCommit, 'abcdef1234567890');
  assert.deepEqual(evidence.rows.map(r => r.stage), [...evidence.rows.map(r => r.stage)].sort((a, b) => a - b));
});

test('기대와 다른 응답은 fail로 남고 통과로 세지 않는다', async () => {
  const { evidence } = await run({
    'GET /api/notes': { status: 200, body: '[{"id":"x"}]' },
    'GET /data.json': { status: 200, body: '{"notes":[{"id":1}],"marker":"SAMPLE_NOTE_1"}' },
  });
  const byId = Object.fromEntries(evidence.rows.map(r => [r.id, r]));
  assert.equal(byId.F03.result, 'fail');
  assert.equal(byId.F03.actual, 'HTTP 200');
  assert.equal(byId.F01.result, 'fail');
  // 가짜 응답이 경로 /api/notes 요청 전부(F03 토큰 없음, F04 위조 토큰, F06 id 지정)에 적용되므로 F01과 합쳐 4건입니다.
  // (L12 정책 사본 검증은 함수 호출 행이며, 사본 파일 줄바꿈에 따라 달라지므로 배포 요청 행만 비교합니다.)
  assert.deepEqual(evidence.rows.filter(r => r.source === 'live_http' && r.result === 'fail').map(r => r.id).sort(),
    ['F01', 'F03', 'F04', 'F06']);
  assert.equal(evidence.summary.forbiddenFailed, 4);
  assert.equal(evidence.summary.forbiddenRejected + evidence.summary.forbiddenFailed + evidence.summary.forbiddenNotRun,
    evidence.rows.filter(r => r.source !== 'local_function' && r.kind === 'forbidden').length);
});

test('요청이 실패하면 fail이며 요청 ID는 비어 있고 다른 행은 계속 확인한다', async () => {
  const { evidence } = await run({ 'GET /api/device': { throws: true } });
  const row = evidence.rows.find(r => r.id === 'F14');
  assert.equal(row.result, 'fail');
  assert.equal(row.requestId, null);
  assert.match(row.actual, /요청 실패/u);
  assert.equal(evidence.rows.find(r => r.id === 'F15').result, 'pass');
});

test('계정 토큰·기기 서명이 필요한 요청은 보내지 않고 미실행으로 남는다', async () => {
  const { evidence, calls } = await run();
  const notRun = evidence.rows.filter(r => r.result === 'not_run');
  assert.ok(notRun.filter(r => r.kind === 'normal').length >= 4);
  assert.ok(notRun.filter(r => r.kind === 'forbidden').length >= 4);
  for (const r of notRun) {
    assert.equal(r.requestId, null);
    assert.equal(r.checkedAt, null);
    assert.match(r.actual, /^미실행/u);
  }
  // 어떤 요청에도 로그인 토큰(위조 토큰 제외)이나 서명 헤더를 붙이지 않는다.
  for (const { init } of calls) {
    const headers = init.headers ?? {};
    assert.equal('x-aleph-signature' in headers, false);
    if (headers.authorization) assert.equal(headers.authorization, `Bearer ${['eyJhbGciOiJFUzI1NiJ9', 'eyJzdWIiOiJmb3JnZWQifQ', 'Zm9yZ2Vk'].join('.')}`);
  }
  assert.equal(evidence.summary.normalNotRun, notRun.filter(r => r.kind === 'normal').length);
});

test('쓰기 요청은 토큰 없이 401 확인용으로만 보낸다', async () => {
  const { calls } = await run();
  const writes = calls.filter(c => ['POST', 'PUT', 'DELETE', 'PATCH'].includes(c.init.method));
  assert.deepEqual(writes.map(c => c.key).sort(), [
    'POST /api/device', 'POST /api/notes', 'POST /api/restore', 'PUT /api/notices?id=notice-01',
  ]);
  assert.ok(writes.every(c => !c.init.headers?.authorization));
});

test('표와 기록 어디에도 토큰·공개 키·응답 본문이 없다', async () => {
  const { evidence } = await run();
  const text = JSON.stringify(evidence) + renderMarkdown(evidence);
  assert.equal(text.includes('anon_public_key_value'), false);
  assert.equal(text.includes('eyJhbGciOiJFUzI1NiJ9'), false);
  assert.doesNotMatch(text, /"(?:body|text)"\s*:/u);
});

test('41종 공격은 한 줄 문장으로만 적고 막음·통과 수를 세지 않는다', async () => {
  const { evidence } = await run();
  const markdown = renderMarkdown(evidence);
  const section = markdown.split('## 41종 공격')[1];
  assert.ok(section, '41종 구역이 있어야 함');
  assert.equal(section.trim(), '41종 공격 전체는 심판이 보내며 이 저장소에서는 실행하지 않았습니다. 표에 없는 공격을 통과로 적지 않습니다.');
  assert.doesNotMatch(markdown, /41종[^\n]*(막음|통과)\s*\d/u);
  assert.doesNotMatch(markdown, /ATTACKS\.json/u);
});

test('요약 수치는 행에서 센 값과 같다', async () => {
  const { evidence } = await run({ 'GET /api/notes': { status: 200, body: '[]' } });
  const again = summarize(evidence.rows);
  assert.deepEqual(evidence.summary, again);
  assert.equal(again.rows, evidence.rows.length);
  const table = renderMarkdown(evidence).split('\n').filter(line => /^\| [NFLAB]\d\d \|/u.test(line));
  assert.equal(table.length, evidence.rows.length);
});

// ---- 시험 계정 구간: 실제 서버와 같은 서명 검증 함수(src/device-auth.mjs)를 쓰는 가짜 서버 ----
import { deviceIdFor, freshTimestamp, publicKeyFromJwk, signedPayload, verifySignature } from '../src/device-auth.mjs';

// 가짜 값입니다. 실제 시험 계정 값은 이 저장소 어디에도 두지 않습니다.
const ACCOUNT_A = { email: ['a-tester', 'example.invalid'].join('@'), password: 'fake-pass-A-for-test-only' };
const ACCOUNT_B = { email: ['b-tester', 'example.invalid'].join('@'), password: 'fake-pass-B-for-test-only' };

function fakeBackend({ leakToOthers = false } = {}) {
  const base = fakeFetch().impl;
  const users = new Map([[ACCOUNT_A.email, { password: ACCOUNT_A.password, token: 'tok-A', owner: 'A' }],
    [ACCOUNT_B.email, { password: ACCOUNT_B.password, token: 'tok-B', owner: 'B' }]]);
  const devices = new Map();     // owner -> Map(deviceId -> 공개키)
  const notes = new Map();       // noteId -> { owner, title }
  const log = [];
  const stats = { stored: 0, foreignWrites: 0 };
  let counter = 0;
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'x-vercel-id': `icn1::acct-${++counter}` } });
  const impl = async (url, init = {}) => {
    const target = new URL(url);
    if (!target.pathname.startsWith('/api/') || target.hostname.includes('origin')) return base(url, init);
    const method = init.method || 'GET';
    const path = `${target.pathname}${target.search}`;
    const body = typeof init.body === 'string' ? init.body : '';
    const headers = Object.fromEntries(Object.entries(init.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
    log.push({ method, path });

    if (target.pathname === '/api/auth') {
      const sent = JSON.parse(body);
      const user = users.get(sent.email);
      return user && user.password === sent.password ? reply(200, { access_token: user.token, user: {} }) : reply(401, { error: 'LOGIN_FAILED' });
    }
    const caller = [...users.values()].find(user => headers.authorization === `Bearer ${user.token}`);
    if (!caller) return reply(401, { error: 'UNAUTHORIZED' });
    const owner = caller.owner;
    if (!devices.has(owner)) devices.set(owner, new Map());

    if (target.pathname === '/api/device' && method === 'POST') {
      const sent = JSON.parse(body);
      const parsed = publicKeyFromJwk(sent.publicKey);
      if (!parsed || !freshTimestamp(sent.timestamp)) return reply(400, { error: 'BAD' });
      const id = deviceIdFor(parsed.jwk);
      if (!verifySignature(parsed.key, ['aleph-device-approve-v1', id, String(sent.timestamp)].join('\n'), sent.proof)) return reply(401, { error: 'DEVICE_PROOF_INVALID' });
      devices.get(owner).set(id, parsed);
      return reply(200, { deviceId: id, status: 'approved' });
    }
    const id = headers['x-aleph-device-id'];
    if (devices.get(owner).size) {
      if (!id) return reply(401, { error: 'DEVICE_SIGNATURE_REQUIRED' });
      const parsed = devices.get(owner).get(id);
      const ts = headers['x-aleph-timestamp'];
      if (!parsed || !freshTimestamp(ts)
          || !verifySignature(parsed.key, signedPayload({ method, path, body, timestamp: ts, deviceId: id }), headers['x-aleph-signature'])) {
        return reply(401, { error: 'DEVICE_SIGNATURE_INVALID' });
      }
    }
    const noteId = target.searchParams.get('id');
    const note = noteId ? notes.get(noteId) : null;
    const foreign = note && note.owner !== owner;
    if (target.pathname === '/api/device') return reply(200, { deviceId: id, status: 'approved' });
    if (target.pathname === '/api/notes' && method === 'GET' && noteId) {
      if (!note) return reply(404, {});
      return foreign && !leakToOthers ? reply(403, { error: 'FORBIDDEN_ZONE_ACCESS' }) : reply(200, { id: noteId, title: note.title });
    }
    if (target.pathname === '/api/notes' && method === 'GET') {
      return reply(200, [...notes].filter(([, value]) => leakToOthers || value.owner === owner).map(([key, value]) => ({ id: key, title: value.title })));
    }
    if (target.pathname === '/api/notes' && method === 'POST') {
      const created = `00000000-0000-4000-8000-0000000000${String(notes.size + 10)}`;
      notes.set(created, { owner, title: JSON.parse(body).title });
      stats.stored += 1;
      return reply(201, { id: created });
    }
    if (target.pathname === '/api/notes' && method === 'PUT') {
      if (!note) return reply(404, {});
      if (foreign) { stats.foreignWrites += leakToOthers ? 1 : 0; return leakToOthers ? reply(200, {}) : reply(403, {}); }
      return reply(200, {});
    }
    if (target.pathname === '/api/notes' && method === 'DELETE') {
      if (!note) return reply(404, {});
      if (foreign) { stats.foreignWrites += leakToOthers ? 1 : 0; return leakToOthers ? reply(200, { success: true }) : reply(403, {}); }
      notes.delete(noteId);
      return reply(200, { success: true });
    }
    if (target.pathname === '/api/restore' && method === 'POST') {
      const sent = JSON.parse(body);
      const existing = notes.get(sent.id);
      return existing && (existing.owner === owner || leakToOthers) ? reply(200, { dryRun: true }) : reply(404, { error: 'BACKUP_NOT_FOUND' });
    }
    if (target.pathname === '/api/notices') return method === 'GET' ? reply(200, {}) : reply(403, { error: 'FORBIDDEN_ZONE_ACCESS' });
    return reply(404, {});
  };
  return { impl, notes, devices, log, stats };
}

const runWithAccounts = async ({ a = ACCOUNT_A, b = ACCOUNT_B, ...options } = {}) => {
  const backend = fakeBackend(options);
  const evidence = await collectEvidence(config, { fetchImpl: backend.impl, now: fixedNow, account: a, accountB: b });
  return { evidence, backend, byId: Object.fromEntries(evidence.rows.map(r => [r.id, r])) };
};

const A_ROWS = ['A00', 'A09', 'A10', 'A07', 'A08', 'A11', 'A12', 'A13', 'A01', 'A14', 'A05', 'A03', 'A04', 'A15'];
const B_ROWS = ['B00', 'B10', 'A18', 'A02', 'A16', 'A17', 'A06'];

test('시험 계정 A·B: 정상 요청 허용과 금지 요청 거부가 모두 요청 ID·시각과 함께 남는다', async () => {
  const { evidence, backend, byId } = await runWithAccounts();
  for (const id of [...A_ROWS, ...B_ROWS]) {
    assert.equal(byId[id].result, 'pass', `${id} ${byId[id].actual}`);
    assert.equal(byId[id].source, 'live_http');
    assert.match(byId[id].requestId, /^icn1::acct-\d+$/u);
    assert.equal(byId[id].checkedAt, '2026-10-13T10:00:00.000Z');
  }
  const sent = [...A_ROWS, ...B_ROWS].map(id => byId[id]);
  assert.ok(sent.some(r => r.kind === 'normal') && sent.some(r => r.kind === 'forbidden'));
  assert.equal(evidence.rows.filter(r => r.result === 'not_run' && r.id.startsWith('A')).length, 0);
  // POST /api/notes는 3번 보냅니다(F05 로그인 없음, A12 서명 뒤 본문 변경, A14 정상 추가). 서버가 저장한 것은 A14 한 건뿐입니다.
  assert.equal(backend.log.filter(c => c.method === 'POST' && c.path === '/api/notes').length, 3);
  assert.equal(backend.stats.stored, 1);
  // B의 수정·삭제 시도는 반영되지 않았고(A15가 200), 시험 메모는 정리되어 남지 않습니다.
  assert.equal(backend.stats.foreignWrites, 0);
  assert.equal(backend.notes.size, 0);
  assert.equal(backend.devices.get('A').size, 1);
  assert.equal(backend.devices.get('B').size, 1);
});

test('시험 계정 A만 있으면 B가 필요한 요청은 보내지 않고 미실행으로 남는다', async () => {
  const { byId, backend } = await runWithAccounts({ b: null });
  for (const id of A_ROWS) assert.equal(byId[id].result, 'pass', id);
  for (const id of B_ROWS) {
    assert.equal(byId[id].result, 'not_run', id);
    assert.equal(byId[id].requestId, null);
    assert.match(byId[id].actual, /B 시험 계정이 없어/u);
  }
  assert.equal(backend.devices.has('B'), false);
});

test('서버가 A의 메모를 B에게 내주면 A02·A16·A17·A18·A06이 fail로 남는다', async () => {
  const { byId } = await runWithAccounts({ leakToOthers: true });
  for (const id of ['A18', 'A02', 'A16', 'A17', 'A06']) assert.equal(byId[id].result, 'fail', `${id} ${byId[id].actual}`);
  // 정상 요청은 그대로 통과합니다.
  assert.equal(byId.A01.result, 'pass');
});

test('시험 계정 구간: 이메일·비밀번호·토큰·서명은 표·기록 어디에도 남지 않는다', async () => {
  const { evidence } = await runWithAccounts();
  const text = JSON.stringify(evidence) + renderMarkdown(evidence);
  for (const secret of [ACCOUNT_A.password, ACCOUNT_B.password, ACCOUNT_A.email, ACCOUNT_B.email, 'tok-A', 'tok-B', 'Bearer ', 'x-aleph-signature', '증거 확인용']) {
    assert.equal(text.includes(secret), false, `${secret} 노출`);
  }
});

test('시험 계정 구간: A 로그인에 실패하면 나머지는 보내지 않고 미실행으로 남는다', async () => {
  const { byId, backend } = await runWithAccounts({ a: { ...ACCOUNT_A, password: 'wrong' } });
  assert.equal(byId.A00.result, 'fail');
  assert.equal(byId.A09.result, 'pass');
  for (const id of ['A10', 'A07', 'A08', 'A01', 'A14', 'A05', 'A03', 'A04', 'A15', ...B_ROWS]) {
    assert.equal(byId[id].result, 'not_run', id);
    assert.match(byId[id].actual, /로그인에 실패/u);
  }
  assert.equal(backend.devices.size, 0);
  assert.equal(backend.notes.size, 0);
});

test('서버가 다른 기기를 확인했다고 응답하면 A07이 fail로 남는다', async () => {
  const backend = fakeBackend();
  const tampering = async (url, init = {}) => {
    const response = await backend.impl(url, init);
    if (new URL(url).pathname === '/api/device' && (init.method || 'GET') === 'GET' && init.headers?.['x-aleph-signature']) {
      return new Response(JSON.stringify({ status: 'approved', deviceId: 'ffffffffffffffff' }), { status: 200, headers: { 'x-vercel-id': 'icn1::tamper' } });
    }
    return response;
  };
  const evidence = await collectEvidence(config, { fetchImpl: tampering, now: fixedNow, account: ACCOUNT_A, accountB: ACCOUNT_B });
  assert.equal(evidence.rows.find(r => r.id === 'A07').result, 'fail');
});

