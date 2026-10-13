// patterns.json 과 같은 내용을 담은 내장 패턴입니다. 실행 때 다른 파일을 읽지 않아 격리 실행에서도 같은 결과를 냅니다.
// (test/xdr-privilege.test.mjs 가 이름·확신도가 patterns.json 과 같은지, reason 이 패턴 이름인지 확인합니다.)
// import 문, 파일 읽기·쓰기, 바깥 질의가 없습니다. 내보내는 것은 decide 하나입니다.
const PATTERNS = Object.freeze({
  addThenCommand: { id: 'admin-group-add-then-command', name: '관리자 그룹에 들어간 뒤 곧바로 관리자 명령 실행', tier: 'clear', baseConfidence: 0.97 },
  borrowed: { id: 'borrowed-credentials-admin-command', name: '다른 계정의 권한으로 관리자 명령 실행', tier: 'clear', baseConfidence: 0.95 },
  addBurst: { id: 'admin-group-add-burst', name: '같은 주소에서 여러 계정을 관리자 그룹에 추가', tier: 'clear', baseConfidence: 0.95 },
  newAddress: { id: 'admin-command-from-new-address', name: '처음 보는 주소에서 관리자 권한 사용', tier: 'clear', baseConfidence: 0.92 },
  outsideHours: { id: 'admin-use-outside-hours', name: '업무 시간 밖 관리자 권한 사용', tier: 'clear', baseConfidence: 0.9 },
  addRemote: { id: 'admin-group-add-from-remote', name: '원격 주소에서 관리자 그룹에 추가', tier: 'clear', baseConfidence: 0.9 },
  rejoin: { id: 'admin-group-leave-and-rejoin', name: '관리자 그룹에서 빠졌다가 곧바로 다시 들어옴', tier: 'clear', baseConfidence: 0.9 },
  singleCommand: { id: 'single-admin-command', name: '관리자 명령 한 건만 있고 다른 이상 신호는 없음', tier: 'suspect', baseConfidence: 0.65 },
  elevationOnly: { id: 'elevation-without-follow-up', name: '권한 상승 시도만 있고 이어진 명령은 없음', tier: 'suspect', baseConfidence: 0.6 },
  groupChange: { id: 'non-admin-group-change', name: '관리자가 아닌 그룹의 추가나 변경', tier: 'suspect', baseConfidence: 0.55 },
  tagged: { id: 'privilege-tagged-low-signal', name: '권한 기법 표시만 있는 약한 신호', tier: 'suspect', baseConfidence: 0.5 },
});

const BLOCK_AT = 0.85;
const ALERT_AT = 0.5;
const SUSPECT_MIN_LEVEL = 5;
const BURST_COUNT = 3;
const REJOIN_COUNT = 2;

const TECHNIQUE = /^T(?:1068|1078)/;
const ADDED_TO_ADMIN = /관리자\s*그룹(?:에)?\s*(?:추가|들어)|방금\s*관리자가\s*된/;
const ADMIN_COMMAND = /(?:관리자|권한)\s*명령|명령\s*실행/;
const ELEVATED_SESSION = /관리자\s*권한으로\s*바뀌/;
const BORROWED = /다른\s*계정의\s*권한/;
const NEW_ADDRESS = /처음\s*보는\s*주소|주소는\s*처음/;
const OUTSIDE_HOURS = /수업\s*시간\s*밖|업무처럼\s*보이지\s*않는|업무\s*시간\s*밖/;
const REMOTE = /원격/;
const REJOIN = /관리자\s*그룹에서\s*빠진.*다시\s*관리자로/;
const ELEVATION_PROMPT = /권한\s*상승/;
const GROUP_WORD = /그룹/;

// 원본 경보에서 패턴 비교에 필요한 값만 읽습니다. 원본은 고치지 않습니다.
function evidenceOf(alert) {
  const data = alert?.data && typeof alert.data === 'object' ? alert.data : {};
  const description = String(alert?.rule?.description ?? '');
  const level = Number(alert?.rule?.level);
  const count = Number(data.count);
  const mitre = [alert?.rule?.mitre].flat().map(String);
  const tagged = mitre.some((id) => TECHNIQUE.test(id));
  const command = ADMIN_COMMAND.test(description);
  return {
    tagged,
    suspectContext: tagged && Number.isFinite(level) && level >= SUSPECT_MIN_LEVEL,
    addedToAdmin: ADDED_TO_ADMIN.test(description),
    command,
    elevated: command || ELEVATED_SESSION.test(description),
    borrowed: BORROWED.test(description),
    newAddress: NEW_ADDRESS.test(description),
    outsideHours: OUTSIDE_HOURS.test(description),
    remote: REMOTE.test(description),
    rejoin: REJOIN.test(description) && Number.isFinite(count) && count >= REJOIN_COUNT,
    burst: Number.isFinite(count) && count >= BURST_COUNT,
    elevationPrompt: ELEVATION_PROMPT.test(description),
    groupChange: GROUP_WORD.test(description),
  };
}

function toAction(confidence) {
  if (confidence >= BLOCK_AT) return 'block';
  if (confidence >= ALERT_AT) return 'alert';
  return 'record';
}

function answer(pattern) {
  return { action: toAction(pattern.baseConfidence), confidence: pattern.baseConfidence, reason: pattern.name };
}

// decide(alert) -> { action: 'block' | 'alert' | 'record', confidence, reason }
// confidence 는 경보가 패턴과 얼마나 뚜렷하게 맞는지 0~1 로 매긴 값입니다. 0.85 이상 block, 0.5 이상 alert, 그 아래 record.
export function decide(alert) {
  const e = evidenceOf(alert);
  if (e.tagged) {
    if (e.addedToAdmin && e.command) return answer(PATTERNS.addThenCommand);
    if (e.borrowed && e.command) return answer(PATTERNS.borrowed);
    if (e.addedToAdmin && e.burst) return answer(PATTERNS.addBurst);
    if (e.elevated && e.newAddress) return answer(PATTERNS.newAddress);
    if (e.elevated && e.outsideHours) return answer(PATTERNS.outsideHours);
    if (e.addedToAdmin && e.remote) return answer(PATTERNS.addRemote);
    if (e.rejoin) return answer(PATTERNS.rejoin);
  }
  if (e.suspectContext) {
    if (e.command) return answer(PATTERNS.singleCommand);
    if (e.elevationPrompt) return answer(PATTERNS.elevationOnly);
    if (e.groupChange) return answer(PATTERNS.groupChange);
    return answer(PATTERNS.tagged);
  }
  return { action: 'record', confidence: 0.05, reason: '알려진 패턴 없음, 정상 이벤트로 기록' };
}
