// patterns.json 과 같은 내용을 담은 내장 패턴입니다. 실행 때 다른 파일을 읽지 않아 격리 실행에서도 같은 결과를 냅니다.
// (test/xdr-exfiltration.test.mjs 가 이름·확신도가 patterns.json 과 같은지, reason 이 패턴 이름인지 확인합니다.)
// import 문, 파일 읽기·쓰기, 바깥 질의가 없습니다. 내보내는 것은 decide 하나입니다.
const PATTERNS = Object.freeze({
  bulkFiles: { id: 'bulk-files-large-transfer', name: '한꺼번에 많은 파일을 대용량으로 전송', tier: 'clear', baseConfidence: 0.95 },
  archiveOutside: { id: 'archive-outside-hours', name: '업무 시간 밖 압축 파일 반출', tier: 'clear', baseConfidence: 0.95 },
  repeated: { id: 'repeated-large-transfer', name: '같은 목적지로 대용량 전송 반복', tier: 'clear', baseConfidence: 0.92 },
  archiveNew: { id: 'archive-to-new-destination', name: '처음 보는 주소로 압축 파일 대용량 전송', tier: 'clear', baseConfidence: 0.9 },
  largeNew: { id: 'large-transfer-new-destination', name: '처음 보는 목적지로 대용량 전송', tier: 'clear', baseConfidence: 0.9 },
  smallUnusual: { id: 'small-transfer-unusual-address', name: '평소와 다른 주소로 작은 전송', tier: 'suspect', baseConfidence: 0.65 },
  archiveOnly: { id: 'archive-without-transfer', name: '압축 파일만 만들었거나 일부만 전송', tier: 'suspect', baseConfidence: 0.6 },
  usualChange: { id: 'usual-destination-volume-change', name: '평소 목적지의 전송량·파일 수 변화', tier: 'suspect', baseConfidence: 0.55 },
  tagged: { id: 'exfiltration-tagged-low-signal', name: '유출 기법 표시만 있는 약한 신호', tier: 'suspect', baseConfidence: 0.5 },
});

const BLOCK_AT = 0.85;
const ALERT_AT = 0.5;
const SUSPECT_MIN_LEVEL = 5;
const LARGE_BYTES = 50000000;
const MANY_FILES = 50;
const REPEAT_COUNT = 5;

const TECHNIQUE = /^T(?:1041|1048)/;
const ARCHIVE = /압축\s*파일/;
const OUTSIDE_HOURS = /수업\s*시간\s*밖|업무\s*시간\s*밖/;
const NEW_DESTINATION = /처음\s*(?:보는\s*)?(?:목적지|주소)|목적지는\s*처음|외부\s*주소/;
const UNUSUAL_ADDRESS = /평소와\s*다른\s*주소/;
const USUAL_CHANGE = /평소보다\s*(?:한\s*번\s*)?높|평소\s*목적지|수업\s*자료\s*주소|백업처럼/;

// 원본 경보에서 패턴 비교에 필요한 값만 읽습니다. 원본은 고치지 않습니다.
function evidenceOf(alert) {
  const data = alert?.data && typeof alert.data === 'object' ? alert.data : {};
  const description = String(alert?.rule?.description ?? '');
  const level = Number(alert?.rule?.level);
  const bytes = Number(data.bytes);
  const files = Number(data.files);
  const count = Number(data.count);
  const mitre = [alert?.rule?.mitre].flat().map(String);
  const newDestination = NEW_DESTINATION.test(description);
  return {
    tagged: mitre.some((id) => TECHNIQUE.test(id)),
    level: Number.isFinite(level) ? level : 0,
    large: Number.isFinite(bytes) && bytes >= LARGE_BYTES,
    manyFiles: Number.isFinite(files) && files >= MANY_FILES,
    repeated: Number.isFinite(count) && count >= REPEAT_COUNT,
    archive: ARCHIVE.test(description),
    outsideHours: OUTSIDE_HOURS.test(description),
    newDestination,
    unusualAddress: newDestination || UNUSUAL_ADDRESS.test(description),
    usualChange: USUAL_CHANGE.test(description),
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
    if (e.manyFiles && e.large) return answer(PATTERNS.bulkFiles);
    if (e.archive && e.outsideHours && e.large) return answer(PATTERNS.archiveOutside);
    if (e.repeated && e.large) return answer(PATTERNS.repeated);
    if (e.archive && e.newDestination && e.large) return answer(PATTERNS.archiveNew);
    if (e.newDestination && e.large) return answer(PATTERNS.largeNew);
    if (e.level >= SUSPECT_MIN_LEVEL) {
      if (e.unusualAddress) return answer(PATTERNS.smallUnusual);
      if (e.archive) return answer(PATTERNS.archiveOnly);
      if (e.usualChange) return answer(PATTERNS.usualChange);
      return answer(PATTERNS.tagged);
    }
  }
  return { action: 'record', confidence: 0.05, reason: '알려진 패턴 없음, 정상 이벤트로 기록' };
}
