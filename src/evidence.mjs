import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// 12단계: 1~11단계 정상·금지 요청을 실제로 보내고 기대·실제 결과, 요청 ID, 확인 시각을 한 표로 남깁니다.
// 결과는 실제 응답이나 실제 함수 반환값만 적습니다. 보내지 않은 요청은 not_run 입니다. 메모 본문·토큰·키는 남기지 않습니다.
// allowWrites=false(npm run bundle 격리 환경)이면 공개 HTTPS 주소로 GET·HEAD만 보내고, 쓰기 요청 행은 not_run 으로 둡니다.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SECRET_IN_PAGE = /sb_secret_[A-Za-z0-9_-]{8,}|service_role|SUPABASE_SECRET_KEY|BEGIN (EC |RSA )?PRIVATE KEY-----|"d"\s*:\s*"[A-Za-z0-9_-]{40,}"/u;
const ZERO_ID = '00000000-0000-4000-8000-000000000001';

// 41종 공격(방어전 안내의 담당 단계·이름). measuredBy의 행이 모두 실측으로 막혔을 때만 "막음"으로 셉니다.
export const ATTACKS = [
  [1, 'ANONYMOUS_NOTE_LIST', '인증 없이 개인 메모 목록을 조회', ['F01']],
  [1, 'ANONYMOUS_NOTE_READ', '인증 없이 개인 메모를 조회', ['F02']],
  [2, 'BUILT_BUNDLE_SECRET_SCAN', '배포 번들에서 시험 비밀값을 검색', ['F05']],
  [2, 'REPOSITORY_SECRET_SCAN', '제출 커밋에서 시험 비밀값을 검색', ['L14']],
  [2, 'STATIC_SEED_DATA_SCAN', '공개 정적 파일에서 개인 메모 시드를 검색', ['F04']],
  [3, 'ANONYMOUS_NOTE_WRITE', '인증 없이 개인 메모를 추가', ['W01']],
  [3, 'EXPIRED_LOGIN_TOKEN', '만료된 로그인 토큰으로 조회', []],
  [3, 'FORGED_LOGIN_TOKEN', '서명이 위조된 로그인 토큰으로 조회', ['F03']],
  [3, 'MISSING_LOGIN_TOKEN', '로그인 토큰 없이 보호 API 조회', ['F01']],
  [3, 'TOKEN_WRONG_AUDIENCE', '다른 서비스용으로 발급된 로그인 토큰으로 메모 조회', []],
  [4, 'FOREIGN_NOTE_DELETE', '시험 계정 B로 A의 메모 삭제', []],
  [4, 'R3_JUDGE_OWNED_NOTE', '학생 시험 신원으로 심판 소유 메모 조회', []],
  [4, 'R3_JUDGE_OWNED_NOTE_WRITE', '학생 시험 신원으로 심판 소유 메모 수정', []],
  [5, 'DIRECT_ORIGIN_NOTE_READ', '공개 키와 시험 계정 토큰으로 원본 Supabase 자료 API 직접 조회', []],
  [5, 'DIRECT_ORIGIN_NOTE_WRITE', '공개 키와 시험 계정 토큰으로 원본 Supabase 자료 API 직접 수정', []],
  [5, 'ORIGIN_ALIAS_BYPASS', '공개 정적 파일과 브라우저 묶음에서 서버 전용 키·시드 표식 검색', ['F05', 'F06', 'F04']],
  [6, 'DEVICE_SUBJECT_MISMATCH', '등록 기기와 다른 사용자 토큰을 조합', []],
  [6, 'MISSING_CLIENT_CERTIFICATE', '클라이언트 인증서 없이 mTLS 통로 요청', []],
  [6, 'UNREGISTERED_DEVICE', '미등록 기기 인증서로 자료실 조회', []],
  [6, 'UNREGISTERED_VIRTUAL_DEVICE_RULE', '판정기에 등록되지 않은 가상 기기 사건을 직접 입력', ['L02']],
  [7, 'ANOMALOUS_HOUR_EVENT', '평소와 다른 시각의 가상 접속 사건을 입력', []],
  [7, 'ANOMALOUS_NETWORK_ACTION', '낯선 네트워크에서 대량 수정하는 가상 사건을 입력', []],
  [7, 'ANOMALOUS_REGION_EVENT', '가상 접속 지역이 급변한 사건을 판정기에 입력', []],
  [7, 'MISSING_STEP_UP', '추가 인증을 마치지 않은 토큰으로 민감 메모 조회', []],
  [8, 'CROSS_ZONE_NOTE_LIST', '다른 구역의 메모 목록을 API로 조회', []],
  [8, 'CROSS_ZONE_NOTE_READ', '다른 구역 메모를 API로 조회', []],
  [8, 'CROSS_ZONE_NOTE_WRITE', '다른 구역 메모를 API로 수정', []],
  [8, 'STUDENT_EDITS_INSTRUCTOR_NOTICE', '학생 시험 계정으로 강사 공지 수정', []],
  [9, 'DOPPELGANGER_DETECTION', '합성 도플갱어 접속 사건을 기록과 탐지기에 입력', []],
  [9, 'REVOKED_IDENTITY_REUSE', '회수된 신원으로 다음 요청을 재시도', []],
  [9, 'REVOKED_LATERAL_ROUTE', '회수된 도플갱어가 다른 자원으로 이동', []],
  [9, 'STOLEN_SESSION_AFTER_REVOKE', '회수 뒤 남은 탈취 세션으로 재접속', []],
  [10, 'RESTORE_CHANGED_NOTE', '시험 계정 B의 메모를 변조한 뒤 학생이 제출한 복구 경로를 호출', []],
  [10, 'RESTORE_DEFENSE_REPLAY', '시험 계정 B의 자료를 복구한 직후 1~9단계 대표 공격을 다시 전송', []],
  [10, 'RESTORE_DELETED_NOTE', '시험 계정 B의 메모를 삭제한 뒤 학생이 제출한 복구 경로를 호출', []],
  [11, 'SIGNED_BODY_TAMPER', '서명 뒤 수정 본문을 변경', []],
  [11, 'SIGNED_PATH_TAMPER', '서명 뒤 요청 경로를 변경', []],
  [11, 'UNSIGNED_CLIENT_REQUEST', '설치형 앱 서명 없이 보호 요청', []],
  [12, 'COMBINED_ANONYMOUS_OWNER_ATTACK', '무인증 조회와 타인 메모 조회를 같은 제출본에 연속 전송', []],
  [12, 'COMBINED_DEVICE_REVOCATION_ATTACK', '미등록 기기 요청 뒤 회수된 신원으로 다시 전송', []],
  [12, 'COMBINED_RESTORE_SIGNATURE_ATTACK', '복구 뒤 서명 없는 변경 요청과 구역 밖 조회를 전송', []],
].map(([stage, code, name, measuredBy]) => ({ stage, code, name, measuredBy }));

