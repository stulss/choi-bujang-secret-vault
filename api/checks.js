import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { checksReport, runChecks } from '../src/checks.mjs';

// 12단계 점검 기록: GET /api/checks
// 제출 묶음(npm run bundle)과 같은 함수(src/checks.mjs의 runChecks)로 지금 점검을 실행해 돌려줍니다.
// 배포 주소에는 GET·HEAD만 최대 24건 보내며, 쓰기 요청이 필요한 점검은 not_run입니다.
// 공개된 경로의 응답 상태만 담고 메모·토큰·키는 담지 않습니다.
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  const method = (request.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  try {
    const config = JSON.parse(await readFile(resolve(process.cwd(), 'aleph.config.json'), 'utf8'));
    const records = await runChecks(config);
    const commit = process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12) : null;
    return response.status(200).json(checksReport(records, { commit, target: new URL(config.publicAppUrl).origin }));
  } catch {
    return response.status(503).json({ error: 'CHECKS_UNAVAILABLE' });
  }
}
