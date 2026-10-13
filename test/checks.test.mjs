import assert from 'node:assert/strict';
import { test } from 'node:test';
import handler from '../api/checks.js';
import { CHECK_CASES } from '../src/rule-check.mjs';

function call(query, method = 'GET') {
  return new Promise((resolve) => {
    const out = { headers: {} };
    handler({ method, query }, {
      setHeader: (key, value) => { out.headers[key.toLowerCase()] = value; },
      status(code) { out.status = code; return this; },
      json(value) { out.body = value; resolve(out); },
    });
  });
}

test('12단계: 고정 가상 입력 사례는 모두 기대대로 나오고 모르는 입력은 실행하지 않는다', async () => {
  for (const item of CHECK_CASES) {
    const one = await call({ case: item.id });
    assert.equal(one.status, 200);
    assert.equal(one.body.ready, true, item.id);
  }
  assert.equal((await call({ case: 'constructor' })).status, 400);
  assert.equal((await call({ case: ['s06-unregistered'] })).status, 400);
  assert.equal((await call({}, 'POST')).status, 405);
});

test('12단계: 서버 점검 기록의 수치는 41종 공격 집계와 일치한다', async () => {
  const record = await call({});
  assert.equal(record.status, 200);
  assert.equal(record.headers['cache-control'], 'no-store');
  assert.equal(record.body.total, 41);
  assert.equal(record.body.blocked, 4);
  assert.equal(record.body.failed, 0);
  assert.equal(record.body.notRun, 37);
});

test('12단계: 작전실 화면은 학생 작업과 제공 엔진(ALEPH SDP 엔진)을 나눠 적는다', async () => {
  const { readFile } = await import('node:fs/promises');
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /<dt>학생이 만든 것<\/dt>/u);
  assert.match(html, /<dt>제공 엔진<\/dt><dd>ALEPH SDP 엔진\./u);
});
