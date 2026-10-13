import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDecider } from '../scripts/decider-test.mjs';
import { checkDetection } from '../scripts/detect-test.mjs';
import { loadVerifiedBackup, policyDiff } from '../scripts/policy-restore.mjs';
import { decide, RULE_IDS } from './decider.mjs';
import { detect } from './detect.mjs';

// 12단계 탈환 작전실: 판정기 규칙·탐지 사건·회수 상태·복구 버전을 한 번에 요약합니다.
// 모든 항목에 상태를 붙여 "서버가 이 응답에서 실제로 읽은 값"과 "연습"과 "미실행"을 섞지 않습니다.
//   verified    이 응답을 만드는 동안 서버가 DB·파일에서 직접 읽거나 다시 계산한 값
//   practice    서버가 가상 사건으로 돌려 본 연습 결과 (운영 엔진·심판 판정이 아님)
//   not_run     연결하거나 실행하지 않은 것
//   unavailable 읽으려 했지만 읽지 못한 것 (표 미생성·조회 오류)
// 메모 본문·제목·토큰·실명·공개키는 읽지도 돌려주지도 않습니다. 메모 ID는 해시 앞 8자리로 가립니다.

export const STATUS = Object.freeze({
  VERIFIED: 'verified', PRACTICE: 'practice', NOT_RUN: 'not_run', UNAVAILABLE: 'unavailable',
});
export const RECORD_LIMIT = 50;

const RULE_LABELS = Object.freeze({
  device_registered: '등록한 기기의 요청만 허용',
  step_up_required: '평소와 다른 복합 접속은 다시 확인',
  zone_partitioning: '메모·공지 구역과 소유자 분리',
});

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const MISSING_TABLE = new Set(['42P01', 'PGRST205']);

export const maskRef = id => createHash('sha256').update(String(id).toLowerCase()).digest('hex').slice(0, 8);

const tally = (items, pick) => items.reduce((acc, item) => {
  const key = pick(item);
  return { ...acc, [key]: (acc[key] ?? 0) + 1 };
}, {});

// 복구 감사 기록(restore_audit) 행을 가린 기록과 그 기록에서 센 수치로 바꿉니다.
// 수치는 반드시 아래 records에서 센 값이며, 화면은 같은 계산으로 다시 대조합니다.
export function summarizeAudit(rows, total) {
  const records = rows.map(row => ({
    ref: maskRef(row.note_id), stage: String(row.stage), result: String(row.result),
    action: row.action ?? null, dryRun: row.dry_run === true, at: row.at,
  }));
  const count = test => records.filter(test).length;
  return {
    records,
    summary: {
      total, shown: records.length, truncated: total > records.length,
      byResult: tally(records, record => record.result),
      requested: count(record => record.stage === 'requested'),
      dryRun: count(record => record.stage === 'plan' && record.result === 'dry_run'),
      restored: count(record => record.stage === 'apply' && record.result === 'restored'),
      stopped: count(record => record.result.startsWith('stopped')),
      failed: count(record => record.result.startsWith('failed')),
    },
  };
}

// 요약 수치가 가린 기록에서 다시 센 값과 같은지 확인합니다 (true여야 화면의 「일치」).
export function auditMatches({ records, summary }) {
  const again = summarizeAudit(records.map(record => ({
    note_id: record.ref, stage: record.stage, result: record.result, action: record.action, dry_run: record.dryRun, at: record.at,
  })), summary.total).summary;
  return ['shown', 'requested', 'dryRun', 'restored', 'stopped', 'failed']
    .every(key => again[key] === summary[key])
    && JSON.stringify(again.byResult) === JSON.stringify(summary.byResult)
    && summary.shown === Math.min(summary.total, RECORD_LIMIT);
}

function dbFailure(error) {
  return { status: STATUS.UNAVAILABLE, error: MISSING_TABLE.has(error?.code) ? 'TABLE_NOT_CREATED' : 'DATABASE_QUERY_ERROR' };
}

function decisionSection() {
  return checkDecider({ decide, ruleIds: RULE_IDS }).then(cases => ({
    status: STATUS.PRACTICE,
    rules: RULE_IDS.map(id => ({ id, label: RULE_LABELS[id] ?? id })),
    cases, passed: cases.filter(item => item.passed).length, total: cases.length,
    note: '서버가 가상 요청으로 돌린 연습 결과이며 심판 판정이 아닙니다.',
  })).catch(() => ({
    status: STATUS.UNAVAILABLE, error: 'PRACTICE_FAILED',
    rules: RULE_IDS.map(id => ({ id, label: RULE_LABELS[id] ?? id })),
  }));
}

function detectionSection() {
  return checkDetection(detect).then(cases => ({
    rule: { windowMinutes: 10, burstLimit: 120, reasonCode: 'burst_read', exactlyLimitIsSafe: true },
    practice: {
      status: STATUS.PRACTICE, cases, passed: cases.filter(item => item.passed).length, total: cases.length,
      note: '가상 조회 사건 연습이며 실제 접속 사건이 아닙니다.',
    },
    liveEvents: {
      status: STATUS.NOT_RUN,
      note: '운영 반 엔진이 검증한 사건을 이 서버가 받아 탐지하는 경로는 연결하지 않았습니다. 실제 사건 수는 없습니다.',
    },
  })).catch(() => ({
    rule: { windowMinutes: 10, burstLimit: 120, reasonCode: 'burst_read', exactlyLimitIsSafe: true },
    practice: { status: STATUS.UNAVAILABLE, error: 'PRACTICE_FAILED' },
    liveEvents: { status: STATUS.NOT_RUN, note: '운영 반 엔진 사건 전달은 연결하지 않았습니다.' },
  }));
}

