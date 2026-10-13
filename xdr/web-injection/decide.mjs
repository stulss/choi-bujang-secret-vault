// patterns.json 과 동일한 패턴을 모듈 내에 내장하여 격리 환경에서도 독립 실행 가능하게 합니다.
// 내보내는 것은 오직 decide 하나입니다.
const PATTERNS = Object.freeze([
  {
    id: 'sql-injection-burst',
    name: '요청 인자 안의 SQL 구문 반복',
    tier: 'clear',
    baseConfidence: 0.95,
    test: (e) => (e.hasSql || e.hasDb) && (e.count >= 8 || e.level >= 10),
  },
  {
    id: 'xss-script-injection-burst',
    name: '스크립트 태그 삽입 반복',
    tier: 'clear',
    baseConfidence: 0.95,
    test: (e) => e.hasScript && (e.count >= 8 || e.level >= 10),
  },
  {
    id: 'path-traversal-burst',
    name: '경로 거슬러 올라가기(../) 반복',
    tier: 'clear',
    baseConfidence: 0.95,
    test: (e) => e.hasTraversal && (e.count >= 8 || e.level >= 10),
  },
  {
    id: 'command-separator-burst',
    name: '명령 구분자 표기 반복',
    tier: 'clear',
    baseConfidence: 0.95,
    test: (e) => e.hasCommand && (e.count >= 8 || e.level >= 10),
  },
  {
    id: 'injection-single-or-suspect',
    name: '반복 없는 단발성 주입 의심 문자',
    tier: 'suspect',
    baseConfidence: 0.5,
    test: (e) => e.count >= 1 || e.level >= 5,
  },
]);

const BLOCK_AT = 0.85;
const ALERT_AT = 0.5;
const JEV_TIMEOUT_MS = 3000;
const INJECTION_CONTEXT = /sql|데이터베이스|스크립트|script|경로|이탈|거슬러|명령|구분|따옴표|주입|삽입|select|\.\./i;

function evidenceOf(alert) {
  const description = String(alert?.rule?.description ?? '');
  const mitre = [alert?.rule?.mitre].flat().map(String);
  const count = Number(alert?.data?.count);
  const level = Number(alert?.rule?.level);

  const isT1190 = mitre.some((id) => id.startsWith('T1190'));
  const injectionContext = isT1190 || INJECTION_CONTEXT.test(description);

  return {
    injectionContext,
    level: Number.isFinite(level) ? level : 0,
    count: Number.isFinite(count) ? count : 1,
    hasSql: /sql/i.test(description),
    hasDb: /데이터베이스/i.test(description),
    hasScript: /스크립트|script/i.test(description),
    hasTraversal: /거슬러|이탈|경로\s*이탈|\.\./i.test(description),
    hasCommand: /명령\s*구분자|구분\s*문자/i.test(description),
  };
}

function matchTier(alert, tier) {
  const evidence = evidenceOf(alert);
  if (!evidence.injectionContext) return undefined;
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

// decide(alert) -> { action: 'block' | 'alert' | 'record', confidence, reason }
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
