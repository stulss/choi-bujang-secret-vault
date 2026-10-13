import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createLoginVerifier } from '../src/verify-login.mjs';

let verifierInstance = null;

const NOTICE_ID = /^(?:notice-[a-z0-9_-]{1,64}|\d{1,9})$/iu;

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
    response.setHeader('WWW-Authenticate', 'Bearer');
    return response.status(401).json({ error: 'UNAUTHORIZED' });
  }

  if (!verified || !verified.userId) {
    response.setHeader('WWW-Authenticate', 'Bearer');
    return response.status(401).json({ error: 'UNAUTHORIZED' });
  }

  const url = new URL(request.url, 'http://localhost');
  const pathParts = url.pathname.replace(/\/+$/, '').split('/');
  const lastPart = pathParts[pathParts.length - 1];
  const isIdInPath = lastPart !== 'notices' && lastPart !== 'api' && lastPart !== '';
  const requestedId = request.query?.id || (isIdInPath ? lastPart : null);
  const noticeId = requestedId || 'notice-default';

  // 8단계: 자원 ID 깊이에 기능 경로(export) 거부
  if (lastPart === 'export' || url.searchParams.get('action') === 'export') {
    return response.status(404).json({
      error: 'INVALID_RESOURCE_ROUTE',
      message: '자원 ID 깊이에 기능 경로(export)를 둘 수 없습니다.',
    });
  }

  // 8단계: 강사 공지 수정 권한 검증 (화면 메뉴나 요청 본문의 role은 믿지 않고 서버 토큰 검증 권한만 판정)
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const isInstructor = verified.role === 'instructor' || verified.app_metadata?.role === 'instructor';
    if (!isInstructor) {
      return response.status(403).json({
        error: 'FORBIDDEN_ZONE_ACCESS',
        message: '강사 공지 수정은 강사 권한이 필요합니다.',
      });
    }
    return response.status(200).json({
      id: noticeId,
      status: 'success',
      message: '공지가 수정되었습니다.',
    });
  }

  // 8단계: 공지 구역은 공지 ID(notice-… 또는 번호)만 받습니다. 메모 ID는 이 구역에 없는 자료입니다.
  if (requestedId && !NOTICE_ID.test(requestedId)) {
    return response.status(404).json({ error: 'NOTICE_NOT_FOUND', message: '공지를 찾을 수 없습니다.' });
  }

  // GET: 공지 조회 반환
  if (method === 'GET') {
    return response.status(200).json({
      id: noticeId,
      type: 'notice',
      title: '훈련 공지사항',
      content: '등록된 공식 훈련 공지 구역입니다.',
      body: '등록된 공식 훈련 공지 구역입니다.',
    });
  }

  return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
