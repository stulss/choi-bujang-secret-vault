import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 10단계: 침해 전에 검증한 시험 정책 사본(policy/backups)과 현재 시험 정책(policy/test-policy.json)을 비교하고,
// 확인한 서비스 하나만 사본 버전으로 되돌립니다. 실제 운영 판정기(src/decider.mjs)는 읽기만 하고 바꾸지 않습니다.
//   npm run policy:diff                                   → 사본 검증, 복원할 버전과 바뀔 항목만 출력
//   npm run policy:restore -- --service notes --version <버전> --yes  → 그 서비스만 되돌리고 감사 기록 한 줄 추가

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const POLICY_FILE = join(root, 'policy', 'test-policy.json');
const MANIFEST_FILE = join(root, 'policy', 'backups', 'manifest.json');
const AUDIT_FILE = join(root, 'policy', 'audit.log.jsonl');

const sha256 = text => createHash('sha256').update(text).digest('hex');

function stop(message) {
  const error = new Error(message);
  error.stop = true;
  throw error;
}

// 사본을 매번 다시 읽어 manifest의 SHA-256·버전·형식과 대조합니다. 하나라도 맞지 않으면 멈춥니다.
export function loadVerifiedBackup() {
  if (!existsSync(MANIFEST_FILE)) stop('사본 목록(policy/backups/manifest.json)이 없어 중단합니다.');
  const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'));
  if (typeof manifest.file !== 'string' || !/^[a-z0-9._-]+\.json$/iu.test(manifest.file)) stop('사본 파일 이름이 올바르지 않아 중단합니다.');
  const file = join(root, 'policy', 'backups', manifest.file);
  if (!existsSync(file)) stop(`사본 ${manifest.file}이 없어 중단합니다.`);
  const text = readFileSync(file, 'utf8');
  if (sha256(text) !== manifest.sha256) stop(`사본 ${manifest.file}의 SHA-256이 기록과 달라 중단합니다.`);
  const backup = JSON.parse(text);
  if (backup.schema !== 'aleph.test-policy.v1' || backup.version !== manifest.version
      || !backup.services || typeof backup.services !== 'object') {
    stop('사본 형식이나 버전이 기록과 달라 중단합니다.');
  }
  return { manifest, backup };
}

function flatten(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { [prefix]: JSON.stringify(value) };
  return Object.entries(value).reduce((acc, [key, item]) => ({ ...acc, ...flatten(item, prefix ? `${prefix}.${key}` : key) }), {});
}

// 사본에 있는 서비스별로 현재 정책과 다른 항목만 돌려줍니다. 사본에 없는 다른 서비스·항목은 비교 대상이 아닙니다.
export function policyDiff(current, backup) {
  const result = {};
  for (const [service, rules] of Object.entries(backup.services)) {
    const want = flatten(rules);
    const have = flatten(current.services?.[service] ?? {});
    const keys = [...new Set([...Object.keys(want), ...Object.keys(have)])].sort();
    const changes = keys.filter(key => want[key] !== have[key])
      .map(key => ({ key, current: have[key] ?? '(없음)', restored: want[key] ?? '(삭제)' }));
    if (changes.length) result[service] = changes;
  }
  return result;
}

// 시험 정책만으로 메모 요청 하나를 판정합니다 (재시험용, 운영 판정기와 별개).
export function evaluateTestPolicy(policy, { method, route, subjectOwner, targetOwner }) {
  const notes = policy.services?.notes ?? {};
  if (!Array.isArray(notes.routes) || !notes.routes.includes(`${method} ${route}`)) return 'deny';
  if (route === '/notes' && method === 'GET') return notes.listRead === 'allow' ? 'allow' : 'deny';
  if (route === '/notes/:id') return (subjectOwner === targetOwner ? notes.ownRead : notes.crossOwner) === 'allow' ? 'allow' : 'deny';
  return 'allow';
}

