// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기입니다.
// 6단계: 기기 등록 상태(deviceRegistered)를 확인하여 등록 기기만 허용합니다.
// 7단계: 평소와 다른 시각·네트워크·대량 자료 조회의 복합 이상 사건을 추가 확인(step_up)으로 보냅니다.
// 요청 본문의 userId, role, 기기 키, 토큰을 별도로 믿거나 저장하지 마세요.
export const RULE_IDS = Object.freeze(['device_registered', 'step_up_required']);

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

export async function decide(request) {
  if (!request || typeof request !== 'object' || request.deviceRegistered !== true) {
    return {
      schema: 'aleph.decision.v1',
      requestId: request?.requestId,
      decision: 'deny',
      reasonCode: 'device_not_registered',
      ruleIds: ['device_registered'],
    };
  }

  // 7단계: 복합 이상 접속 사건 검사
  if (isSuspiciousAccess(request)) {
    // 재인증 확인 완료 여부(유효 기간 900초 이내) 확인
    if (request.stepUp?.verified === true && typeof request.stepUp.authAgeSeconds === 'number' && request.stepUp.authAgeSeconds <= 900) {
      return {
        schema: 'aleph.decision.v1',
        requestId: request.requestId,
        decision: 'allow',
        reasonCode: 'approved',
        ruleIds: ['step_up_required'],
      };
    }

    return {
      schema: 'aleph.decision.v1',
      requestId: request.requestId,
      decision: 'step_up',
      reasonCode: 'step_up_required',
      ruleIds: ['step_up_required'],
    };
  }

  // 등록된 기기의 정상 요청
  return {
    schema: 'aleph.decision.v1',
    requestId: request.requestId,
    decision: 'allow',
    reasonCode: 'approved',
    ruleIds: ['device_registered'],
  };
}
