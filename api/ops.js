import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { checkDeviceSignature } from '../src/device-auth.mjs';
import { ownerIdFor } from '../src/note-owner.mjs';
import { buildOpsSummary } from '../src/ops-summary.mjs';
import { createLoginVerifier } from '../src/verify-login.mjs';

// 12단계 탈환 작전실: GET /api/ops
// 로그인 토큰과 승인 기기의 서명을 확인한 뒤, 이 계정의 판정기 규칙·탐지 사건·회수 상태·복구 버전 요약만 돌려줍니다.
// 읽기 전용입니다. 메모 본문·제목·토큰·공개키는 읽지도 응답에 넣지도 않습니다.

let verifierInstance = null;

async function getVerifier() {
  if (!verifierInstance) {
    const config = JSON.parse(await readFile(resolve(process.cwd(), 'aleph.config.json'), 'utf8'));
    verifierInstance = createLoginVerifier({ config, supabaseSecretKey: process.env.SUPABASE_SECRET_KEY });
  }
  return verifierInstance;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  const method = (request.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') {
    response.setHeader('Allow', 'GET, OPTIONS');
    return response.status(204).end();
  }
  if (method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const authHeader = request.headers?.['authorization'] || request.headers?.['Authorization'];
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

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    return response.status(500).json({ error: 'SERVER_CONFIGURATION_ERROR' });
  }
  const ownerId = ownerIdFor(verified);
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const deviceCheck = await checkDeviceSignature(request, ownerId, supabase);
  if (!deviceCheck.ok) {
    return response.status(deviceCheck.status).json({ error: deviceCheck.error });
  }

  try {
    return response.status(200).json(await buildOpsSummary({ supabase, ownerId, deviceId: deviceCheck.deviceId }));
  } catch {
    return response.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
}
