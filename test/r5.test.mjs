import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deploymentIdentity } from '../scripts/deployment-identity.mjs';
import { runAttackChecks } from '../src/attack-check.mjs';

const config = {
  step: 1,
  judgeIssuer: 'https://aleph-judge-production.up.railway.app/defense/judge',
  sampleMarker: 'SAMPLE_NOTE_1',
  publicAppUrl: 'https://student-defense.vercel.app',
};
const env = {
  VERCEL_GIT_PROVIDER: 'github',
  VERCEL_GIT_REPO_OWNER: 'Student-A',
  VERCEL_GIT_REPO_SLUG: 'aleph-defense',
  VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40),
  VERCEL_URL: 'student-defense-123.vercel.app',
};

test('build identity uses Vercel Git and deployment metadata', () => {
  assert.deepEqual(deploymentIdentity(env, config), {
    schema: 'aleph.defense.deployment.v1',
    step: 1,
    repoUrl: 'https://github.com/student-a/aleph-defense',
    commit: 'a'.repeat(40),
    publicAppUrl: 'https://student-defense-123.vercel.app',
    judgeIssuer: config.judgeIssuer,
    sampleMarker: config.sampleMarker,
  });
  assert.throws(() => deploymentIdentity({ ...env, VERCEL_GIT_PROVIDER: undefined }, config));
  assert.throws(() => deploymentIdentity({ ...env, VERCEL_GIT_COMMIT_SHA: 'short' }, config));
});

// 12단계 점검 코드는 단계와 상관없이 같은 목록을 보내고, 첫 점검이 /data.json 공개 여부입니다.
test('first attack check reads public data.json without credentials', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      if (new URL(String(url)).pathname !== '/data.json') return new Response('{"error":"UNAUTHORIZED"}', { status: 401 });
      return new Response(JSON.stringify({ sampleMarker: 'SAMPLE_NOTE_1', notes: [{ title: '가상' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    const [visible] = await runAttackChecks(config.publicAppUrl);
    const dataCall = calls.find(c => c.url === 'https://student-defense.vercel.app/data.json');
    assert.equal(dataCall.init.method, 'GET');
    assert.deepEqual(dataCall.init.headers, {});
    assert.equal(visible.attackId, 'data_json_notes_cleared');
    assert.deepEqual([visible.observed, visible.result], ['HTTP 200', 'breached']);
    globalThis.fetch = async () => new Response('{"notes":[]}', { status: 200 });
    const [cleared] = await runAttackChecks(config);
    assert.deepEqual([cleared.observed, cleared.result], ['HTTP 200', 'blocked']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
