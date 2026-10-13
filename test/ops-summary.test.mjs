import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { auditMatches, buildOpsSummary, maskRef, RECORD_LIMIT, STATUS, summarizeAudit } from '../src/ops-summary.mjs';

// 12단계 탈환 작전실 요약 시험. 가짜 DB와 가짜 계정만 쓰며 실제 서버·배포를 호출하지 않습니다.
const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const NOTE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NOTE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function fakeSupabase(tables, failures = {}) {
  return {
    from(name) {
      let rows = tables[name] ?? [];
      let wantCount = false;
      let max = Infinity;
      const query = {
        select(_columns, options) { wantCount = options?.count === 'exact'; return query; },
        eq(column, value) { rows = rows.filter(row => row[column] === value); return query; },
        order(column, { ascending }) {
          rows = [...rows].sort((a, b) => (a[column] > b[column] ? 1 : -1) * (ascending ? 1 : -1));
          return query;
        },
        limit(count) { max = count; return query; },
        then(resolve, reject) {
          const result = failures[name]
            ? { data: null, error: failures[name], count: null }
            : { data: rows.slice(0, max), error: null, count: wantCount ? rows.length : null };
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

const audit = (id, owner, note, stage, result, extra = {}) => ({
  id, owner_id: owner, note_id: note, stage, result, action: null, dry_run: false, at: `2026-10-13T00:00:${String(id % 60).padStart(2, '0')}Z`, ...extra,
});

const baseTables = () => ({
  note_backups: [
    { owner_id: ME, note_id: NOTE_A, title: 'SECRET_TITLE_A', body: 'SECRET_BODY_A', created_at: '2026-10-12T00:00:00Z' },
    { owner_id: ME, note_id: NOTE_B, title: 'SECRET_TITLE_B', body: 'SECRET_BODY_B', created_at: '2026-10-13T00:00:00Z' },
    { owner_id: OTHER, note_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', title: 'OTHER_TITLE', body: 'OTHER_BODY', created_at: '2026-10-13T01:00:00Z' },
  ],
  restore_audit: [
    audit(1, ME, NOTE_A, 'requested', 'pending'),
    audit(2, ME, NOTE_A, 'plan', 'dry_run', { dry_run: true, action: 'revert' }),
    audit(3, ME, NOTE_A, 'requested', 'pending'),
    audit(4, ME, NOTE_A, 'apply', 'restored', { action: 'revert' }),
    audit(5, ME, NOTE_B, 'requested', 'pending'),
    audit(6, ME, NOTE_B, 'verify', 'stopped_no_backup'),
    audit(7, OTHER, NOTE_B, 'apply', 'restored', { action: 'revert' }),
  ],
  devices: [
    { owner_id: ME, device_id: '0123456789abcdef', status: 'approved', public_key: { kty: 'EC', x: 'PUBLIC_X', y: 'PUBLIC_Y' } },
    { owner_id: ME, device_id: 'fedcba9876543210', status: 'revoked', public_key: { kty: 'EC', x: 'PUBLIC_X2', y: 'PUBLIC_Y2' } },
    { owner_id: OTHER, device_id: 'aaaaaaaaaaaaaaaa', status: 'approved', public_key: {} },
  ],
});

test('작전실 요약은 내 계정 기록만 세고 가린 기록과 수치가 맞는다', async () => {
  const data = await buildOpsSummary({ supabase: fakeSupabase(baseTables()), ownerId: ME, deviceId: '0123456789abcdef' });
  const restore = data.restore.notes;

  assert.equal(restore.backups.status, STATUS.VERIFIED);
  assert.equal(restore.backups.count, 2);
  assert.equal(restore.backups.latestAt, '2026-10-13T00:00:00Z');

  const { summary, records } = restore.audit;
  assert.equal(restore.audit.status, STATUS.VERIFIED);
  assert.deepEqual({ total: summary.total, shown: summary.shown, requested: summary.requested, dryRun: summary.dryRun,
    restored: summary.restored, stopped: summary.stopped, failed: summary.failed },
  { total: 6, shown: 6, requested: 3, dryRun: 1, restored: 1, stopped: 1, failed: 0 });
  assert.equal(records.length, summary.shown);
  assert.equal(auditMatches(restore.audit), true);
  assert.ok(records.every(record => /^[0-9a-f]{8}$/u.test(record.ref)));
  assert.equal(records[0].ref, maskRef(NOTE_B));
});

test('응답에는 메모 제목·본문·메모 ID·공개키·다른 계정 자료가 없다', async () => {
  const data = await buildOpsSummary({ supabase: fakeSupabase(baseTables()), ownerId: ME, deviceId: null });
  const text = JSON.stringify(data);
  for (const secret of ['SECRET_TITLE', 'SECRET_BODY', 'OTHER_TITLE', 'OTHER_BODY', NOTE_A, NOTE_B, 'PUBLIC_X', 'PUBLIC_Y', OTHER]) {
    assert.equal(text.includes(secret), false, `${secret} 노출`);
  }
  assert.doesNotMatch(text, /"(?:body|title|content|public_key|owner_id|note_id)"\s*:/u);
});

test('회수 상태는 기기 수만 서버 확인으로, 회수 집행과 실제 사건은 미실행으로 구분한다', async () => {
  const data = await buildOpsSummary({ supabase: fakeSupabase(baseTables()), ownerId: ME, deviceId: '0123456789abcdef' });
  assert.deepEqual({ ...data.revocation.devices }, {
    status: STATUS.VERIFIED, approved: 1, revoked: 1, total: 2, thisRequestDeviceApproved: true,
  });
  assert.equal(data.revocation.proposal.status, STATUS.NOT_RUN);
  assert.equal(data.detection.liveEvents.status, STATUS.NOT_RUN);
  assert.equal(data.detection.practice.status, STATUS.PRACTICE);
  assert.equal(data.detection.practice.passed, data.detection.practice.total);
  assert.equal(data.decider.status, STATUS.PRACTICE);
  assert.deepEqual(data.decider.rules.map(rule => rule.id), ['device_registered', 'step_up_required', 'zone_partitioning']);
  assert.equal(data.decider.passed, data.decider.total);
});

test('감사 기록이 50건을 넘으면 최근 50건만 보이고 수치도 그 50건에서 센다', async () => {
  const tables = baseTables();
  tables.restore_audit = Array.from({ length: 60 }, (_, index) => audit(index + 1, ME, NOTE_A, 'requested', 'pending'));
  const { restore } = await buildOpsSummary({ supabase: fakeSupabase(tables), ownerId: ME });
  const { summary, records } = restore.notes.audit;
  assert.equal(summary.total, 60);
  assert.equal(summary.shown, RECORD_LIMIT);
  assert.equal(summary.truncated, true);
  assert.equal(records.length, RECORD_LIMIT);
  assert.equal(summary.requested, RECORD_LIMIT);
  assert.equal(auditMatches(restore.notes.audit), true);
});

test('요약 수치나 기록을 바꾸면 불일치로 잡힌다', () => {
  const rows = [audit(1, ME, NOTE_A, 'apply', 'restored'), audit(2, ME, NOTE_A, 'requested', 'pending')];
  const good = summarizeAudit(rows, 2);
  assert.equal(auditMatches(good), true);
  assert.equal(auditMatches({ ...good, summary: { ...good.summary, restored: 5 } }), false);
  assert.equal(auditMatches({ ...good, records: good.records.slice(1) }), false);
});

test('표가 없거나 조회가 실패하면 그 항목만 읽지 못함으로 표시하고 나머지는 유지한다', async () => {
  const supabase = fakeSupabase(baseTables(), {
    restore_audit: { code: '42P01' }, devices: { code: 'XX000' },
  });
  const data = await buildOpsSummary({ supabase, ownerId: ME });
  assert.deepEqual({ ...data.restore.notes.audit }, { status: STATUS.UNAVAILABLE, error: 'TABLE_NOT_CREATED' });
  assert.deepEqual({ ...data.revocation.devices }, { status: STATUS.UNAVAILABLE, error: 'DATABASE_QUERY_ERROR' });
  assert.equal(data.restore.notes.backups.status, STATUS.VERIFIED);
  assert.equal(data.decider.status, STATUS.PRACTICE);
});

test('정책 사본은 SHA-256을 다시 계산해 확인하고 감사 기록 줄 수와 맞는다', async () => {
  const { restore } = await buildOpsSummary({ supabase: fakeSupabase(baseTables()), ownerId: ME });
  const policy = restore.policy;
  // 사본 파일의 실제 바이트 해시가 manifest와 같을 때만 verified여야 합니다.
  // (Windows의 core.autocrlf=true 체크아웃처럼 줄바꿈이 바뀌어 해시가 다르면 버전을 믿지 않고 unavailable이어야 합니다.)
  const manifest = JSON.parse(await readFile(new URL('../policy/backups/manifest.json', import.meta.url), 'utf8'));
  const actualSha = createHash('sha256').update(await readFile(new URL(`../policy/backups/${manifest.file}`, import.meta.url))).digest('hex');
  if (actualSha === manifest.sha256) {
    assert.equal(policy.status, STATUS.VERIFIED);
    assert.equal(policy.backupVersion, 'v9-9f13368');
    assert.equal(policy.sha256Verified, true);
  } else {
    assert.equal(policy.status, STATUS.UNAVAILABLE);
    assert.equal(policy.error, 'POLICY_BACKUP_UNVERIFIED');
    assert.equal(policy.backupVersion, undefined);
  }

  const lines = (await readFile(new URL('../policy/audit.log.jsonl', import.meta.url), 'utf8')).split(/\r?\n/u).filter(Boolean);
  assert.equal(policy.audit.status, STATUS.VERIFIED);
  assert.equal(policy.audit.summary.total, lines.length);
  assert.equal(policy.audit.records.length + policy.audit.summary.unreadable, lines.length);
  // 정책 감사 기록의 메모(note)와 해시는 응답에 넣지 않습니다.
  assert.doesNotMatch(JSON.stringify(policy.audit), /sha256Before|sha256After|"note"/u);
});

test('GET /api/ops는 로그인 없이는 401, GET 외 요청은 405다', async () => {
  const { default: handler } = await import('../api/ops.js');
  const call = async (request) => {
    const headers = new Map();
    let status;
    let body;
    const response = {
      setHeader: (key, value) => headers.set(key.toLowerCase(), value),
      status: value => { status = value; return { json: value => { body = value; }, end: () => {} }; },
    };
    await handler(request, response);
    return { status, body, headers };
  };
  const anonymous = await call({ method: 'GET', headers: {}, url: '/api/ops' });
  assert.equal(anonymous.status, 401);
  assert.equal(anonymous.body.error, 'UNAUTHORIZED');
  assert.equal(anonymous.headers.get('cache-control'), 'no-store');
  const post = await call({ method: 'POST', headers: {}, url: '/api/ops' });
  assert.equal(post.status, 405);
});
