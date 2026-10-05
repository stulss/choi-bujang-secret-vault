// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(config) {
  if (config.step < 1 || config.step > 12) throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
  let app;
  try {
    app = new URL(config.publicAppUrl);
  } catch {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  if (app.protocol !== 'https:' || app.username || app.password || app.search || app.hash
      || app.pathname !== '/' || app.hostname.endsWith('.example')) {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  if (typeof config.sampleMarker !== 'string' || !config.sampleMarker) throw new Error('가상 메모의 확인 표시를 넣어 주세요.');

  if (config.step === 1) {
    const response = await fetch(new URL('/data.json', app), {
      redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    let visible = false;
    if (response.ok) {
      try {
        const data = await response.json();
        visible = data?.sampleMarker === config.sampleMarker && Array.isArray(data.notes)
          && data.notes.length > 0;
      } catch {
        // A non-JSON response is a failed check, not a successful deployment.
      }
    }
    return [{ attackId: 'anonymous_note_read', expected: '비로그인 화면에서 가상 메모를 확인',
      observed: visible ? '비로그인 요청에서 공개 가상 메모 확인 표시가 보임' : `비로그인 요청에서 확인 표시가 보이지 않음 (HTTP ${response.status})` }];
  }

  if (config.step === 2) {
    const checks = [];
    try {
      const dataRes = await fetch(new URL('/data.json', app), {
        redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      let notesEmpty = false;
      if (dataRes.ok) {
        try {
          const data = await dataRes.json();
          notesEmpty = Array.isArray(data.notes) && data.notes.length === 0 && !data.sampleMarker;
        } catch {}
      }
      checks.push({
        attackId: 'data_json_notes_cleared',
        expected: '공개 data.json에서 가상 메모 문장과 확인 표시가 제거되고 비어 있음',
        observed: notesEmpty ? '정적 data.json에 메모 본문 및 확인 표시가 제거되어 있음 확인' : `정적 data.json 비우기 미확인 (HTTP ${dataRes.status})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'data_json_notes_cleared',
        expected: '공개 data.json에서 가상 메모 문장이 제거되고 비어 있음',
        observed: `요청 실패 (${err.message})`,
      });
    }

    try {
      const apiRes = await fetch(new URL('/api/notes', app), {
        redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      let apiAccessible = false;
      if (apiRes.ok) {
        try {
          const json = await apiRes.json();
          apiAccessible = Array.isArray(json.notes);
        } catch {}
      }
      checks.push({
        attackId: 'anonymous_api_read',
        expected: '인증 없는 /api/notes 요청에서 서버 자료가 조회됨 (2단계 약점)',
        observed: apiAccessible ? '인증 없이 서버 API에서 가상 메모 조회 가능 (약점 확인)' : `서버 API 응답 확인 (HTTP ${apiRes.status})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'anonymous_api_read',
        expected: '인증 없는 /api/notes 요청에서 서버 자료가 조회됨 (2단계 약점)',
        observed: `요청 실패 (${err.message})`,
      });
    }
    return checks;
  }

  if (config.step === 3) {
    const checks = [];
    try {
      const dataRes = await fetch(new URL('/data.json', app), {
        redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      let notesEmpty = false;
      if (dataRes.ok) {
        try {
          const data = await dataRes.json();
          notesEmpty = Array.isArray(data.notes) && data.notes.length === 0 && !data.sampleMarker;
        } catch {}
      }
      checks.push({
        attackId: 'data_json_notes_cleared',
        expected: '공개 data.json에서 가상 메모 문장과 확인 표시가 제거되고 비어 있음',
        observed: notesEmpty ? '정적 data.json에 메모 본문 및 확인 표시가 제거되어 있음 확인' : `정적 data.json 비우기 미확인 (HTTP ${dataRes.status})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'data_json_notes_cleared',
        expected: '공개 data.json에서 가상 메모 문장이 제거되고 비어 있음',
        observed: `요청 실패 (${err.message})`,
      });
    }

    try {
      const apiRes = await fetch(new URL('/api/notes', app), {
        redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      checks.push({
        attackId: 'unauthenticated_api_blocked',
        expected: '비로그인 요청에서 /api/notes 접근이 거부됨 (HTTP 401)',
        observed: apiRes.status === 401 ? '비로그인 요청에서 /api/notes 접근 차단 확인 (HTTP 401)' : `비로그인 접근 차단 미확인 (HTTP ${apiRes.status})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'unauthenticated_api_blocked',
        expected: '비로그인 요청에서 /api/notes 접근이 거부됨 (HTTP 401)',
        observed: `요청 실패 (${err.message})`,
      });
    }

    return checks;
  }

  if (config.step === 4) {
    const checks = [];
    try {
      const dataRes = await fetch(new URL('/data.json', app), {
        redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      let notesEmpty = false;
      if (dataRes.ok) {
        try {
          const data = await dataRes.json();
          notesEmpty = Array.isArray(data.notes) && data.notes.length === 0 && !data.sampleMarker;
        } catch {}
      }
      checks.push({
        attackId: 'data_json_notes_cleared',
        expected: '공개 data.json에서 가상 메모 문장과 확인 표시가 제거되고 비어 있음',
        observed: notesEmpty ? '정적 data.json에 메모 본문 및 확인 표시가 제거되어 있음 확인' : `정적 data.json 비우기 미확인 (HTTP ${dataRes.status})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'data_json_notes_cleared',
        expected: '공개 data.json에서 가상 메모 문장이 제거되고 비어 있음',
        observed: `요청 실패 (${err.message})`,
      });
    }

    try {
      const apiRes = await fetch(new URL('/api/notes', app), {
        redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      checks.push({
        attackId: 'unauthenticated_api_blocked',
        expected: '비로그인 요청에서 /api/notes 접근이 거부됨 (HTTP 401)',
        observed: apiRes.status === 401 ? '비로그인 요청에서 /api/notes 접근 차단 확인 (HTTP 401)' : `비로그인 접근 차단 미확인 (HTTP ${apiRes.status})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'unauthenticated_api_blocked',
        expected: '비로그인 요청에서 /api/notes 접근이 거부됨 (HTTP 401)',
        observed: `요청 실패 (${err.message})`,
      });
    }

    try {
      const singleRes = await fetch(new URL('/api/notes/00000000-0000-4000-8000-000000000001', app), {
        redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      checks.push({
        attackId: 'unauthenticated_single_note_blocked',
        expected: '비로그인 단건 메모 접근 시 거부됨 (HTTP 401)',
        observed: singleRes.status === 401 ? '비로그인 단건 메모 접근 차단 확인 (HTTP 401)' : `비로그인 단건 접근 차단 미확인 (HTTP ${singleRes.status})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'unauthenticated_single_note_blocked',
        expected: '비로그인 단건 메모 접근 시 거부됨 (HTTP 401)',
        observed: `요청 실패 (${err.message})`,
      });
    }

    return checks;
  }

  if (config.step === 5) {
    const checks = [];
    try {
      const dataRes = await fetch(new URL('/data.json', app), {
        redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      let notesEmpty = false;
      if (dataRes.ok) {
        try {
          const data = await dataRes.json();
          notesEmpty = Array.isArray(data.notes) && data.notes.length === 0 && !data.sampleMarker;
        } catch {}
      }
      checks.push({
        attackId: 'data_json_notes_cleared',
        expected: '공개 data.json에서 가상 메모 문장과 확인 표시가 제거되고 비어 있음',
        observed: notesEmpty ? '정적 data.json에 메모 본문 및 확인 표시가 제거되어 있음 확인' : `정적 data.json 비우기 미확인 (HTTP ${dataRes.status})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'data_json_notes_cleared',
        expected: '공개 data.json에서 가상 메모 문장이 제거되고 비어 있음',
        observed: `요청 실패 (${err.message})`,
      });
    }

    try {
      const apiRes = await fetch(new URL('/api/notes', app), {
        redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      checks.push({
        attackId: 'unauthenticated_api_blocked',
        expected: '비로그인 요청에서 /api/notes 접근이 거부됨 (HTTP 401)',
        observed: apiRes.status === 401 ? '비로그인 요청에서 /api/notes 접근 차단 확인 (HTTP 401)' : `비로그인 접근 차단 미확인 (HTTP ${apiRes.status})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'unauthenticated_api_blocked',
        expected: '비로그인 요청에서 /api/notes 접근이 거부됨 (HTTP 401)',
        observed: `요청 실패 (${err.message})`,
      });
    }

    try {
      const origRes = await fetch(config.originalApiUrl, {
        redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      checks.push({
        attackId: 'original_api_direct_access_blocked',
        expected: '원본 자료 API(originalApiUrl) 직접 접근 시 권한 거부됨 (HTTP 401)',
        observed: origRes.status === 401 ? '원본 자료 API 직접 접근 차단 확인 (HTTP 401)' : `원본 자료 직접 접근 차단 미확인 (HTTP ${origRes.status})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'original_api_direct_access_blocked',
        expected: '원본 자료 API(originalApiUrl) 직접 접근 시 권한 거부됨 (HTTP 401)',
        observed: `요청 실패 (${err.message})`,
      });
    }

    return checks;
  }

  throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
}
