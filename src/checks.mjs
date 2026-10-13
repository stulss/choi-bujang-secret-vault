import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fixtureRequests } from '../scripts/fixture-7.mjs';
import { evaluateTestPolicy, loadVerifiedBackup } from '../scripts/policy-restore.mjs';
import { decide } from './decider.mjs';
import { detect } from './detect.mjs';

// 12단계 점검 기록의 서버 쪽입니다. 점검 목록은 src/attack-check.mjs 한 곳에만 있습니다(심판 runner가 그 파일만 씀).
// - GET /api/checks?case=<점검 이름>: 아래 고정된 가상 입력 하나를 학생 판정기·탐지 규칙·정책 사본으로 지금 실행해
//   기대대로인지(ready)를 돌려줍니다. 요청에서 받는 값은 점검 이름 하나뿐이고 입력은 모두 이 파일에 고정돼 있습니다.
//   ALEPH SDP 엔진이 실제로 집행했는지는 확인하지 않았으므로 engineEnforced는 not_run입니다.
// - GET /api/checks: runAttackChecks를 이 배포에 실제로 보내 받은 결과를 checksReport로 그대로 셉니다.

export const ENGINE = 'ALEPH SDP 엔진';
export const ATTACKS_41_NOTE = '41종 공격 전체는 심판이 보내며 이 저장소에서는 실행하지 않았습니다. 표에 없는 공격을 통과로 적지 않습니다.';

const reads = (count, extra) => Array.from({ length: count }, (_, i) => ({
  at: new Date(Date.UTC(2026, 9, 1) + i * 2000).toISOString(), method: 'GET', identity: { sub: 'doppel_fixture' }, deviceId: 'bbbbbbbbbbbbbbbb', ...extra,
}));

async function decision(pick, want) {
  const res = await decide({ ...pick(fixtureRequests()), requestId: randomUUID() });
  return { ready: res.decision === want, observed: `${res.decision}; ${res.reasonCode}` };
}

const CASES = Object.freeze({
  unregistered_device_denied: { source: '학생 판정기', run: () => decision(f => ({ ...f.normal, deviceRegistered: false }), 'deny') },
  suspicious_access_step_up: { source: '학생 판정기', run: () => decision(f => f.suspicious, 'step_up') },
  cross_zone_note_denied: { source: '학생 판정기', run: () => decision(f => ({
    ...f.normal, subjectId: 'student_user_b', path: '/notes/owner_a_item', route: 'GET /notes/:id' }), 'deny') },
  student_notice_mod_denied: { source: '학생 판정기', run: () => decision(f => ({
    ...f.normal, subjectId: 'student_user_b', method: 'PUT', path: '/notices/notice-01', route: 'PUT /notices/:id' }), 'deny') },
  detect_burst_read_propose_revocation: { source: '학생 탐지 규칙', run: async () => {
    const res = detect(reads(150, { network: 'unusual' }));
    return { ready: res.action === 'propose_revocation' && res.deviceId === 'bbbbbbbbbbbbbbbb',
      observed: [res.action, res.reasonCode].filter(Boolean).join('; ') };
  } },
  policy_backup_reverified: { source: '학생 정책 사본', run: async () => {
    try {
      const { manifest } = loadVerifiedBackup();
      return { ready: true, observed: `verified; ${manifest.version}` };
    } catch {
      return { ready: false, observed: 'stopped; sha256_mismatch_or_missing' };
    }
  } },
  policy_restored_cross_owner_denied: { source: '학생 정책 사본', run: async () => {
    const policy = JSON.parse(await readFile(new URL('../policy/test-policy.json', import.meta.url), 'utf8'));
    const cross = evaluateTestPolicy(policy, { method: 'GET', route: '/notes/:id', subjectOwner: 'b', targetOwner: 'a' });
    const own = evaluateTestPolicy(policy, { method: 'GET', route: '/notes/:id', subjectOwner: 'a', targetOwner: 'a' });
    return { ready: cross === 'deny' && own === 'allow', observed: `B->A ${cross}; A->A ${own}` };
  } },
});

export const CASE_IDS = Object.freeze(Object.keys(CASES));

// 모르는 이름이면 null(실행하지 않음). 실행 중 오류는 ready=false로 남깁니다.
export async function runCase(id) {
  const item = typeof id === 'string' && Object.hasOwn(CASES, id) ? CASES[id] : null;
  if (!item) return null;
  const base = { schema: 'byteback.check-case.v1', case: id, source: item.source, engine: ENGINE, engineEnforced: 'not_run' };
  try {
    return { ...base, ...(await item.run()) };
  } catch (error) {
    return { ...base, ready: false, observed: `error; ${error?.name ?? 'Error'}` };
  }
}

// 수치는 attempts의 result를 한 번씩만 셉니다. failed는 뚫린 공격(breached) 수입니다.
export function checksReport(attempts, { checkedAt = new Date().toISOString(), commit = null, target = null } = {}) {
  const count = result => attempts.filter(item => item.result === result).length;
  return {
    schema: 'byteback.checks.v1', checkedAt, commit, target, engine: ENGINE,
    total: attempts.length, blocked: count('blocked'), failed: count('breached'), notRun: count('not_run'),
    attempts, attacks41: ATTACKS_41_NOTE,
  };
}
