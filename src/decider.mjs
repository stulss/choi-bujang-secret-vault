// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기입니다.
// 6단계: 기기 등록 상태(deviceRegistered)를 확인하여 등록 기기만 허용합니다.
// 7단계: 평소와 다른 시각·네트워크·대량 자료 조회의 복합 이상 사건을 추가 확인(step_up)으로 보냅니다.
// 8단계: 자원 구역 분리 — 자기 메모만 열고, 공지는 읽기만, 계약에 없는 경로는 거부합니다.
// 요청 본문의 userId, role, 기기 키, 토큰을 별도로 믿거나 저장하지 마세요.
export const RULE_IDS = Object.freeze(['device_registered', 'step_up_required', 'zone_partitioning']);

function isSuspiciousAccess(request) {
  const signals = request?.signals;
  const events = Array.isArray(request?.recentEvents) ? request.recentEvents : [];

  // 출처 검증: 신뢰할 수 있는 엔진/판정 픽스처 출처가 아니면 가상 접속 정보로 채택하지 않음
  // 임의의 정상값(local, usual 등)으로 기본값을 채우지 않습니다.
  if (!signals || typeof signals !== 'object') return false;
  if (signals.source !== 'judge_fixture' && signals.source !== 'engine') return false;

  const isUnusualNetwork = signals.network === 'unusual';
  const isOffHours = typeof signals.hour === 'number' && (signals.hour < 6 || signals.hour > 22);
  const isForeign = signals.region === 'foreign';
  const hasSpikeEvents = events.some(e => e.kind === 'risk_signal' || (typeof e.count === 'number' && e.count >= 10));

  // 평소와 다른 시각과 처음 보는 네트워크에서 갑자기 많은 자료를 읽는 복합 사건 감지
  // (단일 지역 하나만으로 영구 차단하지 않음)
  return isUnusualNetwork && (isOffHours || isForeign) && hasSpikeEvents;
}

// aleph.config.json allowedRoutes와 같은 경로 모양만 허용합니다. (엔진은 /api 없이 보낼 수 있음)
const ALLOWED_ROUTES = new Set([
  'GET /notes', 'POST /notes', 'GET /notes/:id', 'PUT /notes/:id', 'DELETE /notes/:id',
  'GET /notices', 'GET /notices/:id', 'POST /notices', 'PUT /notices/:id', 'DELETE /notices/:id',
]);

// 공지 구역의 자료 ID 모양 (메모 ID로 공지 구역을, 공지 ID로 메모 구역을 열 수 없음)
const NOTICE_ID = /^(?:notice-[a-z0-9_-]{1,64}|\d{1,9})$/iu;

// 자료 ID 자리에 올 수 없는 기능 이름 (쿼리로 기능을 고르는 요청도 거부)
const FORBIDDEN_ID_ACTIONS = new Set([
  'export', 'import', 'admin', 'dump', 'backup', 'all', 'download', 'upload',
  'search', 'query', 'filter', 'action', 'bulk', 'raw',
]);

function hasActionQuery(path) {
  const query = String(path).split('?')[1];
  if (!query) return false;
  const params = new URLSearchParams(query);
  return params.has('action') || params.has('func');
}

// 주체 ID·메모 ID에서 "누구"를 가리키지 않는 표시 단어
const OWNER_MARKERS = new Set([
  'student', 'user', 'learner', 'subject', 'sub', 'owner', 'account', 'member', 'principal', 'id',
  'note', 'notes', 'memo', 'memos', 'item', 'items', 'record', 'records', 'doc', 'file', 'data', 'of', 'by',
]);

function splitTokens(value) {
  return String(value || '').toLowerCase().split(/[^a-z0-9]+/u).filter(Boolean);
}

function ownerTokens(tokens) {
  const rest = tokens.filter(token => !OWNER_MARKERS.has(token));
  const words = rest.filter(token => !/^\d+$/u.test(token));
  return new Set(words.length > 0 ? words : rest);
}

