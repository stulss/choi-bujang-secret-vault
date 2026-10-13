import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectEvidence, renderMarkdown } from '../src/evidence.mjs';

// 1~11단계 정상·금지 요청 실측 표: npm run evidence
// 배포 주소(aleph.config.json의 publicAppUrl)에 로그인 없는 정상·금지 요청을 실제로 보내고,
// 판정기·탐지기·정책 함수 결과와 함께 docs/EVIDENCE.md 한 표로 씁니다. 원본 기록은 artifacts/evidence.json(커밋 제외)에 남깁니다.
// 계정 토큰·기기 서명이 필요한 요청은 보내지 않고 미실행으로 남깁니다. 41종 공격은 심판이 보내므로 이 표에서 세지 않습니다.

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
try {
  const config = JSON.parse(readFileSync(join(root, 'aleph.config.json'), 'utf8'));
  // 시험 계정은 환경변수로만 받습니다. 코드·표·기록·화면에 출력하지 않습니다.
  //   A 계정: EVIDENCE_EMAIL, EVIDENCE_PASSWORD   B 계정(남의 메모 접근 거부 확인용): EVIDENCE_B_EMAIL, EVIDENCE_B_PASSWORD
  // --with-account 가 있을 때만 사용하며, 시험 계정마다 승인 기기 1개 등록이 남고 A 계정에 가상 메모 1건 추가·삭제가 생깁니다.
  let account = null;
  let accountB = null;
  if (process.argv.includes('--with-account')) {
    const { EVIDENCE_EMAIL: email, EVIDENCE_PASSWORD: password, EVIDENCE_B_EMAIL: emailB, EVIDENCE_B_PASSWORD: passwordB } = process.env;
    if (!email || !password) throw new Error('--with-account 는 환경변수 EVIDENCE_EMAIL, EVIDENCE_PASSWORD 가 필요합니다. 값은 본인 터미널에서 직접 넣어 주세요.');
    account = { email, password };
    if (emailB && passwordB) accountB = { email: emailB, password: passwordB };
  }
  const evidence = await collectEvidence(config, { account, accountB });
  mkdirSync(join(root, 'artifacts'), { recursive: true });
  writeFileSync(join(root, 'artifacts', 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  const markdown = renderMarkdown(evidence);
  writeFileSync(join(root, 'docs', 'EVIDENCE.md'), markdown, 'utf8');
  process.stdout.write(`${markdown.split('\n').slice(2, 6).join('\n')}\n표: docs/EVIDENCE.md\n`);
  if (evidence.rows.some(item => item.result === 'fail')) {
    process.stdout.write('기대와 다른 행이 있습니다. 표의 「기대와 다름」 행을 먼저 확인하세요.\n');
    process.exitCode = 1;
  }
} catch (error) {
  process.stderr.write(`증거 표 첫 오류: ${error.message}\n`);
  process.exitCode = 1;
}
