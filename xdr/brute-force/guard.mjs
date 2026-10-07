import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { isClearAttack } from './decide.mjs';
import { extractAlert } from './read-alerts.mjs';

export const DENY_RULE_ID = 'xdr.brute-force.deny';
export const DENY_REASON_CODE = 'brute_force_blocked';
export const DENY_TTL_MS = 24 * 60 * 60 * 1000;

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;

export function makeDenyRule(alert, decision, ttlMs = DENY_TTL_MS) {
  const row = extractAlert(alert);
  const createdAt = new Date(row.time);
  return {
    ruleId: DENY_RULE_ID,
    srcip: row.srcip,
    account: row.account,
    sourceAlertId: row.id,
    reason: decision.reason,
    confidence: decision.confidence,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + ttlMs).toISOString(),
  };
}

// 알림 한 줄. 비밀값은 extractAlert 가 이미 가렸습니다.
export function alertLine(alert, decision, enforced) {
  const row = extractAlert(alert);
  return [row.time, decision.action, enforced ? 'enforced' : 'logged', row.id, row.srcip, row.account, decision.confidence, decision.reason]
    .join(' | ');
}

// 차단 후보를 고릅니다. 정상 사용자를 막지 않도록 세 가지를 다시 확인합니다.
// 1) 규칙만으로 명확한 공격인가 (Jev 확신도만으로는 막지 않음)
// 2) 올바른 IPv4 주소인가
// 3) 같은 주소에서 정상(record) 이벤트가 나오지 않았는가
export function planBlocks(alerts, decisions, ttlMs = DENY_TTL_MS) {
  const normalSources = new Set();
  alerts.forEach((alert, i) => {
    if (decisions[i].action === 'record') normalSources.add(extractAlert(alert).srcip);
  });
  const rules = new Map();
  const enforced = alerts.map((alert, i) => {
    const decision = decisions[i];
    if (decision.action !== 'block' || !isClearAttack(alert)) return false;
    const { srcip } = extractAlert(alert);
    if (!IPV4.test(srcip) || normalSources.has(srcip)) return false;
    if (!rules.has(srcip)) rules.set(srcip, makeDenyRule(alert, decision, ttlMs));
    return true;
  });
  return { rules: [...rules.values()], enforced };
}

export async function writeBlocks({ alerts, decisions, rulesPath, logPath, ttlMs }) {
  const plan = planBlocks(alerts, decisions, ttlMs);
  await mkdir(dirname(rulesPath), { recursive: true });
  await writeFile(rulesPath, `${JSON.stringify({ schema: 'aleph.xdr.deny-rules.v1', rules: plan.rules }, null, 2)}\n`, 'utf8');

  let existing = '';
  try { existing = await readFile(logPath, 'utf8'); } catch { /* 첫 실행 */ }
  const seen = new Set(existing.split('\n').filter(Boolean));
  const fresh = [];
  alerts.forEach((alert, i) => {
    if (decisions[i].action === 'record') return;
    const line = alertLine(alert, decisions[i], plan.enforced[i]);
    if (!seen.has(line)) fresh.push(line);
  });
  if (fresh.length) await appendFile(logPath, `${fresh.join('\n')}\n`, 'utf8');
  return { ...plan, logged: fresh.length };
}

// 판정기 앞에 꽂는 확인 단계. 판정기 규칙은 대신하지 않고, 만료 전 거부 규칙에 걸린 주소만 먼저 거부합니다.
// source 는 엔진이 확인한 출발 주소입니다(요청 18개 항목에는 주소가 없어 별도 인자로 받습니다).
export function withBruteForceGuard(decide, rules, now = () => new Date()) {
  return async (request, source = {}) => {
    const at = now().getTime();
    const hit = rules.find((rule) => rule.srcip === source.srcip && Date.parse(rule.expiresAt) > at);
    if (hit) {
      return {
        schema: 'aleph.decision.v1',
        requestId: request.requestId,
        decision: 'deny',
        reasonCode: DENY_REASON_CODE,
        ruleIds: [hit.ruleId],
      };
    }
    return decide(request);
  };
}

export async function loadDenyRules(rulesPath) {
  const file = JSON.parse(await readFile(rulesPath, 'utf8'));
  return Array.isArray(file?.rules) ? file.rules : [];
}
