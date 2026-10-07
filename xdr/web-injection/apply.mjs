import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide } from './decide.mjs';
import { writeBlocks } from './guard.mjs';

// 시험 경보를 판단하고 차단 후보를 deny-rules.json, 알림을 xdr/alerts.log 에 씁니다.
export async function applyWebInjection(root) {
  const fixture = JSON.parse(await readFile(join(root, 'xdr', 'fixtures', 'web-injection.json'), 'utf8'));
  const decisions = [];
  for (const alert of fixture.alerts) decisions.push(await decide(alert));
  return writeBlocks({
    alerts: fixture.alerts,
    decisions,
    rulesPath: join(root, 'xdr', 'web-injection', 'deny-rules.json'),
    logPath: join(root, 'xdr', 'alerts.log'),
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
    const out = await applyWebInjection(root);
    console.log(`차단 규칙 ${out.rules.length}건, 새 알림 ${out.logged}줄`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : '실행 오류');
    process.exitCode = 1;
  }
}
