// 12단계 실측 증거 수집기는 심판 격리 실행기에서 추가 파일을 불러오지 않도록 src/attack-check.mjs 안에 있습니다.
// npm run evidence(scripts/evidence.mjs)는 이 파일을 통해 같은 수집기를 씁니다.
export { ATTACKS, attackStatus, collectEvidence, evidenceDigest, summarize } from './attack-check.mjs';
