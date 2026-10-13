import { createHash } from 'node:crypto';

// 메모 API(api/notes.js)와 복구 API(api/restore.js)가 같은 기준을 쓰도록 모은 도우미입니다.
export const NOTE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

// 메모 구역의 주인 ID. 심판 토큰은 실행 ID와 a/b 신원까지 묶어 A·B 구역이 섞이지 않게 합니다.
export function ownerIdFor(verified) {
  if (verified.kind !== 'judge') return verified.userId;
  const hex = createHash('sha256')
    .update(`aleph-judge-owner:${verified.runId}:${verified.identity}:${verified.userId}`)
    .digest('hex');
  const variant = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// 내용 해시: 메모 ID·소유자·제목·본문을 순서대로 묶은 SHA-256. 본문 자체는 어디에도 출력하지 않습니다.
export function noteContentHash({ id, ownerId, title, body }) {
  return createHash('sha256')
    .update(JSON.stringify([String(id).toLowerCase(), String(ownerId), String(title ?? ''), String(body ?? '')]))
    .digest('hex');
}
