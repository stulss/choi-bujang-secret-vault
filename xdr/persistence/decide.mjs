// patterns.json 과 같은 내용을 담은 내장 패턴입니다. 실행 때 다른 파일을 읽지 않아 격리 실행에서도 같은 결과를 냅니다.
// (test/xdr-persistence.test.mjs 가 이름·확신도가 patterns.json 과 같은지, reason 이 패턴 이름인지 확인합니다.)
// import 문, 파일 읽기·쓰기, 바깥 질의가 없습니다. 내보내는 것은 decide 하나입니다.
const PATTERNS = Object.freeze({
  startupAndTask: { id: 'startup-and-task-same-temp-file', name: '시작 프로그램과 예약 작업이 같은 임시 파일을 가리킴', tier: 'clear', baseConfidence: 0.97 },
  serviceTemp: { id: 'unsigned-service-temp-executable', name: '서명 없는 새 서비스가 임시 폴더 실행 파일을 가리킴', tier: 'clear', baseConfidence: 0.95 },
  serviceBurst: { id: 'unsigned-service-registration-burst', name: '서명 없는 서비스 등록 연속 반복', tier: 'clear', baseConfidence: 0.9 },
  taskTemp: { id: 'unusual-scheduled-task-temp-executable', name: '낯선 예약 작업이 임시 폴더 프로그램을 실행', tier: 'clear', baseConfidence: 0.92 },
  startupUnknown: { id: 'startup-folder-unknown-addition', name: '시작 폴더에 평소 목록에 없는 프로그램 추가', tier: 'clear', baseConfidence: 0.9 },
  unverified: { id: 'unverified-signature-new-entry', name: '서명이 확인되지 않은 새 예약 작업이나 시작 항목', tier: 'suspect', baseConfidence: 0.65 },
  tempOnly: { id: 'temp-executable-without-registration', name: '임시 폴더 실행 파일만 있고 등록은 없음', tier: 'suspect', baseConfidence: 0.6 },
  changeOnly: { id: 'persistence-change-no-follow-up', name: '서비스나 시작 폴더 변경만 있고 이어진 실행은 없음', tier: 'suspect', baseConfidence: 0.55 },
  tagged: { id: 'persistence-tagged-low-signal', name: '지속성 기법 표시만 있는 약한 신호', tier: 'suspect', baseConfidence: 0.5 },
});

const BLOCK_AT = 0.85;
const ALERT_AT = 0.5;
const SUSPECT_MIN_LEVEL = 5;
const BURST_COUNT = 3;

const TECHNIQUE = /^T(?:1543|1053|1547)/;
const TEMP_PATH = /\\Temp\\/i;
const STARTUP_PATH = /\\Startup\\/i;
const SERVICE = /서비스/;
const TASK = /예약\s*작업/;
const STARTUP_WORD = /시작\s*(?:폴더|프로그램|항목)/;
const UNSIGNED = /서명\s*(?:이\s*)?없/;
const UNKNOWN_ENTRY = /처음\s*보는|평소\s*목록에\s*없/;
const RANDOM_NAME = /임의\s*문자열/;
const UNVERIFIED = /서명(?:은|이)?\s*(?:확인되지|아직\s*모릅|모릅)/;
const CHANGED = /바뀌|변경/;

// 원본 경보에서 패턴 비교에 필요한 값만 읽습니다. 원본은 고치지 않습니다.
function evidenceOf(alert) {
  const data = alert?.data && typeof alert.data === 'object' ? alert.data : {};
  const path = typeof data.path === 'string' ? data.path : '';
  const description = String(alert?.rule?.description ?? '');
  const level = Number(alert?.rule?.level);
  const count = Number(data.count);
  const mitre = [alert?.rule?.mitre].flat().map(String);
  const tagged = mitre.some((id) => TECHNIQUE.test(id));
  return {
    tagged,
    suspectContext: tagged && Number.isFinite(level) && level >= SUSPECT_MIN_LEVEL,
    temp: TEMP_PATH.test(path),
    startup: STARTUP_PATH.test(path) || STARTUP_WORD.test(description),
    service: SERVICE.test(description),
    task: TASK.test(description),
    unsigned: UNSIGNED.test(description),
    unknown: UNKNOWN_ENTRY.test(description),
    randomName: RANDOM_NAME.test(description),
    unverified: UNVERIFIED.test(description),
    changed: CHANGED.test(description),
    burst: Number.isFinite(count) && count >= BURST_COUNT,
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
    if (e.startup && e.task && e.temp) return answer(PATTERNS.startupAndTask);
    if (e.service && e.temp && (e.unsigned || e.unknown)) return answer(PATTERNS.serviceTemp);
    if (e.service && e.unsigned && e.burst) return answer(PATTERNS.serviceBurst);
    if (e.task && e.temp && (e.unknown || e.randomName)) return answer(PATTERNS.taskTemp);
    if (e.startup && (e.unknown || e.temp)) return answer(PATTERNS.startupUnknown);
  }
  if (e.suspectContext) {
    if (e.unverified) return answer(PATTERNS.unverified);
    if (e.temp) return answer(PATTERNS.tempOnly);
    if (e.changed) return answer(PATTERNS.changeOnly);
    return answer(PATTERNS.tagged);
  }
  return { action: 'record', confidence: 0.05, reason: '알려진 패턴 없음, 정상 이벤트로 기록' };
}
