import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { decide } from '../xdr/brute-force/decide.mjs';
import { readAlerts, redact } from '../xdr/brute-force/read-alerts.mjs';
import { planBlocks, withBruteForceGuard } from '../xdr/brute-force/guard.mjs';

const fixture = JSON.parse(await readFile(new URL('../xdr/fixtures/brute-force.json', import.meta.url), 'utf8'));
const alerts = fixture.alerts;
const NORMAL = new Set(['bf-20', 'bf-21', 'bf-22', 'bf-23', 'bf-24', 'bf-25', 'bf-26', 'bf-27', 'bf-28']);
const decisions = await Promise.all(alerts.map((alert) => decide(alert)));

test('경보 건수와 뽑은 줄 수가 같다', async () => {
  const rows = await readAlerts(new URL('../xdr/fixtures/brute-force.json', import.meta.url));
  assert.equal(rows.length, alerts.length);
});

test('비밀값처럼 보이는 값은 가려진다', () => {
  assert.equal(redact('password=hunter2 로그인 실패'), '[가림] 로그인 실패');
});

test('정상 이벤트는 record, 명확한 공격은 block, 애매한 건 alert', () => {
  alerts.forEach((alert, i) => {
    if (NORMAL.has(alert.id)) assert.equal(decisions[i].action, 'record', alert.id);
  });
  assert.equal(decisions.filter((d) => d.action === 'block').length, 10);
  assert.ok(decisions.every((d, i) => NORMAL.has(alerts[i].id) || d.action !== 'record'));
});

test('Jev 무응답은 alert, 높은 확신도는 block, 낮은 확신도는 record', async () => {
  const ambiguous = alerts.find((alert) => alert.id === 'bf-13');
  assert.equal((await decide(ambiguous, { askJev: () => new Promise(() => {}) })).action, 'alert');
  assert.equal((await decide(ambiguous, { askJev: () => { throw new Error('x'); } })).action, 'alert');
  assert.equal((await decide(ambiguous, { askJev: () => 0.9 })).action, 'block');
  assert.equal((await decide(ambiguous, { askJev: () => 0.2 })).action, 'record');
});

test('시험 경보를 다시 흘리면 명확한 공격 주소만 막히고 정상 요청은 통과한다', async () => {
  const { rules, enforced } = planBlocks(alerts, decisions);
  assert.ok(rules.every((rule) => rule.expiresAt && rule.sourceAlertId));
  const guarded = withBruteForceGuard(async (request) => ({ decision: 'allow', requestId: request.requestId }), rules, () => new Date('2026-09-27T12:00:00+09:00'));

  alerts.forEach((alert, i) => {
    const isNormal = NORMAL.has(alert.id);
    if (isNormal) assert.equal(enforced[i], false, alert.id);
  });
  for (const alert of alerts) {
    const srcip = alert.data.srcip;
    const out = await guarded({ requestId: alert.id }, { srcip });
    if (NORMAL.has(alert.id)) assert.equal(out.decision, 'allow', alert.id);
  }
  assert.equal((await guarded({ requestId: 'a' }, { srcip: '203.0.113.10' })).decision, 'deny');
  assert.equal((await guarded({ requestId: 'b' }, { srcip: '192.0.2.60' })).decision, 'allow');
  // 만료 뒤에는 막지 않는다
  const expired = withBruteForceGuard(async () => ({ decision: 'allow' }), rules, () => new Date('2026-09-29T12:00:00+09:00'));
  assert.equal((await expired({ requestId: 'c' }, { srcip: '203.0.113.10' })).decision, 'allow');
});
