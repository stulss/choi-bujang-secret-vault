import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  APPROVAL_VERSION, MAX_DEVICES_PER_OWNER, checkDeviceSignature, deviceIdFor, freshTimestamp,
  publicKeyFromJwk, verifySignature,
} from '../src/device-auth.mjs';
import { ownerIdFor } from '../src/note-owner.mjs';
import { createLoginVerifier } from '../src/verify-login.mjs';

// 11단계: 기기 승인 요청과 승인 상태 확인.
// POST /api/device  { publicKey: <P-256 공개키 JWK>, timestamp, proof }  → 서버가 확인한 뒤 승인 여부를 정합니다.
//   proof = 기기 개인키로 "aleph-device-approve-v1\n<deviceId>\n<timestamp>"에 서명한 값 (개인키 보유 증명)
// GET  /api/device  (서명 헤더 필수) → 이 기기가 서버에 승인 기기로 등록됐는지 서명으로 다시 확인합니다.
// 화면의 버튼이나 설치 표시는 승인이 아닙니다. 승인 여부는 이 서버 응답만으로 정합니다.

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
    response.setHeader('Allow', 'GET, POST, OPTIONS');
    return response.status(204).end();
  }
  if (method !== 'GET' && method !== 'POST') {
    response.setHeader('Allow', 'GET, POST');
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

  try {
    if (method === 'GET') {
      if (!request.headers['x-aleph-device-id'] || !request.headers['x-aleph-signature']) {
        return response.status(401).json({ error: 'DEVICE_SIGNATURE_REQUIRED', status: 'unverified' });
      }
      const check = await checkDeviceSignature(request, ownerId, supabase);
      if (!check.ok) return response.status(check.status).json({ error: check.error, status: 'not_approved' });
      return response.status(200).json({ deviceId: check.deviceId, status: 'approved', verifiedBy: 'server' });
    }

    // POST: 승인 요청
    const body = readBody(request);
    const parsed = publicKeyFromJwk(body.publicKey);
    if (!parsed) return response.status(400).json({ error: 'INVALID_DEVICE_PUBLIC_KEY' });
    const deviceId = deviceIdFor(parsed.jwk);
    if (!freshTimestamp(body.timestamp)) return response.status(400).json({ error: 'STALE_APPROVAL_REQUEST' });
    const proofPayload = [APPROVAL_VERSION, deviceId, String(body.timestamp)].join('\n');
    if (!verifySignature(parsed.key, proofPayload, body.proof)) {
      return response.status(401).json({ error: 'DEVICE_PROOF_INVALID', deviceId, status: 'rejected' });
    }

    const { data: existing, error: readError } = await supabase
      .from('devices').select('device_id, status').eq('owner_id', ownerId);
    if (readError) return response.status(503).json({ error: 'DEVICE_REGISTRY_UNAVAILABLE' });
    const rows = existing ?? [];
    const same = rows.find(row => row.device_id === deviceId);
    if (same?.status === 'revoked') {
      return response.status(403).json({ error: 'DEVICE_REVOKED', deviceId, status: 'revoked' });
    }
    if (!same && rows.filter(row => row.status === 'approved').length >= MAX_DEVICES_PER_OWNER) {
      return response.status(403).json({ error: 'DEVICE_LIMIT_REACHED', deviceId, status: 'rejected' });
    }
    if (!same) {
      const { error: insertError } = await supabase.from('devices').insert({
        owner_id: ownerId, device_id: deviceId, public_key: parsed.jwk, status: 'approved',
      });
      if (insertError) return response.status(503).json({ error: 'DEVICE_REGISTRY_UNAVAILABLE' });
    }
    return response.status(200).json({ deviceId, status: 'approved', approvedBy: 'server' });
  } catch {
    return response.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
}
