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
        deviceId: '0123456789abcdef',
        subjectId: 'student_user_b',
        service: 'notes',
        method: 'GET',
        path: '/notes/owner_a_item',
        route: 'GET /notes/:id',
      });
      checks.push({
        attackId: 'cross_zone_note_read',
        expected: '서버 거부, 자기 구역은 허용',
        observed: crossZoneRes.decision === 'deny' && crossZoneRes.reasonCode === 'zone_owner_forbidden'
          ? '타 사용자 메모 구역 접근 판정기 차단 확인 (deny, zone_owner_forbidden)'
          : `판정 결과 상이 (${crossZoneRes.decision}, ${crossZoneRes.reasonCode})`,
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
        attackId: 'cross_zone_note_read',
        expected: '서버 거부, 자기 구역은 허용',
        observed: `구역 판정 점검 실패 (${err.message})`,
      });
    }

    try {
      const { decide } = await import('./decider.mjs');
      const crossZoneWriteRes = await decide({
        schema: 'aleph.decision.v1',
        requestId: '00000000-0000-4000-8000-000000000004',
        deviceRegistered: true,
        deviceId: '0123456789abcdef',
        subjectId: 'student_user_b',
        service: 'notes',
        method: 'PUT',
        path: '/notes/owner_a_item',
        route: 'PUT /notes/:id',
      });
      checks.push({
        attackId: 'cross_zone_note_write',
        expected: '서버 거부, 원본 불변',
        observed: crossZoneWriteRes.decision === 'deny' && crossZoneWriteRes.reasonCode === 'zone_owner_forbidden'
          ? '타 사용자 메모 수정 시 판정기 차단 확인 (deny, zone_owner_forbidden)'
          : `판정 결과 상이 (${crossZoneWriteRes.decision}, ${crossZoneWriteRes.reasonCode})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'cross_zone_note_write',
        expected: '서버 거부, 원본 불변',
        observed: `구역 수정 점검 실패 (${err.message})`,
      });
    }

    checks.push({
      attackId: 'cross_zone_note_list',
      expected: '목록이 누출되지 않음',
      observed: '미실행 (로그인한 두 계정의 목록 요청을 이 점검에서 보내지 않음)',
    });

    try {
      const { decide } = await import('./decider.mjs');
      const noticeModRes = await decide({
        schema: 'aleph.decision.v1',
        requestId: '00000000-0000-4000-8000-000000000003',
        deviceRegistered: true,
        deviceId: '0123456789abcdef',
        subjectId: 'learner_normal',
        service: 'notes',
        method: 'PUT',
        path: '/notices/notice-01',
        route: 'PUT /notices/:id',
      });
      checks.push({
        attackId: 'student_edits_instructor_notice',
        expected: '거부되고 강사 정상 수정은 허용',
        observed: noticeModRes.decision === 'deny' && noticeModRes.reasonCode === 'instructor_notice_forbidden'
          ? '일반 학생 강사 공지 수정 판정기 차단 확인 (deny, instructor_notice_forbidden)'
          : `판정 결과 상이 (${noticeModRes.decision}, ${noticeModRes.reasonCode})`,
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
        attackId: 'student_edits_instructor_notice',
        expected: '거부되고 강사 정상 수정은 허용',
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

  if (config.step === 9) {
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
        deviceId: '0123456789abcdef',
        subjectId: 'student_user_b',
        service: 'notes',
        method: 'GET',
        path: '/notes/owner_a_item',
        route: 'GET /notes/:id',
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
        deviceId: '0123456789abcdef',
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

    try {
      const { detect } = await import('./detect.mjs');
      const burstEvents = Array.from({ length: 125 }, (_, i) => ({
        at: new Date(Date.UTC(2026, 9, 1, 0, 0, 0) + i * 2000).toISOString(),
        method: 'GET',
        identity: { sub: 'learner_fixture' },
      }));
      const burstResult = detect(burstEvents);
      checks.push({
        attackId: 'detect_burst_read_propose_revocation',
        expected: '10분 내 120건 초과 폭주 조회 시 propose_revocation 및 burst_read 제안 생성',
        observed: burstResult.action === 'propose_revocation' && burstResult.reasonCode === 'burst_read' && burstResult.subject === 'learner_fixture'
          ? '도플갱어 폭주 조회 탐지 및 회수 제안 생성 확인 (propose_revocation)'
          : `탐지 결과 상이 (${burstResult.action}, ${burstResult.reasonCode})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'detect_burst_read_propose_revocation',
        expected: '10분 내 120건 초과 폭주 조회 시 propose_revocation 및 burst_read 제안 생성',
        observed: `탐지 점검 실패 (${err.message})`,
      });
    }

    try {
      const { detect } = await import('./detect.mjs');
      const normalEvents = Array.from({ length: 30 }, (_, i) => ({
        at: new Date(Date.UTC(2026, 9, 1, 0, 0, 0) + i * 2000).toISOString(),
        method: 'GET',
        identity: { sub: 'learner_fixture' },
      }));
      const normalResult = detect(normalEvents);
      checks.push({
        attackId: 'detect_normal_read_observe',
        expected: '정상 범위(30건) 조회 시 observe 유지',
        observed: normalResult.action === 'observe'
          ? '정상 조회 관찰 상태 유지 확인 (observe)'
          : `탐지 결과 상이 (${normalResult.action})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'detect_normal_read_observe',
        expected: '정상 범위(30건) 조회 시 observe 유지',
        observed: `정상 탐지 점검 실패 (${err.message})`,
      });
    }

    const virtualReads = (count, extra) => Array.from({ length: count }, (_, i) => ({
      at: new Date(Date.UTC(2026, 9, 1, 0, 0, 0) + i * 2000).toISOString(),
      method: 'GET', identity: { sub: 'doppel_fixture' }, deviceId: 'bbbbbbbbbbbbbbbb', ...extra,
    }));

    try {
      const { detect } = await import('./detect.mjs');
      const result = detect(virtualReads(150, { network: 'unusual' }));
      checks.push({
        attackId: 'detect_combined_propose_device',
        expected: '평소와 다른 네트워크와 다량 조회가 함께인 가상 사건은 기기 한 개 대상 회수 제안',
        observed: result.action === 'propose_revocation' && result.deviceId === 'bbbbbbbbbbbbbbbb' && result.reasonCode
          ? `가상 기기 한 개 대상 회수 제안 확인 (${result.action}, ${result.reasonCode})`
          : `탐지 결과 상이 (${result.action}, ${result.reasonCode ?? '-'})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'detect_combined_propose_device',
        expected: '평소와 다른 네트워크와 다량 조회가 함께인 가상 사건은 기기 한 개 대상 회수 제안',
        observed: `복합 탐지 점검 실패 (${err.message})`,
      });
    }

    try {
      const { detect } = await import('./detect.mjs');
      const result = detect(virtualReads(150, { network: 'usual', region: 'foreign' }));
      checks.push({
        attackId: 'detect_region_only_observe',
        expected: '지역만 다르고 네트워크는 평소와 같은 가상 사건은 회수 제안 없이 observe',
        observed: result.action === 'observe'
          ? '지역 단독 사건 회수 제안 없음 확인 (observe)'
          : `탐지 결과 상이 (${result.action})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'detect_region_only_observe',
        expected: '지역만 다르고 네트워크는 평소와 같은 가상 사건은 회수 제안 없이 observe',
        observed: `지역 단독 점검 실패 (${err.message})`,
      });
    }

    try {
      const { decide } = await import('./decider.mjs');
      const { fixtureRequests } = await import('../scripts/fixture-7.mjs');
      const { normal } = fixtureRequests();
      const res = await decide(normal);
      checks.push({
        attackId: 'normal_device_kept',
        expected: '탐지 규칙을 넣은 뒤에도 정상 기기의 가상 요청은 기존 응답 형식으로 허용',
        observed: res.decision === 'allow' && Object.keys(res).sort().join(',') === 'decision,reasonCode,requestId,ruleIds,schema'
          ? '정상 기기 허용 유지 확인 (allow, 응답 5항목)'
          : `판정 결과 상이 (${res.decision}, ${res.reasonCode})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'normal_device_kept',
        expected: '탐지 규칙을 넣은 뒤에도 정상 기기의 가상 요청은 기존 응답 형식으로 허용',
        observed: `정상 기기 점검 실패 (${err.message})`,
      });
    }

    return checks;
  }

  if (config.step === 10) {
    // 복구 뒤 1~9단계 정상·금지 요청 재시험: 9단계 점검을 그대로 다시 실행한 결과를 먼저 담습니다.
    const checks = await runAttackChecks({ ...config, step: 9 });

    try {
      const res = await fetch(new URL('/api/restore', app), {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: '00000000-0000-4000-8000-000000000000' }),
        redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      checks.push({
        attackId: 'restore_unauthenticated_blocked',
        expected: '로그인 없이 복구 경로(POST /api/restore) 호출 시 복원 없이 거부됨 (HTTP 401)',
        observed: res.status === 401
          ? '비로그인 복구 요청 차단 확인 (HTTP 401)'
          : `복구 경로 응답 확인 (HTTP ${res.status})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'restore_unauthenticated_blocked',
        expected: '로그인 없이 복구 경로(POST /api/restore) 호출 시 복원 없이 거부됨 (HTTP 401)',
        observed: `요청 실패 (${err.message})`,
      });
    }

    try {
      const { loadVerifiedBackup, evaluateTestPolicy } = await import('../scripts/policy-restore.mjs');
      const { readFile } = await import('node:fs/promises');
      const { manifest } = loadVerifiedBackup();
      checks.push({
        attackId: 'policy_backup_reverified',
        expected: '침해 전 시험 정책 사본을 다시 읽어 SHA-256·버전 검증 통과',
        observed: `사본 ${manifest.version} 재검증 통과 (SHA-256 ${manifest.sha256.slice(0, 12)}…)`,
      });
      const policy = JSON.parse(await readFile(new URL('../policy/test-policy.json', import.meta.url), 'utf8'));
      const cross = evaluateTestPolicy(policy, { method: 'GET', route: '/notes/:id', subjectOwner: 'b', targetOwner: 'a' });
      const own = evaluateTestPolicy(policy, { method: 'GET', route: '/notes/:id', subjectOwner: 'a', targetOwner: 'a' });
      checks.push({
        attackId: 'policy_restored_cross_owner_denied',
        expected: '되돌린 시험 정책에서 B의 A 메모 요청은 거부, A의 자기 메모 요청은 허용',
        observed: `시험 정책 재판정 결과 (B→A ${cross}, A→A ${own})`,
      });
    } catch (err) {
      checks.push({
        attackId: 'policy_backup_reverified',
        expected: '침해 전 시험 정책 사본을 다시 읽어 SHA-256·버전 검증 통과',
        observed: `중단 (${err.message})`,
      });
    }

    checks.push({
      attackId: 'restore_single_note_live',
      expected: '시험 계정 B의 메모 한 건을 바꾸거나 지운 뒤 복구하면 ID·소유자·내용 해시가 사본과 같음',
      observed: '미실행 (이 점검은 시험 계정 B 토큰으로 배포된 복구 경로를 호출하지 않음)',
    });

    return checks;
  }

  if (config.step === 11) {
    // 새 화면에서도 1~10단계 정상·금지 결과가 유지되는지 10단계 점검을 그대로 다시 실행합니다.
    const checks = await runAttackChecks({ ...config, step: 10 });

    try {
      const res = await fetch(new URL('/manifest.webmanifest', app), { redirect: 'error', signal: AbortSignal.timeout(10000) });
      const manifest = res.ok ? await res.json().catch(() => null) : null;
      checks.push({
        attackId: 'pwa_manifest_served',
        expected: '설치형 웹앱 설정(manifest)에 앱 이름이 있고, 설치 표시는 기기 확인으로 쓰지 않음',
        observed: manifest?.name
          ? `manifest 제공 확인 (HTTP ${res.status}, 이름 있음, display ${manifest.display ?? '-'})`
          : `manifest 미확인 (HTTP ${res.status})`,
      });
    } catch (err) {
      checks.push({ attackId: 'pwa_manifest_served', expected: '설치형 웹앱 설정(manifest) 제공', observed: `요청 실패 (${err.message})` });
    }

    try {
      const res = await fetch(new URL('/api/device', app), { redirect: 'error', signal: AbortSignal.timeout(10000) });
      checks.push({
        attackId: 'device_status_unsigned_blocked',
        expected: '로그인·기기 서명 없이 기기 승인 상태를 물으면 승인으로 처리하지 않고 거부 (HTTP 401)',
        observed: res.status === 401 ? '서명 없는 기기 상태 요청 거부 확인 (HTTP 401)' : `기기 상태 응답 확인 (HTTP ${res.status})`,
      });
    } catch (err) {
      checks.push({ attackId: 'device_status_unsigned_blocked', expected: '서명 없는 기기 상태 요청 거부 (HTTP 401)', observed: `요청 실패 (${err.message})` });
    }

    try {
      const res = await fetch(new URL('/', app), { redirect: 'error', signal: AbortSignal.timeout(10000) });
      const html = res.ok ? await res.text() : '';
      const storesSecrets = /localStorage\.|sessionStorage\.setItem|indexedDB\.open|extractable\s*:\s*true/u.test(html);
      const nonExtractable = /generateKey\([^)]*false/u.test(html);
      checks.push({
        attackId: 'device_key_not_in_storage',
        expected: '접속 화면 코드가 기기 키·토큰을 브라우저 저장소에 넣지 않고, 기기 키를 꺼낼 수 없게 만듦',
        observed: !html ? `접속 화면 미확인 (HTTP ${res.status})`
          : (!storesSecrets && nonExtractable ? '배포 화면에 저장소 저장 코드 없음, 꺼낼 수 없는 기기 키 생성 확인'
            : `배포 화면 확인 필요 (저장소 사용 ${storesSecrets ? '있음' : '없음'}, 꺼낼 수 없는 키 ${nonExtractable ? '확인' : '미확인'})`),
      });
    } catch (err) {
      checks.push({ attackId: 'device_key_not_in_storage', expected: '기기 키·토큰을 브라우저 저장소에 넣지 않음', observed: `요청 실패 (${err.message})` });
    }

    return checks;
  }

  if (config.step === 12) {
    // 격리 환경 규칙: 공개 HTTPS 주소로 GET·HEAD만 보내고, 쓰기 요청과 토큰이 필요한 요청은 not_run 으로 둡니다.
    // 증거 수집기는 이 파일 아래에 함께 있어 추가 파일을 불러오지 않습니다(격리 실행기 대비).
    const evidence = await collectEvidence(config, { allowWrites: false });
    const checks = [];
    const label = { pass: '기대와 같음', fail: '기대와 다름', not_run: 'not_run' };
    for (let stage = 1; stage <= 12; stage += 1) {
      const rows = evidence.rows.filter(item => item.stage === stage);
      if (!rows.length) continue;
      const measured = rows.filter(item => item.result !== 'not_run');
      const text = rows.map(item => `${item.id} ${item.actual}${item.result === 'not_run' ? '' : ` [${label[item.result]}]`}`).join('; ');
      checks.push({
        attackId: `stage${String(stage).padStart(2, '0')}_measured_requests`,
        expected: `${stage}단계 정상 요청 허용·금지 요청 거부를 실제 응답으로 확인 (${rows.map(item => item.id).join(', ')})`,
        observed: measured.length ? text.slice(0, 300) : 'not_run',
      });
    }
    const s = evidence.summary;
    checks.push({
      attackId: 'evidence_summary_measured',
      expected: '금지 요청 거부와 정상 요청 허용을 실측 결과로만 세고, 미실행은 따로 셈',
      observed: `금지 거부 ${s.forbiddenRejected}·다름 ${s.forbiddenFailed}·미실행 ${s.forbiddenNotRun} / 정상 허용 ${s.normalAllowed}·다름 ${s.normalFailed}·미실행 ${s.normalNotRun} (검사한 배포 커밋 ${evidence.deployedCommit ? evidence.deployedCommit.slice(0, 7) : '확인 못 함'})`,
    });
    checks.push({
      attackId: 'attack41_run_status',
      expected: '41종 공격은 같은 종류의 요청을 실제로 보내 막힌 것만 막음으로 세고 나머지는 미실행',
      observed: `실측 막음 ${s.attacksBlocked} · 실측 못 막음 ${s.attacksNotBlocked} · 미실행 ${s.attacksNotRun} / 전체 ${s.attacksTotal}`,
    });
    checks.push({
      attackId: 'combined_attacks_live',
      expected: '12단계 복합 공격 3종(무인증+타인 메모, 미등록 기기+회수 신원, 복구 뒤 무서명 변경+구역 밖 조회)',
      observed: 'not_run',
    });
    return checks;
  }

  throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
}

// ============================================================================
// 12단계 실측 증거 수집기 (npm run evidence와 npm run bundle이 함께 씀)
// ============================================================================

// 12단계: 1~11단계 정상·금지 요청을 실제로 보내고 기대·실제 결과, 요청 ID, 확인 시각을 한 표로 남깁니다.
// 결과는 실제 응답이나 실제 함수 반환값만 적습니다. 보내지 않은 요청은 not_run 입니다. 메모 본문·토큰·키는 남기지 않습니다.
// allowWrites=false(npm run bundle 격리 환경)이면 공개 HTTPS 주소로 GET·HEAD만 보내고, 쓰기 요청 행은 not_run 으로 둡니다.

// 심판 격리 실행기는 불러올 수 있는 모듈과 전역 객체를 제한합니다(전역 crypto 없음).
// 허용 목록의 node:crypto(randomUUID·sha256)·node:fs·node:child_process와 판정기·탐지기는 try 안에서 불러오고,
// 불러오지 못하면 그 행만 not_run 입니다. AbortSignal.timeout·TextEncoder 같은 전역도 있다고 가정하지 않습니다.
const rootUrl = new URL('../', import.meta.url);
// file: URL → 경로 문자열 (node:url 없이, 격리 환경의 fs·git이 문자열 경로만 받아도 되도록)
const toPath = url => {
  const path = decodeURIComponent(new URL(url).pathname);
  return /^\/[A-Za-z]:\//u.test(path) ? path.slice(1) : path;
};
let nodeCrypto = {};
let uuidSeq = 0;
// 판정 요청 ID: node:crypto randomUUID. 쓸 수 없으면 시각·순번으로 만든 실행 내 고유 ID(UUID 형식 아님)를 씁니다.
const randomUUID = () => (typeof nodeCrypto.randomUUID === 'function'
  ? nodeCrypto.randomUUID()
  : `local-${Date.now().toString(16)}-${(uuidSeq += 1).toString(16)}`);
// SHA-256: node:crypto createHash('sha256'). 쓸 수 없으면 null을 돌려주고, 호출한 쪽이 그 행을 not_run 으로 둡니다.
const sha256Hex = async text => (typeof nodeCrypto.createHash === 'function'
  ? nodeCrypto.createHash('sha256').update(text).digest('hex')
  : null);
const timeoutSignal = ms => (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
  ? AbortSignal.timeout(ms) : undefined);
async function optional(specifier) {
  try {
    return await import(specifier);
  } catch (error) {
    return { importError: error?.message || 'import_failed' };
  }
}
const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const SECRET_IN_PAGE = /sb_secret_[A-Za-z0-9_-]{8,}|service_role|SUPABASE_SECRET_KEY|BEGIN (EC |RSA )?PRIVATE KEY-----|"d"\s*:\s*"[A-Za-z0-9_-]{40,}"/u;
const ZERO_ID = '00000000-0000-4000-8000-000000000001';

// 41종 공격(방어전 안내의 담당 단계·이름). measuredBy의 행이 모두 실측으로 막혔을 때만 "막음"으로 셉니다.
export const ATTACKS = [
  [1, 'ANONYMOUS_NOTE_LIST', '인증 없이 개인 메모 목록을 조회', ['F01']],
  [1, 'ANONYMOUS_NOTE_READ', '인증 없이 개인 메모를 조회', ['F02']],
  [2, 'BUILT_BUNDLE_SECRET_SCAN', '배포 번들에서 시험 비밀값을 검색', ['F05']],
  [2, 'REPOSITORY_SECRET_SCAN', '제출 커밋에서 시험 비밀값을 검색', ['L14']],
  [2, 'STATIC_SEED_DATA_SCAN', '공개 정적 파일에서 개인 메모 시드를 검색', ['F04']],
  [3, 'ANONYMOUS_NOTE_WRITE', '인증 없이 개인 메모를 추가', ['W01']],
  [3, 'EXPIRED_LOGIN_TOKEN', '만료된 로그인 토큰으로 조회', []],
  [3, 'FORGED_LOGIN_TOKEN', '서명이 위조된 로그인 토큰으로 조회', ['F03']],
  [3, 'MISSING_LOGIN_TOKEN', '로그인 토큰 없이 보호 API 조회', ['F01']],
  [3, 'TOKEN_WRONG_AUDIENCE', '다른 서비스용으로 발급된 로그인 토큰으로 메모 조회', []],
  [4, 'FOREIGN_NOTE_DELETE', '시험 계정 B로 A의 메모 삭제', []],
  [4, 'R3_JUDGE_OWNED_NOTE', '학생 시험 신원으로 심판 소유 메모 조회', []],
  [4, 'R3_JUDGE_OWNED_NOTE_WRITE', '학생 시험 신원으로 심판 소유 메모 수정', []],
  [5, 'DIRECT_ORIGIN_NOTE_READ', '공개 키와 시험 계정 토큰으로 원본 Supabase 자료 API 직접 조회', []],
  [5, 'DIRECT_ORIGIN_NOTE_WRITE', '공개 키와 시험 계정 토큰으로 원본 Supabase 자료 API 직접 수정', []],
  [5, 'ORIGIN_ALIAS_BYPASS', '공개 정적 파일과 브라우저 묶음에서 서버 전용 키·시드 표식 검색', ['F05', 'F06', 'F04']],
  [6, 'DEVICE_SUBJECT_MISMATCH', '등록 기기와 다른 사용자 토큰을 조합', []],
  [6, 'MISSING_CLIENT_CERTIFICATE', '클라이언트 인증서 없이 mTLS 통로 요청', []],
  [6, 'UNREGISTERED_DEVICE', '미등록 기기 인증서로 자료실 조회', []],
  [6, 'UNREGISTERED_VIRTUAL_DEVICE_RULE', '판정기에 등록되지 않은 가상 기기 사건을 직접 입력', ['L02']],
  [7, 'ANOMALOUS_HOUR_EVENT', '평소와 다른 시각의 가상 접속 사건을 입력', []],
  [7, 'ANOMALOUS_NETWORK_ACTION', '낯선 네트워크에서 대량 수정하는 가상 사건을 입력', []],
  [7, 'ANOMALOUS_REGION_EVENT', '가상 접속 지역이 급변한 사건을 판정기에 입력', []],
  [7, 'MISSING_STEP_UP', '추가 인증을 마치지 않은 토큰으로 민감 메모 조회', []],
  [8, 'CROSS_ZONE_NOTE_LIST', '다른 구역의 메모 목록을 API로 조회', []],
  [8, 'CROSS_ZONE_NOTE_READ', '다른 구역 메모를 API로 조회', []],
  [8, 'CROSS_ZONE_NOTE_WRITE', '다른 구역 메모를 API로 수정', []],
  [8, 'STUDENT_EDITS_INSTRUCTOR_NOTICE', '학생 시험 계정으로 강사 공지 수정', []],
  [9, 'DOPPELGANGER_DETECTION', '합성 도플갱어 접속 사건을 기록과 탐지기에 입력', []],
  [9, 'REVOKED_IDENTITY_REUSE', '회수된 신원으로 다음 요청을 재시도', []],
  [9, 'REVOKED_LATERAL_ROUTE', '회수된 도플갱어가 다른 자원으로 이동', []],
  [9, 'STOLEN_SESSION_AFTER_REVOKE', '회수 뒤 남은 탈취 세션으로 재접속', []],
  [10, 'RESTORE_CHANGED_NOTE', '시험 계정 B의 메모를 변조한 뒤 학생이 제출한 복구 경로를 호출', []],
  [10, 'RESTORE_DEFENSE_REPLAY', '시험 계정 B의 자료를 복구한 직후 1~9단계 대표 공격을 다시 전송', []],
  [10, 'RESTORE_DELETED_NOTE', '시험 계정 B의 메모를 삭제한 뒤 학생이 제출한 복구 경로를 호출', []],
  [11, 'SIGNED_BODY_TAMPER', '서명 뒤 수정 본문을 변경', []],
  [11, 'SIGNED_PATH_TAMPER', '서명 뒤 요청 경로를 변경', []],
  [11, 'UNSIGNED_CLIENT_REQUEST', '설치형 앱 서명 없이 보호 요청', []],
  [12, 'COMBINED_ANONYMOUS_OWNER_ATTACK', '무인증 조회와 타인 메모 조회를 같은 제출본에 연속 전송', []],
  [12, 'COMBINED_DEVICE_REVOCATION_ATTACK', '미등록 기기 요청 뒤 회수된 신원으로 다시 전송', []],
  [12, 'COMBINED_RESTORE_SIGNATURE_ATTACK', '복구 뒤 서명 없는 변경 요청과 구역 밖 조회를 전송', []],
].map(([stage, code, name, measuredBy]) => ({ stage, code, name, measuredBy }));

const now = () => new Date().toISOString();

async function http(app, { method = 'GET', path, url, headers = {}, body }) {
  const target = url ? new URL(url) : new URL(path, app);
  const res = await fetch(target, {
    method, headers, body, redirect: 'manual', signal: timeoutSignal(10000),
  });
  const text = method === 'HEAD' ? '' : await res.text();
  return { status: res.status, requestId: res.headers.get('x-vercel-id') || res.headers.get('sb-request-id') || null, text };
}

// 행 하나: { id, stage, kind: normal|forbidden, request, expected, actual, result: pass|fail|not_run, requestId, checkedAt, source }
function row(base, extra) {
  return { requestId: null, checkedAt: now(), ...base, ...extra };
}

async function live(rows, app, base, request, judge) {
  try {
    const res = await http(app, request);
    const verdict = judge(res);
    rows.push(row(base, { actual: verdict.actual, result: verdict.ok ? 'pass' : 'fail', requestId: res.requestId, source: 'live_http' }));
  } catch (error) {
    rows.push(row(base, { actual: `요청 실패 (${error?.name ?? 'Error'}: ${String(error?.message ?? '').slice(0, 60)})`, result: 'fail', source: 'live_http' }));
  }
}

async function local(rows, base, run) {
  try {
    const result = await run();
    if (result.notRun) { notRun(rows, base, result.notRun); return; }
    const { actual, ok, requestId } = result;
    rows.push(row(base, { actual, result: ok ? 'pass' : 'fail', requestId: requestId ?? randomUUID(), source: 'local_function' }));
  } catch (error) {
    rows.push(row(base, { actual: `실행 실패 (${error.message})`, result: 'fail', source: 'local_function' }));
  }
}

const notRun = (rows, base, why) => rows.push(row(base, { actual: why, result: 'not_run', checkedAt: null, source: 'not_run' }));
const statusIs = (...codes) => res => ({ ok: codes.includes(res.status), actual: `HTTP ${res.status}` });

export async function collectEvidence(config, { allowWrites = false } = {}) {
  nodeCrypto = await optional('node:crypto');
  const app = new URL(config.publicAppUrl);
  const rows = [];
  let deployedCommit = null;

  // ---- 정상 요청 (공개 화면) ----
  await live(rows, app, { id: 'N01', stage: 1, kind: 'normal', request: 'GET /aleph.json', expected: 'HTTP 200, 배포 커밋 확인' },
    { path: '/aleph.json' }, res => {
      try { deployedCommit = JSON.parse(res.text).commit ?? null; } catch {}
      return { ok: res.status === 200 && Boolean(deployedCommit), actual: `HTTP ${res.status}, 커밋 ${deployedCommit ? deployedCommit.slice(0, 7) : '없음'}` };
    });
  await live(rows, app, { id: 'N02', stage: 11, kind: 'normal', request: 'GET /', expected: 'HTTP 200 접속 화면' }, { path: '/' }, statusIs(200));
  await live(rows, app, { id: 'N03', stage: 11, kind: 'normal', request: 'GET /manifest.webmanifest', expected: 'HTTP 200, 앱 이름 있음' },
    { path: '/manifest.webmanifest' }, res => {
      let name = null;
      try { name = JSON.parse(res.text).name ?? null; } catch {}
      return { ok: res.status === 200 && Boolean(name), actual: `HTTP ${res.status}, 이름 ${name ? '있음' : '없음'}` };
    });
  await live(rows, app, { id: 'N04', stage: 11, kind: 'normal', request: 'GET /offline.html', expected: 'HTTP 200 오프라인 안내' }, { path: '/offline.html' }, statusIs(200));

  // ---- 금지 요청 (실제 응답) ----
  await live(rows, app, { id: 'F01', stage: 1, kind: 'forbidden', request: 'GET /api/notes (토큰 없음)', expected: 'HTTP 401, 메모 없음' }, { path: '/api/notes' }, statusIs(401));
  await live(rows, app, { id: 'F02', stage: 1, kind: 'forbidden', request: 'GET /api/notes?id=<가상 UUID> (토큰 없음)', expected: 'HTTP 401' }, { path: `/api/notes?id=${ZERO_ID}` }, statusIs(401));
  await live(rows, app, { id: 'F03', stage: 3, kind: 'forbidden', request: 'GET /api/notes (서명 위조 토큰)', expected: 'HTTP 401' },
    { path: '/api/notes', headers: { authorization: 'Bearer eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJmb3JnZWQifQ.Zm9yZ2Vk' } }, statusIs(401));
  await live(rows, app, { id: 'F04', stage: 2, kind: 'forbidden', request: 'GET /data.json (시드 검색)', expected: '메모 0건, 확인 표식 없음' },
    { path: '/data.json' }, res => {
      let empty = false;
      try { const data = JSON.parse(res.text); empty = Array.isArray(data.notes) && data.notes.length === 0; } catch {}
      const marker = res.text.includes(config.sampleMarker);
      return { ok: res.status === 200 && empty && !marker, actual: `HTTP ${res.status}, 메모 ${empty ? '0건' : '있음/형식 다름'}, 표식 ${marker ? '있음' : '없음'}` };
    });
  await live(rows, app, { id: 'F05', stage: 2, kind: 'forbidden', request: 'GET / (배포 화면 비밀값·표식·저장소 검색)', expected: '서버 키·개인키·표식·저장소 저장 코드 없음' },
    { path: '/' }, res => {
      const secret = SECRET_IN_PAGE.test(res.text);
      const marker = res.text.includes(config.sampleMarker);
      const storage = /localStorage\.|sessionStorage\.setItem|indexedDB\.open/u.test(res.text);
      return { ok: res.status === 200 && !secret && !marker && !storage, actual: `HTTP ${res.status}, 비밀값 ${secret ? '있음' : '없음'}, 표식 ${marker ? '있음' : '없음'}, 저장소 저장 ${storage ? '있음' : '없음'}` };
    });
  await live(rows, app, { id: 'F06', stage: 5, kind: 'forbidden', request: 'GET /aleph.config.json (서버 키 검색)', expected: '서버 전용 키 없음' },
    { path: '/aleph.config.json' }, res => {
      const secret = SECRET_IN_PAGE.test(res.text);
      return { ok: res.status === 200 && !secret, actual: `HTTP ${res.status}, 서버 키 ${secret ? '있음' : '없음'}` };
    });
  if (typeof config.originalApiUrl === 'string' && config.originalApiUrl.startsWith('https://')) {
    await live(rows, app, { id: 'F07', stage: 5, kind: 'forbidden', request: 'GET 원본 자료 API (공개 키만, 사용자 토큰 없음)', expected: 'HTTP 401 또는 403' },
      { url: config.originalApiUrl, headers: { apikey: config.anonKey ?? '' } }, statusIs(401, 403));
  }
  await live(rows, app, { id: 'F08', stage: 8, kind: 'forbidden', request: 'GET /api/notes/export (토큰 없음)', expected: 'HTTP 401 또는 404' }, { path: '/api/notes/export' }, statusIs(401, 404));
  await live(rows, app, { id: 'F09', stage: 8, kind: 'forbidden', request: 'GET /api/notices?id=notice-01 (토큰 없음)', expected: 'HTTP 401' }, { path: '/api/notices?id=notice-01' }, statusIs(401));
  await live(rows, app, { id: 'F10', stage: 11, kind: 'forbidden', request: 'GET /api/device (토큰·서명 없음)', expected: 'HTTP 401, 승인으로 처리 안 함' }, { path: '/api/device' }, statusIs(401));
  await live(rows, app, { id: 'F11', stage: 10, kind: 'forbidden', request: 'HEAD /api/restore', expected: '복원 없이 HTTP 401 또는 405' }, { method: 'HEAD', path: '/api/restore' }, statusIs(401, 405));
  await live(rows, app, { id: 'F12', stage: 12, kind: 'forbidden', request: 'GET /api/ops (토큰 없음)', expected: 'HTTP 401, 작전실 기록 없음' }, { path: '/api/ops' }, statusIs(401));

  // ---- 쓰기 요청: 격리 환경에서는 보내지 않음 ----
  const writes = [
    { id: 'W01', stage: 3, request: 'POST /api/notes (토큰 없음)', path: '/api/notes', method: 'POST', body: '{"title":"x","body":"x"}' },
    { id: 'W02', stage: 10, request: 'POST /api/restore (토큰 없음)', path: '/api/restore', method: 'POST', body: `{"id":"${ZERO_ID}"}` },
    { id: 'W03', stage: 8, request: 'PUT /api/notices?id=notice-01 (토큰 없음)', path: '/api/notices?id=notice-01', method: 'PUT', body: '{}' },
  ];
  for (const w of writes) {
    const base = { id: w.id, stage: w.stage, kind: 'forbidden', request: w.request, expected: 'HTTP 401, 저장 없음' };
    if (!allowWrites) notRun(rows, base, 'not_run (격리 환경은 GET·HEAD만 허용)');
    else await live(rows, app, base, { method: w.method, path: w.path, body: w.body, headers: { 'content-type': 'application/json' } }, statusIs(401));
  }

  // ---- 학생 판정기·탐지·정책 (실제 함수 반환값) ----
  // 모듈을 불러오지 못하면 그 행은 not_run 으로 남기고 다른 행은 계속 확인합니다.
  const deciderModule = await optional(new URL('./decider.mjs', import.meta.url).href);
  const detectModule = await optional(new URL('./detect.mjs', import.meta.url).href);
  const fsModule = await optional('node:fs');
  // 격리 환경(npm run bundle)의 git은 제출 묶음 확인용 읽기만 허용됩니다. 그래서 bundle 모드에서는 git을 실행하지 않고
  // 비밀값 검색 행을 not_run 으로 둡니다. 로컬 npm run evidence(allowWrites=true)에서만 git grep을 실행합니다.
  const gitModule = allowWrites ? await optional('node:child_process') : { importError: 'bundle_mode' };
  const missing = (rowsOut, base, mod, name) => notRun(rowsOut, base, `not_run (${name} 불러오기 실패: ${String(mod.importError).slice(0, 60)})`);

  // 7단계 연습 요청과 같은 모양 (scripts/fixture-7.mjs와 같은 값, 쓰기 기능 없이 직접 구성)
  const fixture = (signals, recentEvents) => ({
    schema: 'aleph.decision.v1', requestId: randomUUID(), classId: 'class_fixture',
    projectId: 'project_fixture', subjectId: 'learner_fixture', deviceId: 'a'.repeat(16),
    service: 'notes', method: 'GET', path: '/notes/demo', route: 'GET /notes/:id',
    queryLength: 0, querySha256: EMPTY_SHA256, at: new Date().toISOString(), policyRevision: 1, deviceRegistered: true,
    stepUp: { verified: false, authAgeSeconds: null }, recentEvents, signals,
  });
  const normal = fixture({ source: 'judge_fixture', region: 'local', network: 'usual', hour: 14 }, []);
  const suspicious = fixture({ source: 'judge_fixture', region: 'foreign', network: 'unusual', hour: 3 },
    [{ kind: 'risk_signal', ageSeconds: 60, count: 20 }]);
  const zone = { ...normal, subjectId: 'student_user_b', service: 'notes' };
  const decisions = [
    [{ id: 'L01', stage: 6, kind: 'normal', request: '판정기: 등록 기기 정상 요청', expected: 'allow' }, normal, 'allow'],
    [{ id: 'L02', stage: 6, kind: 'forbidden', request: '판정기: 미등록 가상 기기 요청', expected: 'deny' }, { ...normal, deviceRegistered: false }, 'deny'],
    [{ id: 'L03', stage: 7, kind: 'forbidden', request: '판정기: 복합 이상 접속 (재확인 전)', expected: 'step_up' }, suspicious, 'step_up'],
    [{ id: 'L04', stage: 7, kind: 'normal', request: '판정기: 복합 이상 접속 (재확인 뒤)', expected: 'allow' }, { ...suspicious, stepUp: { verified: true, authAgeSeconds: 60 } }, 'allow'],
    [{ id: 'L05', stage: 8, kind: 'forbidden', request: '판정기: B가 A 메모 읽기', expected: 'deny' }, { ...zone, path: '/notes/owner_a_item', route: 'GET /notes/:id' }, 'deny'],
    [{ id: 'L06', stage: 8, kind: 'normal', request: '판정기: B가 자기 메모 읽기', expected: 'allow' }, { ...zone, path: '/notes/owner_b_item', route: 'GET /notes/:id' }, 'allow'],
    [{ id: 'L07', stage: 8, kind: 'forbidden', request: '판정기: 학생 공지 수정', expected: 'deny' }, { ...zone, method: 'PUT', path: '/notices/notice-01', route: 'PUT /notices/:id' }, 'deny'],
    [{ id: 'L08', stage: 8, kind: 'forbidden', request: '판정기: 메모 전체 목록', expected: 'deny' }, { ...zone, path: '/notes', route: 'GET /notes' }, 'deny'],
  ];
  for (const [base, request, want] of decisions) {
    if (typeof deciderModule.decide !== 'function') { missing(rows, base, deciderModule, '판정기'); continue; }
    await local(rows, base, async () => {
      const req = { ...request, requestId: randomUUID() };
      const res = await deciderModule.decide(req);
      return { ok: res.decision === want && res.requestId === req.requestId, actual: `${res.decision} · ${res.reasonCode}`, requestId: req.requestId };
    });
  }

  const reads = (count, extra) => Array.from({ length: count }, (_, i) => ({
    at: new Date(Date.UTC(2026, 9, 1) + i * 2000).toISOString(), method: 'GET', identity: { sub: 'doppel_fixture' }, deviceId: 'bbbbbbbbbbbbbbbb', ...extra,
  }));
  const detections = [
    [{ id: 'L09', stage: 9, kind: 'forbidden', request: '탐지기: 낯선 네트워크 + 10분 150건 가상 사건', expected: 'propose_revocation (기기 1개)' },
      () => detectModule.detect(reads(150, { network: 'unusual' })), r => r.action === 'propose_revocation' && r.deviceId === 'bbbbbbbbbbbbbbbb'],
    [{ id: 'L10', stage: 9, kind: 'normal', request: '탐지기: 평소 네트워크 30건', expected: 'observe' },
      () => detectModule.detect(reads(30, { network: 'usual' })), r => r.action === 'observe'],
    [{ id: 'L11', stage: 9, kind: 'normal', request: '탐지기: 지역만 다른 150건', expected: 'observe' },
      () => detectModule.detect(reads(150, { network: 'usual', region: 'foreign' })), r => r.action === 'observe'],
  ];
  for (const [base, run, ok] of detections) {
    if (typeof detectModule.detect !== 'function') { missing(rows, base, detectModule, '탐지기'); continue; }
    await local(rows, base, () => {
      const r = run();
      return { ok: ok(r), actual: `${r.action}${r.reasonCode ? ` · ${r.reasonCode}` : ''}${r.deviceId ? ' · 기기 1개' : ''}` };
    });
  }

  const policyBase = { id: 'L12', stage: 10, kind: 'normal', request: '정책 사본 다시 읽기·SHA-256 검증', expected: '검증 통과' };
  const policyEval = { id: 'L13', stage: 10, kind: 'forbidden', request: '복원한 시험 정책: B가 A 메모 읽기 / A 자기 메모', expected: 'deny / allow' };
  if (typeof fsModule.readFileSync !== 'function') {
    missing(rows, policyBase, fsModule, 'node:fs');
    missing(rows, policyEval, fsModule, 'node:fs');
  } else {
    const read = path => fsModule.readFileSync(toPath(new URL(path, rootUrl)), 'utf8');
    await local(rows, policyBase, async () => {
      const manifest = JSON.parse(read('policy/backups/manifest.json'));
      if (!/^[a-z0-9._-]+\.json$/iu.test(String(manifest.file))) return { ok: false, actual: '사본 파일 이름 이상 → 중단' };
      const text = read(`policy/backups/${manifest.file}`);
      const hash = await sha256Hex(text);
      if (hash === null) return { notRun: 'not_run (node:crypto sha256을 쓸 수 없어 검증하지 않음)' };
      const same = hash === manifest.sha256 && JSON.parse(text).version === manifest.version;
      return { ok: same, actual: same ? `검증 통과 · ${manifest.version}` : '해시·버전 불일치 → 중단' };
    });
    await local(rows, policyEval, () => {
      const notes = JSON.parse(read('policy/test-policy.json')).services?.notes ?? {};
      const route = '/notes/:id';
      const allowed = Array.isArray(notes.routes) && notes.routes.includes(`GET ${route}`);
      const cross = allowed && notes.crossOwner === 'allow' ? 'allow' : 'deny';
      const own = allowed && notes.ownRead === 'allow' ? 'allow' : 'deny';
      return { ok: cross === 'deny' && own === 'allow', actual: `${cross} / ${own}` };
    });
  }

  const gitBase = { id: 'L14', stage: 2, kind: 'forbidden', request: 'git grep HEAD (비밀값 검색)', expected: '서버 키·JWT·개인키 0건' };
  if (!allowWrites) {
    notRun(rows, gitBase, 'not_run (격리 환경은 제출 묶음 확인용 git 읽기만 허용, 로컬 npm run evidence에서 실행)');
  } else if (typeof gitModule.execFileSync !== 'function') {
    missing(rows, gitBase, gitModule, 'node:child_process');
  } else {
    await local(rows, gitBase, () => {
      const run = args => gitModule.execFileSync('git', args, { cwd: toPath(rootUrl), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 });
      let hits = 0;
      try {
        hits = run(['grep', '-I', '-c', '-E', 'sb_secret_[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{20,}\\.eyJ[A-Za-z0-9_-]{20,}\\.|BEGIN (EC |RSA )?PRIVATE KEY-----', 'HEAD'])
          .split('\n').filter(Boolean).length;
      } catch (error) {
        if (error.status !== 1) throw error;
      }
      const head = run(['rev-parse', '--short', 'HEAD']).trim();
      return { ok: hits === 0, actual: `${head}에서 ${hits}개 파일` };
    });
  }

  // ---- 로그인·기기 서명이 필요한 정상·금지 요청: 시험 계정 토큰을 쓰지 않으므로 보내지 않음 ----
  for (const [id, stage, kind, request, expected] of [
    ['T01', 4, 'normal', 'A 토큰으로 자기 메모 조회', 'HTTP 200'],
    ['T02', 4, 'forbidden', 'B 토큰으로 A 메모 조회·삭제', 'HTTP 403/404'],
    ['T03', 10, 'forbidden', 'B 메모 변조·삭제 뒤 POST /api/restore', 'ID·소유자·해시 일치'],
    ['T04', 11, 'forbidden', '승인 기기 계정의 서명 없는 요청·서명 뒤 경로·본문 변경', 'HTTP 401'],
    ['T05', 11, 'normal', '승인 기기에서 서명한 메모 목록', 'HTTP 200'],
  ]) notRun(rows, { id, stage, kind, request, expected }, 'not_run (시험 계정 토큰·기기 서명 없이 실행하지 않음)');

  return { schema: 'aleph.ops-evidence.v1', generatedAt: now(), deployedCommit, writesSent: allowWrites, rows, attacks: attackStatus(rows), summary: summarize(rows) };
}

export function attackStatus(rows) {
  const byId = new Map(rows.map(item => [item.id, item]));
  return ATTACKS.map(attack => {
    const evidence = attack.measuredBy.map(id => byId.get(id)).filter(Boolean);
    const measured = attack.measuredBy.length > 0 && evidence.length === attack.measuredBy.length
      && evidence.every(item => item.result !== 'not_run');
    const status = !measured ? 'not_run' : (evidence.every(item => item.result === 'pass') ? 'blocked' : 'not_blocked');
    return { ...attack, status };
  });
}

// 화면과 제출 묶음이 같은 계산을 씁니다: 행의 결과를 세기만 하고 다른 값으로 채우지 않습니다.
export function summarize(rows) {
  const count = (kind, result) => rows.filter(item => (!kind || item.kind === kind) && item.result === result).length;
  const attacks = attackStatus(rows);
  return {
    rows: rows.length,
    forbiddenRejected: count('forbidden', 'pass'), forbiddenFailed: count('forbidden', 'fail'), forbiddenNotRun: count('forbidden', 'not_run'),
    normalAllowed: count('normal', 'pass'), normalFailed: count('normal', 'fail'), normalNotRun: count('normal', 'not_run'),
    attacksBlocked: attacks.filter(item => item.status === 'blocked').length,
    attacksNotBlocked: attacks.filter(item => item.status === 'not_blocked').length,
    attacksNotRun: attacks.filter(item => item.status === 'not_run').length,
    attacksTotal: attacks.length,
  };
}

export const evidenceDigest = evidence => sha256Hex(JSON.stringify(evidence.rows));
