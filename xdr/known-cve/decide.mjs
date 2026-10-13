// patterns.json 과 같은 내용을 담은 내장 패턴입니다. 실행 때 다른 파일을 읽지 않아 격리 실행에서도 같은 결과를 냅니다.
// (test/xdr-known-cve.test.mjs 가 이름·확신도가 patterns.json 과 같은지, reason 이 패턴 이름인지 확인합니다.)
// import 문, 파일 읽기·쓰기, 바깥 질의가 없습니다. 내보내는 것은 decide 하나입니다.
const PATTERNS = Object.freeze({
  headerAndUrl: { id: 'lookup-in-header-and-url', name: '머리글과 주소 인자에 같은 원격 조회 구문', tier: 'clear', baseConfidence: 0.97 },
  header: { id: 'lookup-in-header', name: '요청 머리글 안의 원격 조회 구문', tier: 'clear', baseConfidence: 0.9 },
  url: { id: 'lookup-in-url-argument', name: '주소 인자 안의 원격 조회 구문', tier: 'clear', baseConfidence: 0.9 },
  word: { id: 'cve-or-lookup-word-only', name: '취약점 번호나 조회 단어만 있고 완전한 구문은 없음', tier: 'suspect', baseConfidence: 0.65 },
  scanner: { id: 'vulnerability-scanner-trace', name: '알려진 취약점 점검 도구의 흔적', tier: 'suspect', baseConfidence: 0.55 },
  tagged: { id: 't1190-tagged-low-signal', name: 'T1190 표시만 있는 약한 신호', tier: 'suspect', baseConfidence: 0.5 },
});

const BLOCK_AT = 0.85;
const ALERT_AT = 0.5;
const SUSPECT_MIN_LEVEL = 5;
const REPEAT_COUNT = 3;
const REPEAT_BONUS = 0.03;

// 완전한 원격 조회 구문: ${ jndi : 접속방식 :// ... }. 번호·단어·조각만 있는 것은 여기에 걸리지 않습니다.
const FULL_LOOKUP = /\$\{\s*jndi\s*:\s*[a-z]{3,6}\s*:\/\//i;
const LOOKUP_WORD = /CVE-2021-44228|jndi|lookup|\$\{/i;
const SCANNER_TRACE = /점검\s*도구|스캐너|scanner|scan|probe/i;
const NOT_HEADER_FIELDS = new Set(['srcip', 'dstip', 'srcuser', 'count', 'url']);

// 주소 인자는 퍼센트 인코딩으로 올 수 있어 원문과 해제본을 모두 봅니다. 해제할 수 없으면 원문만 씁니다.
function decoded(text) {
  try {
    return `${text}\n${decodeURIComponent(text)}`;
  } catch {
    return text;
  }
}

// 원본 경보에서 패턴 비교에 필요한 값만 읽습니다. 원본은 고치지 않습니다.
function evidenceOf(alert) {
  const data = alert?.data && typeof alert.data === 'object' ? alert.data : {};
  const headerText = Object.entries(data)
    .filter(([key, value]) => !NOT_HEADER_FIELDS.has(key) && typeof value === 'string')
    .map(([, value]) => value).join('\n');
  const urlText = typeof data.url === 'string' ? data.url : '';
  const description = String(alert?.rule?.description ?? '');
  const count = Number(data.count);
  const level = Number(alert?.rule?.level);
  const mitre = [alert?.rule?.mitre].flat().map(String);
  const all = `${decoded(headerText)}\n${decoded(urlText)}`;
  return {
    inHeader: FULL_LOOKUP.test(decoded(headerText)),
    inUrl: FULL_LOOKUP.test(decoded(urlText)),
    repeated: Number.isFinite(count) && count >= REPEAT_COUNT,
    suspectContext: mitre.some((id) => id.startsWith('T1190')) && Number.isFinite(level) && level >= SUSPECT_MIN_LEVEL,
    hasWord: LOOKUP_WORD.test(all),
    hasScanner: SCANNER_TRACE.test(`${all}\n${description}`),
  };
}

function toAction(confidence) {
  if (confidence >= BLOCK_AT) return 'block';
  if (confidence >= ALERT_AT) return 'alert';
  return 'record';
}

function answer(pattern, bonus = 0) {
  const confidence = Math.min(1, Math.round((pattern.baseConfidence + bonus) * 100) / 100);
  return { action: toAction(confidence), confidence, reason: pattern.name };
}

// decide(alert) -> { action: 'block' | 'alert' | 'record', confidence, reason }
// confidence 는 경보가 패턴과 얼마나 뚜렷하게 맞는지 0~1 로 매긴 값입니다. 0.85 이상 block, 0.5 이상 alert, 그 아래 record.
export function decide(alert) {
  const e = evidenceOf(alert);
  const bonus = e.repeated ? REPEAT_BONUS : 0;
  if (e.inHeader && e.inUrl) return answer(PATTERNS.headerAndUrl, bonus);
  if (e.inHeader) return answer(PATTERNS.header, bonus);
  if (e.inUrl) return answer(PATTERNS.url, bonus);
  if (e.suspectContext) {
    if (e.hasWord) return answer(PATTERNS.word);
    if (e.hasScanner) return answer(PATTERNS.scanner);
    return answer(PATTERNS.tagged);
  }
  return { action: 'record', confidence: 0.05, reason: '알려진 패턴 없음, 정상 이벤트로 기록' };
}
