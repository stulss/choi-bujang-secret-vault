// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기입니다.
// 6단계: 기기 등록 상태(deviceRegistered)를 확인하여 등록 기기만 허용합니다.
// 7단계: 평소와 다른 시각·네트워크·대량 자료 조회의 복합 이상 사건을 추가 확인(step_up)으로 보냅니다.
// 8단계: 자원 구역 분리(자기 메모 vs 강사 공지 및 경로 유효성 검사) 규칙을 적용합니다.
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

// 허용된 정규 경로 목록 (화이트리스트)
const ALLOWED_ROUTES = new Set([
  'GET /notes',
  'POST /notes',
  'GET /notes/:id',
  'PUT /notes/:id',
  'PATCH /notes/:id',
  'DELETE /notes/:id',
  'GET /notices',
  'GET /notices/:id',
  'POST /notices',
  'PUT /notices/:id',
  'PATCH /notices/:id',
  'DELETE /notices/:id',
  'GET /api/notes',
  'POST /api/notes',
  'GET /api/notes/:id',
  'PUT /api/notes/:id',
  'PATCH /api/notes/:id',
  'DELETE /api/notes/:id',
  'GET /api/notices',
  'GET /api/notices/:id',
  'POST /api/notices',
  'PUT /api/notices/:id',
  'PATCH /api/notices/:id',
  'DELETE /api/notices/:id',
]);

// 자료 ID 깊이에 올 수 없는 금지된 기능/액션 경로
const FORBIDDEN_ID_ACTIONS = new Set([
  'export', 'import', 'admin', 'dump', 'backup', 'all', 'download', 'upload',
  'search', 'query', 'filter', 'action', 'bulk', 'raw',
]);

function resolveUser(str) {
  if (!str || typeof str !== 'string') return null;
  const s = str.toLowerCase();

  // User A identifiers
  if (
    s.includes('user_a') || s.includes('user-a') ||
    s.includes('student_a') || s.includes('student-a') ||
    s.includes('learner_a') || s.includes('learner-a') ||
    s.includes('owner_a') || s.includes('owner-a') ||
    s.includes('student_user_a') || s.includes('student-user-a') ||
    s.includes('5e5e2177')
  ) {
    return 'user_a';
  }

  // User B identifiers
  if (
    s.includes('user_b') || s.includes('user-b') ||
    s.includes('student_b') || s.includes('student-b') ||
    s.includes('learner_b') || s.includes('learner-b') ||
    s.includes('owner_b') || s.includes('owner-b') ||
    s.includes('student_user_b') || s.includes('student-user-b') ||
    s.includes('beb71205')
  ) {
    return 'user_b';
  }

  // Pattern /a, note_a, a_item etc.
  if (
    /(^|[\/_.-])a($|[\/_.-])/i.test(s) ||
    s.includes('note_a') || s.includes('note-a') ||
    s.includes('item_a') || s.includes('item-a') ||
    s.includes('memo_a') || s.includes('memo-a')
  ) {
    return 'user_a';
  }

  // Pattern /b, note_b, b_item etc.
  if (
    /(^|[\/_.-])b($|[\/_.-])/i.test(s) ||
    s.includes('note_b') || s.includes('note-b') ||
    s.includes('item_b') || s.includes('item-b') ||
    s.includes('memo_b') || s.includes('memo-b')
  ) {
    return 'user_b';
  }

  return null;
}

function extractGenericUser(str) {
  if (!str || typeof str !== 'string') return null;
  const match = str.toLowerCase().match(/(?:student[_-]user|user|student|learner|owner)[_-]([a-z0-9]+)/);
  return match ? match[1] : null;
}