const now = () => new Date().toISOString();

async function http(app, { method = 'GET', path, url, headers = {}, body }) {
  const target = url ? new URL(url) : new URL(path, app);
  const res = await fetch(target, {
    method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(10000),
  });
  const text = method === 'HEAD' ? '' : await res.text();
  return { status: res.status, requestId: res.headers.get('x-vercel-id') || res.headers.get('sb-request-id') || null, text };
}

// 행 하나: { id, stage, kind: normal|forbidden, request, expected, actual, result: pass|fail|not_run, requestId, checkedAt, source }
function row(base, extra) {
  return { requestId: null, checkedAt: now(), ...base, ...extra };
}

async function live(rows, app, base, request, judge) {
  try {
    const res = await http(app, request);
    const verdict = judge(res);
    rows.push(row(base, { actual: verdict.actual, result: verdict.ok ? 'pass' : 'fail', requestId: res.requestId, source: 'live_http' }));
  } catch (error) {
    rows.push(row(base, { actual: `요청 실패 (${error.name})`, result: 'fail', source: 'live_http' }));
  }
}

function local(rows, base, run) {
  try {
    const { actual, ok, requestId } = run();
    rows.push(row(base, { actual, result: ok ? 'pass' : 'fail', requestId: requestId ?? randomUUID(), source: 'local_function' }));
  } catch (error) {
    rows.push(row(base, { actual: `실행 실패 (${error.message})`, result: 'fail', source: 'local_function' }));
  }
}

