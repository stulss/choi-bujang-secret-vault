import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { checkDeviceSignature } from '../src/device-auth.mjs';
import { NOTE_ID, noteContentHash, ownerIdFor } from '../src/note-owner.mjs';
import { createLoginVerifier } from '../src/verify-login.mjs';

// 10단계: 비공개 가상 메모 사본(note_backups)에서 지정한 한 건만 복원합니다.
// POST /api/restore  본문 { "id": "<메모 UUID>", "dryRun": true|false }  (또는 /api/restore/<id>, ?id=)
// 순서: 감사 기록 → 사본 다시 읽기·해시 검증 → ID·소유자 대조 → 그 한 건만 되돌림 → 다시 읽어 해시 대조 → 감사 기록.
// 다른 메모, 사본, 감사 기록은 바꾸거나 지우지 않습니다. 메모 본문은 응답과 로그에 넣지 않습니다.

let verifierInstance = null;

async function getVerifier() {
  if (!verifierInstance) {
    const config = JSON.parse(await readFile(resolve(process.cwd(), 'aleph.config.json'), 'utf8'));
    verifierInstance = createLoginVerifier({ config, supabaseSecretKey: process.env.SUPABASE_SECRET_KEY });
  }
  return verifierInstance;
}

function readBody(request) {
  let body = request.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecretKey) {
    return response.status(500).json({ error: 'SERVER_CONFIGURATION_ERROR' });
  }

  const method = (request.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') {
    response.setHeader('Allow', 'POST, OPTIONS');
    return response.status(204).end();
  }
  if (method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const authHeader = request.headers['authorization'] || request.headers['Authorization'];
  let verified = null;
  try {
    verified = await (await getVerifier())(authHeader);
  } catch {
    verified = null;
  }
  if (!verified || !verified.userId) {
    response.setHeader('WWW-Authenticate', 'Bearer');
    return response.status(401).json({ error: 'UNAUTHORIZED' });
  }

  const body = readBody(request);
  const url = new URL(request.url, 'http://localhost');
  const lastPart = url.pathname.replace(/\/+$/u, '').split('/').pop();
  const id = String(body.id ?? request.query?.id ?? (lastPart !== 'restore' ? lastPart : '')).toLowerCase();
  const dryRun = body.dryRun === true || url.searchParams.get('dryRun') === '1';
  if (!NOTE_ID.test(id)) {
    return response.status(400).json({ error: 'INVALID_RESTORE_TARGET', message: '복원할 메모 ID(UUID) 한 개가 필요합니다.' });
  }

  const ownerId = ownerIdFor(verified);
  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // 11단계: 승인 기기의 서명 확인 (복구 요청도 서명 뒤 경로·본문을 바꾸면 거부)
  const deviceCheck = await checkDeviceSignature(request, ownerId, supabase);
  if (!deviceCheck.ok) {
    return response.status(deviceCheck.status).json({ error: deviceCheck.error });
  }

  // 감사 기록은 추가만 합니다. 기록을 남길 수 없으면 복원하지 않습니다.
  async function audit(stage, result, extra = {}) {
    const { error } = await supabase.from('restore_audit').insert({
      note_id: id, owner_id: ownerId, stage, result, dry_run: dryRun, ...extra,
    });
    return !error;
  }

  try {
    if (!(await audit('requested', 'pending'))) {
      return response.status(503).json({ error: 'AUDIT_UNAVAILABLE', message: '감사 기록을 남길 수 없어 복원을 멈췄습니다.' });
    }

    // 1. 사본을 다시 읽고 저장된 해시와 다시 계산한 해시를 대조합니다.
    const { data: backup, error: backupError } = await supabase
      .from('note_backups')
      .select('note_id, owner_id, title, body, content_hash, created_at')
      .eq('note_id', id)
      .maybeSingle();
    if (backupError || !backup || backup.owner_id !== ownerId) {
      await audit('verify', 'stopped_no_backup');
      return response.status(404).json({ error: 'BACKUP_NOT_FOUND', message: '이 메모의 검증된 사본이 없어 복원을 멈췄습니다.' });
    }
    const backupHash = noteContentHash({ id: backup.note_id, ownerId: backup.owner_id, title: backup.title, body: backup.body });
    if (backupHash !== backup.content_hash) {
      await audit('verify', 'stopped_backup_unverified');
      return response.status(409).json({ error: 'BACKUP_UNVERIFIED', message: '사본 해시 검증에 실패해 복원을 멈췄습니다.' });
    }

    // 2. 현재 메모와 비교해 바뀔 항목을 정합니다. 다른 사람 소유로 바뀐 ID는 건드리지 않습니다.
    const { data: current, error: currentError } = await supabase
      .from('notes')
      .select('id, owner_id, title, body, content')
      .eq('id', id)
      .maybeSingle();
    if (currentError) {
      await audit('plan', 'stopped_read_error');
      return response.status(500).json({ error: 'DATABASE_QUERY_ERROR' });
    }
    if (current && current.owner_id !== ownerId) {
      await audit('plan', 'stopped_owner_mismatch');
      return response.status(409).json({ error: 'OWNER_MISMATCH', message: '현재 메모의 소유자가 사본과 달라 복원을 멈췄습니다.' });
    }
    const currentBody = current ? (current.body ?? current.content ?? '') : null;
    const changes = !current ? ['id', 'owner_id', 'title', 'body']
      : [current.title !== backup.title && 'title', currentBody !== backup.body && 'body',
        (current.content ?? '') !== backup.body && 'content'].filter(Boolean);
    const plan = {
      id,
      backupVersion: backup.created_at,
      backupHash,
      action: !current ? 'recreate' : (changes.length ? 'revert' : 'none'),
      changes,
    };

    if (dryRun) {
      await audit('plan', 'dry_run', { action: plan.action });
      return response.status(200).json({ dryRun: true, ...plan });
    }

    // 3. 그 한 건만 되돌립니다.
    if (plan.action !== 'none') {
      const row = { title: backup.title, body: backup.body, content: backup.body };
      const { error: writeError } = current
        ? await supabase.from('notes').update(row).eq('id', id).eq('owner_id', ownerId)
        : await supabase.from('notes').insert({ id, owner_id: ownerId, ...row });
      if (writeError) {
        await audit('apply', 'failed_write', { action: plan.action });
        return response.status(500).json({ error: 'RESTORE_WRITE_FAILED' });
      }
    }

    // 4. 다시 읽어 ID·소유자·내용 해시가 사본과 같은지 확인합니다.
    const { data: after } = await supabase
      .from('notes')
      .select('id, owner_id, title, body, content')
      .eq('id', id)
      .maybeSingle();
    const afterHash = after
      ? noteContentHash({ id: after.id, ownerId: after.owner_id, title: after.title, body: after.body ?? after.content ?? '' })
      : null;
    const verifiedRestore = Boolean(after) && after.id === id && after.owner_id === backup.owner_id && afterHash === backupHash;
    await audit('apply', verifiedRestore ? 'restored' : 'failed_verify', { action: plan.action });
    if (!verifiedRestore) {
      return response.status(500).json({ error: 'RESTORE_VERIFY_FAILED' });
    }

    return response.status(200).json({
      restored: true, ...plan, idMatches: true, ownerMatches: true, contentHash: afterHash,
    });
  } catch {
    return response.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
}
