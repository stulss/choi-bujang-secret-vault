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
    // 1~11단계 점검을 그대로 다시 실행하고, 탈환 작전실 요약 경로가 로그인 없이 열리지 않는지 확인합니다.
    // 제출 묶음은 점검 20개까지만 받으므로, 시험 계정 토큰이 필요해 보내지 않는 복구 점검(restore_single_note_live, 미실행)은
    // 여기서 빼고 그 미실행 기록은 docs/EVIDENCE.md의 A05·A06 행에 남깁니다.
    const checks = (await runAttackChecks({ ...config, step: 11 }))
      .filter(item => item.attackId !== 'restore_single_note_live');

    try {
      const res = await fetch(new URL('/api/ops', app), { redirect: 'error', signal: AbortSignal.timeout(10000) });
      checks.push({
        attackId: 'ops_summary_unauthenticated_blocked',
        expected: '로그인·기기 서명 없이 탈환 작전실 요약(/api/ops)을 요청하면 기록을 주지 않고 거부 (HTTP 401)',
        observed: res.status === 401 ? '비로그인 작전실 요약 요청 거부 확인 (HTTP 401)' : `작전실 요약 응답 확인 (HTTP ${res.status})`,
      });
    } catch (err) {
      checks.push({ attackId: 'ops_summary_unauthenticated_blocked', expected: '비로그인 작전실 요약 요청 거부 (HTTP 401)', observed: `요청 실패 (${err.message})` });
    }

    return checks;
  }

  throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
}