const notRun = (rows, base, why) => rows.push(row(base, { actual: why, result: 'not_run', checkedAt: null, source: 'not_run' }));
const statusIs = (...codes) => res => ({ ok: codes.includes(res.status), actual: `HTTP ${res.status}` });

export async function collectEvidence(config, { allowWrites = false } = {}) {
  const app = new URL(config.publicAppUrl);
  const rows = [];
  let deployedCommit = null;

  // ---- 정상 요청 (공개 화면) ----
  await live(rows, app, { id: 'N01', stage: 1, kind: 'normal', request: 'GET /aleph.json', expected: 'HTTP 200, 배포 커밋 확인' },
    { path: '/aleph.json' }, res => {
      try { deployedCommit = JSON.parse(res.text).commit ?? null; } catch {}
      return { ok: res.status === 200 && Boolean(deployedCommit), actual: `HTTP ${res.status}, 커밋 ${deployedCommit ? deployedCommit.slice(0, 7) : '없음'}` };
    });
  await live(rows, app, { id: 'N02', stage: 11, kind: 'normal', request: 'GET /', expected: 'HTTP 200 접속 화면' }, { path: '/' }, statusIs(200));
  await live(rows, app, { id: 'N03', stage: 11, kind: 'normal', request: 'GET /manifest.webmanifest', expected: 'HTTP 200, 앱 이름 있음' },
    { path: '/manifest.webmanifest' }, res => {
      let name = null;
      try { name = JSON.parse(res.text).name ?? null; } catch {}
      return { ok: res.status === 200 && Boolean(name), actual: `HTTP ${res.status}, 이름 ${name ? '있음' : '없음'}` };
    });
  await live(rows, app, { id: 'N04', stage: 11, kind: 'normal', request: 'GET /offline.html', expected: 'HTTP 200 오프라인 안내' }, { path: '/offline.html' }, statusIs(200));

  // ---- 금지 요청 (실제 응답) ----
  await live(rows, app, { id: 'F01', stage: 1, kind: 'forbidden', request: 'GET /api/notes (토큰 없음)', expected: 'HTTP 401, 메모 없음' }, { path: '/api/notes' }, statusIs(401));
  await live(rows, app, { id: 'F02', stage: 1, kind: 'forbidden', request: 'GET /api/notes?id=<가상 UUID> (토큰 없음)', expected: 'HTTP 401' }, { path: `/api/notes?id=${ZERO_ID}` }, statusIs(401));
  await live(rows, app, { id: 'F03', stage: 3, kind: 'forbidden', request: 'GET /api/notes (서명 위조 토큰)', expected: 'HTTP 401' },
    { path: '/api/notes', headers: { authorization: 'Bearer eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJmb3JnZWQifQ.Zm9yZ2Vk' } }, statusIs(401));
  await live(rows, app, { id: 'F04', stage: 2, kind: 'forbidden', request: 'GET /data.json (시드 검색)', expected: '메모 0건, 확인 표식 없음' },
    { path: '/data.json' }, res => {
      let empty = false;
      try { const data = JSON.parse(res.text); empty = Array.isArray(data.notes) && data.notes.length === 0; } catch {}
      const marker = res.text.includes(config.sampleMarker);
      return { ok: res.status === 200 && empty && !marker, actual: `HTTP ${res.status}, 메모 ${empty ? '0건' : '있음/형식 다름'}, 표식 ${marker ? '있음' : '없음'}` };
    });
  await live(rows, app, { id: 'F05', stage: 2, kind: 'forbidden', request: 'GET / (배포 화면 비밀값·표식·저장소 검색)', expected: '서버 키·개인키·표식·저장소 저장 코드 없음' },
    { path: '/' }, res => {
      const secret = SECRET_IN_PAGE.test(res.text);
      const marker = res.text.includes(config.sampleMarker);
      const storage = /localStorage\.|sessionStorage\.setItem|indexedDB\.open/u.test(res.text);
      return { ok: res.status === 200 && !secret && !marker && !storage, actual: `HTTP ${res.status}, 비밀값 ${secret ? '있음' : '없음'}, 표식 ${marker ? '있음' : '없음'}, 저장소 저장 ${storage ? '있음' : '없음'}` };
    });
  await live(rows, app, { id: 'F06', stage: 5, kind: 'forbidden', request: 'GET /aleph.config.json (서버 키 검색)', expected: '서버 전용 키 없음' },
    { path: '/aleph.config.json' }, res => {
      const secret = SECRET_IN_PAGE.test(res.text);
      return { ok: res.status === 200 && !secret, actual: `HTTP ${res.status}, 서버 키 ${secret ? '있음' : '없음'}` };
    });
  if (typeof config.originalApiUrl === 'string' && config.originalApiUrl.startsWith('https://')) {
    await live(rows, app, { id: 'F07', stage: 5, kind: 'forbidden', request: 'GET 원본 자료 API (공개 키만, 사용자 토큰 없음)', expected: 'HTTP 401 또는 403' },
      { url: config.originalApiUrl, headers: { apikey: config.anonKey ?? '' } }, statusIs(401, 403));
  }
  await live(rows, app, { id: 'F08', stage: 8, kind: 'forbidden', request: 'GET /api/notes/export (토큰 없음)', expected: 'HTTP 401 또는 404' }, { path: '/api/notes/export' }, statusIs(401, 404));
  await live(rows, app, { id: 'F09', stage: 8, kind: 'forbidden', request: 'GET /api/notices?id=notice-01 (토큰 없음)', expected: 'HTTP 401' }, { path: '/api/notices?id=notice-01' }, statusIs(401));
  await live(rows, app, { id: 'F10', stage: 11, kind: 'forbidden', request: 'GET /api/device (토큰·서명 없음)', expected: 'HTTP 401, 승인으로 처리 안 함' }, { path: '/api/device' }, statusIs(401));
  await live(rows, app, { id: 'F11', stage: 10, kind: 'forbidden', request: 'HEAD /api/restore', expected: '복원 없이 HTTP 401 또는 405' }, { method: 'HEAD', path: '/api/restore' }, statusIs(401, 405));
  await live(rows, app, { id: 'F12', stage: 12, kind: 'forbidden', request: 'GET /api/ops (토큰 없음)', expected: 'HTTP 401, 작전실 기록 없음' }, { path: '/api/ops' }, statusIs(401));

  // ---- 쓰기 요청: 격리 환경에서는 보내지 않음 ----
  const writes = [
    { id: 'W01', stage: 3, request: 'POST /api/notes (토큰 없음)', path: '/api/notes', method: 'POST', body: '{"title":"x","body":"x"}' },
    { id: 'W02', stage: 10, request: 'POST /api/restore (토큰 없음)', path: '/api/restore', method: 'POST', body: `{"id":"${ZERO_ID}"}` },
    { id: 'W03', stage: 8, request: 'PUT /api/notices?id=notice-01 (토큰 없음)', path: '/api/notices?id=notice-01', method: 'PUT', body: '{}' },
  ];
  for (const w of writes) {
    const base = { id: w.id, stage: w.stage, kind: 'forbidden', request: w.request, expected: 'HTTP 401, 저장 없음' };
    if (!allowWrites) notRun(rows, base, 'not_run (격리 환경은 GET·HEAD만 허용)');
    else await live(rows, app, base, { method: w.method, path: w.path, body: w.body, headers: { 'content-type': 'application/json' } }, statusIs(401));
  }

  // ---- 학생 판정기·탐지·정책 (실제 함수 반환값) ----
  const { decide } = await import(pathToFileURL(join(root, 'src', 'decider.mjs')).href);
  const { detect } = await import(pathToFileURL(join(root, 'src', 'detect.mjs')).href);
  const { fixtureRequests } = await import(pathToFileURL(join(root, 'scripts', 'fixture-7.mjs')).href);
  const { loadVerifiedBackup, evaluateTestPolicy } = await import(pathToFileURL(join(root, 'scripts', 'policy-restore.mjs')).href);
  const { normal, suspicious } = fixtureRequests();
  const decided = [];
  const decideRow = async (base, request, want) => {
    const req = { ...request, requestId: randomUUID() };
    const res = await decide(req);
    decided.push({ base, res, req, want });
  };
  const zone = { ...normal, subjectId: 'student_user_b', service: 'notes' };
  await decideRow({ id: 'L01', stage: 6, kind: 'normal', request: '판정기: 등록 기기 정상 요청', expected: 'allow' }, normal, 'allow');
  await decideRow({ id: 'L02', stage: 6, kind: 'forbidden', request: '판정기: 미등록 가상 기기 요청', expected: 'deny' }, { ...normal, deviceRegistered: false }, 'deny');
  await decideRow({ id: 'L03', stage: 7, kind: 'forbidden', request: '판정기: 복합 이상 접속 (재확인 전)', expected: 'step_up' }, suspicious, 'step_up');
  await decideRow({ id: 'L04', stage: 7, kind: 'normal', request: '판정기: 복합 이상 접속 (재확인 뒤)', expected: 'allow' }, { ...suspicious, stepUp: { verified: true, authAgeSeconds: 60 } }, 'allow');
  await decideRow({ id: 'L05', stage: 8, kind: 'forbidden', request: '판정기: B가 A 메모 읽기', expected: 'deny' }, { ...zone, path: '/notes/owner_a_item', route: 'GET /notes/:id' }, 'deny');
  await decideRow({ id: 'L06', stage: 8, kind: 'normal', request: '판정기: B가 자기 메모 읽기', expected: 'allow' }, { ...zone, path: '/notes/owner_b_item', route: 'GET /notes/:id' }, 'allow');
  await decideRow({ id: 'L07', stage: 8, kind: 'forbidden', request: '판정기: 학생 공지 수정', expected: 'deny' }, { ...zone, method: 'PUT', path: '/notices/notice-01', route: 'PUT /notices/:id' }, 'deny');
  await decideRow({ id: 'L08', stage: 8, kind: 'forbidden', request: '판정기: 메모 전체 목록', expected: 'deny' }, { ...zone, path: '/notes', route: 'GET /notes' }, 'deny');
  for (const { base, res, req, want } of decided) {
    rows.push(row(base, { actual: `${res.decision} · ${res.reasonCode}`, result: res.decision === want && res.requestId === req.requestId ? 'pass' : 'fail', requestId: req.requestId, source: 'local_function' }));
  }

  const reads = (count, extra) => Array.from({ length: count }, (_, i) => ({
    at: new Date(Date.UTC(2026, 9, 1) + i * 2000).toISOString(), method: 'GET', identity: { sub: 'doppel_fixture' }, deviceId: 'bbbbbbbbbbbbbbbb', ...extra,
  }));
  local(rows, { id: 'L09', stage: 9, kind: 'forbidden', request: '탐지기: 낯선 네트워크 + 10분 150건 가상 사건', expected: 'propose_revocation (기기 1개)' }, () => {
    const r = detect(reads(150, { network: 'unusual' }));
    return { ok: r.action === 'propose_revocation' && r.deviceId === 'bbbbbbbbbbbbbbbb', actual: `${r.action}${r.reasonCode ? ` · ${r.reasonCode}` : ''}${r.deviceId ? ' · 기기 1개' : ''}` };
  });
  local(rows, { id: 'L10', stage: 9, kind: 'normal', request: '탐지기: 평소 네트워크 30건', expected: 'observe' }, () => {
    const r = detect(reads(30, { network: 'usual' }));
    return { ok: r.action === 'observe', actual: r.action };
  });
  local(rows, { id: 'L11', stage: 9, kind: 'normal', request: '탐지기: 지역만 다른 150건', expected: 'observe' }, () => {
    const r = detect(reads(150, { network: 'usual', region: 'foreign' }));
    return { ok: r.action === 'observe', actual: r.action };
  });
  local(rows, { id: 'L12', stage: 10, kind: 'normal', request: '정책 사본 다시 읽기·SHA-256 검증', expected: '검증 통과' }, () => {
    const { manifest } = loadVerifiedBackup();
    return { ok: true, actual: `검증 통과 · ${manifest.version}` };
  });
  local(rows, { id: 'L13', stage: 10, kind: 'forbidden', request: '복원한 시험 정책: B가 A 메모 읽기 / A 자기 메모', expected: 'deny / allow' }, () => {
    const policy = JSON.parse(readFileSync(join(root, 'policy', 'test-policy.json'), 'utf8'));
    const cross = evaluateTestPolicy(policy, { method: 'GET', route: '/notes/:id', subjectOwner: 'b', targetOwner: 'a' });
    const own = evaluateTestPolicy(policy, { method: 'GET', route: '/notes/:id', subjectOwner: 'a', targetOwner: 'a' });
    return { ok: cross === 'deny' && own === 'allow', actual: `${cross} / ${own}` };
  });
  local(rows, { id: 'L14', stage: 2, kind: 'forbidden', request: 'git grep HEAD (비밀값 검색)', expected: '서버 키·JWT·개인키 0건' }, () => {
    let hits = 0;
    try {
      const out = execFileSync('git', ['grep', '-I', '-c', '-E', 'sb_secret_[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{20,}\\.eyJ[A-Za-z0-9_-]{20,}\\.|BEGIN (EC |RSA )?PRIVATE KEY-----', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      hits = out.split('\n').filter(Boolean).length;
    } catch (error) {
      if (error.status !== 1) throw error;
    }
    const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    return { ok: hits === 0, actual: `${head}에서 ${hits}개 파일` };
  });

  // ---- 로그인·기기 서명이 필요한 정상·금지 요청: 시험 계정 토큰을 쓰지 않으므로 보내지 않음 ----
  for (const [id, stage, kind, request, expected] of [
    ['T01', 4, 'normal', 'A 토큰으로 자기 메모 조회', 'HTTP 200'],
    ['T02', 4, 'forbidden', 'B 토큰으로 A 메모 조회·삭제', 'HTTP 403/404'],
    ['T03', 10, 'forbidden', 'B 메모 변조·삭제 뒤 POST /api/restore', 'ID·소유자·해시 일치'],
    ['T04', 11, 'forbidden', '승인 기기 계정의 서명 없는 요청·서명 뒤 경로·본문 변경', 'HTTP 401'],
    ['T05', 11, 'normal', '승인 기기에서 서명한 메모 목록', 'HTTP 200'],
  ]) notRun(rows, { id, stage, kind, request, expected }, 'not_run (시험 계정 토큰·기기 서명 없이 실행하지 않음)');

  return { schema: 'aleph.ops-evidence.v1', generatedAt: now(), deployedCommit, writesSent: allowWrites, rows, attacks: attackStatus(rows), summary: summarize(rows) };
}

export function attackStatus(rows) {
  const byId = new Map(rows.map(item => [item.id, item]));
  return ATTACKS.map(attack => {
    const evidence = attack.measuredBy.map(id => byId.get(id)).filter(Boolean);
    const measured = attack.measuredBy.length > 0 && evidence.length === attack.measuredBy.length
      && evidence.every(item => item.result !== 'not_run');
    const status = !measured ? 'not_run' : (evidence.every(item => item.result === 'pass') ? 'blocked' : 'not_blocked');
    return { ...attack, status };
  });
}

// 화면과 제출 묶음이 같은 계산을 씁니다: 행의 결과를 세기만 하고 다른 값으로 채우지 않습니다.
export function summarize(rows) {
  const count = (kind, result) => rows.filter(item => (!kind || item.kind === kind) && item.result === result).length;
  const attacks = attackStatus(rows);
  return {
    rows: rows.length,
    forbiddenRejected: count('forbidden', 'pass'), forbiddenFailed: count('forbidden', 'fail'), forbiddenNotRun: count('forbidden', 'not_run'),
    normalAllowed: count('normal', 'pass'), normalFailed: count('normal', 'fail'), normalNotRun: count('normal', 'not_run'),
    attacksBlocked: attacks.filter(item => item.status === 'blocked').length,
    attacksNotBlocked: attacks.filter(item => item.status === 'not_blocked').length,
    attacksNotRun: attacks.filter(item => item.status === 'not_run').length,
    attacksTotal: attacks.length,
  };
}

export const evidenceDigest = evidence => createHash('sha256').update(JSON.stringify(evidence.rows)).digest('hex');
