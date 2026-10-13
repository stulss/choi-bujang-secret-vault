// 12단계 자기 점검: npm run bundle과 심판 runner가 부르는 점검 목록은 이 파일 하나에만 있습니다.
// - 심판 runner는 격리된 환경에서 이 파일 하나만 읽어 runAttackChecks(배포 주소)를 부릅니다.
//   그래서 다른 파일·내장 모듈·패키지·JSON을 하나도 불러오지 않고 이 파일 안에서만 계산합니다.
// - 인자는 배포 주소 문자열(runner) 또는 aleph.config.json 객체 둘 다 받습니다.
// - 요청은 배포 주소 한 곳에만 GET으로, 점검 하나에 한 번, 한 번 실행에 최대 24건 보냅니다.
//   쓰기 요청이나 로그인·기기 서명이 필요한 점검은 보내지 않고 observed·result를 not_run으로 남깁니다.
// - observed에는 심판이 같은 요청 기록과 대조할 수 있는 값(HTTP 상태, jsonReady, jsonArrayLength)만 적습니다.
// - result는 받은 응답으로만 정합니다: 기대대로 거부·차단되면 blocked, 아니면 breached, 응답이 없으면 not_run.
// - 판정기·탐지 규칙·정책 사본 점검은 배포의 GET /api/checks?case=<점검 이름> 응답의 ready로 확인합니다.
//   서버가 학생 코드를 고정된 가상 입력으로 실행한 결과이며, ALEPH SDP 엔진이 집행한 결과가 아닙니다.
// - 토큰·개인키·실명·메모 본문은 결과에 넣지 않습니다. 이 결과는 학생의 자기 점검이며 심판 판정이 아닙니다.

const MAX_REQUESTS = 24;
const ZERO_ID = '00000000-0000-4000-8000-000000000001';
// 서명 자리가 엉터리인 가짜 토큰입니다. 실제 토큰이 아닙니다.
const FAKE_TOKEN = 'not.a.token';

const noNotes = res => !/"(title|body|content)"\s*:/u.test(res.text);
const status = (...codes) => res => codes.includes(res.status) && noNotes(res);
const ready = res => res.status === 200 && res.json?.ready === true;
const emptyData = res => res.status === 404 || (res.status === 200 && Array.isArray(res.json?.notes)
  && res.json.notes.length === 0 && res.json.sampleMarker === undefined);
const safeScreen = res => res.status === 200
  && !/localStorage\.|sessionStorage\.setItem|indexedDB\.open|extractable\s*:\s*true/u.test(res.text)
  && /generateKey\([^)]*false/u.test(res.text);
const viaCase = (id, stage, expected) => ({ id, stage, expected, path: `/api/checks?case=${id}`, ok: ready });

