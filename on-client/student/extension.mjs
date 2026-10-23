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

        // 16단계: 미지원 조치 안내 (supportedActions가 있는 경우에만 비활성 버튼 표시)
        if (Array.isArray(event.supportedActions) && event.supportedActions.length > 0) {
          const actionSection = document.createElement('div');
          actionSection.className = 'student-unsupported-actions';

          const actionHeading = document.createElement('h4');
          actionHeading.textContent = '조치 안내';
          actionSection.append(actionHeading);

          const actionNotice = document.createElement('p');
          actionNotice.className = 'student-action-notice';
          actionNotice.textContent = '아직 지원하지 않는 조치입니다. 조치 실행 연결은 준비 중입니다.';
          actionSection.append(actionNotice);

          for (const action of event.supportedActions) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.disabled = true;
            btn.textContent = `${action} 미지원`;
            btn.setAttribute('aria-label', `${action} 미지원`);
            actionSection.append(btn);
          }
          detail.append(actionSection);
        }

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
    renderStatus({ devices, sessions, notifications, diagnostics, mode } = {}) {
      const root = document.createElement('div');
      root.className = 'student-status-card';

      const addHeading = (text, level = 'h3') => {
        const h = document.createElement(level);
        h.textContent = text;
        root.append(h);
      };

      const addParagraph = (text, className = '') => {
        const p = document.createElement('p');
        p.textContent = text;
        if (className) p.className = className;
        root.append(p);
        return p;
      };

      const modeText = (m) => ({
        connected: '연결됨',
        demo: '예제 자료',
        disconnected: '연결 없음',
        unknown: '확인 불가',
      })[m] || '';

      const modeStr = modeText(mode);
      if (modeStr) {
        addParagraph(`상태 모드: ${modeStr}`, 'student-mode-notice');
      }

      const deviceLabel = (status) => ({
        compliant: '보안 기준 충족(compliant)',
        noncompliant: '보안 기준 미충족(noncompliant)',
        unknown: '확인 불가(unknown)',
      })[status] || `확인 불가(${status ?? 'unknown'})`;

      const sessionLabel = (status) => ({
        active: '활성(active)',
        expired: '만료(expired)',
        revoked: '철회됨(revoked)',
        unknown: '확인 불가(unknown)',
      })[status] || `확인 불가(${status ?? 'unknown'})`;

      const resourceLabel = (res) => ({
        me: '로그인 정보',
        devices: '기기',
        sessions: '세션',
        events: '보안 기록',
        apps: '업무 앱',
        access: '접속 판정',
        diagnostics: '도움정보',
        vulnerabilities: '취약점 조회',
      })[res] || String(res ?? '알 수 없음');

      // 1) 등록 기기 상태 영역
      addHeading('등록 기기 상태');
      if (devices?.status === 'loading') {
        addParagraph('기기 목록을 불러오는 중입니다.', 'student-status-loading');
      } else if (devices?.status === 'error') {
        const msg = devices.error?.message || '기기 정보를 확인할 수 없습니다.';
        const isTimeout = devices.error?.code === 'REQUEST_TIMEOUT' || msg.includes('시간');
        const timeoutNotice = isTimeout ? ' (요청 처리 시간 초과)' : '';
        addParagraph(`기기 목록을 불러오지 못했습니다${timeoutNotice}: ${msg}`, 'student-status-error');
        addParagraph('다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요.', 'student-retry-notice');
      } else if (devices?.status === 'ok') {
        const list = Array.isArray(devices.data) ? devices.data : [];
        if (list.length === 0) {
          addParagraph('등록된 기기가 없습니다.', 'student-status-empty');
        } else {
          const ul = document.createElement('ul');
          ul.className = 'student-devices-list';
          for (const d of list) {
            const li = document.createElement('li');
            li.textContent = `${d.label || d.id || '확인 불가'} (ID: ${d.id ?? '확인 불가'}) · ${deviceLabel(d.status)}`;
            ul.append(li);
          }
          root.append(ul);
        }
      } else {
        addParagraph('기기 상태를 확인할 수 없습니다.', 'student-status-empty');
      }

      // 2) 현재 세션 상태 영역
      addHeading('현재 세션 상태');
      addParagraph('세션은 지금 연결 하나만 옵니다. (과거 세션 목록이 아닙니다)', 'student-session-scope-note');
      if (sessions?.status === 'loading') {
        addParagraph('세션 정보를 불러오는 중입니다.', 'student-status-loading');
      } else if (sessions?.status === 'error') {
        const msg = sessions.error?.message || '세션 정보를 확인할 수 없습니다.';
        const isTimeout = sessions.error?.code === 'REQUEST_TIMEOUT' || msg.includes('시간');
        const timeoutNotice = isTimeout ? ' (요청 처리 시간 초과)' : '';
        addParagraph(`세션 정보를 불러오지 못했습니다${timeoutNotice}: ${msg}`, 'student-status-error');
        addParagraph('다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요.', 'student-retry-notice');
      } else if (sessions?.status === 'ok') {
        const list = Array.isArray(sessions.data) ? sessions.data : [];
        if (list.length === 0) {
          addParagraph('현재 연결된 세션이 없습니다.', 'student-status-empty');
        } else {
          const ul = document.createElement('ul');
          ul.className = 'student-sessions-list';
          for (const s of list) {
            const li = document.createElement('li');
            li.textContent = `세션 ID: ${s.id ?? '확인 불가'} · 상태: ${sessionLabel(s.status)}`;
            ul.append(li);
          }
          root.append(ul);
        }
      } else {
        addParagraph('세션 상태를 확인할 수 없습니다.', 'student-status-empty');
      }

      // 3) 알림 영역 (notifications)
      addHeading('보안 알림');
      const notifs = Array.isArray(notifications) ? notifications : [];
      if (notifs.length === 0) {
        addParagraph('주의할 알림이 없습니다.', 'student-status-empty');
      } else {
        const ul = document.createElement('ul');
        ul.className = 'student-notifications-list';
        for (const n of notifs) {
          const li = document.createElement('li');
          const res = resourceLabel(n.resource);
          const code = String(n.code ?? 'UNKNOWN');
          const msg = String(n.message ?? '');
          li.textContent = `[${res}] (${code}) ${msg}`;
          ul.append(li);
        }
        root.append(ul);
      }

      // 4) 진단 정보 및 도움정보 복사 영역 (diagnostics)
      addHeading('진단 정보');
      addParagraph('이 정보는 문제 발생 시 원인을 파악하고 도움을 요청하기 위해 쓰도록 복사하는 안전한 점검 결과입니다.', 'student-diag-guide');

      let safeDiagData = null;
      if (diagnostics?.status === 'loading') {
        addParagraph('진단 정보를 불러오는 중입니다.', 'student-status-loading');
      } else if (diagnostics?.status === 'error') {
        addParagraph(`진단 정보를 불러오지 못했습니다: ${diagnostics.error?.message || '확인 불가'}`, 'student-status-error');
      } else if (diagnostics?.status === 'ok' && diagnostics.data) {
        const d = diagnostics.data;
        safeDiagData = {
          requestId: String(d.requestId ?? '확인 불가'),
          component: String(d.component ?? 'on-client'),
          version: String(d.version ?? '0.1.0'),
          checkedAt: String(d.checkedAt ?? new Date().toISOString()),
          engine: {
            mode: String(d.engine?.mode ?? 'unknown'),
            code: String(d.engine?.code ?? 'unknown'),
          },
        };

        const dl = document.createElement('dl');
        dl.className = 'student-diag-details';

        const addDiagRow = (termText, descText) => {
          const dt = document.createElement('dt');
          dt.textContent = termText;
          const dd = document.createElement('dd');
          dd.textContent = descText;
          dl.append(dt, dd);
        };

        addDiagRow('요청 ID (requestId)', safeDiagData.requestId);
        addDiagRow('구성 요소 (component)', safeDiagData.component);
        addDiagRow('버전 (version)', safeDiagData.version);
        addDiagRow('확인 시각 (checkedAt)', safeDiagData.checkedAt);
        addDiagRow('엔진 모드 (engine.mode)', safeDiagData.engine.mode);
        addDiagRow('엔진 코드 (engine.code)', safeDiagData.engine.code);
        root.append(dl);
      } else {
        addParagraph('도움정보 조회 전입니다. 위쪽 제공 영역의 「도움정보 불러오기」를 누르면 점검 결과가 전달됩니다.', 'student-status-empty');
      }

      // 정확한 이름 「도움정보 복사」 버튼 생성
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.textContent = '도움정보 복사';
      copyBtn.setAttribute('aria-label', '도움정보 복사');

      const copyStatus = document.createElement('span');
      copyStatus.className = 'student-copy-status';
      copyStatus.setAttribute('role', 'status');

      copyBtn.addEventListener('click', async () => {
        const textToCopy = safeDiagData
          ? JSON.stringify(safeDiagData, null, 2)
          : JSON.stringify({
              mode: modeStr || 'unknown',
              note: '현재 진단 결과가 로드되지 않았습니다.',
              checkedAt: new Date().toISOString(),
            }, null, 2);

        try {
          if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(textToCopy);
            copyStatus.textContent = ' (도움정보가 클립보드에 복사되었습니다.)';
          } else {
            copyStatus.textContent = ' (클립보드 API를 지원하지 않습니다.)';
          }
        } catch {
          copyStatus.textContent = ' (복사에 실패했습니다. 권한을 확인하세요.)';
        }
      });

      const btnWrapper = document.createElement('div');
      btnWrapper.className = 'student-diag-actions';
      btnWrapper.append(copyBtn, copyStatus);
      root.append(btnWrapper);

      return root;
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection({ status, mode, data, error, checkedAt, explanationAccepted } = {}) {
      const root = document.createElement('div');
      root.className = 'student-ai-connection-card';
      root.dataset.studentAiConnection = String(status ?? 'idle');

      const addParagraph = (text, className) => {
        const p = document.createElement('p');
        p.textContent = text;
        if (className) p.className = className;
        root.append(p);
        return p;
      };

      // 1) idle / loading 상태 처리
      if (!status || status === 'idle') {
        addParagraph('AI 연결 점검 전', 'student-ai-status-idle');
        addParagraph('설정값 존재는 이용 권한 확인이 아닙니다. 상단 점검 버튼을 직접 눌러 점검하세요.', 'student-ai-guide');
        return root;
      }

      if (status === 'loading') {
        addParagraph('AI 연결 점검 중', 'student-ai-status-loading');
        addParagraph('현재 로그인으로 AI 모델 응답을 점검하는 중입니다…', 'student-ai-guide');
        return root;
      }

      // 2) ok 상태 처리
      if (status === 'ok') {
        const auth = data?.audienceAuthorization;
        if ((auth !== 'test' && auth !== 'verified') || !Number.isInteger(data?.modelCount)) {
          addParagraph('AI 연결 점검 결과를 확인할 수 없습니다', 'student-ai-status-unverified');
          addParagraph('점검 종류(test/verified) 또는 모델 수가 계약과 다릅니다. 연결 완료로 보지 말고 상단 버튼으로 직접 다시 점검하세요.', 'student-ai-guide');
          return root;
        }
        const authLabel = auth === 'test'
          ? '시험 연결 점검(test)'
          : auth === 'verified'
            ? '앱 권한 확인 후 점검(verified)'
            : '확인 불가';

        const head = document.createElement('h3');
        head.textContent = authLabel;
        root.append(head);

        if (mode === 'demo') {
          addParagraph('예제 응답(demo) · 실제 게이트 수용 아님', 'student-ai-tag-demo');
        }

        const dl = document.createElement('dl');
        dl.className = 'student-ai-connection-details';

        const addRow = (label, val) => {
          const dt = document.createElement('dt');
          dt.textContent = label;
          const dd = document.createElement('dd');
          dd.textContent = String(val);
          dl.append(dt, dd);
        };

        addRow('점검 종류 (audienceAuthorization)', authLabel);
        addRow('응답 모델 수 (modelCount)', data?.modelCount ?? '0');
        addRow('점검 시각 (checkedAt)', checkedAt ?? '시각 정보 없음');
        root.append(dl);

        // 핵심 안내: 연결만 점검했고 사건 설명은 아직 실행하지 않음
        const explainNotice = addParagraph(
          '사건 설명은 아직 실행하지 않았습니다. 모델 목록 응답은 연결 점검 결과일 뿐이며 사건 설명이 완료된 것이 아닙니다. 사건 설명은 보안 기록에서 별도로 확인하세요.',
          'student-ai-notice-unexecuted'
        );
        explainNotice.setAttribute('role', 'note');

        return root;
      }

      // 3) error 상태 처리 (안전한 error.code와 error.message 표기 및 원인별 안내)
      if (status === 'error') {
        const code = String(error?.code ?? 'AI_REQUEST_UNVERIFIED');
        const message = String(error?.message ?? 'AI 연결 상태를 확인할 수 없습니다.');

        const errHeading = document.createElement('h3');
        errHeading.textContent = `AI 연결 점검 실패: [${code}] ${message}`;
        root.append(errHeading);

        let guideText = '';
        if (code === 'ON_AI_PROVISIONING_PENDING' || code === 'ON_AI_TRANSPORT_PENDING') {
          guideText = '권한 준비 중: 담당자에게 계정 연결과 앱 권한 확인을 요청하세요. (학생 환경 설정 오류가 아닙니다)';
        } else if (code === 'WB_CLCO_AUTH_REQUIRED' || code === 'AUTH_REQUIRED' || code === 'UNAUTHORIZED') {
          guideText = '인증 실패: 계정 연결을 다시 확인하거나 담당자에게 확인을 요청하세요. (Workbench 열쇠나 원본 열쇠를 복사하지 마세요)';
        } else if (code === 'WB_CLCO_ACCESS_BLOCKED' || code === 'SUBJECT_SCOPE_UNVERIFIED' || code === 'FORBIDDEN' || code === 'ACCESS_DENIED') {
          guideText = '접근 제한: 계정 연결을 다시 확인하거나 담당자에게 확인을 요청하세요.';
        } else if (code === 'WB_CLCO_COHORT_BUDGET_EXHAUSTED' || code === 'WB_CLCO_LIMIT_REACHED' || code === 'LIMIT_EXCEEDED' || code === 'QUOTA_EXCEEDED') {
          guideText = '반 사용량·이용 한도: 담당자 확인을 요청하세요.';
        } else if (code === 'WB_CLCO_SESSION_CLOSED' || code === 'SESSION_CLOSED') {
          guideText = '이용 시간 아님: 이용 시간을 확인하세요.';
        } else if (['WB_CLCO_TIMEOUT', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT', 'TIMEOUT', 'WB_CLCO_RATE_LIMITED', 'WB_CLCO_NETWORK_ERROR', 'WB_CLCO_SERVER_UNAVAILABLE', 'NETWORK_ERROR'].includes(code)) {
          guideText = '요청 제한·시간 초과·네트워크: 잠시 뒤 직접 다시 점검하세요.';
        } else if (['WB_CLCO_CANCELLED', 'CANCELLED', 'REQUEST_CANCELLED'].includes(code)) {
          guideText = '취소: 취소됨. 이전 결과는 현재 결과가 아닙니다.';
        } else if (code === 'ON_AI_MODEL_LIST_EMPTY' || code === 'MODEL_NOT_CONFIGURED' || code === 'NO_MODELS') {
          guideText = '쓸 수 있는 모델 없음: 담당자에게 모델 허용 설정 확인을 요청하세요.';
        } else if (code === 'ON_AI_AUTHORIZATION_CHANGED') {
          guideText = '권한 변경 감지: AI 이용 권한 내용이 점검 도중 바뀌었습니다. 다시 점검하기 전에 담당자에게 현재 권한을 확인하세요.';
        } else {
          guideText = '권한 준비 중 또는 확인 불가: 담당자에게 계정 연결과 앱 권한 확인을 요청하세요.';
        }

        const guidePara = addParagraph(guideText, 'student-ai-error-guide');
        guidePara.setAttribute('role', 'alert');

        addParagraph('자동으로 다시 점검하지 않습니다. 다시 점검하려면 상단의 버튼을 직접 누르세요.', 'student-ai-retry-notice');
        return root;
      }

      addParagraph('알 수 없는 AI 연결 점검 상태입니다.', 'student-ai-status-unknown');
      return root;
    },
    renderExplanation({ event, explanation, checkedAt } = {}) {
      const root = document.createElement('div');
      root.className = 'student-explanation-card';

      const addParagraph = (text, className) => {
        const p = document.createElement('p');
        p.textContent = text;
        if (className) p.className = className;
        root.append(p);
        return p;
      };

      // 1) explanation.status가 error인 경우
      // event가 null이어도 안전한 오류 코드·메시지와 근거 부족 등 실패 이유를 먼저 표시
      if (explanation?.status === 'error') {
        const code = String(explanation.error?.code ?? 'AI_REQUEST_UNVERIFIED');
        const message = String(explanation.error?.message ?? 'AI 설명을 확인할 수 없습니다.');

        const errHeading = document.createElement('h3');
        errHeading.textContent = `AI 설명 실패: [${code}] ${message}`;
        root.append(errHeading);

        addParagraph('기록은 그대로입니다 (과제 실패가 아닙니다).', 'student-explanation-notice');
        addParagraph('AI 연결 상태 및 사건의 근거를 다시 확인하세요.', 'student-explanation-guide');
        return root;
      }

      // 2) 오류 없이 event가 null이거나 없는 경우: 보안 기록을 먼저 선택하도록 안내
      if (!event) {
        addParagraph('보안 기록에서 기록을 먼저 고르세요.', 'student-explanation-placeholder');
        return root;
      }

      // 3) explanation.status가 loading인 경우: 요청 중 안내
      if (explanation?.status === 'loading') {
        addParagraph('AI 설명을 요청하는 중입니다… (기록은 그대로 유지됩니다)', 'student-explanation-loading');
        return root;
      }

      // 4) explanation이 없거나 status가 ok가 아닌 대기 상태인 경우
      if (!explanation || explanation.status !== 'ok' || !explanation.data) {
        addParagraph('선택한 사건의 AI 설명 결과가 없습니다. 기록은 그대로 유지됩니다.', 'student-explanation-empty');
        return root;
      }

      const data = explanation.data;

      // 5) 이상 응답 검증: AI가 이미 실행했다고 답한 설명은 쓸 수 없음 (proposal_not_executed / executed_output_rejected)
      if (data.executed === true) {
        const alertHeading = document.createElement('h3');
        alertHeading.textContent = 'AI 설명 오류: 이미 실행된 것으로 표시된 설명';
        root.append(alertHeading);
        addParagraph('AI가 이미 실행했다고 답한 설명은 쓸 수 없습니다. 기록은 그대로 유지됩니다.', 'student-explanation-alert');
        return root;
      }

      // 6) 근거 대조 검증: event.evidence와 data.evidenceIds 대조 (insufficient_evidence / wrong_event_rejected / evidence_binding)
      const evidenceList = Array.isArray(event.evidence) ? event.evidence : [];
      const evidenceMap = new Map(evidenceList.map(e => [e.id, e.text]));
      const evidenceIds = Array.isArray(data.evidenceIds) ? data.evidenceIds : [];

      // 근거가 아예 없거나 인용한 근거가 없는 경우
      if (evidenceList.length === 0 || evidenceIds.length === 0) {
        const failHeading = document.createElement('h3');
        failHeading.textContent = 'AI 설명 불가: 근거 부족';
        root.append(failHeading);
        addParagraph('근거가 없는 사건은 설명할 수 없습니다 (근거 부족·입력 오류). 기록은 그대로 유지됩니다.', 'student-explanation-alert');
        return root;
      }

      // 인용한 근거 ID가 사건의 근거에 없는 경우
      const hasInvalidEvidence = evidenceIds.some(id => !evidenceMap.has(id));
      if (hasInvalidEvidence) {
        const mismatchHeading = document.createElement('h3');
        mismatchHeading.textContent = 'AI 설명 불가: 근거 불일치';
        root.append(mismatchHeading);
        addParagraph('해당 설명을 쓸 수 없습니다. 설명의 근거가 선택한 사건의 근거와 맞지 않습니다 (근거가 맞지 않음). 내용을 지어내지 않습니다.', 'student-explanation-alert');
        addParagraph('안전한 오류 코드: INVALID_EVIDENCE_BINDING · 기록은 그대로 유지됩니다.', 'student-explanation-guide');
        return root;
      }

      // proposals 내부의 evidenceIds 검증
      const proposals = Array.isArray(data.proposals) ? data.proposals : [];
      const hasInvalidProposalEvidence = proposals.some(p => Array.isArray(p.evidenceIds) && p.evidenceIds.some(id => !evidenceMap.has(id)));
      if (hasInvalidProposalEvidence) {
        const mismatchHeading = document.createElement('h3');
        mismatchHeading.textContent = 'AI 설명 불가: 제안 근거 불일치';
        root.append(mismatchHeading);
        addParagraph('조치 제안의 근거가 사건의 근거와 일치하지 않아 설명을 쓸 수 없습니다. 내용을 지어내지 않습니다.', 'student-explanation-alert');
        return root;
      }

      // 7) 모든 검증 통과: 성공 표식(data-student-explanation-event)을 바깥 요소에 event.id로 부착
      root.setAttribute('data-student-explanation-event', String(event.id));

      // 7-1) 사건 ID와 AI 설명 제목 및 요약
      const head = document.createElement('h3');
      head.textContent = `사건 ${event.id} AI 설명(참고용)`;
      root.append(head);

      addParagraph('AI 설명은 참고 정보이며 해석입니다. 사실 판단은 인용한 근거와 연동 시스템이 알려 준 상태를 기준으로 합니다.', 'student-explanation-subtext');

      addParagraph(String(data.summary ?? ''), 'student-explanation-summary');

      // 7-2) 인용한 근거 목록 (evidenceIds마다 "근거 ID — 근거 글")
      const evidenceHead = document.createElement('h4');
      evidenceHead.textContent = '인용한 근거 목록';
      root.append(evidenceHead);

      const evidenceUl = document.createElement('ul');
      evidenceUl.className = 'student-explanation-evidence-list';
      for (const refId of evidenceIds) {
        const li = document.createElement('li');
        const text = evidenceMap.get(refId) ?? '근거 본문 없음';
        li.textContent = `${refId} — ${text}`;
        evidenceUl.append(li);
      }
      root.append(evidenceUl);

      // 7-3) 규칙 목록 (event.rules 마다 "규칙 ID — 규칙 글")
      const rulesHead = document.createElement('h4');
      rulesHead.textContent = '적용 규칙 목록';
      root.append(rulesHead);

      const rulesList = Array.isArray(event.rules) ? event.rules : [];
      if (rulesList.length === 0) {
        addParagraph('적용된 규칙이 없습니다.', 'student-explanation-empty-rules');
      } else {
        const rulesUl = document.createElement('ul');
        rulesUl.className = 'student-explanation-rules-list';
        for (const rule of rulesList) {
          const li = document.createElement('li');
          li.textContent = `${rule.id} — ${rule.text}`;
          rulesUl.append(li);
        }
        root.append(rulesUl);
      }

      // 7-4) 확인 불가 상태 목록 (event.state에서 unknown인 항목 나열 / unknown_evidence)
      const stateHead = document.createElement('h4');
      stateHead.textContent = '확인되지 않은 현재 상태';
      root.append(stateHead);

      const stateLabels = { access: '접속', session: '세션', device: '기기' };
      const unknownStates = [];
      for (const [key, label] of Object.entries(stateLabels)) {
        if (event.state?.[key] === 'unknown') {
          unknownStates.push(`${label}: 확인 불가(unknown)`);
        }
      }

      if (unknownStates.length === 0) {
        addParagraph('확인 불가 상태: 없음', 'student-explanation-unknown-none');
      } else {
        const unknownUl = document.createElement('ul');
        unknownUl.className = 'student-explanation-unknown-list';
        for (const item of unknownStates) {
          const li = document.createElement('li');
          li.textContent = item;
          unknownUl.append(li);
        }
        root.append(unknownUl);
      }
      addParagraph('확인할 수 없는 상태(unknown)는 안전이나 정상으로 간주하지 않습니다.', 'student-explanation-subtext');

      // 7-5) 조치 제안 (proposals)
      const proposalHead = document.createElement('h4');
      proposalHead.textContent = '조치 제안';
      root.append(proposalHead);

      const supportedActions = Array.isArray(event.supportedActions) ? event.supportedActions : [];
      if (proposals.length === 0) {
        if (supportedActions.length === 0) {
          addParagraph('연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).', 'student-explanation-no-proposals');
        } else {
          addParagraph('AI가 제안한 조치가 없습니다.', 'student-explanation-no-proposals');
        }
        addParagraph('AI는 아무런 조치도 실행하지 않았습니다.', 'student-explanation-subtext');
      } else {
        const proposalsUl = document.createElement('ul');
        proposalsUl.className = 'student-explanation-proposals-list';
        for (const p of proposals) {
          const li = document.createElement('li');
          const pAction = document.createElement('p');
          const refEvidenceStr = Array.isArray(p.evidenceIds) && p.evidenceIds.length ? ` (근거: ${p.evidenceIds.join(', ')})` : '';
          pAction.textContent = `조치 제안: ${p.action} — 이유: ${p.reason}${refEvidenceStr}`;

          const pStatus = document.createElement('p');
          pStatus.className = 'student-explanation-proposal-status';
          pStatus.textContent = '사람 확인이 필요하며 실행되지 않았습니다(미실행). 설명·제안만으로 보안 조치가 자동 실행되지 않습니다.';

          li.append(pAction, pStatus);
          proposalsUl.append(li);
        }
        root.append(proposalsUl);
      }

      // 7-6) 점검 시각
      if (checkedAt) {
        addParagraph(`점검 시각: ${String(checkedAt)}`, 'student-explanation-time');
      }

      return root;
    },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
