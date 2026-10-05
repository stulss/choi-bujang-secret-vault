import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
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

  // 1. Token Verification via src/verify-login.mjs
  const authHeader = request.headers['authorization'] || request.headers['Authorization'];
  let verified = null;
  try {
    const verifier = await getVerifier();
    verified = await verifier(authHeader);
  } catch {
    return response.status(401).json({ error: 'UNAUTHORIZED' });
  }

  if (!verified || !verified.userId) {
    return response.status(401).json({ error: 'UNAUTHORIZED' });
  }

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

  const method = (request.method || 'GET').toUpperCase();

  try {
    if (method === 'GET') {
      if (noteId) {
        // Single note GET: verify owner_id or existence
        const { data, error } = await supabase
          .from('notes')
          .select('id, owner_id, title, content, body, created_at')
          .eq('id', noteId)
          .maybeSingle();

        if (error || !data || data.owner_id !== verified.userId) {
          return response.status(404).json({ error: 'NOTE_NOT_FOUND' });
        }

        return response.status(200).json({
          id: data.id,
          title: data.title,
          body: data.body ?? data.content ?? '',
        });
      }

      // List GET: return only notes owned by the authenticated user
      const { data, error } = await supabase
        .from('notes')
        .select('id, owner_id, title, content, body, created_at')
        .eq('owner_id', verified.userId)
        .order('created_at', { ascending: true });

      if (error) {
        return response.status(500).json({ error: 'DATABASE_QUERY_ERROR' });
      }

      const list = (data ?? []).map(row => ({
        id: row.id,
        title: row.title,
        body: row.body ?? row.content ?? '',
      }));

      return response.status(200).json(list);
    }

    if (method === 'POST') {
      let bodyData = request.body;
      if (typeof bodyData === 'string') {
        try { bodyData = JSON.parse(bodyData); } catch {}
      }
      const id = bodyData?.id || randomUUID();
      const title = bodyData?.title || '';
      const bodyText = bodyData?.body ?? bodyData?.content ?? '';

      // Do NOT trust any owner_id from request body or url; always bind to verified.userId
      const { error } = await supabase.from('notes').insert({
        id,
        title,
        content: bodyText,
        body: bodyText,
        owner_id: verified.userId,
      });

      if (error) {
        return response.status(500).json({ error: 'DATABASE_INSERT_ERROR' });
      }

      return response.status(201).json({
        id,
        title,
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

      if (fetchErr || !existing || existing.owner_id !== verified.userId) {
        return response.status(404).json({ error: 'NOTE_NOT_FOUND' });
      }

      if (bodyData?.owner_id && bodyData.owner_id !== verified.userId) {
        return response.status(403).json({ error: 'FORBIDDEN' });
      }
      if (request.query?.owner_id && request.query.owner_id !== verified.userId) {
        return response.status(403).json({ error: 'FORBIDDEN' });
      }

      const title = bodyData?.title;
      const bodyText = bodyData?.body ?? bodyData?.content;

      const updatePayload = {
        owner_id: verified.userId,
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
        .eq('owner_id', verified.userId)
        .select('id, title, content, body')
        .maybeSingle();

      if (error || !data) {
        return response.status(404).json({ error: 'NOTE_NOT_FOUND' });
      }

      return response.status(200).json({
        id: data.id,
        title: data.title,
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

      if (fetchErr || !existing || existing.owner_id !== verified.userId) {
        return response.status(404).json({ error: 'NOTE_NOT_FOUND' });
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('owner_id', verified.userId);

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