// path가 없는 점검은 보내지 않습니다(이유는 expected에 적음). 단계 순서입니다.
const CHECKS = [
  { id: 'data_json_notes_cleared', stage: 2, path: '/data.json', ok: emptyData,
    expected: '공개 정적 파일 GET /data.json에 가상 메모와 확인 표식이 없음 (HTTP 404 또는 빈 notes)' },
  { id: 'unauthenticated_api_blocked', stage: 3, path: '/api/notes', ok: status(401),
    expected: '로그인 없이 메모 목록 GET /api/notes를 요청하면 거부 (HTTP 401)' },
  { id: 'forged_token_blocked', stage: 3, path: '/api/notes', headers: { authorization: `Bearer ${FAKE_TOKEN}` }, ok: status(401),
    expected: '엉터리 토큰으로 GET /api/notes를 요청하면 거부 (HTTP 401)' },
  { id: 'unauthenticated_single_note_blocked', stage: 4, path: `/api/notes?id=${ZERO_ID}`, ok: status(401),
    expected: '로그인 없이 메모 한 건(GET /api/notes?id=…)을 요청하면 거부 (HTTP 401)' },
  { id: 'original_api_direct_access_blocked', stage: 5,
    expected: '공개 키만으로 원본 자료 API(Supabase notes)를 직접 읽으면 거부. 배포 주소가 아니라서 이 점검에서는 보내지 않음' },
  viaCase('unregistered_device_denied', 6, '판정기: 미등록 가상 기기의 요청은 deny (GET /api/checks?case=… 응답 ready=true)'),
  viaCase('suspicious_access_step_up', 7, '판정기: 평소와 다른 시각·네트워크·대량 조회가 겹친 가상 요청은 step_up (ready=true)'),
  viaCase('cross_zone_note_denied', 8, '판정기: B 계정이 A의 메모 구역을 읽으면 deny (ready=true)'),
  viaCase('student_notice_mod_denied', 8, '판정기: 학생이 강사 공지를 수정하면 deny (ready=true)'),
  { id: 'unauthenticated_notices_blocked', stage: 8, path: '/api/notices', ok: status(401),
    expected: '로그인 없이 공지 GET /api/notices를 요청하면 거부 (HTTP 401)' },
  { id: 'id_depth_feature_route_blocked', stage: 8, path: '/api/notes/export', ok: status(401, 404),
    expected: '자원 ID 자리에 기능 경로(GET /api/notes/export)를 두면 거부 (HTTP 401 또는 404)' },
  viaCase('detect_burst_read_propose_revocation', 9, '탐지 규칙: 낯선 네트워크에서 10분 안 150건 조회한 가상 사건은 기기 한 개 회수 제안 (ready=true)'),
  viaCase('policy_backup_reverified', 10, '정책 사본을 다시 읽어 SHA-256이 기록과 같은지 확인하고, 다르면 복원하지 않고 멈춤 (ready=true)'),
  viaCase('policy_restored_cross_owner_denied', 10, '되돌린 시험 정책: B의 A 메모 읽기는 deny, A의 자기 메모 읽기는 allow (ready=true)'),
  { id: 'restore_unauthenticated_blocked', stage: 10,
    expected: '로그인 없이 복구(POST /api/restore)를 요청하면 거부 (HTTP 401). 쓰기 요청이라서 이 점검에서는 보내지 않음' },
  { id: 'device_status_unsigned_blocked', stage: 11, path: '/api/device', ok: status(401),
    expected: '로그인·기기 서명 없이 기기 승인 상태 GET /api/device를 물으면 거부 (HTTP 401)' },
  { id: 'device_key_not_in_storage', stage: 11, path: '/', ok: safeScreen,
    expected: '접속 화면(GET /) 코드가 토큰·기기 키를 브라우저 저장소에 넣지 않고 꺼낼 수 없는 기기 키를 만듦 (HTTP 200)' },
  { id: 'approved_device_note_list', stage: 11,
    expected: '정상: 로그인하고 승인 기기로 서명한 GET /api/notes는 내 메모만 HTTP 200. 토큰과 기기 서명이 필요해서 이 점검에서는 보내지 않음' },
  { id: 'ops_summary_unauthenticated_blocked', stage: 12, path: '/api/ops', ok: status(401),
    expected: '로그인·기기 서명 없이 탈환 작전실 요약 GET /api/ops를 요청하면 거부 (HTTP 401)' },
];

function deploymentUrl(target) {
  let app = null;
  try {
    app = new URL(typeof target === 'string' ? target : target?.publicAppUrl);
  } catch {
    app = null;
  }
  if (!app || app.protocol !== 'https:' || app.username || app.password || app.search || app.hash
      || app.pathname !== '/' || app.hostname.endsWith('.example')) {
    throw new Error('aleph.config.json의 실제 배포 주소(publicAppUrl)를 먼저 넣어 주세요.');
  }
  return app;
}

// 응답에서 심판이 대조할 수 있는 값만 남깁니다.
function observedOf(res) {
  let text = `HTTP ${res.status}`;
  if (typeof res.json?.ready === 'boolean') text += `; jsonReady=${res.json.ready}`;
  if (Array.isArray(res.json)) text += `; jsonArrayLength=${res.json.length}`;
  return text;
}

async function send(app, check) {
  const url = new URL(check.path, app);
  if (url.origin !== app.origin) return null; // 배포 주소가 아닌 곳에는 보내지 않습니다.
  try {
    const res = await fetch(url, {
      method: 'GET', redirect: 'manual', headers: check.headers ?? {},
      signal: globalThis.AbortSignal?.timeout?.(10000),
      // runner가 이 요청을 점검 이름과 이어서 관측하도록 붙이는 표시입니다. 요청 헤더·주소에는 들어가지 않습니다.
      alephEvidence: { caseId: check.id, requestKey: 'read' },
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = undefined; }
    return { status: res.status, text, json };
  } catch {
    return null;
  }
}

export async function runAttackChecks(target) {
  const app = deploymentUrl(target);
  let sent = 0;
  return Promise.all(CHECKS.map(async check => {
    const base = { attackId: check.id, stage: check.stage, expected: check.expected };
    if (!check.path || sent >= MAX_REQUESTS) return { ...base, observed: 'not_run', result: 'not_run' };
    sent += 1;
    const res = await send(app, check);
    if (!res) return { ...base, observed: 'not_run', result: 'not_run' };
    return { ...base, observed: observedOf(res), result: check.ok(res) ? 'blocked' : 'breached' };
  }));
}
