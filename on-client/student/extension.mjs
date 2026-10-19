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
    renderDecision({ status = 'idle', data, error, appId } = {}) {
      const root = document.createElement('div');
      root.className = 'student-decision-card';

      const details = document.createElement('dl');
      details.className = 'student-decision-list';
      root.append(details);

      const addDetail = (label, value) => {
        const term = document.createElement('dt');
        term.textContent = label;
        const description = document.createElement('dd');
        description.textContent = value;
        details.append(term, description);
      };

      const addNotice = (text) => {
        const notice = document.createElement('p');
        notice.className = 'student-decision-notice';
        notice.textContent = text;
        root.append(notice);
      };

      const appValue = data?.appId ?? appId;
      if (appValue != null) addDetail('업무 앱 ID', String(appValue));

      if (status === 'idle') {
        addNotice('요청 전: 업무 앱을 선택해 접속을 요청하세요.');
      } else if (status === 'loading') {
        addNotice('판정 확인 중(loading)');
      } else if (status === 'error') {
        const message = typeof error?.message === 'string' && error.message
          ? error.message
          : '서버가 오류 메시지를 제공하지 않았습니다.';
        addNotice(`요청 실패(error): ${message}`);
        addNotice('요청 실패는 접근 거부 판정이 아닙니다.');
      } else if (status === 'ok') {
        const decisionLabels = {
          allow: '허용(allow)',
          deny: '거부(deny)',
          challenge: '추가 확인 필요(challenge)',
          unknown: '확인 불가(unknown)',
        };
        const decision = typeof data?.decision === 'string' ? data.decision : 'unknown';
        addDetail('접근 판정', Object.hasOwn(decisionLabels, decision) ? decisionLabels[decision] : '확인 불가(unknown)');
        addDetail('판정 이유', typeof data?.reason === 'string' && data.reason ? data.reason : '사유 정보 없음');
        addDetail('판정 시각', typeof data?.checkedAt === 'string' && data.checkedAt ? data.checkedAt : '확인 불가');

        if (decision === 'challenge') {
          addNotice('이 화면은 추가 인증 또는 확인 절차를 대신 수행하지 않습니다.');
        } else if (!Object.hasOwn(decisionLabels, decision) || decision === 'unknown') {
          addNotice('확인할 수 없는 판정은 접근 허용이나 정상으로 간주하지 않습니다.');
        }
      } else {
        addNotice('판정을 확인할 수 없습니다(unknown). 접근 허용으로 간주하지 않습니다.');
      }

      return root;
    },
    renderEvents({ status = 'loading', mode, data, error } = {}) {
      const root = document.createElement('div');
      root.className = 'student-events-card';

      const addMessage = (text, kind = 'empty') => {
        const message = document.createElement('p');
        message.className = `student-events-${kind}`;
        message.textContent = text;
        if (kind === 'error') message.setAttribute('role', 'alert');
        else message.setAttribute('role', 'status');
        root.append(message);
        return message;
      };

      const addNotice = (label, value) => {
        const notice = document.createElement('p');
        notice.className = 'student-mode-notice';
        notice.textContent = `${label}: ${value}`;
        root.append(notice);
      };

      const modeText = (m) => ({
        connected: '연결됨',
        demo: '예제 자료',
        disconnected: '연결 없음',
        unknown: '확인 불가',
      })[m] || '';

      const modeStr = modeText(mode);
      if (modeStr) {
        addNotice('보안 기록 모드', modeStr);
      }

      if (status === 'loading') {
        addMessage('불러오는 중');
        return root;
      }
      if (status === 'error') {
        const message = typeof error?.message === 'string' && error.message
          ? error.message
          : '서버가 오류 메시지를 제공하지 않았습니다.';
        if (error?.code === 'CONTRACT_MISMATCH' || error?.code === 'ENGINE_RESULT_UNVERIFIED') {
          addMessage(`확인 불가: ${message}`, 'error');
        } else {
          addMessage(`기록을 불러오지 못했습니다: ${message}`, 'error');
        }
        return root;
      }
      if (status !== 'ok' || !Array.isArray(data)) {
        addMessage('확인 불가: 기록 상태를 확인할 수 없습니다.', 'error');
        return root;
      }

      // 1) 받은 data 배열을 복사해 at 기준 최신순으로 정렬 (원본 배열 보존)
      const sortedEvents = [...data].sort((left, right) => {
        const leftTime = Date.parse(left?.at ?? '');
        const rightTime = Date.parse(right?.at ?? '');
        if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
          return rightTime - leftTime;
        }
        return String(right?.at ?? '').localeCompare(String(left?.at ?? ''));
      });

      if (sortedEvents.length === 0) {
        addMessage('표시할 기록이 없습니다.');
        return root;
      }

      const kindText = (kind) => ({
        access: '접속 (access)',
        xdr: 'XDR 경보 (xdr)',
      })[kind] || `확인 불가 (${String(kind ?? 'unknown')})`;

      const accessText = (value) => ({
        allowed: '허용됨(allowed)',
        denied: '거부됨(denied)',
        unknown: '확인 불가(unknown)',
      })[value] || `확인 불가(${String(value ?? 'unknown')})`;

      const sessionText = (value) => ({
        active: '활성(active)',
        expired: '만료(expired)',
        revoked: '철회됨(revoked)',
        unknown: '확인 불가(unknown)',
      })[value] || `확인 불가(${String(value ?? 'unknown')})`;

      const deviceText = (value) => ({
        compliant: '보안 기준 충족(compliant)',
        noncompliant: '보안 기준 미충족(noncompliant)',
        unknown: '확인 불가(unknown)',
      })[value] || `확인 불가(${String(value ?? 'unknown')})`;

      const appText = (appId) => (appId == null || appId === '') ? '앱을 확인할 수 없습니다' : String(appId);

      // 3) 「기록 종류」「업무 앱」「접속 상태」 필터
      const filters = { kind: 'all', appId: 'all', access: 'all' };
      let selectedEventId = null;

      const filterGroup = document.createElement('div');
      filterGroup.className = 'student-events-filters';

      const createFilter = (labelText, key, values, describe = (value) => value) => {
        const label = document.createElement('label');
        label.textContent = labelText;
        const select = document.createElement('select');
        select.name = `student-events-${key}`;
        select.setAttribute('aria-label', labelText);

        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = '전체 (all)';
        select.append(allOption);

        for (const value of values) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = describe(value);
          select.append(option);
        }

        select.addEventListener('change', () => {
          filters[key] = select.value;
          selectedEventId = null;
          renderRows();
        });

        label.append(select);
        filterGroup.append(label);
      };

      const uniqueValues = (values) => [...new Set(values.filter((value) => typeof value === 'string' && value !== ''))];

      createFilter('기록 종류', 'kind', uniqueValues(sortedEvents.map((event) => event.kind)), kindText);
      createFilter('업무 앱', 'appId', uniqueValues(sortedEvents.map((event) => event.appId)));
      createFilter('접속 상태', 'access', uniqueValues(sortedEvents.map((event) => event.state?.access)), accessText);
      root.append(filterGroup);

      const count = document.createElement('p');
      count.className = 'student-events-count';
      count.setAttribute('role', 'status');
      root.append(count);

      const list = document.createElement('ul');
      list.className = 'student-events-list';
      root.append(list);

      const detailContainer = document.createElement('div');
      detailContainer.className = 'student-event-detail-container';
      detailContainer.setAttribute('aria-live', 'polite');
      root.append(detailContainer);

      const addRowValue = (details, label, value) => {
        const term = document.createElement('dt');
        term.textContent = label;
        const description = document.createElement('dd');
        description.textContent = value;
        details.append(term, description);
      };

      // 4) 「<event.id> 상세」 버튼으로 선택한 기록 상세 보기
      const renderDetail = (event) => {
        detailContainer.replaceChildren();
        if (!event) return;

        const detail = document.createElement('section');
        detail.className = 'student-event-detail';
        detail.dataset.studentEventDetail = String(event.id);
        detail.setAttribute('aria-label', `${event.id} 상세`);

        const heading = document.createElement('h3');
        heading.textContent = `${event.id} 상세`;
        detail.append(heading);

        const eventDetails = document.createElement('dl');
        addRowValue(eventDetails, '사건 ID', String(event.id));
        addRowValue(eventDetails, '업무 앱', appText(event.appId));
        detail.append(eventDetails);

        const addTextRows = (headingText, rows, emptyText) => {
          const sectionHeading = document.createElement('h4');
          sectionHeading.textContent = headingText;
          detail.append(sectionHeading);
          if (!Array.isArray(rows) || rows.length === 0) {
            const empty = document.createElement('p');
            empty.textContent = emptyText;
            detail.append(empty);
            return;
          }
          const items = document.createElement('ul');
          for (const row of rows) {
            const item = document.createElement('li');
            item.textContent = `ID: ${String(row?.id ?? '확인 불가')} · 내용: ${String(row?.text ?? '확인 불가')}`;
            items.append(item);
          }
          detail.append(items);
        };

        addTextRows('근거 (evidence)', event.evidence, '근거가 없습니다.');
        addTextRows('규칙 (rules)', event.rules, '규칙 정보가 없습니다.');

        const stateHeading = document.createElement('h4');
        stateHeading.textContent = '기록 상태 (state)';
        detail.append(stateHeading);

        const stateDetails = document.createElement('dl');
        addRowValue(stateDetails, '접속 상태 (access)', accessText(event.state?.access));
        addRowValue(stateDetails, '세션 상태 (session)', sessionText(event.state?.session));
        addRowValue(stateDetails, '기기 상태 (device)', deviceText(event.state?.device));
        detail.append(stateDetails);

        detailContainer.append(detail);
      };

      // 2) 각 행 렌더링 (id, 시각, 종류, 앱, 요약, data-student-event-id)
      const renderRows = () => {
        const visibleEvents = sortedEvents.filter((event) =>
          (filters.kind === 'all' || event.kind === filters.kind)
          && (filters.appId === 'all' || event.appId === filters.appId)
          && (filters.access === 'all' || event.state?.access === filters.access));

        count.textContent = `표시 건수: ${visibleEvents.length} / ${sortedEvents.length}`;
        list.replaceChildren();

        if (visibleEvents.length === 0) {
          const emptyItem = document.createElement('li');
          emptyItem.textContent = '선택한 필터에 맞는 기록이 없습니다.';
          list.append(emptyItem);
          renderDetail(null);
          return;
        }

        for (const event of visibleEvents) {
          const row = document.createElement('li');
          row.className = 'student-event-row';
          row.dataset.studentEventId = String(event.id);

          const rowDetails = document.createElement('dl');
          addRowValue(rowDetails, '사건 ID', String(event.id));
          addRowValue(rowDetails, '시각', String(event.at ?? '시각 정보 없음'));
          addRowValue(rowDetails, '종류', kindText(event.kind));
          addRowValue(rowDetails, '업무 앱', appText(event.appId));
          addRowValue(rowDetails, '요약', String(event.summary ?? '요약 정보 없음'));
          row.append(rowDetails);

          const detailButton = document.createElement('button');
          detailButton.type = 'button';
          detailButton.textContent = `${event.id} 상세`;
          detailButton.setAttribute('aria-label', `${event.id} 상세`);
          detailButton.addEventListener('click', () => {
            selectedEventId = String(event.id);
            renderDetail(event);
          });
          row.append(detailButton);
          list.append(row);
        }

        const selectedEvent = visibleEvents.find((event) => String(event.id) === selectedEventId);
        if (selectedEvent) renderDetail(selectedEvent);
        else renderDetail(null);
      };

      renderRows();
      return root;
    },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
