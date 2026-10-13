import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide } from './decide.mjs';
import { extractAlert } from './read-alerts.mjs';

// decide.mjs 는 판단 결과만 돌려줍니다. 파일 쓰기(거부 규칙, 알림 기록)와 판정기 연결은 이 파일이 맡습니다.
// 판정기(src/decider.mjs)의 기존 규칙은 고치지 않고, 판정기 앞에 거부 확인 단계만 꽂습니다.
export const DENY_RULE_ID = 'xdr.persistence.deny';
export const DENY_REASON_CODE = 'persistence_blocked';
export const DENY_TTL_MS = 24 * 60 * 60 * 1000;
const SERVICE_ACCOUNT = /^svc-/i;

// 이 대역은 내부 사용자일 수 있어 자동으로 막지 않습니다.
function isPrivateAddress(ip) {
  if (isIP(ip) === 6) return /^(::1$|f[cd]|fe80)/i.test(ip);
  const [a, b] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

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

// 차단 후보를 고릅니다. 이 경보는 공격 경보에도 계정이 붙어 있어서 계정 유무가 아니라 아래로 정상 사용자를 지킵니다.
// 1) decide 를 다시 불러도 block 인가 (넘겨받은 결과만 믿지 않음)
// 2) 올바른 IP 이고 내부 대역이 아닌가
// 3) 같은 주소에서 정상(record) 경보가 나오지 않았는가
// 4) 서비스 계정(svc-)이 아닌가, 같은 주소를 쓰는 다른 계정의 경보가 없는가
export async function planBlocks(alerts, decisions, ttlMs = DENY_TTL_MS) {
  const rows = alerts.map((alert) => extractAlert(alert));
  const accountsBySource = new Map();
  const recordSources = new Set();
  rows.forEach((row, i) => {
    if (!accountsBySource.has(row.srcip)) accountsBySource.set(row.srcip, new Set());
    if (row.account) accountsBySource.get(row.srcip).add(row.account);
    if (decisions[i].action === 'record') recordSources.add(row.srcip);
  });
  const rules = new Map();
  const enforced = await Promise.all(alerts.map(async (alert, i) => {
    const decision = decisions[i];
    if (decision.action !== 'block' || (await decide(alert)).action !== 'block') return false;
    const { srcip, account } = rows[i];
    if (!isIP(srcip) || isPrivateAddress(srcip) || recordSources.has(srcip)) return false;
    if (SERVICE_ACCOUNT.test(account) || accountsBySource.get(srcip).size > 1) return false;
    if (!rules.has(srcip)) rules.set(srcip, makeDenyRule(alert, decision, ttlMs));
    return true;
  }));
  return { rules: [...rules.values()], enforced };
}

export async function writeBlocks({ alerts, decisions, rulesPath, logPath, ttlMs }) {
  const plan = await planBlocks(alerts, decisions, ttlMs);
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
export function withPersistenceGuard(decider, rules, now = () => new Date()) {
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
    return decider(request);
  };
}

export async function loadDenyRules(rulesPath) {
  const file = JSON.parse(await readFile(rulesPath, 'utf8'));
  return Array.isArray(file?.rules) ? file.rules : [];
}

// 시험 경보를 판단하고 차단 후보를 deny-rules.json, 알림을 xdr/alerts.log 에 씁니다.
export async function applyPersistence(root) {
  const fixture = JSON.parse(await readFile(join(root, 'xdr', 'fixtures', 'persistence.json'), 'utf8'));
  const decisions = await Promise.all(fixture.alerts.map((alert) => decide(alert)));
  return writeBlocks({
    alerts: fixture.alerts,
    decisions,
    rulesPath: join(root, 'xdr', 'persistence', 'deny-rules.json'),
    logPath: join(root, 'xdr', 'alerts.log'),
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
    const out = await applyPersistence(root);
    console.log(`차단 규칙 ${out.rules.length}건, 새 알림 ${out.logged}줄`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : '실행 오류');
    process.exitCode = 1;
  }
}
