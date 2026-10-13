import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// 로그인 중계: 브라우저는 키 없이 이메일·비밀번호만 보내고, 공개 키는 서버에서만 붙입니다.
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if ((request.method || 'GET').toUpperCase() !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const { email, password } = request.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return response.status(400).json({ error: 'INVALID_REQUEST', message: '이메일과 비밀번호를 입력해 주세요.' });
  }

  try {
    const config = JSON.parse(await readFile(resolve(process.cwd(), 'aleph.config.json'), 'utf8'));
    const issuer = config.identityProvider?.issuer;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY || config.identityProvider?.anonKey || config.publishableKey;
    if (!issuer || !key) return response.status(500).json({ error: 'SERVER_CONFIGURATION_ERROR' });

    const upstream = await fetch(`${issuer}/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || !data.access_token) {
      return response.status(401).json({ error: 'LOGIN_FAILED', message: '로그인에 실패했습니다.' });
    }
    return response.status(200).json({
      access_token: data.access_token,
      user: { id: data.user?.id, email: data.user?.email },
    });
  } catch {
    return response.status(502).json({ error: 'AUTH_UPSTREAM_ERROR', message: '로그인 중 오류가 발생했습니다.' });
  }
}
