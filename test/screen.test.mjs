import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { runAttackChecks } from '../src/attack-check.mjs';
import { checksReport, runCase } from '../src/checks.mjs';
import { buildOpsSummary } from '../src/ops-summary.mjs';

// 화면(public/index.html의 스크립트)을 아주 작은 가짜 DOM에서 그대로 실행합니다.
// 서버 응답은 서버 쪽 진짜 함수(runAttackChecks, runCase, buildOpsSummary)로 만들고, 화면에 찍힌 수치가 응답과 같은지 확인합니다.
// 실제 브라우저·배포 주소는 쓰지 않습니다.

class TextNode { constructor(text) { this.textContent = String(text); } }
class El {
  constructor(tag) { this.tag = tag; this.children = []; this.style = {}; this.dataset = {}; this.listeners = {}; this.own = ''; this.className = ''; this.value = ''; this.disabled = false; }
  set textContent(value) { this.own = String(value); this.children = []; }
  get textContent() { return this.own + this.children.map(child => child.textContent).join(''); }
  append(...nodes) { for (const n of nodes) this.children.push(typeof n === 'string' ? new TextNode(n) : n); }
  appendChild(n) { this.children.push(n); return n; }
  replaceChildren(...nodes) { this.children = []; this.own = ''; this.append(...nodes); }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  set onclick(fn) { this.listeners.click = [fn]; }
  findAll(tag) { return [...(this.tag === tag ? [this] : []), ...this.children.flatMap(c => (c instanceof El ? c.findAll(tag) : []))]; }
}

const pageScript = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8').match(/<script type="module">([\s\S]*)<\/script>/u)[1];
// 배포를 흉내 내는 가짜 응답: /api/checks?case=… 는 서버 쪽 진짜 runCase로 답합니다.
async function serverFetch(url) {
  const u = new URL(url);
  if (u.pathname === '/api/checks') return new Response(JSON.stringify(await runCase(u.searchParams.get('case'))), { status: 200 });
  if (u.pathname === '/data.json') return new Response('{"notes":[]}', { status: 200 });
  if (u.pathname === '/') return new Response("generateKey({ name: 'ECDSA' }, false, ['sign'])", { status: 200 });
  return new Response('{"error":"UNAUTHORIZED"}', { status: 401 });
}

async function serverChecks() {
  const original = globalThis.fetch;
  globalThis.fetch = serverFetch;
  try {
    return checksReport(await runAttackChecks('https://example-app.vercel.app'), { checkedAt: 't' });
  } finally {
    globalThis.fetch = original;
  }
}

