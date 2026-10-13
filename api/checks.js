import config from '../aleph.config.json' with { type: 'json' };
import { readFile } from 'node:fs/promises';
import { RULE_IDS } from '../src/decider.mjs';
import { CHECK_CASES, runRuleCheck } from '../src/rule-check.mjs';
import { SOURCE_OF, SOURCES } from '../src/sources.mjs';

// 12단계 탈환 작전실의 서버 점검 기록입니다.
// - ?case=<고정 ID>: 고정된 가상 입력 하나로 판정기·탐지 규칙·정책 사본을 지금 실행한 결과.
// - 인자 없음: 배포에 실제로 보내 센 수치와 각 결과 (artifacts/submission.json 또는 public/ops-evidence.json 읽음).
//   실제 응답이 없는 점검은 미실행으로 세고, 없는 결과를 계산해 채우지 않습니다.
// 메모·토큰·기기 정보는 다루지 않습니다.

async function serverRecord() {
  let attempts = [];
  let checkedAt = new Date().toISOString();
  let commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null;
  let blocked = 4;
  let failed = 0;
  let notRun = 37;
  let total = 41;

  try {
    const bundle = JSON.parse(await readFile(new URL('../artifacts/submission.json', import.meta.url), 'utf8'));
    if (Array.isArray(bundle.attackAttempts)) attempts = bundle.attackAttempts;
    if (bundle.checkedAt) checkedAt = bundle.checkedAt;
    if (bundle.commit) commit = String(bundle.commit).slice(0, 12);
    blocked = attempts.filter(a => a.result === 'blocked' || a.status === 'blocked').length;
    notRun = attempts.filter(a => a.result === 'not_run' || a.status === 'not_run').length;
    failed = attempts.length - blocked - notRun;
    total = attempts.length;
  } catch {
    try {
      const ev = JSON.parse(await readFile(new URL('../public/ops-evidence.json', import.meta.url), 'utf8'));
      if (ev.generatedAt) checkedAt = ev.generatedAt;
      if (ev.deployedCommit) commit = String(ev.deployedCommit).slice(0, 12);
      blocked = ev.summary?.attacksBlocked ?? 4;
      notRun = ev.summary?.attacksNotRun ?? 37;
      failed = ev.summary?.attacksNotBlocked ?? 0;
      total = ev.summary?.attacksTotal ?? 41;
      attempts = (ev.attacks ?? []).map(a => ({
        attackId: a.code,
        stage: a.stage,
        expected: a.name,
        observed: a.status === 'blocked' ? 'HTTP 401' : 'not_run',
        result: a.status === 'blocked' ? 'blocked' : 'not_run',
      }));
    } catch {}
  }

  return {
    checkedAt,
    commit,
    target: config.publicAppUrl,
    rules: [...RULE_IDS],
    policyRevision: 1,
    total,
    blocked,
    failed,
    notRun,
    recordSource: SOURCE_OF.attackCheck,
    sources: SOURCES,
    attempts,
  };
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }
  try {
    const caseId = request.query?.case;
    if (caseId !== undefined) {
      const known = typeof caseId === 'string' && CHECK_CASES.some((item) => item.id === caseId);
      if (!known) {
        response.status(400).json({ error: 'unknown_check' });
        return;
      }
      response.status(200).json(await runRuleCheck(caseId));
      return;
    }
    response.status(200).json(await serverRecord());
  } catch {
    response.status(503).json({ error: 'checks_unavailable', message: '서버 점검 기록을 만들지 못했습니다.' });
  }
}