async function revocationSection(supabase, ownerId, deviceId) {
  const { data, error } = await supabase.from('devices').select('device_id, status').eq('owner_id', ownerId);
  const proposal = {
    status: STATUS.NOT_RUN,
    note: '탐지 제안(propose_revocation)을 받아 접속을 거두는 회수 API는 만들지 않았습니다. 회수 집행과 경과 시간은 미실행입니다.',
  };
  if (error) return { devices: dbFailure(error), proposal };
  const rows = data ?? [];
  return {
    devices: {
      status: STATUS.VERIFIED,
      approved: rows.filter(row => row.status === 'approved').length,
      revoked: rows.filter(row => row.status === 'revoked').length,
      total: rows.length,
      thisRequestDeviceApproved: deviceId ? rows.some(row => row.device_id === deviceId && row.status === 'approved') : null,
    },
    proposal,
  };
}

async function policyAuditSection(rootDir) {
  let text;
  try {
    text = await readFile(resolve(rootDir, 'policy', 'audit.log.jsonl'), 'utf8');
  } catch {
    return { status: STATUS.UNAVAILABLE, error: 'POLICY_AUDIT_NOT_FOUND' };
  }
  const lines = text.split(/\r?\n/u).filter(Boolean);
  const records = [];
  let unreadable = 0;
  for (const line of lines) {
    try {
      const item = JSON.parse(line);
      records.push({
        at: String(item.at ?? ''), action: String(item.action ?? ''), service: String(item.service ?? ''),
        changedKeyCount: Array.isArray(item.changedKeys) ? item.changedKeys.length : 0,
      });
    } catch {
      unreadable += 1;
    }
  }
  return {
    status: STATUS.VERIFIED, records,
    summary: { total: lines.length, shown: records.length, unreadable, byAction: tally(records, record => record.action) },
  };
}

async function policySection(rootDir) {
  const audit = await policyAuditSection(rootDir);
  try {
    const { manifest, backup } = loadVerifiedBackup();
    const current = JSON.parse(await readFile(resolve(rootDir, 'policy', 'test-policy.json'), 'utf8'));
    const diff = policyDiff(current, backup);
    return {
      status: STATUS.VERIFIED,
      backupVersion: manifest.version, sourceCommit: manifest.sourceCommit,
      sha256: manifest.sha256.slice(0, 12), sha256Verified: true,
      currentVersion: current.version ?? null, restoredServices: current.restored ?? {},
      differences: Object.fromEntries(Object.entries(diff).map(([service, changes]) => [service, changes.length])),
      differenceCount: Object.values(diff).reduce((sum, changes) => sum + changes.length, 0),
      audit,
    };
  } catch (error) {
    // 사본이 없거나 SHA-256이 다르면 버전을 믿지 않고 멈춘 상태로 보여 줍니다.
    return {
      status: STATUS.UNAVAILABLE, error: error?.stop ? 'POLICY_BACKUP_UNVERIFIED' : 'POLICY_FILES_UNREADABLE',
      message: error?.stop ? error.message : undefined, audit,
    };
  }
}

async function noteRestoreSection(supabase, ownerId) {
  const backups = await supabase.from('note_backups').select('note_id, created_at', { count: 'exact' })
    .eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(1);
  const audit = await supabase.from('restore_audit')
    .select('note_id, stage, result, action, dry_run, at', { count: 'exact' })
    .eq('owner_id', ownerId).order('id', { ascending: false }).limit(RECORD_LIMIT);
  return {
    backups: backups.error
      ? dbFailure(backups.error)
      : { status: STATUS.VERIFIED, count: backups.count ?? (backups.data ?? []).length, latestAt: backups.data?.[0]?.created_at ?? null },
    audit: audit.error
      ? dbFailure(audit.error)
      : { status: STATUS.VERIFIED, ...summarizeAudit(audit.data ?? [], audit.count ?? (audit.data ?? []).length) },
  };
}

export async function buildOpsSummary({ supabase, ownerId, deviceId = null, rootDir = root, now = new Date() }) {
  const [decider, detection, revocation, notes, policy] = await Promise.all([
    decisionSection(), detectionSection(), revocationSection(supabase, ownerId, deviceId),
    noteRestoreSection(supabase, ownerId), policySection(rootDir),
  ]);
  return {
    schema: 'byteback.ops.v1', generatedAt: now.toISOString(),
    legend: {
      verified: '이 응답에서 서버가 직접 읽은 값', practice: '가상 사건 연습 (심판·운영 엔진 아님)',
      not_run: '미실행', unavailable: '읽지 못함',
    },
    decider, detection, revocation, restore: { notes, policy },
  };
}
