// 9단계: 도플갱어를 찾고 권한을 거둡니다 (가상 사건 탐지)
// docs/DETECT_EVENTS.md 계약: 같은 가명 사용자의 GET이 10분 구간에서 120건을 넘으면 회수를 제안합니다.
// 사건에 네트워크 값이 있으면 평소와 다른 네트워크와 다량 조회가 함께일 때만 의심으로 봅니다.
// 지역 값 하나만으로는 제안하지 않습니다. 결과는 판정기 응답과 별도이며, 회수 집행과 시간 측정은 심판이 합니다.
// 메모 본문, 토큰, 실명은 읽거나 저장하거나 출력하지 않습니다.

const WINDOW_MS = 10 * 60 * 1000;
const BURST_LIMIT = 120;
const DEVICE_ID = /^[0-9a-f]{16}$/u;
const NETWORKS = new Set(['usual', 'unusual', 'unknown']);

// 사건 하나에서 가명 사용자·기기·요청 종류·판정·네트워크·시각만 꺼냅니다. 나머지 값은 버립니다.
export function readEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return null;
  const sub = event.identity?.sub;
  const at = Date.parse(event.at);
  if (typeof sub !== 'string' || !sub || sub.length > 200 || Number.isNaN(at)) return null;
  const method = typeof event.method === 'string' ? event.method.toUpperCase() : '';
  const deviceId = typeof event.deviceId === 'string' && DEVICE_ID.test(event.deviceId) ? event.deviceId : null;
  const decision = ['allow', 'deny', 'step_up'].includes(event.decision) ? event.decision : null;
  const rawNetwork = event.network ?? event.signals?.network;
  const network = NETWORKS.has(rawNetwork) ? rawNetwork : null;
  return { sub, deviceId, method, decision, network, at };
}

function burstWindow(records) {
  records.sort((a, b) => a.at - b.at);
  let left = 0;
  for (let right = 0; right < records.length; right += 1) {
    while (records[right].at - records[left].at > WINDOW_MS) left += 1;
    if (right - left + 1 > BURST_LIMIT) return records.slice(left, right + 1);
  }
  return null;
}

export function detect(events) {
  if (!Array.isArray(events)) throw new TypeError('invalid_detection_events');

  // 가명 사용자 + 기기 단위로 묶어 다른 사용자·다른 기기의 조회를 합산하지 않습니다.
  const groups = new Map();
  for (const raw of events) {
    const event = readEvent(raw);
    if (!event || event.method !== 'GET') continue;
    const key = `${event.sub}\u0000${event.deviceId ?? ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }

  for (const records of groups.values()) {
    const burst = burstWindow(records);
    if (!burst) continue;
    const networkKnown = records.some(item => item.network !== null);
    const unusualNetwork = burst.some(item => item.network === 'unusual');
    if (networkKnown && !unusualNetwork) continue;

    const proposal = { action: 'propose_revocation', reasonCode: 'burst_read', subject: burst[0].sub };
    if (burst[0].deviceId) proposal.deviceId = burst[0].deviceId;
    return proposal;
  }

  return { action: 'observe' };
}