function fakeSupabase() {
  const tables = {
    note_backups: [{ owner_id: 'me', note_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', created_at: '2026-10-13T00:00:00Z' }],
    restore_audit: [
      { id: 1, owner_id: 'me', note_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', stage: 'requested', result: 'pending', action: null, dry_run: false, at: 't1' },
      { id: 2, owner_id: 'me', note_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', stage: 'apply', result: 'restored', action: 'revert', dry_run: false, at: 't2' },
    ],
    devices: [{ owner_id: 'me', device_id: '0123456789abcdef', status: 'approved' }],
  };
  return {
    from(name) {
      let rows = tables[name] ?? [];
      let wantCount = false;
      const q = {
        select(_c, o) { wantCount = o?.count === 'exact'; return q; },
        eq(col, val) { rows = rows.filter(r => r[col] === val); return q; },
        order() { return q; }, limit() { return q; },
        then(res, rej) { return Promise.resolve({ data: rows, error: null, count: wantCount ? rows.length : null }).then(res, rej); },
      };
      return q;
    },
  };
}

async function openPage({ tamperChecks = false, login = true } = {}) {
  const checks = await serverChecks();
  const ops = await buildOpsSummary({ supabase: fakeSupabase(), ownerId: 'me' });
  const servedChecks = tamperChecks ? { ...checks, blocked: checks.blocked + 1 } : checks;

  const elements = {};
  globalThis.document = { getElementById: id => (elements[id] ??= new El('div')), createElement: tag => new El(tag), createTextNode: t => new TextNode(t) };
  globalThis.matchMedia = () => ({ matches: false });
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
  globalThis.addEventListener = () => {};
  globalThis.sessionStorage = { removeItem() {} };
  globalThis.fetch = async (path, init = {}) => {
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
    const method = init.method || 'GET';
    if (path === '/api/auth') return json({ access_token: 'tok', user: { email: 'a@example.invalid' } });
    if (path === '/api/device' && method === 'POST') return json({ status: 'approved' });
    if (path === '/api/device') return json({ status: 'approved', deviceId: init.headers['X-Aleph-Device-Id'] });
    if (path === '/api/notes') return json([]);
    if (path === '/api/ops') return json(ops);
    if (path === '/api/checks') return json(servedChecks);
    return json({}, 404);
  };

  const dir = mkdtempSync(join(tmpdir(), 'screen-'));
  const file = join(dir, 'page.mjs');
  writeFileSync(file, pageScript);
  try {
    await import(pathToFileURL(file).href);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const click = id => Promise.all((elements[id].listeners.click ?? []).map(fn => fn()));
  if (login) {
    elements.email.value = 'a@example.invalid';
    elements.password.value = 'x';
    await click('login-btn');
    await click('device-btn');
  }
  for (let i = 0; i < 20; i += 1) await new Promise(r => setTimeout(r, 5));
  return { elements, checks, ops };
}

const CHECK_LABELS = [['total', '점검 항목'], ['blocked', '막은 공격'], ['failed', '뚫린 공격'], ['notRun', '실행하지 않은 점검']];

test('화면의 서버 점검 기록 수치는 /api/checks 응답을 그대로 옮긴 값이고, 결과는 응답으로만 정한다', async () => {
  const { elements, checks } = await openPage();
  assert.equal(elements['device-state'].textContent, '서버 확인 완료');
  assert.equal(elements['ops-box'].style.display, 'block');
  const text = elements['checks-body'].textContent;
  for (const [key, label] of CHECK_LABELS) {
    assert.match(text, new RegExp(`${label} ${checks[key]}(?!\\d)`, 'u'), `${label} ${checks[key]}`);
  }
  assert.equal(checks.total, checks.blocked + checks.failed + checks.notRun);
  assert.equal(elements['checks-match'].textContent, '서버 기록 그대로');
  const rows = elements['checks-body'].findAll('tr');
  assert.equal(rows.length, checks.attempts.length + 1);
  for (const attempt of checks.attempts) assert.ok(rows.some(r => r.textContent.includes(attempt.attackId) && r.textContent.includes(attempt.observed)), attempt.attackId);
  assert.match(text, /41종 공격 전체는 심판이 보내며/u);
  assert.match(text, /ALEPH SDP 엔진이 실제로 집행했는지는 확인하지 않았습니다/u);
});

test('로그인하지 않아도 서버 점검 기록은 바로 보이고, 내 계정 요약(작전실)은 열리지 않는다', async () => {
  const { elements, checks } = await openPage({ login: false });
  assert.notEqual(elements['ops-box'].style.display, 'block');
  const text = elements['checks-body'].textContent;
  for (const [key, label] of CHECK_LABELS) assert.match(text, new RegExp(`${label} ${checks[key]}(?!\\d)`, 'u'), label);
  assert.equal(elements['checks-match'].textContent, '서버 기록 그대로');
});

test('작전실 요약 수치도 /api/ops 응답과 같고 가린 기록과 일치한다고 표시한다', async () => {
  const { elements, ops } = await openPage();
  const text = elements['ops-body'].textContent;
  const s = ops.restore.notes.audit.summary;
  assert.match(text, new RegExp(`요청 ${s.requested} · 미리보기 ${s.dryRun} · 복원 완료 ${s.restored} · 멈춤 ${s.stopped} · 실패 ${s.failed}`, 'u'));
  assert.match(text, new RegExp(`메모 사본 ${ops.restore.notes.backups.count}건`, 'u'));
  assert.match(elements['ops-match'].textContent, /^일치/u);
  assert.doesNotMatch(JSON.stringify(text), /aaaaaaaa-aaaa/u);
});

test('서버 요약 수치를 바꾸면 화면이 불일치로 표시한다', async () => {
  const { elements } = await openPage({ tamperChecks: true });
  assert.match(elements['checks-match'].textContent, /^불일치 · 막은 공격/u);
});
