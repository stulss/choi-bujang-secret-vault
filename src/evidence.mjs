import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtureRequests } from '../scripts/fixture-7.mjs';
import { ATTACKS_41_NOTE } from './checks.mjs';
import { evaluateTestPolicy, loadVerifiedBackup } from '../scripts/policy-restore.mjs';
import { decide } from './decider.mjs';
import { detect } from './detect.mjs';
import { APPROVAL_VERSION, deviceIdFor, signedPayload } from './device-auth.mjs';

// 1~11단계 정상·금지 요청 실측 표를 만드는 수집기입니다 (npm run evidence).
// 행 하나 = 요청 하나: 기대 결과, 실제 결과, 요청 ID, 확인 시각. 결과는 pass | fail | not_run 셋뿐입니다.
//   live_http      배포 주소에 실제로 보낸 요청과 그 응답 (요청 ID는 응답 헤더 x-vercel-id, 원본 API는 sb-request-id)
//   local_function 판정기·탐지기·정책 함수를 이 PC에서 직접 부른 결과 (요청이 아님, 요청 ID는 이번 실행에서 만든 UUID)
//   not_run        보내지 않은 요청. 요청 ID와 확인 시각을 비워 두며 통과로 세지 않습니다.
// 응답 본문과 토큰은 판정에만 쓰고 표에 남기지 않습니다. 계정 토큰·기기 서명이 필요한 요청은 보내지 않습니다.

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ZERO_ID = '00000000-0000-4000-8000-000000000001';
const SECRET_IN_PAGE = /sb_secret_[A-Za-z0-9_-]{8,}|service_role|SUPABASE_SECRET_KEY|BEGIN (?:EC |RSA )?PRIVATE KEY-----/u;
// 위조 토큰 시험값: 비밀값 검사에 걸리지 않도록 세 조각을 실행 시 이어 붙인다(값은 같다).
const FORGED_TOKEN = `Bearer ${['eyJhbGciOiJFUzI1NiJ9', 'eyJzdWIiOiJmb3JnZWQifQ', 'Zm9yZ2Vk'].join('.')}`;
const NEEDS_ACCOUNT = '시험 계정 토큰·기기 서명이 필요해 보내지 않음';

const statusIn = (...codes) => res => ({ ok: codes.includes(res.status), actual: `HTTP ${res.status}` });

async function send(fetchImpl, app, { method = 'GET', path, url, headers = {}, body }) {
  const target = url ? new URL(url) : new URL(path, app);
  const res = await fetchImpl(target, { method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(10000) });
  const text = method === 'HEAD' ? '' : await res.text();
  return { status: res.status, text, requestId: res.headers.get('x-vercel-id') || res.headers.get('sb-request-id') || null };
}