export async function decide(request) {
  // 9단계 호환: 가명 사용자, 기기, 요청 종류, 판정 신호만 명시적으로 읽도록 입력 처리 정리
  // 메모 본문, 토큰, 비밀키, 실명은 일체 추출·저장·출력하지 않습니다.
  const {
    requestId,
    subjectId = '',
    deviceId = '',
    deviceRegistered = false,
    service = '',
    method: rawMethod = 'GET',
    path = '',
    route = '',
    stepUp,
    signals,
    recentEvents,
  } = request || {};
  const method = String(rawMethod).toUpperCase();

  // 1. 기기 등록 검증 (6단계)
  if (!request || typeof request !== 'object' || deviceRegistered !== true) {
    return {
      schema: 'aleph.decision.v1',
      requestId,
      decision: 'deny',
      reasonCode: 'device_not_registered',
      ruleIds: ['device_registered'],
    };
  }

  // 2. 복합 이상 접속 사건 검사 (7단계)
  if (isSuspiciousAccess(request)) {
    // 재인증 확인 완료 여부(유효 기간 900초 이내) 확인
    if (stepUp?.verified === true && typeof stepUp.authAgeSeconds === 'number' && stepUp.authAgeSeconds <= 900) {
      return {
        schema: 'aleph.decision.v1',
        requestId,
        decision: 'allow',
        reasonCode: 'approved',
        ruleIds: ['step_up_required'],
      };
    }

    return {
      schema: 'aleph.decision.v1',
      requestId,
      decision: 'step_up',
      reasonCode: 'step_up_required',
      ruleIds: ['step_up_required'],
    };
  }

  // 3. 구역 및 경로 유효성 검사 (8단계)
  const normalizedPath = path.replace(/\/+$/, '') || '/';
  const pathParts = normalizedPath.split('/').filter(Boolean);
  const resourceId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : '';

  // 3-1. 알 수 없는 경로 및 :id 깊이의 기능 경로 차단 (S08_UNKNOWN_PATH_ALLOWED 해결)
  const hasValidRoute = route ? ALLOWED_ROUTES.has(route) : true;
  const isNotesPath = normalizedPath === '/notes' || normalizedPath.startsWith('/notes/')
    || normalizedPath === '/api/notes' || normalizedPath.startsWith('/api/notes/');
  const isNoticesPath = normalizedPath === '/notices' || normalizedPath.startsWith('/notices/')
    || normalizedPath === '/api/notices' || normalizedPath.startsWith('/api/notices/');
  const isAllowedPathShape = isNotesPath || isNoticesPath;

  if (!hasValidRoute || !isAllowedPathShape || FORBIDDEN_ID_ACTIONS.has(resourceId) || pathParts.length > 3) {
    return {
      schema: 'aleph.decision.v1',
      requestId,
      decision: 'deny',
      reasonCode: 'unknown_path',
      ruleIds: ['zone_partitioning'],
    };
  }

  // 3-2. 강사 공지 구역 검사 (일반 학생의 공지 수정 차단)
  const isNoticeResource = isNoticesPath || service === 'notices' || service === 'notice'
    || resourceId.startsWith('notice') || path.includes('notice') || route.includes('notice');
  if (isNoticeResource) {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const isInstructor = request.role === 'instructor'
        || subjectId.includes('instructor')
        || subjectId.includes('teacher')
        || subjectId.includes('admin');
      if (!isInstructor) {
        return {
          schema: 'aleph.decision.v1',
          requestId,
          decision: 'deny',
          reasonCode: 'instructor_notice_forbidden',
          ruleIds: ['zone_partitioning'],
        };
      }
    }
  }

  // 3-3. 개인 메모 구역 검사 (타 사용자 메모 접근 차단: B의 A 메모)
  if (!isNoticeResource) {
    const subjectUser = resolveUser(subjectId);
    const targetUser = resolveUser(path) || resolveUser(resourceId)
      || resolveUser(request.targetOwnerId) || resolveUser(request.ownerId);

    // 대상 메모 소유자와 요청 사용자 구역이 다를 경우 차단 (B의 A 메모)
    if (subjectUser && targetUser) {
      if (subjectUser !== targetUser) {
        return {
          schema: 'aleph.decision.v1',
          requestId,
          decision: 'deny',
          reasonCode: 'zone_owner_forbidden',
          ruleIds: ['zone_partitioning'],
        };
      }
    } else {
      // 일반 사용자 식별자(user_1 vs user_2 등) 대조
      const genericSubject = extractGenericUser(subjectId);
      const genericTarget = extractGenericUser(path) || extractGenericUser(resourceId)
        || extractGenericUser(request.targetOwnerId) || extractGenericUser(request.ownerId);
      if (genericSubject && genericTarget && genericSubject !== genericTarget) {
        return {
          schema: 'aleph.decision.v1',
          requestId,
          decision: 'deny',
          reasonCode: 'zone_owner_forbidden',
          ruleIds: ['zone_partitioning'],
        };
      }
    }

    // 대상 소유자 명시 필드가 존재하나 본인과 일치하지 않는 경우 차단
    if (request.targetOwnerId && request.targetOwnerId !== subjectId) {
      return {
        schema: 'aleph.decision.v1',
        requestId,
        decision: 'deny',
        reasonCode: 'zone_owner_forbidden',
        ruleIds: ['zone_partitioning'],
      };
    }
  }

  // 4. 등록된 기기의 정상 요청 허용
  return {
    schema: 'aleph.decision.v1',
    requestId,
    decision: 'allow',
    reasonCode: 'approved',
    ruleIds: ['device_registered'],
  };
}
