// 9단계: 도플갱어를 찾고 권한을 거둡니다 (가상 사건 탐지)
// docs/DETECT_EVENTS.md 계약을 준수하며, 10분 구간 내 120건 초과 GET 조회 시 propose_revocation 제안을 반환합니다.
// 메모 본문, 토큰, 실명은 일체 다루지 않으며 가명 식별자(sub)와 시각 정보만 처리합니다.
export function detect(events) {
  if (!Array.isArray(events)) throw new TypeError('invalid_detection_events');

  const userEvents = new Map();

  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    if (event.method !== 'GET') continue;

    const sub = event.identity?.sub || event.subjectId || event.deviceId;
    if (!sub) continue;

    const atTime = new Date(event.at).getTime();
    if (Number.isNaN(atTime)) continue;

    if (!userEvents.has(sub)) {
      userEvents.set(sub, []);
    }
    userEvents.get(sub).push({ time: atTime, event });
  }

  const WINDOW_MS = 10 * 60 * 1000; // 10분 (600,000ms)

  // 1. 단일 식별자 단위의 10분 구간 슬라이딩 윈도우 폭주 조회 검사
  for (const [sub, records] of userEvents.entries()) {
    records.sort((a, b) => a.time - b.time);

    let left = 0;
    for (let right = 0; right < records.length; right++) {
      while (records[right].time - records[left].time > WINDOW_MS) {
        left++;
      }
      const countInWindow = right - left + 1;
      // 120건 초과(121건 이상) 시 회수 제안
      if (countInWindow > 120) {
        return {
          action: 'propose_revocation',
          reasonCode: 'burst_read',
          subject: sub,
        };
      }
    }
  }

  // 2. 평소와 다른 네트워크와 갑작스러운 다량 조회의 복합 의심 사건 검사
  // (지역 단독만으로 확정하지 않음)
  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    const isUnusualNetwork = event.network === 'unusual' || event.signals?.network === 'unusual';
    const isBurstOrSpike = event.spike === true || (typeof event.count === 'number' && event.count > 120);
    const target = event.deviceId || event.identity?.sub || event.subjectId;
    if (isUnusualNetwork && isBurstOrSpike && target) {
      return {
        action: 'propose_revocation',
        reasonCode: 'burst_read',
        subject: target,
      };
    }
  }

  return { action: 'observe' };
}
