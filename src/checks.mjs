import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtureRequests } from '../scripts/fixture-7.mjs';
import { evaluateTestPolicy, loadVerifiedBackup } from '../scripts/policy-restore.mjs';
import { decide } from './decider.mjs';
import { detect } from './detect.mjs';

// 12단계 점검 목록 하나. 제출 묶음(src/attack-check.mjs 12단계), GET /api/checks, 작전실 화면이 모두 이 목록을 씁니다.
// - 배포 주소에는 GET·HEAD 요청만, 한 번 실행에 최대 24건, 점검 하나에 요청 1건만 보냅니다(코드로 강제).
// - observed에는 사실 값만 적습니다 (예: "HTTP 401", "deny; device_not_registered"). 설명은 expected에 둡니다.
// - 쓰기 요청이 필요한 점검은 보내지 않고 result·observed 모두 not_run으로 남깁니다.
// - 판정기·탐지·정책 점검은 요청이 아니라 학생 코드를 이 실행 안에서 직접 부른 결과입니다(source로 구분).
//   ALEPH SDP 엔진이 실제로 집행했는지는 확인하지 않았으므로 engineEnforced는 not_run입니다.

export const READ_ONLY_METHODS = new Set(['GET', 'HEAD']);
export const MAX_REQUESTS = 24;
export const ENGINE = 'ALEPH SDP 엔진';
export const ATTACKS_41_NOTE = '41종 공격 전체는 심판이 보내며 이 저장소에서는 실행하지 않았습니다. 표에 없는 공격을 통과로 적지 않습니다.';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ZERO_ID = '00000000-0000-4000-8000-000000000001';

// 읽기 전용 요청기: GET·HEAD 외 메서드와 상한을 넘는 요청은 보내기 전에 거부합니다.
export function createReadOnlyFetch(fetchImpl = (...args) => globalThis.fetch(...args), max = MAX_REQUESTS) {
  let count = 0;
  const guarded = async (url, init = {}) => {
    const method = String(init.method ?? 'GET').toUpperCase();
    if (!READ_ONLY_METHODS.has(method)) throw new Error(`READ_ONLY_VIOLATION ${method}`);
    if (count >= max) throw new Error(`REQUEST_LIMIT ${max}`);
    count += 1;
    return fetchImpl(url, { ...init, method, redirect: 'error', signal: AbortSignal.timeout(10000) });
  };
  guarded.count = () => count;
  return guarded;
}

const http = (attackId, stage, kind, expected, request, judge) => ({ attackId, stage, kind, source: 'http', expected, request, judge });
const rule = (attackId, stage, kind, source, expected, run) => ({ attackId, stage, kind, source, expected, run });
const notRun = (attackId, stage, kind, expected, reason) => ({ attackId, stage, kind, source: 'http', expected, notRun: reason });
const status = ok => res => ({ ok: ok(res.status), observed: `HTTP ${res.status}` });

