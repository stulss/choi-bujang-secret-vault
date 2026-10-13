import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { decide as ztnaDecide } from '../src/decider.mjs';
import { fixtureRequests } from '../scripts/fixture-7.mjs';
import { decide } from '../xdr/known-cve/decide.mjs';
import { readAlerts, redact } from '../xdr/known-cve/read-alerts.mjs';
import { DENY_REASON_CODE, planBlocks, withKnownCveGuard } from '../xdr/known-cve/respond.mjs';

const FIXTURE = new URL('../xdr/fixtures/known-cve.json', import.meta.url);
const alerts = JSON.parse(await readFile(FIXTURE, 'utf8')).alerts;
const original = JSON.stringify(alerts);
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => `kc-${String(from + i).padStart(2, '0')}`);
const CLEAR = new Set(range(1, 8));
const AMBIGUOUS = new Set(range(9, 16));
const NORMAL = new Set(range(17, 24));
const decisions = alerts.map((alert) => decide(alert));
const NOW = () => new Date('2026-09-27T12:00:00+09:00');

test('경보 건수와 뽑은 줄 수가 같고 원본 경보는 그대로다', async () => {
  const rows = await readAlerts(FIXTURE);
  assert.equal(rows.length, alerts.length);
  assert.deepEqual(Object.keys(rows[0]), ['id', 'time', 'srcip', 'account', 'level', 'description']);
  assert.equal(JSON.stringify(alerts), original);
  assert.doesNotMatch(JSON.stringify(rows), /\$\{jndi:/u);
});

test('비밀값처럼 보이는 값은 가려진다', () => {
  assert.equal(redact('password=hunter2 로그인 실패'), '[가림] 로그인 실패');
  assert.equal(redact('token: abc123 사용'), '[가림] 사용');
});

test('명확한 공격은 block, 애매한 건 alert, 정상 이벤트는 record 로 나뉜다', () => {
  alerts.forEach((alert, i) => {
    const want = CLEAR.has(alert.id) ? 'block' : AMBIGUOUS.has(alert.id) ? 'alert' : 'record';
    assert.equal(decisions[i].action, want, `${alert.id} ${decisions[i].reason}`);
    assert.ok(decisions[i].confidence >= 0 && decisions[i].confidence <= 1, alert.id);
    assert.ok(decisions[i].reason.length > 0 && !decisions[i].reason.includes('\n'), alert.id);
  });
  assert.equal(NORMAL.size, alerts.filter((alert) => NORMAL.has(alert.id)).length);
});

test('확신도 기준: 0.85 이상 block, 0.5 이상 alert, 그 아래 record', () => {
  for (const d of decisions) {
    assert.equal(d.action, d.confidence >= 0.85 ? 'block' : d.confidence >= 0.5 ? 'alert' : 'record');
  }
});

test('decide.mjs 는 decide 하나만 내보내고 import·파일·바깥 질의가 없다', async () => {
  const mod = await import('../xdr/known-cve/decide.mjs');
  assert.deepEqual(Object.keys(mod), ['decide']);
  const source = await readFile(new URL('../xdr/known-cve/decide.mjs', import.meta.url), 'utf8');
  const code = source.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(code, /^\s*import\b|\bimport\s*\(|\brequire\s*\(|\bfetch\s*\(|readFile|writeFile|appendFile|node:|process\.|Date\.now|Math\.random/mu);
});

test('상수는 patterns.json 과 같고, 패턴마다 근거가 한 줄씩 있다', async () => {
  const file = JSON.parse(await readFile(new URL('../xdr/known-cve/patterns.json', import.meta.url), 'utf8'));
  const source = await readFile(new URL('../xdr/known-cve/decide.mjs', import.meta.url), 'utf8');
  assert.ok(file.patterns.length > 0);
  for (const p of file.patterns) {
    assert.ok(typeof p.evidence === 'string' && p.evidence.length > 0 && !p.evidence.includes('\n'), p.id);
    assert.ok(typeof p.name === 'string' && p.name.length > 0 && p.condition && typeof p.condition === 'object', p.id);
    assert.ok(source.includes(`id: '${p.id}', name: '${p.name}', tier: '${p.tier}', baseConfidence: ${p.baseConfidence} }`), p.id);
  }
  const names = file.patterns.map((p) => p.name);
  decisions.forEach((d, i) => {
    if (d.action !== 'record') assert.ok(names.includes(d.reason), alerts[i].id);
  });
});

test('시험 경보를 다시 흘리면 명확한 공격 주소만 막히고 정상 요청은 통과한다', async () => {
  const { rules, enforced } = await planBlocks(alerts, decisions);
  assert.ok(rules.length > 0 && rules.every((rule) => rule.expiresAt && rule.sourceAlertId && rule.ruleId));
  alerts.forEach((alert, i) => assert.equal(enforced[i], CLEAR.has(alert.id), alert.id));

  const request = fixtureRequests().normal;
  const guarded = withKnownCveGuard(ztnaDecide, rules, NOW);
  assert.equal((await ztnaDecide(request)).decision, 'allow');
  for (const alert of alerts) {
    const out = await guarded({ ...request, requestId: alert.id }, { srcip: alert.data.srcip });
    if (CLEAR.has(alert.id)) {
      assert.equal(out.decision, 'deny', alert.id);
      assert.equal(out.reasonCode, DENY_REASON_CODE, alert.id);
    } else {
      assert.equal(out.decision, 'allow', alert.id);
    }
  }
  assert.equal((await guarded(request, { srcip: '192.0.2.60' })).decision, 'allow');
  assert.equal((await guarded(request, {})).decision, 'allow');
  // 만료 뒤에는 막지 않는다
  const expired = withKnownCveGuard(ztnaDecide, rules, () => new Date('2026-09-29T12:00:00+09:00'));
  assert.equal((await expired(request, { srcip: '203.0.113.10' })).decision, 'allow');
});

test('정상 사용자와 같은 주소·계정이 있는 주소·내부 주소는 막지 않는다', async () => {
  const attack = alerts.find((alert) => alert.id === 'kc-01');
  const normal = alerts.find((alert) => alert.id === 'kc-17');
  const clone = (id, data) => ({ ...structuredClone(attack), id, data: { ...structuredClone(attack.data), ...data } });
  const cases = [
    [[clone('x-1', { srcip: '203.0.113.99' }), { ...structuredClone(normal), id: 'x-2', data: { ...normal.data, srcip: '203.0.113.99' } }], false],
    // 계정이 있는 경보가 같은 주소에서 alert 로 나온 경우(record 가 아님)에도 막지 않는다
    [[clone('x-3', { srcip: '203.0.113.98' }), { id: 'x-4', rule: { level: 6, mitre: ['T1190'], description: 'x' }, data: { srcip: '203.0.113.98', srcuser: 'user01', url: '/search?q=CVE-2021-44228' } }], false],
    [[clone('x-5', { srcip: '192.168.1.20' })], false],
    [[clone('x-6', { srcip: 'not-an-ip' })], false],
    [[clone('x-7', { srcip: '203.0.113.97' })], true],
  ];
  for (const [list, expected] of cases) {
    const ds = list.map((alert) => decide(alert));
    const { enforced } = await planBlocks(list, ds);
    assert.equal(enforced[0], expected, list[0].id);
  }
});

test('깨진 인코딩이나 빈 경보도 오류 없이 record 또는 alert 로 답한다', () => {
  const broken = { id: 'x', rule: { level: 6, mitre: ['T1190'] }, data: { srcip: '203.0.113.5', url: '/x?q=%E0%A4%A' } };
  assert.equal(decide(broken).action, 'alert');
  assert.equal(decide({}).action, 'record');
  assert.equal(decide(null).action, 'record');
});
