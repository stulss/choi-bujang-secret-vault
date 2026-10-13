import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runAttackChecks } from '../src/attack-check.mjs';
import { checksReport, runCase } from '../src/checks.mjs';

// 12단계 점검 기록 (로그인 불필요, GET·HEAD만)
// - GET /api/checks?case=<점검 이름>: 고정된 가상 입력 하나를 학생 판정기·탐지 규칙·정책 사본으로 지금 실행한 결과(ready).
// - GET /api/checks: 제출 묶음·심판 runner와 같은 함수(src/attack-check.mjs의 runAttackChecks)를 이 배포에 실제로 보내
//   받은 결과와 수치를 돌려줍니다. 화면의 「서버 점검 기록」은 이 수치를 계산하지 않고 그대로 옮깁니다.
// 공개된 경로의 응답 상태만 담고 메모·토큰·키는 담지 않습니다.
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  const method = (request.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  try {
    const caseId = request.query?.case;
    if (caseId !== undefined) {
      const result = await runCase(caseId);
      return result ? response.status(200).json(result) : response.status(400).json({ error: 'UNKNOWN_CASE' });
    }
    const config = JSON.parse(await readFile(resolve(process.cwd(), 'aleph.config.json'), 'utf8'));
    const attempts = await runAttackChecks(config.publicAppUrl);
    const commit = process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12) : null;
    return response.status(200).json(checksReport(attempts, { commit, target: new URL(config.publicAppUrl).origin }));
  } catch {
    return response.status(503).json({ error: 'CHECKS_UNAVAILABLE' });
  }
}
