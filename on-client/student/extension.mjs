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

      const deviceLabel = (status) => {
        const code = typeof status === 'string' && status ? status : 'unknown';
        const meaning = ({
          compliant: '보안 기준 충족',
          noncompliant: '보안 기준 미충족',
          unknown: '확인 불가',
        })[code] || '확인 불가';
        return `${meaning} (${code})`;
      };

      const sessionLabel = (status) => {
        const code = typeof status === 'string' && status ? status : 'unknown';
        const meaning = ({
          active: '활성',
          expired: '만료',
          revoked: '철회됨',
          unknown: '확인 불가',
        })[code] || '확인 불가';
        return `${meaning} (${code})`;
      };

      const addListState = (label, resource) => {
        if (resource?.status === 'loading') {
          addDetail(label, '불러오는 중');
        } else if (resource?.status === 'error') {
          addDetail(label, errorText(resource));
        } else if (resource?.status !== 'ok') {
          addDetail(label, '확인 불가');
        }
      };

      // 각 입력의 모드 안내는 해당 자료가 loading/error여도 함께 표시한다.
      addMode('로그인 정보', me);
      addMode('기기 정보', devices);
      addMode('세션 정보', sessions);

      // 사용자 및 현재 기기·세션은 로그인 정보(me)를 기준으로 표시한다.
      if (me?.status === 'loading') {
        addDetail('사용자', '불러오는 중');
      } else if (me?.status === 'error') {
        addDetail('사용자', errorText(me));
      } else if (me?.status === 'ok' && me.data) {
        const user = me.data.user || {};
        const userName = user.label || user.id || '확인 불가';
        addDetail('사용자', `${userName} (ID: ${user.id ?? '확인 불가'})`);
      } else {
        addDetail('사용자', '확인 불가');
      }

      const currentDevice = me?.status === 'ok' && me.data ? me.data.device : null;
      if (me?.status === 'loading') {
        addDetail('현재 기기', '불러오는 중');
      } else if (me?.status === 'error') {
        addDetail('현재 기기', errorText(me));
      } else if (me?.status === 'ok' && currentDevice) {
        const label = currentDevice.label || currentDevice.id || '확인 불가';
        const id = currentDevice.id ?? '확인 불가';
        addDetail('현재 기기', `${label} (ID: ${id}) · ${deviceLabel(currentDevice.status)}`, currentDevice.status);
      } else {
        addDetail('현재 기기', '확인 불가');
      }

      const currentSession = me?.status === 'ok' && me.data ? me.data.session : null;
      if (me?.status === 'loading') {
        addDetail('로그인 세션', '불러오는 중');
      } else if (me?.status === 'error') {
        addDetail('로그인 세션', errorText(me));
      } else if (me?.status === 'ok' && currentSession) {
        const id = currentSession.id ?? '확인 불가';
        addDetail('로그인 세션', `${id} · ${sessionLabel(currentSession.status)}`, currentSession.status);
      } else {
        addDetail('로그인 세션', '확인 불가');
      }

      // 목록 자체의 loading/error는 현재 로그인 정보와 별도로 표시한다.
      addListState('기기 목록', devices);
      addListState('세션 목록', sessions);

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
