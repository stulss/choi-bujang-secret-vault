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

  if (config.step === 6) {
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

    try {
      const { decide } = await import('./decider.mjs');
      const unregisteredRes = await decide({
        schema: 'aleph.decision.v1',
        requestId: '00000000-0000-4000-8000-000000000000',
        deviceRegistered: false,
      });
      checks.push({
        attackId: 'unregistered_device_denied',
        expected: '미등록 기기 가상 요청 시 판정기에서 거부됨 (deny, device_not_registered)',
        observed: unregisteredRes.decision === 'deny' && unregisteredRes.reasonCode === 'device_not_registered'
          ? '미등록 기기 가상 요청 판정기 차단 확인 (deny, device_not_registered)'
          : `판정 결과 상이 (${unregisteredRes.decision}, ${unregisteredRes.reasonCode})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'unregistered_device_denied',
        expected: '미등록 기기 가상 요청 시 판정기에서 거부됨 (deny, device_not_registered)',
        observed: `판정 점검 실패 (${err.message})`,
      });
    }

    return checks;
  }

  if (config.step === 7) {
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

    try {
      const { decide } = await import('./decider.mjs');
      const unregisteredRes = await decide({
        schema: 'aleph.decision.v1',
        requestId: '00000000-0000-4000-8000-000000000000',
        deviceRegistered: false,
      });
      checks.push({
        attackId: 'unregistered_device_denied',
        expected: '미등록 기기 가상 요청 시 판정기에서 거부됨 (deny, device_not_registered)',
        observed: unregisteredRes.decision === 'deny' && unregisteredRes.reasonCode === 'device_not_registered'
          ? '미등록 기기 가상 요청 판정기 차단 확인 (deny, device_not_registered)'
          : `판정 결과 상이 (${unregisteredRes.decision}, ${unregisteredRes.reasonCode})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'unregistered_device_denied',
        expected: '미등록 기기 가상 요청 시 판정기에서 거부됨 (deny, device_not_registered)',
        observed: `판정 점검 실패 (${err.message})`,
      });
    }

    try {
      const { fixtureRequests } = await import('../scripts/fixture-7.mjs');
      const { decide } = await import('./decider.mjs');
      const { suspicious } = fixtureRequests();
      const suspiciousRes = await decide(suspicious);
      checks.push({
        attackId: 'suspicious_fixture_step_up',
        expected: '복합 이상 가상 사건은 추가 확인(step_up, step_up_required)으로 판정됨',
        observed: suspiciousRes.decision === 'step_up' && suspiciousRes.reasonCode === 'step_up_required'
          ? '복합 이상 사건 판정기 추가 확인(step_up, step_up_required) 정상 확인'
          : `판정 결과 상이 (${suspiciousRes.decision}, ${suspiciousRes.reasonCode})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'suspicious_fixture_step_up',
        expected: '복합 이상 가상 사건은 추가 확인(step_up, step_up_required)으로 판정됨',
        observed: `복합 이상 사건 점검 실패 (${err.message})`,
      });
    }

    checks.push({
      attackId: 'live_reauth_gate_unsupported',
      expected: '재로그인 시각 확인 계약이 없으므로 가상 사건 규칙만 시험하고 실제 자료 차단은 미실행',
      observed: '엔진 재로그인 시각 확인 계약 미제공으로 실제 자료 차단 실측은 안전하게 미실행 유지',
    });

    return checks;
  }

  if (config.step === 8) {
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

    try {
      const { decide } = await import('./decider.mjs');
      const unregisteredRes = await decide({
        schema: 'aleph.decision.v1',
        requestId: '00000000-0000-4000-8000-000000000000',
        deviceRegistered: false,
      });
      checks.push({
        attackId: 'unregistered_device_denied',
        expected: '미등록 기기 가상 요청 시 판정기에서 거부됨 (deny, device_not_registered)',
        observed: unregisteredRes.decision === 'deny' && unregisteredRes.reasonCode === 'device_not_registered'
          ? '미등록 기기 가상 요청 판정기 차단 확인 (deny, device_not_registered)'
          : `판정 결과 상이 (${unregisteredRes.decision}, ${unregisteredRes.reasonCode})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'unregistered_device_denied',
        expected: '미등록 기기 가상 요청 시 판정기에서 거부됨 (deny, device_not_registered)',
        observed: `판정 점검 실패 (${err.message})`,
      });
    }

    try {
      const { decide } = await import('./decider.mjs');
      const crossZoneRes = await decide({
        schema: 'aleph.decision.v1',
        requestId: '00000000-0000-4000-8000-000000000002',
        deviceRegistered: true,
        subjectId: 'student_user_b',
        service: 'notes',
        method: 'GET',
        path: '/notes/owner_a_item',
        route: 'GET /notes/:id',
        targetOwnerId: 'student_user_a',
      });
      checks.push({
        attackId: 'cross_zone_note_denied',
        expected: '타인 소유 메모 구역 접근 시 판정기에서 거부됨 (deny, zone_owner_forbidden)',
        observed: crossZoneRes.decision === 'deny' && crossZoneRes.reasonCode === 'zone_owner_forbidden'
          ? '타 사용자 메모 구역 접근 판정기 차단 확인 (deny, zone_owner_forbidden)'
          : `판정 결과 상이 (${crossZoneRes.decision}, ${crossZoneRes.reasonCode})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'cross_zone_note_denied',
        expected: '타인 소유 메모 구역 접근 시 판정기에서 거부됨 (deny, zone_owner_forbidden)',
        observed: `구역 판정 점검 실패 (${err.message})`,
      });
    }

    try {
      const { decide } = await import('./decider.mjs');
      const noticeModRes = await decide({
        schema: 'aleph.decision.v1',
        requestId: '00000000-0000-4000-8000-000000000003',
        deviceRegistered: true,
        subjectId: 'learner_normal',
        service: 'notes',
        method: 'PUT',
        path: '/notices/notice-01',
        route: 'PUT /notices/:id',
      });
      checks.push({
        attackId: 'student_notice_mod_denied',
        expected: '일반 학생의 강사 공지 수정 시 판정기에서 거부됨 (deny, instructor_notice_forbidden)',
        observed: noticeModRes.decision === 'deny' && noticeModRes.reasonCode === 'instructor_notice_forbidden'
          ? '일반 학생 강사 공지 수정 판정기 차단 확인 (deny, instructor_notice_forbidden)'
          : `판정 결과 상이 (${noticeModRes.decision}, ${noticeModRes.reasonCode})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'student_notice_mod_denied',
        expected: '일반 학생의 강사 공지 수정 시 판정기에서 거부됨 (deny, instructor_notice_forbidden)',
        observed: `공지 수정 점검 실패 (${err.message})`,
      });
    }

    try {
      const exportRes = await fetch(new URL('/api/notes/export', app), {
        redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      checks.push({
        attackId: 'id_depth_feature_route_blocked',
        expected: '자원 ID 깊이에 기능 경로(export) 요청 시 거부됨 (HTTP 401 또는 404)',
        observed: (exportRes.status === 401 || exportRes.status === 404)
          ? `기능 경로 export 직접 요청 차단 확인 (HTTP ${exportRes.status})`
          : `기능 경로 응답 확인 (HTTP ${exportRes.status})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'id_depth_feature_route_blocked',
        expected: '자원 ID 깊이에 기능 경로(export) 요청 시 거부됨 (HTTP 401 또는 404)',
        observed: `요청 실패 (${err.message})`,
      });
    }

    return checks;
  }

  throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
}
