import { createHash, createPublicKey, verify } from 'node:crypto';

// 11단계: 기기 승인과 요청 서명 확인. 기기 개인키는 브라우저 메모리 안에서만 쓰이고 서버로 오지 않습니다.
// 서버는 승인한 기기의 공개키(devices 테이블)로 "메서드·경로·본문 해시·시각·기기 ID" 서명을 확인합니다.
// 서명 헤더가 하나라도 있으면 모두 맞아야 하고, 승인 기기가 있는 계정은 서명 없는 보호 요청을 거부합니다.

export const SIGNATURE_VERSION = 'aleph-device-sig-v1';
export const APPROVAL_VERSION = 'aleph-device-approve-v1';
export const MAX_CLOCK_SKEW_MS = 120 * 1000;
export const MAX_DEVICES_PER_OWNER = 10;
const DEVICE_ID = /^[0-9a-f]{16}$/u;
const B64URL = /^[A-Za-z0-9_-]{16,200}$/u;

const header = (request, name) => {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

// 공개키 JWK(P-256)만 받습니다. 개인키 성분(d)이 섞여 있으면 거부합니다.
export function publicKeyFromJwk(jwk) {
  if (!jwk || typeof jwk !== 'object' || Array.isArray(jwk) || 'd' in jwk
      || jwk.kty !== 'EC' || jwk.crv !== 'P-256'
      || typeof jwk.x !== 'string' || typeof jwk.y !== 'string'
      || !B64URL.test(jwk.x) || !B64URL.test(jwk.y)) return null;
  const clean = { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y };
  try {
    return { jwk: clean, key: createPublicKey({ key: clean, format: 'jwk' }) };
  } catch {
    return null;
  }
}

// 기기 ID: 공개키에서 만든 16자리 소문자 16진수 (판정 계약의 deviceId 형식과 같음). 개인키가 아닙니다.
export function deviceIdFor(jwk) {
  return createHash('sha256').update(`${jwk.crv}|${jwk.x}|${jwk.y}`).digest('hex').slice(0, 16);
}

export function bodyText(request) {
  const body = request.body;
  if (body === undefined || body === null) return '';
  if (typeof body === 'string') return body;
  if (Buffer.isBuffer(body)) return body.toString('utf8');
  if (typeof body === 'object' && Object.keys(body).length === 0
      && !Number(header(request, 'content-length'))) return '';
  return JSON.stringify(body);
}

export function signedPayload({ method, path, body, timestamp, deviceId }) {
  const bodyHash = createHash('sha256').update(body).digest('hex');
  return [SIGNATURE_VERSION, method.toUpperCase(), path, bodyHash, String(timestamp), deviceId].join('\n');
}

export function verifySignature(key, payload, signature) {
  if (typeof signature !== 'string' || !B64URL.test(signature)) return false;
  try {
    return verify('sha256', Buffer.from(payload), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url'));
  } catch {
    return false;
  }
}

export function freshTimestamp(value, now = Date.now()) {
  const ts = Number(value);
  return Number.isSafeInteger(ts) && Math.abs(now - ts) <= MAX_CLOCK_SKEW_MS;
}

// 보호 요청마다 호출합니다. { ok: true, deviceId } 또는 { ok: false, status, error }를 돌려줍니다.
export async function checkDeviceSignature(request, ownerId, supabase, now = Date.now()) {
  const deviceId = header(request, 'x-aleph-device-id');
  const timestamp = header(request, 'x-aleph-timestamp');
  const signature = header(request, 'x-aleph-signature');

  if (deviceId === undefined && timestamp === undefined && signature === undefined) {
    const { data, error } = await supabase
      .from('devices').select('device_id').eq('owner_id', ownerId).eq('status', 'approved');
    if (error) {
      // devices 테이블을 아직 만들지 않은 경우에만 10단계까지의 동작을 유지합니다.
      if (error.code === '42P01' || error.code === 'PGRST205') return { ok: true, deviceId: null };
      return { ok: false, status: 503, error: 'DEVICE_CHECK_UNAVAILABLE' };
    }
    if ((data ?? []).length > 0) return { ok: false, status: 401, error: 'DEVICE_SIGNATURE_REQUIRED' };
    return { ok: true, deviceId: null };
  }

  if (!DEVICE_ID.test(String(deviceId)) || !freshTimestamp(timestamp, now)) {
    return { ok: false, status: 401, error: 'DEVICE_SIGNATURE_INVALID' };
  }
  const { data: device, error } = await supabase
    .from('devices').select('device_id, owner_id, public_key, status')
    .eq('owner_id', ownerId).eq('device_id', deviceId).maybeSingle();
  if (error || !device || device.status !== 'approved') {
    return { ok: false, status: 401, error: 'DEVICE_NOT_APPROVED' };
  }
  const parsed = publicKeyFromJwk(device.public_key);
  const url = new URL(request.url, 'http://localhost');
  const payload = signedPayload({
    method: request.method || 'GET', path: `${url.pathname}${url.search}`,
    body: bodyText(request), timestamp, deviceId,
  });
  if (!parsed || deviceIdFor(parsed.jwk) !== deviceId || !verifySignature(parsed.key, payload, signature)) {
    return { ok: false, status: 401, error: 'DEVICE_SIGNATURE_INVALID' };
  }
  return { ok: true, deviceId };
}