function printPlan(manifest, diff) {
  process.stdout.write(`복원할 사본: ${manifest.version} (${manifest.file}, SHA-256 ${manifest.sha256.slice(0, 12)}… 검증 통과, 출처 커밋 ${manifest.sourceCommit})\n`);
  const services = Object.keys(diff);
  if (!services.length) {
    process.stdout.write('현재 시험 정책이 사본과 같습니다. 바뀔 항목이 없습니다.\n');
    return;
  }
  for (const service of services) {
    process.stdout.write(`[${service}] 바뀔 항목 ${diff[service].length}개\n`);
    for (const change of diff[service]) process.stdout.write(`  - ${change.key}: ${change.current} → ${change.restored}\n`);
  }
}

export function restoreService({ service, version, yes }) {
  const { manifest, backup } = loadVerifiedBackup();
  const currentText = readFileSync(POLICY_FILE, 'utf8');
  const current = JSON.parse(currentText);
  const diff = policyDiff(current, backup);
  printPlan(manifest, diff);
  if (!service || !backup.services[service]) stop('되돌릴 서비스(--service)가 사본에 없어 중단합니다.');
  if (version !== manifest.version) stop(`확인 버전(--version)이 사본 버전 ${manifest.version}과 달라 중단합니다.`);
  if (!diff[service]) {
    process.stdout.write(`[${service}] 이미 사본과 같아 바꾸지 않습니다.\n`);
    return { changed: false };
  }
  if (yes !== true) stop('위 항목을 확인했다면 --yes를 붙여 다시 실행하세요. 아직 아무것도 바꾸지 않았습니다.');

  // 지정한 서비스만 사본으로 교체합니다. 다른 서비스 규칙과 감사 기록은 그대로 둡니다.
  const next = { ...current, services: { ...current.services, [service]: structuredClone(backup.services[service]) },
    restored: { ...(current.restored ?? {}), [service]: manifest.version } };
  const nextText = `${JSON.stringify(next, null, 2)}\n`;
  const auditBefore = existsSync(AUDIT_FILE) ? readFileSync(AUDIT_FILE, 'utf8') : '';
  writeFileSync(POLICY_FILE, nextText, 'utf8');
  appendFileSync(AUDIT_FILE, `${JSON.stringify({
    at: new Date().toISOString(), action: 'policy_restore', service, fromVersion: manifest.version,
    changedKeys: diff[service].map(item => item.key), sha256Before: sha256(currentText), sha256After: sha256(nextText),
  })}\n`, 'utf8');
  const auditAfter = readFileSync(AUDIT_FILE, 'utf8');
  if (!auditAfter.startsWith(auditBefore)) stop('감사 기록 앞부분이 바뀌었습니다. 확인이 필요합니다.');
  process.stdout.write(`[${service}] 사본 ${manifest.version}으로 되돌렸습니다. 감사 기록 한 줄을 추가했습니다.\n`);
  return { changed: true };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  try {
    if (command === 'diff') {
      const { manifest, backup } = loadVerifiedBackup();
      printPlan(manifest, policyDiff(JSON.parse(readFileSync(POLICY_FILE, 'utf8')), backup));
    } else if (command === 'restore') {
      restoreService({ service: option('--service'), version: option('--version'), yes: args.includes('--yes') });
    } else {
      throw new Error('사용법: node scripts/policy-restore.mjs diff | restore --service <이름> --version <버전> [--yes]');
    }
    if (command === 'restore' || command === 'diff') {
      const policy = JSON.parse(readFileSync(POLICY_FILE, 'utf8'));
      const crossOwner = evaluateTestPolicy(policy, { method: 'GET', route: '/notes/:id', subjectOwner: 'b', targetOwner: 'a' });
      const ownRead = evaluateTestPolicy(policy, { method: 'GET', route: '/notes/:id', subjectOwner: 'a', targetOwner: 'a' });
      process.stdout.write(`시험 정책 재판정 · B의 A 메모 읽기: ${crossOwner} · A의 자기 메모 읽기: ${ownRead}\n`);
    }
  } catch (error) {
    process.stderr.write(`${error.stop ? '중단' : '첫 오류'}: ${error.message}\n`);
    process.exitCode = 1;
  }
}
