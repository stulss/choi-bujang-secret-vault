import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RULE_IDS } from '../src/decider.mjs';
import { checkDeviceSignature } from '../src/device-auth.mjs';
import { ownerIdFor } from '../src/note-owner.mjs';
import { createLoginVerifier } from '../src/verify-login.mjs';

// 12단계 탈환 작전실: 로그인한 사용자 자신의 서버 기록을 가려서(앞 4자리만) 돌려줍니다.
// 수치는 같은 응답의 기록 행을 세어 만듭니다. 메모 제목·본문, 토큰, 기기 공개키는 읽지도 돌려주지도 않습니다.
// 기록이 없거나 읽지 못한 항목은 0으로 채우지 않고 status 로 구분합니다.

let verifierInstance = null;

async function getVerifier() {
  if (!verifierInstance) {
    const config = JSON.parse(await readFile(resolve(process.cwd(), 'aleph.config.json'), 'utf8'));
    verifierInstance = createLoginVerifier({ config, supabaseSecretKey: process.env.SUPABASE_SECRET_KEY });
  }
  return verifierInstance;
}

const mask = value => (typeof value === 'string' && value.length > 4 ? `${value.slice(0, 4)}…` : '…');
const countBy = (rows, key) => rows.reduce((acc, item) => ({ ...acc, [item[key]]: (acc[item[key]] ?? 0) + 1 }), {});

async function section(read) {
  try {
    const { data, error } = await read();
    if (error) return { status: 'unavailable', rows: [] };
    return { status: 'measured', rows: data ?? [] };
  } catch {
    return { status: 'unavailable', rows: [] };
  }
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecretKey) {
    return response.status(500).json({ error: 'SERVER_CONFIGURATION_ERROR' });
  }
  if ((request.method || 'GET').toUpperCase() !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  let verified = null;
  try {
    verified = await (await getVerifier())(request.headers['authorization'] || request.headers['Authorization']);
  } catch {
    verified = null;
  }
  if (!verified || !verified.userId) {
    response.setHeader('WWW-Authenticate', 'Bearer');
    return response.status(401).json({ error: 'UNAUTHORIZED' });
  }

  const ownerId = ownerIdFor(verified);
  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const deviceCheck = await checkDeviceSignature(request, ownerId, supabase);
  if (!deviceCheck.ok) return response.status(deviceCheck.status).json({ error: deviceCheck.error });

  try {
    const devices = await section(() => supabase.from('devices').select('device_id, status, created_at').eq('owner_id', ownerId));
    const audit = await section(() => supabase.from('restore_audit').select('note_id, stage, result, action, dry_run, at').eq('owner_id', ownerId));
    const backups = await section(() => supabase.from('note_backups').select('note_id, created_at').eq('owner_id', ownerId));

    let policy = { status: 'unavailable' };
    try {
      const manifest = JSON.parse(await readFile(new URL('../policy/backups/manifest.json', import.meta.url), 'utf8'));
      policy = { status: 'measured', version: manifest.version, sha256Prefix: String(manifest.sha256).slice(0, 12), sourceCommit: manifest.sourceCommit };
    } catch {}

    const deviceRows = devices.rows.map(item => ({ device: mask(item.device_id), status: item.status, at: item.created_at }));
    const auditRows = audit.rows
      .map(item => ({ note: mask(item.note_id), stage: item.stage, result: item.result, action: item.action ?? null, dryRun: Boolean(item.dry_run), at: item.at }))
      .sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const backupRows = backups.rows.map(item => ({ note: mask(item.note_id), at: item.created_at }))
      .sort((a, b) => String(b.at).localeCompare(String(a.at)));

    return response.status(200).json({
      schema: 'aleph.ops.v1',
      generatedAt: new Date().toISOString(),
      verifiedDevice: deviceCheck.deviceId ? mask(deviceCheck.deviceId) : null,
      rules: { status: 'measured', ruleIds: [...RULE_IDS], source: 'src/decider.mjs (학생 판정기)' },
      detection: {
        status: 'not_connected', serverEvents: [],
        note: '이 자료실 서버에는 탐지 사건 저장소가 없습니다. 실제 사건 전달과 회수 집행은 ALEPH SDP 엔진 몫이며, 탐지 규칙의 실행 결과는 증거 표(ops-evidence.json)의 로컬 실측입니다.',
      },
      revocation: { status: devices.status, rows: deviceRows, counts: countBy(deviceRows, 'status'), total: deviceRows.length },
      restore: {
        status: audit.status, rows: auditRows, counts: countBy(auditRows, 'result'), total: auditRows.length,
        backups: { status: backups.status, total: backupRows.length, latest: backupRows[0]?.at ?? null },
        policy,
      },
    });
  } catch {
    return response.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
}
