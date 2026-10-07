import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractAlert } from './read-alerts.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const { patterns } = JSON.parse(await readFile(join(here, 'patterns.json'), 'utf8'));

export const BLOCK_AT = 0.85;
export const ALERT_AT = 0.5;
const JEV_TIMEOUT_MS = 3000;

// 원본 경보에서 패턴 비교에 필요한 숫자만 읽습니다. 원본은 고치지 않습니다.
function evidenceOf(alert) {
  const failures = Number(alert?.data?.count);
  const listed = String(alert?.data?.accounts ?? '').split(',').filter((name) => name.trim()).length;
  const described = Number(/계정\s*(\d+)\s*개/.exec(String(alert?.rule?.description ?? ''))?.[1] ?? 0);
  return {
    mitre: Array.isArray(alert?.rule?.mitre) ? alert.rule.mitre : [],
    level: Number.isFinite(alert?.rule?.level) ? alert.rule.level : 0,
    failures: Number.isFinite(failures) ? failures : 0,
    accounts: Math.max(listed, described),
  };
}

function matches(pattern, evidence) {
  const c = pattern.condition;
  return evidence.mitre.includes(c.mitre)
    && evidence.level >= (c.minLevel ?? 0)
    && evidence.failures >= (c.minFailures ?? 0)
    && evidence.accounts >= (c.minAccounts ?? 0);
}

function matchTier(alert, tier) {
  const evidence = evidenceOf(alert);
  return patterns.find((pattern) => pattern.tier === tier && matches(pattern, evidence));
}

// 차단 연결이 한 번 더 확인하는 기준: 규칙만으로 명확한 공격인가.
export function isClearAttack(alert) {
  return Boolean(matchTier(alert, 'clear'));
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
    ? await askWithTimeout(askJev, { alert: extractAlert(alert), pattern: suspect.name, evidence: evidenceOf(alert) })
    : undefined;
  if (answered === undefined) {
    return { action: 'alert', confidence: ALERT_AT, reason: `${suspect.name} (Jev 무응답)` };
  }
  return { action: toAction(answered), confidence: answered, reason: `${suspect.name} (Jev ${answered})` };
}