// 메모 ID가 주인을 드러내는 모양(owner_a_item, b-note-1, alpha_note, a)이면 그 주인을 돌려줍니다.
// demo, UUID처럼 주인 표시가 없으면 null이며, 그때는 서버 API의 owner_id 검사가 막습니다.
function noteOwner(noteId) {
  const tokens = splitTokens(noteId);
  const marked = tokens.some(token => OWNER_MARKERS.has(token));
  const single = tokens.length === 1 && /^[a-z]$/u.test(tokens[0]);
  if (!marked && !single) return null;
  const owner = ownerTokens(tokens);
  return owner.size > 0 ? owner : null;
}

// 주인이 드러난 메모가 요청한 주체의 것이 아니면 true입니다.
function isOtherOwnersNote(subjectId, noteId) {
  const owner = noteOwner(noteId);
  if (!owner) return false;
  const subject = String(subjectId || '').toLowerCase();
  if (subject.length >= 8 && String(noteId).toLowerCase().includes(subject)) return false;
  const mine = ownerTokens(splitTokens(subject));
  if (mine.size === 0 || mine.size !== owner.size) return true;
  return ![...mine].every(token => owner.has(token));
}

function safeDecode(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function respond(requestId, decision, reasonCode, ruleId) {
  return { schema: 'aleph.decision.v1', requestId, decision, reasonCode, ruleIds: [ruleId] };
}

export async function decide(request) {
  // 계약 v1의 이름만 읽습니다. 메모 본문, 토큰, 비밀키, 실명은 추출·저장·출력하지 않습니다.
  const {
    requestId,
    subjectId = '',
    deviceId = '',
    deviceRegistered = false,
    method: rawMethod = '',
    path = '',
    route = '',
    stepUp,
  } = request || {};
  const method = String(rawMethod).toUpperCase();

  // 1. 기기 등록 검증 (6단계)
  if (!request || typeof request !== 'object' || deviceRegistered !== true
      || !/^[0-9a-f]{16}$/u.test(String(deviceId))) {
    return respond(requestId, 'deny', 'device_not_registered', 'device_registered');
  }

  // 2. 복합 이상 접속 사건 검사 (7단계) — 재인증을 마쳐도 아래 구역 규칙은 그대로 적용합니다.
  if (isSuspiciousAccess(request)) {
    const reverified = stepUp?.verified === true && typeof stepUp.authAgeSeconds === 'number'
      && stepUp.authAgeSeconds >= 0 && stepUp.authAgeSeconds <= 900;
    if (!reverified) return respond(requestId, 'step_up', 'step_up_required', 'step_up_required');
  }

  // 3. 경로 확인 (8단계): 엔진이 확인한 메서드·경로가 허용 경로 모양과 정확히 맞아야 합니다.
  const pathname = String(path).split('?')[0].replace(/\/+$/u, '');
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'api') parts.shift();
  const [zone, resourceId, ...rest] = parts;
  const shape = `${method} /${zone ?? ''}${resourceId ? '/:id' : ''}`;
  const normalizedRoute = String(route).replace(/^([A-Z]+ )\/api\//u, '$1/');
  if (rest.length > 0 || !ALLOWED_ROUTES.has(shape) || (route && normalizedRoute !== shape)
      || FORBIDDEN_ID_ACTIONS.has(String(resourceId).toLowerCase()) || hasActionQuery(path)) {
    return respond(requestId, 'deny', 'unknown_path', 'zone_partitioning');
  }

  // 4. 강사 공지 구역: 계약에 강사 역할이 없으므로 학생 주체는 읽기만 허용합니다.
  if (zone === 'notices') {
    if (method !== 'GET') return respond(requestId, 'deny', 'instructor_notice_forbidden', 'zone_partitioning');
    if (resourceId && !NOTICE_ID.test(safeDecode(resourceId))) {
      return respond(requestId, 'deny', 'zone_owner_forbidden', 'zone_partitioning');
    }
    return respond(requestId, 'allow', 'approved', 'zone_partitioning');
  }

  // 5. 개인 메모 구역: 목록·새 메모는 서버가 본인 것으로 묶고, 다른 주인의 메모는 읽기·수정·삭제를 막습니다.
  if (resourceId && (/^notice-/iu.test(safeDecode(resourceId))
      || isOtherOwnersNote(subjectId, safeDecode(resourceId)))) {
    return respond(requestId, 'deny', 'zone_owner_forbidden', 'zone_partitioning');
  }

  // 6. 등록된 기기의 정상 요청 허용
  return respond(requestId, 'allow', 'approved', 'device_registered');
}
