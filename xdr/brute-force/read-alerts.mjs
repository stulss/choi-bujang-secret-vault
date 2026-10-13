import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 비밀값처럼 보이는 조각은 출력 전에 가립니다. 원본 경보 객체는 고치지 않습니다.
const SECRET_PATTERNS = [
  /\b(?:pass(?:word)?|passwd|pwd|token|secret|api[_-]?key|authorization|bearer)\b\s*[=:]\s*\S+/gi,
  /\beyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]*/g,
  /\b(?:sk|pk|ghp|xox[a-z])[-_][\w-]{16,}/gi,
  /\b[A-Za-z0-9+/_-]{32,}={0,2}/g,
];

export function redact(value) {
  if (typeof value !== 'string') return '';
  return SECRET_PATTERNS.reduce((text, pattern) => text.replace(pattern, '[가림]'), value);
}

// 시각·출발 주소·계정·규칙 수준·설명만 뽑습니다. id 는 줄을 경보와 맞추는 번호입니다.
export function extractAlert(alert) {
  return {
    id: redact(String(alert?.id ?? '')),
    time: redact(String(alert?.timestamp ?? '')),
    srcip: redact(String(alert?.data?.srcip ?? '')),
    account: redact(String(alert?.data?.srcuser ?? '')),
    level: Number.isFinite(alert?.rule?.level) ? alert.rule.level : 0,
    description: redact(String(alert?.rule?.description ?? '')),
  };
}

export async function readAlerts(path) {
  const fixture = JSON.parse(await readFile(path, 'utf8'));
  if (!Array.isArray(fixture?.alerts)) throw new Error('경보 묶음 형식이 아닙니다.');
  const rows = fixture.alerts.map(extractAlert);
  if (rows.length !== fixture.alerts.length) throw new Error('경보 건수와 뽑은 줄 수가 다릅니다.');
  return rows;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const here = dirname(fileURLToPath(import.meta.url));
  try {
    const path = join(here, '..', 'fixtures', 'brute-force.json');
    const total = JSON.parse(await readFile(path, 'utf8')).alerts.length;
    const rows = await readAlerts(path);
    for (const row of rows) console.log(JSON.stringify(row));
    console.error(`경보 ${total}건, 뽑은 줄 ${rows.length}줄`);
    if (total !== rows.length) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : '읽기 오류');
    process.exitCode = 1;
  }
}
