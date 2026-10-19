// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
  return {
    renderIdentity({ me, devices, sessions } = {}) {
      const root = document.createElement('div');
      root.className = 'student-identity-card';

      const details = document.createElement('dl');
      details.className = 'student-identity-list';
      root.append(details);

      const addDetail = (label, value, statusVal) => {
        const term = document.createElement('dt');
        term.textContent = label;
        const description = document.createElement('dd');
        description.textContent = value;
        if (statusVal) {
          description.dataset.status = statusVal;
        }
        details.append(term, description);
      };

      const addNotice = (label, value) => {
        const notice = document.createElement('p');
        notice.className = 'student-mode-notice';
        notice.textContent = `${label}: ${value}`;
        root.append(notice);
      };

      const modeText = (mode) => ({
        connected: '연결됨',
        demo: '예제 자료',
        disconnected: '연결 없음',
        unknown: '확인 불가',
      })[mode] || '';

      const addMode = (label, resource) => {
        const text = modeText(resource?.mode);
        if (text) addNotice(`${label} 모드`, text);
      };

      const errorText = (resource) => {
        const message = typeof resource?.error?.message === 'string' && resource.error.message
          ? resource.error.message
          : '서버가 오류 메시지를 제공하지 않았습니다.';
        return ['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED'].includes(resource?.error?.code)
          ? `확인 불가: ${message}`
          : `연결 실패: ${message}`;
      };

      const deviceLabel = (status) => ({
        compliant: '보안 기준 충족',
        noncompliant: '보안 기준 미충족',
        unknown: '확인 불가',
      })[status] || `확인 불가 (${status ?? 'unknown'})`;

      const sessionLabel = (status) => ({
        active: '활성',
        expired: '만료',
        revoked: '철회됨',
        unknown: '확인 불가',
      })[status] || `확인 불가 (${status ?? 'unknown'})`;

      // 1. 모드 안내 (loading, error 상태에서도 전달받은 모드 안내 표시)
      addMode('로그인 정보', me);
      addMode('기기 정보', devices);
      addMode('세션 정보', sessions);

      // 2. me/devices/sessions 상태별 렌더링
      if (me?.status === 'loading') {
        addDetail('사용자', '불러오는 중');
        addDetail('현재 기기', '불러오는 중');
        addDetail('로그인 세션', '불러오는 중');
      } else if (me?.status === 'error') {
        const message = errorText(me);
        // 오류 시 이전 사용자 정보를 남기지 않고 실패 메시지만 표시
        addDetail('사용자', message);
        addDetail('현재 기기', message);
        addDetail('로그인 세션', message);
      } else if (me?.status === 'ok' && me.data) {
        const { user, device, session } = me.data;

        // devices 목록에서 현재 기기 정보 확인
        const listedDevice = devices?.status === 'ok' && Array.isArray(devices.data)
          ? devices.data.find((item) => item.id === device?.id)
          : null;
        const currentDevice = listedDevice || device || {};

        // sessions 목록에서 현재 세션 정보 확인
        const listedSession = sessions?.status === 'ok' && Array.isArray(sessions.data)
          ? sessions.data.find((item) => item.id === session?.id)
          : null;
        const currentSession = listedSession || session || {};

        // 사용자 표시
        const userName = user?.label || user?.id || '확인 불가';
        addDetail('사용자', `${userName} (ID: ${user?.id ?? '확인 불가'})`);

        // 기기 표시
        if (devices?.status === 'loading') {
          addDetail('현재 기기', '불러오는 중');
        } else if (devices?.status === 'error') {
          addDetail('현재 기기', errorText(devices));
        } else if (devices?.status === 'ok') {
          const dLabel = currentDevice.label || currentDevice.id || '확인 불가';
          const dId = currentDevice.id ?? '확인 불가';
          const dStatusText = deviceLabel(currentDevice.status);
          addDetail('현재 기기', `${dLabel} (ID: ${dId}) · ${dStatusText}`, currentDevice.status);
        } else {
          addDetail('현재 기기', '확인 불가');
        }

        // 세션 표시
        if (sessions?.status === 'loading') {
          addDetail('로그인 세션', '불러오는 중');
        } else if (sessions?.status === 'error') {
          addDetail('로그인 세션', errorText(sessions));
        } else if (sessions?.status === 'ok') {
          const sId = currentSession.id ?? '확인 불가';
          const sStatusText = sessionLabel(currentSession.status);
          addDetail('로그인 세션', `${sId} · ${sStatusText}`, currentSession.status);
        } else {
          addDetail('로그인 세션', '확인 불가');
        }
      } else {
        addDetail('사용자', '확인 불가');
        addDetail('현재 기기', '확인 불가');
        addDetail('로그인 세션', '확인 불가');
      }

      return root;
    },
    renderDecision() { return '학생 구현 대기: 서버의 판정과 이유를 연결하세요.'; },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