function checkList(config) {
  const { normal, suspicious } = fixtureRequests();
  const zoneB = { ...normal, subjectId: 'student_user_b' };
  const reads = (count, extra) => Array.from({ length: count }, (_, i) => ({
    at: new Date(Date.UTC(2026, 9, 1) + i * 2000).toISOString(), method: 'GET', identity: { sub: 'doppel_fixture' }, deviceId: 'bbbbbbbbbbbbbbbb', ...extra,
  }));
  const decision = (input, want) => async () => {
    const res = await decide({ ...input, requestId: crypto.randomUUID() });
    return { ok: res.decision === want, observed: `${res.decision}; ${res.reasonCode}` };
  };
  const detection = (events, ok) => async () => {
    const res = detect(events);
    return { ok: ok(res), observed: [res.action, res.reasonCode, res.deviceId ? 'device=1' : null].filter(Boolean).join('; ') };
  };
  const hasOrigin = typeof config.originalApiUrl === 'string' && config.originalApiUrl.startsWith('https://') && Boolean(config.anonKey);

  return [
    http('data_json_notes_cleared', 2, 'forbidden', '공개 정적 파일 /data.json에 가상 메모와 확인 표식이 없어야 함 (메모 0건)', { path: '/data.json' }, res => {
      let notes = 'unparsed';
      try { const data = JSON.parse(res.text); notes = Array.isArray(data.notes) ? data.notes.length : 'unparsed'; } catch { notes = 'unparsed'; }
      const marker = Boolean(config.sampleMarker) && res.text.includes(config.sampleMarker);
      return { ok: res.status === 200 && notes === 0 && !marker, observed: `HTTP ${res.status}; notes=${notes}; sampleMarker=${marker}` };
    }),
    http('unauthenticated_api_blocked', 3, 'forbidden', '로그인 없이 GET /api/notes 요청 시 거부 (HTTP 401)', { path: '/api/notes' }, status(code => code === 401)),
    http('unauthenticated_single_note_blocked', 4, 'forbidden', '로그인 없이 메모 한 건(GET /api/notes?id=…) 요청 시 거부 (HTTP 401)', { path: `/api/notes?id=${ZERO_ID}` }, status(code => code === 401)),
    hasOrigin
      ? http('original_api_direct_access_blocked', 5, 'forbidden', '공개 키만으로 원본 자료 API(Supabase notes)를 직접 읽으면 거부 (HTTP 401 또는 403)',
        { url: config.originalApiUrl, headers: { apikey: config.anonKey } }, status(code => code === 401 || code === 403))
      : notRun('original_api_direct_access_blocked', 5, 'forbidden', '공개 키만으로 원본 자료 API를 직접 읽으면 거부', 'originalApiUrl 또는 공개 키 설정 없음'),
    rule('normal_device_kept', 6, 'normal', 'decider', '학생 판정기: 등록 기기의 정상 요청은 allow', decision(normal, 'allow')),
    rule('unregistered_device_denied', 6, 'forbidden', 'decider', '학생 판정기: 미등록 가상 기기 요청은 deny (device_not_registered)', decision({ ...normal, deviceRegistered: false }, 'deny')),
    rule('suspicious_access_step_up', 7, 'forbidden', 'decider', '학생 판정기: 평소와 다른 시각·네트워크·대량 조회가 겹친 가상 요청은 step_up', decision(suspicious, 'step_up')),
    rule('cross_zone_note_denied', 8, 'forbidden', 'decider', '학생 판정기: B가 A의 메모 구역을 읽으면 deny (zone_owner_forbidden)',
      decision({ ...zoneB, path: '/notes/owner_a_item', route: 'GET /notes/:id' }, 'deny')),
    rule('student_notice_mod_denied', 8, 'forbidden', 'decider', '학생 판정기: 학생이 강사 공지를 수정하면 deny (instructor_notice_forbidden)',
      decision({ ...zoneB, method: 'PUT', path: '/notices/notice-01', route: 'PUT /notices/:id' }, 'deny')),
    http('id_depth_feature_route_blocked', 8, 'forbidden', '자원 ID 자리에 기능 경로(GET /api/notes/export)를 두면 거부 (HTTP 401 또는 404)', { path: '/api/notes/export' }, status(code => code === 401 || code === 404)),
    rule('detect_burst_read_propose_revocation', 9, 'forbidden', 'detect', '학생 탐지 규칙: 낯선 네트워크에서 10분 안 150건 조회한 가상 사건은 기기 한 개 회수 제안',
      detection(reads(150, { network: 'unusual' }), r => r.action === 'propose_revocation' && r.deviceId === 'bbbbbbbbbbbbbbbb')),
    rule('detect_normal_read_observe', 9, 'normal', 'detect', '학생 탐지 규칙: 평소 네트워크 30건은 observe', detection(reads(30, { network: 'usual' }), r => r.action === 'observe')),
    rule('detect_region_only_observe', 9, 'normal', 'detect', '학생 탐지 규칙: 지역만 다른 150건은 회수 제안 없이 observe',
      detection(reads(150, { network: 'usual', region: 'foreign' }), r => r.action === 'observe')),
    rule('policy_backup_reverified', 10, 'normal', 'policy', '정책 사본을 다시 읽어 SHA-256을 기록과 대조 (다르면 중단)', async () => {
      try {
        const { manifest } = loadVerifiedBackup();
        return { ok: true, observed: `verified; ${manifest.version}; sha256=${manifest.sha256.slice(0, 12)}` };
      } catch {
        return { ok: false, observed: 'stopped; sha256_mismatch_or_missing' };
      }
    }),
    rule('policy_restored_cross_owner_denied', 10, 'forbidden', 'policy', '되돌린 시험 정책: B의 A 메모 읽기는 deny, A의 자기 메모 읽기는 allow', async () => {
      const policy = JSON.parse(await readFile(resolve(root, 'policy', 'test-policy.json'), 'utf8'));
      const cross = evaluateTestPolicy(policy, { method: 'GET', route: '/notes/:id', subjectOwner: 'b', targetOwner: 'a' });
      const own = evaluateTestPolicy(policy, { method: 'GET', route: '/notes/:id', subjectOwner: 'a', targetOwner: 'a' });
      return { ok: cross === 'deny' && own === 'allow', observed: `B->A ${cross}; A->A ${own}` };
    }),
    notRun('restore_unauthenticated_blocked', 10, 'forbidden', '로그인 없이 복구(POST /api/restore)를 요청하면 거부 (HTTP 401)', '쓰기 요청(POST)이라 보내지 않음'),
    http('pwa_manifest_served', 11, 'normal', '설치형 웹앱 설정(manifest)에 앱 이름이 있음. 설치 표시는 기기 확인이 아님', { path: '/manifest.webmanifest' }, res => {
      let manifest = null;
      try { manifest = JSON.parse(res.text); } catch { manifest = null; }
      return { ok: res.status === 200 && Boolean(manifest?.name), observed: `HTTP ${res.status}; name=${Boolean(manifest?.name)}; display=${manifest?.display ?? 'none'}` };
    }),
    http('device_status_unsigned_blocked', 11, 'forbidden', '로그인·기기 서명 없이 기기 승인 상태(GET /api/device)를 물으면 거부 (HTTP 401)', { path: '/api/device' }, status(code => code === 401)),
    http('device_key_not_in_storage', 11, 'forbidden', '접속 화면 코드가 토큰·기기 키를 브라우저 저장소에 넣지 않고, 기기 키를 꺼낼 수 없게 만듦', { path: '/' }, res => {
      const storage = /localStorage\.|sessionStorage\.setItem|indexedDB\.open|extractable\s*:\s*true/u.test(res.text);
      const nonExtractable = /generateKey\([^)]*false/u.test(res.text);
      return { ok: res.status === 200 && !storage && nonExtractable, observed: `HTTP ${res.status}; browserStorage=${storage}; nonExtractableKey=${nonExtractable}` };
    }),
    http('ops_summary_unauthenticated_blocked', 12, 'forbidden', '로그인·기기 서명 없이 탈환 작전실 요약(GET /api/ops)을 요청하면 거부 (HTTP 401)', { path: '/api/ops' }, status(code => code === 401)),
  ];
}

