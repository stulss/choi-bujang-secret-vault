import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { checkDeviceSignature } from '../src/device-auth.mjs';
import { NOTE_ID, noteContentHash, ownerIdFor } from '../src/note-owner.mjs';
import { createLoginVerifier } from '../src/verify-login.mjs';

let verifierInstance = null;

async function getVerifier() {
  if (!verifierInstance) {
    const root = resolve(process.cwd());
    const config = JSON.parse(await readFile(resolve(root, 'aleph.config.json'), 'utf8'));
    verifierInstance = createLoginVerifier({
      config,
      supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
    });
  }
  return verifierInstance;
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
    response.setHeader('Allow', 'GET, POST, PUT, DELETE, OPTIONS');
    return response.status(204).end();
  }

  // 1. Token Verification via src/verify-login.mjs
  const authHeader = request.headers['authorization'] || request.headers['Authorization'];
  let verified = null;
  try {
    const verifier = await getVerifier();
    verified = await verifier(authHeader);
  } catch (err) {
    console.log('[NOTES_API]', method, request.url, 'AUTH_ERROR:', err.message, 'authHeaderPresent:', !!authHeader);
    response.setHeader('WWW-Authenticate', 'Bearer');
    return response.status(401).json({ error: 'UNAUTHORIZED' });
  }

  if (!verified || !verified.userId) {
    console.log('[NOTES_API]', method, request.url, 'UNAUTHORIZED (no userId)', 'authHeaderPresent:', !!authHeader);
    response.setHeader('WWW-Authenticate', 'Bearer');
    return response.status(401).json({ error: 'UNAUTHORIZED' });
  }

  console.log('[NOTES_API]', method, request.url, 'VERIFIED_USER:', verified.userId);

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // 2. Extract noteId if present from path or query
  const url = new URL(request.url, 'http://localhost');
  const pathParts = url.pathname.replace(/\/+$/, '').split('/');
  const lastPart = pathParts[pathParts.length - 1];
  const isIdInPath = lastPart !== 'notes' && lastPart !== 'api' && lastPart !== '';
  const noteId = request.query?.id || (isIdInPath ? lastPart : null);

  // 8단계: 자원 ID 깊이에 기능 경로(export)를 두거나 쿼리로 기능을 분기하려는 요청 거부
  if (lastPart === 'export' || url.searchParams.get('action') === 'export') {
    return response.status(404).json({
      error: 'INVALID_RESOURCE_ROUTE',
      message: '자원 ID 깊이에 기능 경로(export)를 둘 수 없습니다.',
    });
  }

  // 8단계: 메모 구역은 메모 ID(UUID)만 받습니다. 공지 ID나 다른 모양의 ID는 이 구역에 없는 자료입니다.
  if (noteId && !NOTE_ID.test(noteId)) {
    return response.status(404).json({
      error: 'NOTE_NOT_FOUND',
      message: '자료를 찾을 수 없습니다.',
    });
  }

  const ownerId = ownerIdFor(verified);

  // 11단계: 승인 기기의 서명 확인 (서명 뒤 경로·본문을 바꾸면 거부, 승인 기기가 있는 계정은 서명 필수)
  const deviceCheck = await checkDeviceSignature(request, ownerId, supabase);
  if (!deviceCheck.ok) {
    return response.status(deviceCheck.status).json({ error: deviceCheck.error });
  }

  try {
    if (method === 'GET') {
      if (noteId) {
        // Single note GET: verify owner_id or existence
        const { data, error } = await supabase
          .from('notes')
          .select('id, owner_id, title, content, body, created_at')
          .eq('id', noteId)
          .maybeSingle();

        if (error || !data) {
          return response.status(404).json({
            error: 'NOTE_NOT_FOUND',
            message: '자료를 찾을 수 없습니다.',
          });
        }

        if (data.owner_id !== ownerId) {
          return response.status(403).json({
            error: 'FORBIDDEN_ZONE_ACCESS',
            message: '다른 구역의 자료입니다.',
          });
        }

        return response.status(200).json({
          id: data.id,
          title: data.title,
          content: data.content ?? data.body ?? '',
          body: data.body ?? data.content ?? '',
        });
      }

      // List GET: return only notes owned by the authenticated user
      const { data, error } = await supabase
        .from('notes')
        .select('id, owner_id, title, content, body, created_at')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: true });

      if (error) {
        return response.status(500).json({ error: 'DATABASE_QUERY_ERROR' });
      }

      const list = (data ?? []).map(row => ({
        id: row.id,
        title: row.title,
        content: row.content ?? row.body ?? '',
        body: row.body ?? row.content ?? '',
      }));

      return response.status(200).json(list);
    }

    if (method === 'POST') {
      let bodyData = request.body;
      if (typeof bodyData === 'string') {
        try { bodyData = JSON.parse(bodyData); } catch {}
      }
      const id = randomUUID();
      const title = bodyData?.title || '';
      const bodyText = bodyData?.body ?? bodyData?.content ?? '';

      // Do NOT trust any owner_id from request body or url; always bind to ownerId
      const { error } = await supabase.from('notes').insert({
        id,
        title,
        content: bodyText,
        body: bodyText,
        owner_id: ownerId,
      });

      if (error) {
        return response.status(500).json({ error: 'DATABASE_INSERT_ERROR' });
      }

      // 10단계: 만들 때의 내용을 비공개 사본(note_backups)에 검증용 해시와 함께 남깁니다.
      // 이후 수정은 사본에 반영하지 않습니다. 사본 저장이 실패해도 메모 생성은 유지하고, 복구 때 사본 없음으로 멈춥니다.
      const { error: backupError } = await supabase.from('note_backups').insert({
        note_id: id,
        owner_id: ownerId,
        title,
        body: bodyText,
        content_hash: noteContentHash({ id, ownerId, title, body: bodyText }),
      });
      if (backupError) console.log('[NOTES_API] BACKUP_INSERT_FAILED', backupError.code ?? 'unknown');

      return response.status(201).json({
        id,
        title,
        content: bodyText,
        body: bodyText,
      });
    }

    if (method === 'PUT') {
      if (!noteId) {
        return response.status(400).json({ error: 'MISSING_NOTE_ID' });
      }
      let bodyData = request.body;
      if (typeof bodyData === 'string') {
        try { bodyData = JSON.parse(bodyData); } catch {}
      }

      // Fetch existing note to verify ownership
      const { data: existing, error: fetchErr } = await supabase
        .from('notes')
        .select('id, owner_id, title, content, body')
        .eq('id', noteId)
        .maybeSingle();

      if (fetchErr || !existing) {
        return response.status(404).json({
          error: 'NOTE_NOT_FOUND',
          message: '수정할 자료가 존재하지 않습니다.',
        });
      }

      if (existing.owner_id !== ownerId) {
        return response.status(403).json({
          error: 'FORBIDDEN_ZONE_ACCESS',
          message: '다른 구역의 자료입니다.',
        });
      }

      if (bodyData?.owner_id && bodyData.owner_id !== ownerId) {
        return response.status(403).json({
          error: 'FORBIDDEN',
          message: '타 사용자의 소유권을 지정할 수 없습니다.',
        });
      }
      if (request.query?.owner_id && request.query.owner_id !== ownerId) {
        return response.status(403).json({
          error: 'FORBIDDEN',
          message: '타 사용자의 소유권을 지정할 수 없습니다.',
        });
      }

      const title = bodyData?.title;
      const bodyText = bodyData?.body ?? bodyData?.content;

      const updatePayload = {
        owner_id: ownerId,
      };
      if (title !== undefined) updatePayload.title = title;
      if (bodyText !== undefined) {
        updatePayload.content = bodyText;
        updatePayload.body = bodyText;
      }

      const { data, error } = await supabase
        .from('notes')
        .update(updatePayload)
        .eq('id', noteId)
        .eq('owner_id', ownerId)
        .select('id, title, content, body')
        .maybeSingle();

      if (error || !data) {
        return response.status(404).json({
          error: 'NOTE_NOT_FOUND',
          message: '해당 구역의 자료를 수정할 수 없습니다.',
        });
      }

      return response.status(200).json({
        id: data.id,
        title: data.title,
        content: data.content ?? data.body ?? '',
        body: data.body ?? data.content ?? '',
      });
    }

    if (method === 'DELETE') {
      if (!noteId) {
        return response.status(400).json({ error: 'MISSING_NOTE_ID' });
      }

      // Fetch existing note to verify ownership
      const { data: existing, error: fetchErr } = await supabase
        .from('notes')
        .select('id, owner_id')
        .eq('id', noteId)
        .maybeSingle();

      if (fetchErr || !existing) {
        return response.status(404).json({
          error: 'NOTE_NOT_FOUND',
          message: '삭제할 자료가 존재하지 않습니다.',
        });
      }

      if (existing.owner_id !== ownerId) {
        return response.status(403).json({
          error: 'FORBIDDEN_ZONE_ACCESS',
          message: '다른 구역의 자료입니다.',
        });
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('owner_id', ownerId);

      if (error) {
        return response.status(500).json({ error: 'DATABASE_DELETE_ERROR' });
      }

      return response.status(200).json({ success: true, id: noteId });
    }

    response.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  } catch {
    return response.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
}