// account: { email, password } 시험 계정 A, accountB: 시험 계정 B(남의 메모 접근 거부 확인용). 값은 환경변수에서만 받고 코드·표·기록에 남기지 않습니다.
// 없으면 로그인·기기 서명이 필요한 요청은 보내지 않고 미실행으로 남깁니다.
export async function collectEvidence(config, { fetchImpl = fetch, now = () => new Date(), rootDir = root, account = null, accountB = null } = {}) {
  const app = new URL(config.publicAppUrl);
  const rows = [];
  const stamp = () => now().toISOString();
  let deployedCommit = null;

  async function live(base, request, judge) {
    try {
      const res = await send(fetchImpl, app, request);
      const verdict = judge(res);
      rows.push({ ...base, source: 'live_http', actual: verdict.actual, result: verdict.ok ? 'pass' : 'fail',
        requestId: res.requestId, checkedAt: stamp() });
    } catch (error) {
      rows.push({ ...base, source: 'live_http', actual: `요청 실패 (${error?.name ?? 'Error'})`, result: 'fail',
        requestId: null, checkedAt: stamp() });
    }
  }
  async function local(base, run) {
    try {
      const { ok, actual, requestId } = await run();
      rows.push({ ...base, source: 'local_function', actual, result: ok ? 'pass' : 'fail',
        requestId: requestId ?? randomUUID(), checkedAt: stamp() });
    } catch (error) {
      rows.push({ ...base, source: 'local_function', actual: `실행 실패 (${error.message})`, result: 'fail',
        requestId: randomUUID(), checkedAt: stamp() });
    }
  }
  const notRun = (base, why) => rows.push({ ...base, source: 'not_run', actual: `미실행 (${why})`, result: 'not_run',
    requestId: null, checkedAt: null });
  const row = (id, stage, kind, request, expected) => ({ id, stage, kind, request, expected });

  // ---- 정상 요청: 공개 화면 ----
  await live(row('N01', 1, 'normal', 'GET /aleph.json', 'HTTP 200, 배포 커밋 확인'), { path: '/aleph.json' }, res => {
    try { deployedCommit = JSON.parse(res.text).commit ?? null; } catch { deployedCommit = null; }
    return { ok: res.status === 200 && Boolean(deployedCommit), actual: `HTTP ${res.status}, 커밋 ${deployedCommit ? deployedCommit.slice(0, 7) : '없음'}` };
  });
  await live(row('N02', 11, 'normal', 'GET /', 'HTTP 200 접속 화면'), { path: '/' }, statusIn(200));
  await live(row('N03', 11, 'normal', 'GET /manifest.webmanifest', 'HTTP 200, 앱 이름 있음'), { path: '/manifest.webmanifest' }, res => {
    let name = null;
    try { name = JSON.parse(res.text).name ?? null; } catch { name = null; }
    return { ok: res.status === 200 && Boolean(name), actual: `HTTP ${res.status}, 이름 ${name ? '있음' : '없음'}` };
  });
  await live(row('N04', 11, 'normal', 'GET /offline.html', 'HTTP 200 오프라인 안내'), { path: '/offline.html' }, statusIn(200));

  // ---- 금지 요청: 로그인 없이 보내므로 서버가 거부해야 하고, 쓰기 요청도 401에서 멈춥니다 ----
  await live(row('F01', 2, 'forbidden', 'GET /data.json (시드 검색)', '메모 0건, 확인 표식 없음'), { path: '/data.json' }, res => {
    let empty = false;
    try { const data = JSON.parse(res.text); empty = Array.isArray(data.notes) && data.notes.length === 0; } catch { empty = false; }
    const marker = Boolean(config.sampleMarker) && res.text.includes(config.sampleMarker);
    return { ok: res.status === 200 && empty && !marker, actual: `HTTP ${res.status}, 메모 ${empty ? '0건' : '있음/형식 다름'}, 표식 ${marker ? '있음' : '없음'}` };
  });
  await live(row('F02', 2, 'forbidden', 'GET / (비밀값·표식·브라우저 저장소 사용 검색)', '비밀값·표식·저장소 저장 코드 없음'), { path: '/' }, res => {
    const secret = SECRET_IN_PAGE.test(res.text);
    const marker = Boolean(config.sampleMarker) && res.text.includes(config.sampleMarker);
    const storage = /localStorage\.|sessionStorage\.setItem|indexedDB\.open/u.test(res.text);
    return { ok: res.status === 200 && !secret && !marker && !storage,
      actual: `HTTP ${res.status}, 비밀값 ${secret ? '있음' : '없음'}, 표식 ${marker ? '있음' : '없음'}, 저장소 저장 ${storage ? '있음' : '없음'}` };
  });
  await live(row('F03', 3, 'forbidden', 'GET /api/notes (토큰 없음)', 'HTTP 401, 메모 없음'), { path: '/api/notes' }, statusIn(401));
  await live(row('F04', 3, 'forbidden', 'GET /api/notes (서명 위조 토큰)', 'HTTP 401'),
    { path: '/api/notes', headers: { authorization: FORGED_TOKEN } }, statusIn(401));
  await live(row('F05', 3, 'forbidden', 'POST /api/notes (토큰 없음)', 'HTTP 401, 저장 없음'),
    { method: 'POST', path: '/api/notes', headers: { 'content-type': 'application/json' }, body: '{"title":"x","body":"x"}' }, statusIn(401));
  await live(row('F06', 4, 'forbidden', 'GET /api/notes?id=<가상 UUID> (토큰 없음)', 'HTTP 401'), { path: `/api/notes?id=${ZERO_ID}` }, statusIn(401));
  await live(row('F07', 5, 'forbidden', 'GET /aleph.config.json (서버 키 검색)', '서버 전용 키·공개 키 없음'), { path: '/aleph.config.json' }, res => {
    const secret = SECRET_IN_PAGE.test(res.text) || /"(?:anonKey|publishableKey)"/u.test(res.text);
    return { ok: res.status === 200 && !secret, actual: `HTTP ${res.status}, 키 ${secret ? '있음' : '없음'}` };
  });
  if (typeof config.originalApiUrl === 'string' && config.originalApiUrl.startsWith('https://') && config.anonKey) {
    await live(row('F08', 5, 'forbidden', 'GET 원본 자료 API (공개 키만, 사용자 토큰 없음)', 'HTTP 401 또는 403'),
      { url: config.originalApiUrl, headers: { apikey: config.anonKey } }, statusIn(401, 403));
  } else {
    notRun(row('F08', 5, 'forbidden', 'GET 원본 자료 API (공개 키만, 사용자 토큰 없음)', 'HTTP 401 또는 403'), 'originalApiUrl 또는 공개 키 설정이 없음');
  }
  await live(row('F09', 8, 'forbidden', 'GET /api/notes/export (토큰 없음)', 'HTTP 401 또는 404'), { path: '/api/notes/export' }, statusIn(401, 404));
  await live(row('F10', 8, 'forbidden', 'GET /api/notices?id=notice-01 (토큰 없음)', 'HTTP 401'), { path: '/api/notices?id=notice-01' }, statusIn(401));
  await live(row('F11', 8, 'forbidden', 'PUT /api/notices?id=notice-01 (토큰 없음)', 'HTTP 401, 수정 없음'),
    { method: 'PUT', path: '/api/notices?id=notice-01', headers: { 'content-type': 'application/json' }, body: '{}' }, statusIn(401));
  await live(row('F12', 10, 'forbidden', 'HEAD /api/restore', '복원 없이 HTTP 401 또는 405'), { method: 'HEAD', path: '/api/restore' }, statusIn(401, 405));
  await live(row('F13', 10, 'forbidden', 'POST /api/restore (토큰 없음)', 'HTTP 401, 복원 없음'),
    { method: 'POST', path: '/api/restore', headers: { 'content-type': 'application/json' }, body: `{"id":"${ZERO_ID}","dryRun":true}` }, statusIn(401));
  await live(row('F14', 11, 'forbidden', 'GET /api/device (토큰·서명 없음)', 'HTTP 401, 승인으로 처리 안 함'), { path: '/api/device' }, statusIn(401));
  await live(row('F15', 11, 'forbidden', 'POST /api/device (토큰 없음)', 'HTTP 401, 기기 등록 없음'),
    { method: 'POST', path: '/api/device', headers: { 'content-type': 'application/json' }, body: '{}' }, statusIn(401));

  // ---- 판정기·탐지기·정책: 배포 요청이 아니라 이 PC에서 함수를 직접 부른 결과 ----
  const { normal, suspicious } = fixtureRequests();
  const zone = { ...normal, subjectId: 'student_user_b' };
  const decisions = [
    ['L01', 6, 'normal', '판정기: 등록 기기 정상 요청', 'allow', normal],
    ['L02', 6, 'forbidden', '판정기: 미등록 가상 기기 요청', 'deny', { ...normal, deviceRegistered: false }],
    ['L03', 7, 'forbidden', '판정기: 복합 이상 접속 (재확인 전)', 'step_up', suspicious],
    ['L04', 7, 'normal', '판정기: 복합 이상 접속 (재확인 뒤)', 'allow', { ...suspicious, stepUp: { verified: true, authAgeSeconds: 60 } }],
    ['L05', 8, 'forbidden', '판정기: B가 A 메모 읽기', 'deny', { ...zone, path: '/notes/owner_a_item', route: 'GET /notes/:id' }],
    ['L06', 8, 'normal', '판정기: B가 자기 메모 읽기', 'allow', { ...zone, path: '/notes/owner_b_item', route: 'GET /notes/:id' }],
    ['L07', 8, 'forbidden', '판정기: 학생 공지 수정', 'deny', { ...zone, method: 'PUT', path: '/notices/notice-01', route: 'PUT /notices/:id' }],
    ['L08', 8, 'forbidden', '판정기: 메모 전체 목록', 'deny', { ...zone, path: '/notes', route: 'GET /notes' }],
  ];
  for (const [id, stage, kind, request, want, input] of decisions) {
    await local(row(id, stage, kind, request, want), async () => {
      const req = { ...input, requestId: randomUUID() };
      const res = await decide(req);
      return { ok: res.decision === want && res.requestId === req.requestId, actual: `${res.decision} · ${res.reasonCode}`, requestId: req.requestId };
    });
  }

  const reads = (count, extra) => Array.from({ length: count }, (_, index) => ({
    at: new Date(Date.UTC(2026, 9, 1) + index * 2000).toISOString(), method: 'GET',
    identity: { sub: 'doppel_fixture' }, deviceId: 'bbbbbbbbbbbbbbbb', ...extra,
  }));
  const detections = [
    ['L09', 9, 'forbidden', '탐지기: 낯선 네트워크 + 10분 150건 가상 사건', 'propose_revocation (기기 1개)',
      () => detect(reads(150, { network: 'unusual' })), r => r.action === 'propose_revocation' && r.deviceId === 'bbbbbbbbbbbbbbbb'],
    ['L10', 9, 'normal', '탐지기: 평소 네트워크 30건', 'observe', () => detect(reads(30, { network: 'usual' })), r => r.action === 'observe'],
    ['L11', 9, 'normal', '탐지기: 지역만 다른 150건', 'observe', () => detect(reads(150, { network: 'usual', region: 'foreign' })), r => r.action === 'observe'],
  ];
  for (const [id, stage, kind, request, expected, run, ok] of detections) {
    await local(row(id, stage, kind, request, expected), () => {
      const result = run();
      return { ok: ok(result), actual: `${result.action}${result.reasonCode ? ` · ${result.reasonCode}` : ''}${result.deviceId ? ' · 기기 1개' : ''}` };
    });
  }

  await local(row('L12', 10, 'normal', '정책 사본 다시 읽기·SHA-256 검증', '검증 통과'), () => {
    try {
      const { manifest } = loadVerifiedBackup();
      return { ok: true, actual: `검증 통과 · ${manifest.version}` };
    } catch (error) {
      return { ok: false, actual: `검증 중단 · ${String(error.message).slice(0, 80)}` };
    }
  });
  await local(row('L13', 10, 'forbidden', '시험 정책: B가 A 메모 읽기 / A의 자기 메모 읽기', 'deny / allow'), async () => {
    const policy = JSON.parse(await readFile(resolve(rootDir, 'policy', 'test-policy.json'), 'utf8'));
    const cross = evaluateTestPolicy(policy, { method: 'GET', route: '/notes/:id', subjectOwner: 'b', targetOwner: 'a' });
    const own = evaluateTestPolicy(policy, { method: 'GET', route: '/notes/:id', subjectOwner: 'a', targetOwner: 'a' });
    return { ok: cross === 'deny' && own === 'allow', actual: `${cross} / ${own}` };
  });

  // ---- 시험 계정 A·B로 보내는 요청 (account가 있을 때만, B 요청은 accountB도 있을 때만) ----
  const NEEDS_B = 'B 시험 계정이 없어 보내지 않음';
  const accountPlan = [
    ['A00', 3, 'normal', 'POST /api/auth (A 시험 계정 로그인)', 'HTTP 200, 로그인 토큰 받음'],
    ['A09', 3, 'forbidden', 'POST /api/auth (틀린 비밀번호)', 'HTTP 401, 토큰 없음'],
    ['A10', 11, 'normal', 'POST /api/device (A 기기 승인 요청, 개인키 보유 증명)', 'HTTP 200, 승인'],
    ['A07', 11, 'normal', 'GET /api/device (A 승인 기기 서명)', 'HTTP 200, 같은 기기 승인 확인'],
    ['A08', 11, 'forbidden', 'GET /api/notes (A 로그인 토큰만, 기기 서명 없음)', 'HTTP 401'],
    ['A11', 11, 'forbidden', 'GET /api/notes (서명 뒤 경로를 ?id=…로 변경)', 'HTTP 401'],
    ['A12', 11, 'forbidden', 'POST /api/notes (서명 뒤 본문 변경)', 'HTTP 401, 저장 없음'],
    ['A13', 11, 'forbidden', 'GET /api/notes (10분 지난 서명)', 'HTTP 401'],
    ['A01', 4, 'normal', 'GET /api/notes (A 토큰·기기 서명, 자기 메모 목록)', 'HTTP 200'],
    ['A14', 4, 'normal', 'POST /api/notes (A 토큰·기기 서명, 가상 메모 1건 추가)', 'HTTP 201, 새 메모 ID'],
    ['B00', 3, 'normal', 'POST /api/auth (B 시험 계정 로그인)', 'HTTP 200, 로그인 토큰 받음'],
    ['B10', 11, 'normal', 'POST /api/device (B 기기 승인 요청, 개인키 보유 증명)', 'HTTP 200, 승인'],
    ['A18', 4, 'normal', 'GET /api/notes (B 토큰·기기 서명, B 자신의 메모 목록)', 'HTTP 200, A가 만든 메모 없음'],
    ['A02', 4, 'forbidden', 'GET /api/notes?id=<A의 메모> (B 토큰·기기 서명)', 'HTTP 403 또는 404, 내용 없음'],
    ['A16', 4, 'forbidden', 'PUT /api/notes?id=<A의 메모> (B 토큰·기기 서명)', 'HTTP 403 또는 404, 수정 없음'],
    ['A17', 4, 'forbidden', 'DELETE /api/notes?id=<A의 메모> (B 토큰·기기 서명)', 'HTTP 403 또는 404, 삭제 없음'],
    ['A06', 10, 'forbidden', 'POST /api/restore (B가 A의 메모 복구 미리보기)', 'HTTP 404'],
    ['A05', 10, 'normal', 'POST /api/restore (A 메모 복구 미리보기 dryRun)', 'HTTP 200, 복원 없이 계획만'],
    ['A03', 8, 'normal', 'GET /api/notices (A 토큰·기기 서명)', 'HTTP 200'],
    ['A04', 8, 'forbidden', 'PUT /api/notices?id=notice-01 (학생 계정 공지 수정)', 'HTTP 403'],
    ['A15', 4, 'normal', 'DELETE /api/notes?id=<A가 만든 메모> (A, 시험 메모 정리)', 'HTTP 200, B의 삭제 시도 뒤에도 남아 있었음'],
  ];
  const planned = Object.fromEntries(accountPlan.map(item => [item[0], row(...item)]));
  const skip = (ids, why) => { for (const id of ids) if (!rows.some(r => r.id === id)) notRun(planned[id], why); };
  const B_IDS = ['B00', 'B10', 'A18', 'A02', 'A16', 'A17', 'A06'];
  const parse = text => { try { return JSON.parse(text); } catch { return {}; } };
  const jsonHeaders = { 'content-type': 'application/json' };

  // 로그인 → 토큰. 토큰은 이 함수 안에서만 쓰고 표나 기록에 넣지 않습니다.
  async function login(base, who) {
    let token = null;
    await live(base, { method: 'POST', path: '/api/auth', headers: jsonHeaders, body: JSON.stringify({ email: who.email, password: who.password }) }, res => {
      token = parse(res.text).access_token ?? null;
      return { ok: res.status === 200 && Boolean(token), actual: `HTTP ${res.status}, 토큰 ${token ? '받음' : '없음'}` };
    });
    return token;
  }

  // 화면과 같은 방식: 꺼낼 수 없는 P-256 개인키를 이 실행 안에서만 만들고 어디에도 쓰지 않습니다.
  // 서명 대상: 버전·메서드·경로(쿼리 포함)·본문 SHA-256·시각·기기 ID (src/device-auth.mjs와 같은 규칙)
  async function createDevice(token) {
    const { subtle } = globalThis.crypto;
    const keyPair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
    const jwk = await subtle.exportKey('jwk', keyPair.publicKey);
    const publicKey = { kty: 'EC', crv: jwk.crv, x: jwk.x, y: jwk.y };
    const deviceId = deviceIdFor(publicKey);
    const encoder = new TextEncoder();
    const sign = async text => Buffer.from(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keyPair.privateKey, encoder.encode(text))).toString('base64url');
    const bearer = { authorization: `Bearer ${token}` };
    const signedHeaders = async (method, path, bodyText = '', timestamp = Date.now()) => ({
      ...bearer, 'x-aleph-device-id': deviceId, 'x-aleph-timestamp': String(timestamp),
      'x-aleph-signature': await sign(signedPayload({ method, path, body: bodyText, timestamp, deviceId })),
    });
    const signedRequest = async (method, path, bodyObject) => {
      const body = bodyObject === undefined ? undefined : JSON.stringify(bodyObject);
      return { method, path, body, headers: { ...(await signedHeaders(method, path, body ?? '')), ...(body ? jsonHeaders : {}) } };
    };
    const approve = async () => {
      const timestamp = Date.now();
      return { method: 'POST', path: '/api/device', headers: { ...bearer, ...jsonHeaders }, body: JSON.stringify({
        publicKey, timestamp, proof: await sign([APPROVAL_VERSION, deviceId, String(timestamp)].join('\n')),
      }) };
    };
    return { deviceId, bearer, signedHeaders, signedRequest, approve };
  }
  const approved = res => {
    const status = parse(res.text).status ?? null;
    return { ok: res.status === 200 && status === 'approved', actual: `HTTP ${res.status}, 상태 ${status ?? '없음'}` };
  };

  if (!account?.email || !account?.password) {
    skip(Object.keys(planned), NEEDS_ACCOUNT);
  } else {
    const tokenA = await login(planned.A00, account);
    await live(planned.A09, { method: 'POST', path: '/api/auth', headers: jsonHeaders, body: JSON.stringify({ email: account.email, password: randomUUID() }) },
      res => ({ ok: res.status === 401 && !res.text.includes('access_token'), actual: `HTTP ${res.status}, 토큰 ${res.text.includes('access_token') ? '있음' : '없음'}` }));

    if (!tokenA) {
      skip(Object.keys(planned), '로그인에 실패해 보내지 않음');
    } else {
      const a = await createDevice(tokenA);
      await live(planned.A10, await a.approve(), approved);
      await live(planned.A07, await a.signedRequest('GET', '/api/device'), res => {
        const body = parse(res.text);
        return { ok: res.status === 200 && body.status === 'approved' && body.deviceId === a.deviceId,
          actual: `HTTP ${res.status}, 상태 ${body.status ?? '없음'}, 같은 기기 ${body.deviceId === a.deviceId ? '예' : '아니오'}` };
      });

      await live(planned.A08, { path: '/api/notes', headers: a.bearer }, statusIn(401));
      await live(planned.A11, { path: `/api/notes?id=${ZERO_ID}`, headers: await a.signedHeaders('GET', '/api/notes') }, statusIn(401));
      const originalBody = JSON.stringify({ title: '증거 확인용 가상 메모', body: '증거 확인용 가상 본문' });
      await live(planned.A12, { method: 'POST', path: '/api/notes', body: JSON.stringify({ title: '바꾼 본문', body: '바꾼 본문' }),
        headers: { ...(await a.signedHeaders('POST', '/api/notes', originalBody)), ...jsonHeaders } }, statusIn(401));
      await live(planned.A13, { path: '/api/notes', headers: await a.signedHeaders('GET', '/api/notes', '', Date.now() - 10 * 60 * 1000) }, statusIn(401));

      await live(planned.A01, await a.signedRequest('GET', '/api/notes'), res => {
        const list = parse(res.text);
        return { ok: res.status === 200 && Array.isArray(list), actual: `HTTP ${res.status}, 목록 ${Array.isArray(list) ? `${list.length}건` : '형식 다름'}` };
      });
      let noteId = null;
      await live(planned.A14, await a.signedRequest('POST', '/api/notes', JSON.parse(originalBody)), res => {
        noteId = parse(res.text).id ?? null;
        return { ok: res.status === 201 && Boolean(noteId), actual: `HTTP ${res.status}, 새 메모 ID ${noteId ? '받음' : '없음'}` };
      });

      // ---- B 시험 계정: A가 만든 메모에 접근하면 거부되어야 합니다 ----
      if (!noteId) {
        skip(B_IDS, 'A의 시험 메모가 없어 보내지 않음');
      } else if (!accountB?.email || !accountB?.password) {
        skip(B_IDS, NEEDS_B);
      } else {
        const tokenB = await login(planned.B00, accountB);
        if (!tokenB) {
          skip(B_IDS, '로그인에 실패해 보내지 않음');
        } else {
          const b = await createDevice(tokenB);
          await live(planned.B10, await b.approve(), approved);
          const target = `/api/notes?id=${encodeURIComponent(noteId)}`;
          await live(planned.A18, await b.signedRequest('GET', '/api/notes'), res => {
            const list = parse(res.text);
            const leaked = Array.isArray(list) && list.some(item => item?.id === noteId);
            return { ok: res.status === 200 && Array.isArray(list) && !leaked, actual: `HTTP ${res.status}, A의 메모 ${leaked ? '보임' : '없음'}` };
          });
          await live(planned.A02, await b.signedRequest('GET', target), res => ({
            ok: [403, 404].includes(res.status) && !res.text.includes('증거 확인용'), actual: `HTTP ${res.status}, A의 내용 ${res.text.includes('증거 확인용') ? '보임' : '없음'}` }));
          await live(planned.A16, await b.signedRequest('PUT', target, { title: 'B가 바꾼 제목', body: 'B가 바꾼 본문' }), statusIn(403, 404));
          await live(planned.A17, await b.signedRequest('DELETE', target), statusIn(403, 404));
          await live(planned.A06, await b.signedRequest('POST', '/api/restore', { id: noteId, dryRun: true }), statusIn(404));
        }
      }

      if (noteId) {
        await live(planned.A05, await a.signedRequest('POST', '/api/restore', { id: noteId, dryRun: true }), res => {
          const body = parse(res.text);
          return { ok: res.status === 200 && body.dryRun === true && !body.restored, actual: `HTTP ${res.status}, 미리보기 ${body.dryRun === true ? '예' : '아니오'}, 복원 ${body.restored ? '함' : '안 함'}` };
        });
      } else {
        skip(['A05'], '메모 추가에 실패해 보내지 않음');
      }
      await live(planned.A03, await a.signedRequest('GET', '/api/notices'), statusIn(200));
      await live(planned.A04, await a.signedRequest('PUT', '/api/notices?id=notice-01', {}), statusIn(403));
      if (noteId) {
        // B의 삭제 시도(A17) 뒤에도 A의 메모가 남아 있어야 200으로 지워집니다.
        await live(planned.A15, await a.signedRequest('DELETE', `/api/notes?id=${encodeURIComponent(noteId)}`), statusIn(200));
      } else {
        skip(['A15'], '지울 시험 메모가 없어 보내지 않음');
      }
    }
  }

  const ordered = rows.map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.stage - b.item.stage || a.index - b.index).map(entry => entry.item);
  return { schema: 'byteback.evidence.v1', generatedAt: stamp(), target: app.origin, deployedCommit, rows: ordered, summary: summarize(ordered) };
}

