// patterns.json 과 같은 내용을 담은 내장 패턴입니다. 실행 때 다른 파일을 읽지 않아 격리 실행에서도 같은 결과를 냅니다.
// (test/xdr-brute-force.test.mjs 가 reason 이 patterns.json 의 이름인지 확인합니다.) 내보내는 것은 decide 하나입니다.
const PATTERNS = Object.freeze([
  { id: 'multi-account-same-password', name: '여러 계정 같은 비밀번호 대입', tier: 'clear', baseConfidence: 0.9, test: (e) => e.accounts >= 5 },
  { id: 'same-source-failure-burst', name: '같은 주소 로그인 실패 연속', tier: 'clear', baseConfidence: 0.95, test: (e) => e.failures >= 30 || e.level >= 10 },
  { id: 'failures-below-threshold', name: '기준 미만 로그인 실패', tier: 'suspect', baseConfidence: 0.5, test: (e) => e.failures >= 3 || e.level >= 5 },
]);

const BLOCK_AT = 0.85;
const ALERT_AT = 0.5;
const JEV_TIMEOUT_MS = 3000;
const LOGIN_CONTEXT = /로그인|비밀번호|계정|login|password|auth/i;

// 원본 경보에서 패턴 비교에 필요한 숫자만 읽습니다. 원본은 고치지 않습니다.
function evidenceOf(alert) {
  const description = String(alert?.rule?.description ?? '');
  const mitre = [alert?.rule?.mitre].flat().map(String);
  const failures = Number(alert?.data?.count);
  const level = Number(alert?.rule?.level);
  const accountsData = alert?.data?.accounts;
  const listed = (Array.isArray(accountsData) ? accountsData : String(accountsData ?? '').split(','))
    .filter((name) => String(name).trim()).length;
  const described = Number(/계정\s*(\d+)\s*개/.exec(description)?.[1] ?? 0);
  // 공격 형태 경보인지: ATT&CK T1110 표시가 있거나, 설명이 로그인 실패 이야기일 때만 패턴을 봅니다.
  const bruteContext = mitre.some((id) => id.startsWith('T1110')) || (LOGIN_CONTEXT.test(description) && /실패/.test(description));
  return {
    bruteContext,
    level: Number.isFinite(level) ? level : 0,
    failures: Number.isFinite(failures) ? failures : 0,
    accounts: Math.max(listed, described),
  };
}

function matchTier(alert, tier) {
  const evidence = evidenceOf(alert);
  if (!evidence.bruteContext) return undefined;
  return PATTERNS.find((pattern) => pattern.tier === tier && pattern.test(evidence));
}

function toAction(confidence) {
  if (confidence >= BLOCK_AT) return 'block';
  if (confidence >= ALERT_AT) return 'alert';
  return 'record';
}

async function askWithTimeout(askJev, payload) {
  let timer;
  try {
    const answer = await Promise.race([
      Promise.resolve(askJev(payload)),
      new Promise((resolve) => { timer = setTimeout(() => resolve(undefined), JEV_TIMEOUT_MS); }),
    ]);
    const value = typeof answer === 'number' ? answer : answer?.confidence;
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

// decide(alert) -> { action, confidence, reason }
// askJev 는 애매한 경보에만 불립니다. 응답이 없거나 형식이 틀리면 alert 로 남깁니다.
export async function decide(alert, { askJev } = {}) {
  const clear = matchTier(alert, 'clear');
  if (clear) {
    return { action: toAction(clear.baseConfidence), confidence: clear.baseConfidence, reason: clear.name };
  }

  const suspect = matchTier(alert, 'suspect');
  if (!suspect) {
    return { action: 'record', confidence: 0.05, reason: '알려진 패턴 없음, 정상 이벤트로 기록' };
  }

  const answered = typeof askJev === 'function'
    ? await askWithTimeout(askJev, { id: String(alert?.id ?? ''), pattern: suspect.name, evidence: evidenceOf(alert) })
    : undefined;
  if (answered === undefined) {
    return { action: 'alert', confidence: ALERT_AT, reason: `${suspect.name} (Jev 무응답)` };
  }
  return { action: toAction(answered), confidence: answered, reason: `${suspect.name} (Jev ${answered})` };
}