const SOURCE_LABEL = { http: '배포 주소 요청', decider: '학생 판정기', detect: '학생 탐지 규칙', policy: '학생 정책 사본' };

async function runOne(check, { app, guardedFetch }) {
  const base = { attackId: check.attackId, stage: check.stage, kind: check.kind, source: check.source, sourceLabel: SOURCE_LABEL[check.source], expected: check.expected };
  if (check.notRun) return { ...base, observed: 'not_run', result: 'not_run', reason: check.notRun };
  const outcome = (ok, observed) => ({ ...base, observed, result: !ok ? 'failed' : (check.kind === 'normal' ? 'allowed' : 'blocked') });
  if (check.source !== 'http') {
    try {
      const { ok, observed } = await check.run();
      return { ...outcome(ok, observed), engine: ENGINE, engineEnforced: 'not_run' };
    } catch (error) {
      return { ...outcome(false, `error; ${error?.name ?? 'Error'}`), engine: ENGINE, engineEnforced: 'not_run' };
    }
  }
  try {
    const { url, path, headers = {}, method = 'GET' } = check.request;
    const res = await guardedFetch(url ? new URL(url) : new URL(path, app), { method, headers });
    const text = method === 'HEAD' ? '' : await res.text();
    const { ok, observed } = check.judge({ status: res.status, text });
    return outcome(ok, observed);
  } catch (error) {
    return outcome(false, `error; ${String(error?.message ?? error?.name ?? 'Error').split(' ')[0]}`);
  }
}

// 점검을 실행하고 목록을 돌려줍니다. 순서는 단계 순서입니다.
export async function runChecks(config, { fetchImpl } = {}) {
  const app = new URL(config.publicAppUrl);
  const guardedFetch = createReadOnlyFetch(fetchImpl);
  const records = await Promise.all(checkList(config).map(check => runOne(check, { app, guardedFetch })));
  return records;
}

// 제출 묶음 형식: attackId·expected·observed 세 값만. /api/checks의 attempts와 같은 값입니다.
export const toAttempts = records => records.map(({ attackId, expected, observed }) => ({ attackId, expected, observed }));

// 요약 수치는 목록의 result를 한 번씩만 셉니다. 같은 이름의 다른 수치를 따로 두지 않습니다.
export function summarizeChecks(records) {
  const count = result => records.filter(item => item.result === result).length;
  return { total: records.length, blocked: count('blocked'), allowed: count('allowed'), failed: count('failed'), notRun: count('not_run') };
}

export function checksReport(records, { checkedAt = new Date().toISOString(), commit = null, target = null } = {}) {
  return {
    schema: 'byteback.checks.v1', checkedAt, commit, target, engine: ENGINE,
    ...summarizeChecks(records),
    attempts: records,
    attacks41: ATTACKS_41_NOTE,
  };
}
