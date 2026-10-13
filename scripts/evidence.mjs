import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectEvidence, evidenceDigest } from '../src/evidence.mjs';

// 12단계 증거 표 만들기: npm run evidence
// 배포 주소로 1~11단계 정상·금지 요청을 실제로 보내고(토큰 없이 보내도 되는 쓰기 요청 포함),
// 결과를 public/ops-evidence.json(작전실 화면용)과 docs/EVIDENCE.md(한 표)로 씁니다.
// 시험 계정 토큰이 필요한 요청은 보내지 않고 not_run 으로 남깁니다.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'aleph.config.json'), 'utf8'));
const evidence = await collectEvidence(config, { allowWrites: true });
evidence.digest = evidenceDigest(evidence);
writeFileSync(join(root, 'public', 'ops-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

const label = { pass: '기대와 같음', fail: '기대와 다름', not_run: '미실행' };
const s = evidence.summary;
const lines = [
  '# 12단계 실측 증거 표',
  '',
  `- 생성: \`npm run evidence\` · ${evidence.generatedAt} · 검사한 배포 커밋 \`${evidence.deployedCommit ?? '확인 못 함'}\``,
  `- 행 ${s.rows}개 · 금지 요청 거부 ${s.forbiddenRejected} / 다름 ${s.forbiddenFailed} / 미실행 ${s.forbiddenNotRun} · 정상 요청 허용 ${s.normalAllowed} / 다름 ${s.normalFailed} / 미실행 ${s.normalNotRun}`,
  `- 41종 공격: 실측 막음 ${s.attacksBlocked} · 실측 못 막음 ${s.attacksNotBlocked} · 미실행 ${s.attacksNotRun} (막음은 같은 종류의 요청을 실제로 보낸 결과만 셉니다)`,
  `- 요청 ID: 배포 주소는 응답 헤더 \`x-vercel-id\`(원본 API는 \`sb-request-id\`), 판정기·탐지기는 이번 실행에서 만든 UUID입니다. 표 SHA-256 \`${evidence.digest.slice(0, 16)}…\``,
  '',
  '| ID | 단계 | 구분 | 요청 | 기대 결과 | 실제 결과 | 판단 | 요청 ID | 확인 시각 |',
  '|---|---|---|---|---|---|---|---|---|',
  ...evidence.rows.map(r => `| ${r.id} | ${r.stage} | ${r.kind === 'normal' ? '정상' : '금지'} | ${r.request} | ${r.expected} | ${r.actual} | ${label[r.result]} | ${r.requestId ? `\`${r.requestId}\`` : '-'} | ${r.checkedAt ?? '-'} |`),
  '',
  '## 41종 공격 실행 여부',
  '',
  '| 단계 | 코드 | 공격 | 상태 | 근거 행 |',
  '|---|---|---|---|---|',
  ...evidence.attacks.map(a => `| ${a.stage} | ${a.code} | ${a.name} | ${a.status === 'blocked' ? '실측 막음' : a.status === 'not_blocked' ? '실측 못 막음' : '미실행'} | ${a.measuredBy.join(', ') || '-'} |`),
  '',
];
writeFileSync(join(root, 'docs', 'EVIDENCE.md'), lines.join('\n'), 'utf8');
process.stdout.write(`${lines.slice(2, 6).join('\n')}\n증거 표: docs/EVIDENCE.md, public/ops-evidence.json\n`);