const count = (list, kind, result) => list.filter(item => item.kind === kind && item.result === result).length;

// 요약은 행의 결과를 세기만 합니다. 행에 없는 값을 더하거나 미실행을 통과로 바꾸지 않습니다.
export function summarize(rows) {
  const http = rows.filter(item => item.source !== 'local_function');
  const local = rows.filter(item => item.source === 'local_function');
  return {
    rows: rows.length,
    forbiddenRejected: count(http, 'forbidden', 'pass'), forbiddenFailed: count(http, 'forbidden', 'fail'), forbiddenNotRun: count(http, 'forbidden', 'not_run'),
    normalAllowed: count(http, 'normal', 'pass'), normalFailed: count(http, 'normal', 'fail'), normalNotRun: count(http, 'normal', 'not_run'),
    localMatched: local.filter(item => item.result === 'pass').length, localDiffered: local.filter(item => item.result === 'fail').length,
  };
}

export const evidenceDigest = evidence => createHash('sha256').update(JSON.stringify(evidence.rows)).digest('hex');

const cell = value => String(value ?? '').replace(/\|/gu, '\\|').replace(/\r?\n/gu, ' ');
const RESULT_LABEL = { pass: '기대와 같음', fail: '기대와 다름', not_run: '미실행' };

export function renderMarkdown(evidence) {
  const s = evidence.summary;
  const lines = [
    '# 1~11단계 정상·금지 요청 실측 표',
    '',
    `- 생성: \`npm run evidence\` · ${evidence.generatedAt} · 대상 ${evidence.target} · 배포 커밋 \`${evidence.deployedCommit ?? '확인 못 함'}\``,
    `- 배포 주소에 실제로 보낸 요청: 금지 요청 거부 ${s.forbiddenRejected} / 다름 ${s.forbiddenFailed} / 미실행 ${s.forbiddenNotRun} · 정상 요청 허용 ${s.normalAllowed} / 다름 ${s.normalFailed} / 미실행 ${s.normalNotRun}`,
    `- 판정기·탐지기·정책 함수를 이 PC에서 직접 부른 결과(요청 아님): 기대와 같음 ${s.localMatched} / 다름 ${s.localDiffered} — 거부·허용 요청 수에 넣지 않습니다`,
    '- 요청 ID: 배포 주소는 응답 헤더 `x-vercel-id`(원본 API는 `sb-request-id`), 함수 호출은 이번 실행에서 만든 UUID입니다. 미실행은 요청 ID와 시각을 비웁니다.',
    `- 행 SHA-256 \`${evidenceDigest(evidence).slice(0, 16)}…\``,
    '',
    '| ID | 단계 | 구분 | 요청 | 기대 결과 | 실제 결과 | 판단 | 요청 ID | 확인 시각 |',
    '|---|---|---|---|---|---|---|---|---|',
    ...evidence.rows.map(r => `| ${r.id} | ${r.stage} | ${r.kind === 'normal' ? '정상' : '금지'} | ${cell(r.request)} | ${cell(r.expected)} | ${cell(r.actual)} | ${RESULT_LABEL[r.result]} | ${r.requestId ? `\`${r.requestId}\`` : '-'} | ${r.checkedAt ?? '-'} |`),
    '',
    '## 41종 공격',
    '',
    ATTACKS_41_NOTE,
  ];
  return `${lines.join('\n')}\n`;
}
