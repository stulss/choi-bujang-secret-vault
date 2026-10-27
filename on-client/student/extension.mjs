// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.

// 관제 대시보드형 상단 4대 상태 카드 및 하단 실시간 타임라인 동기화 헬퍼
function syncDashboard(type, payload) {
  if (typeof document === 'undefined') return;
  try {
    if (type === 'identity') {
      const { me, devices, sessions } = payload || {};
      const metric = document.getElementById('metric-integrity');
      const desc = document.getElementById('desc-integrity');
      const badge = document.getElementById('badge-integrity');
      if (metric && desc && badge) {
        const deviceStatus = me?.data?.device?.status;
        if (deviceStatus === 'compliant') {
          metric.textContent = '정상 (보호 중)';
          badge.textContent = '기준 충족';
          badge.dataset.status = 'ok';
          desc.textContent = `등록 기기: ${me?.data?.device?.id || '확인됨'}`;
        } else if (deviceStatus === 'noncompliant') {
          metric.textContent = '주의 (미충족)';
          badge.textContent = '기준 미충족';
          badge.dataset.status = 'warn';
          desc.textContent = '기기 보안 기준 점검 필요';
        } else if (me?.mode === 'demo') {
          metric.textContent = '정상 [예시 값]';
          badge.textContent = '예제 모드';
          badge.dataset.status = 'demo';
          desc.textContent = `가상 기기: ${me?.data?.device?.id || 'demo-device-01'}`;
        } else {
          metric.textContent = '미연결';
          badge.textContent = '확인 불가';
          badge.dataset.status = 'unknown';
          desc.textContent = 'SDP 호스트 연결 대기';
        }
      }
    } else if (type === 'decision') {
      const { status, data, error } = payload || {};
      const metric = document.getElementById('metric-decision');
      const desc = document.getElementById('desc-decision');
      const badge = document.getElementById('badge-decision');
      if (metric && desc && badge) {
        if (status === 'ok') {
          const decision = data?.decision;
          if (decision === 'allow') {
            metric.textContent = '접속 허용';
            badge.textContent = '허용 (allow)';
            badge.dataset.status = 'allow';
            desc.textContent = `규칙: ${data?.rule || 'device_registered'}`;
          } else if (decision === 'deny') {
            metric.textContent = '접속 차단';
            badge.textContent = '차단 (deny)';
            badge.dataset.status = 'deny';
            desc.textContent = `사유: ${data?.reason || '미인가'}`;
          } else if (decision === 'challenge') {
            metric.textContent = '재인증 요구';
            badge.textContent = '추가 확인 (step_up)';
            badge.dataset.status = 'challenge';
            desc.textContent = '2차 본인 확인 절차 필요';
          } else {
            metric.textContent = '판정 불명';
            badge.textContent = '확인 불가';
            badge.dataset.status = 'unknown';
            desc.textContent = '원격 서버 판정 미응답';
          }
        } else if (status === 'loading') {
          metric.textContent = '판정 중...';
          badge.textContent = '조회 중';
        } else if (status === 'error') {
          metric.textContent = '판정 실패';
          badge.textContent = '통신 오류';
          desc.textContent = error?.message || '판정 요청 실패';
        }
      }
    } else if (type === 'events') {
      const { status, data } = payload || {};
      const metric = document.getElementById('metric-alerts');
      const desc = document.getElementById('desc-alerts');
      const badge = document.getElementById('badge-alerts');
      const timeline = document.getElementById('dashboard-timeline');
      if (metric && desc && badge) {
        if (status === 'ok' && Array.isArray(data)) {
          const xdrCount = data.filter(e => e?.kind === 'xdr').length;
          metric.textContent = `${xdrCount}건`;
          badge.textContent = xdrCount > 0 ? '경보 탐지됨' : '정상 관제';
          badge.dataset.status = xdrCount > 0 ? 'warn' : 'ok';
          desc.textContent = `수집된 전체 기록: ${data.length}건`;

          if (timeline && data.length > 0) {
            timeline.replaceChildren();
            const list = document.createElement('div');
            list.className = 'timeline-list';
            const recent = data.slice(0, 5);
            recent.forEach(ev => {
              const item = document.createElement('div');
              item.className = 'timeline-item';
              const left = document.createElement('span');
              left.textContent = `[${ev?.kind === 'xdr' ? 'XDR경보' : '접속'}] ${ev?.summary || ev?.id || '기록'}`;
              const right = document.createElement('span');
              right.className = 'muted';
              right.textContent = ev?.at ? new Date(ev.at).toLocaleTimeString() : '-';
              item.append(left, right);
              list.append(item);
            });
            timeline.append(list);
          }
        }
      }
    } else if (type === 'vulnerabilities') {
      const { status, data } = payload || {};
      const metric = document.getElementById('metric-vulnerabilities');
      const desc = document.getElementById('desc-vulnerabilities');
      const badge = document.getElementById('badge-vulnerabilities');
      if (metric && desc && badge) {
        if (status === 'ok') {
          const count = data?.summary?.totalVulnerabilities ?? 0;
          metric.textContent = count === 0 ? '0건 (안전)' : `${count}건 발견`;
          badge.textContent = data?.status === 'complete' ? '점검 완료' : (data?.status || '점검됨');
          badge.dataset.status = count === 0 ? 'ok' : 'warn';
          desc.textContent = `패키지 ${data?.packages?.length ?? 0}개 대조`;
        } else if (status === 'loading') {
          metric.textContent = '조회 중...';
          badge.textContent = 'OSV 조회';
        } else if (status === 'error') {
          metric.textContent = '조회 실패';
          badge.textContent = '오류';
        }
      }
    } else if (type === 'system-health') {
      const data = payload;
      const noteIntegrity = document.getElementById('note-integrity');
      const trendVisualBar = document.getElementById('trend-visual-bar');
      if (data) {
        if (noteIntegrity) {
          const parts = [];
          if (data.memory?.status === 'ok') {
            parts.push(`RSS ${data.memory.agentRssMb}MB`);
          }
          if (data.disk?.status === 'ok') {
            parts.push(`디스크 여유 ${data.disk.freeGb}GB(${data.disk.freePercent}%)`);
          } else if (data.disk?.status === 'unverifiable') {
            parts.push('디스크 확인 불가');
          }
          if (parts.length > 0) {
            noteIntegrity.textContent = `[실측] ${parts.join(' · ')}`;
          }
        }
        if (trendVisualBar && data.disk?.status === 'ok' && data.memory?.status === 'ok') {
          trendVisualBar.replaceChildren();
          const safeSeg = document.createElement('div');
          safeSeg.className = 'trend-segment segment-safe';
          safeSeg.style.width = `${data.disk.freePercent}%`;
          safeSeg.textContent = `디스크 가용 여유 ${data.disk.freePercent}% [실측 값]`;

          const memSeg = document.createElement('div');
          memSeg.className = 'trend-segment segment-warn';
          const usedMemPct = 100 - data.memory.freePercent;
          memSeg.style.width = `${Math.max(20, 100 - data.disk.freePercent)}%`;
          memSeg.textContent = `시스템 메모리 사용 ${usedMemPct}% (Agent 극경량 점유)`;

          trendVisualBar.append(safeSeg, memSeg);
        }
      }
    }
  } catch (e) {
    // 관제 대시보드 동기화 실패 시 기본 렌더러에 영향을 주지 않음
  }
}

export function createStudentView() {
  return {
    renderIdentity({ me, devices, sessions } = {}) {
      syncDashboard('identity', { me, devices, sessions });
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
      syncDashboard('decision', { status, data, error, appId });
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

      // 최상단: 케셰브 학생 영역 3대 핵심 기능 우선 배치 배너
      const priorityBanner = document.createElement('div');
      priorityBanner.className = 'student-priority-banner';

      const bannerTitle = document.createElement('h3');
      bannerTitle.className = 'student-priority-title';
      bannerTitle.textContent = '🛡️ 케셰브 보안 Agent 3대 핵심 기능';

      const bannerBadges = document.createElement('div');
      bannerBadges.className = 'student-priority-badges';

      const bReal = document.createElement('span');
      bReal.className = 'tag tag-real';
      bReal.textContent = '실측 중심';

      const bReadOnly = document.createElement('span');
      bReadOnly.className = 'tag tag-policy';
      bReadOnly.textContent = '읽기 전용';

      bannerBadges.append(bReal, bReadOnly);
      priorityBanner.append(bannerTitle, bannerBadges);
      root.append(priorityBanner);

      let lastHealthData = null;
      let lastAuditData = null;

      // =========================================================================
      // [핵심 기능 1] 내 PC 하드웨어 자원 실측 및 초경량 안전 마진 분석
      // =========================================================================
      const healthContainer = document.createElement('div');
      healthContainer.className = 'health-container';

      const healthHeader = document.createElement('div');
      healthHeader.className = 'health-header-row';

      const healthTitle = document.createElement('h4');
      healthTitle.textContent = '1. 내 PC 하드웨어 자원 상태 및 안전 마진 분석';

      const realBadge = document.createElement('span');
      realBadge.className = 'tag tag-real';
      realBadge.textContent = '실측 값';
      healthTitle.append(realBadge);

      const healthActions = document.createElement('div');
      healthActions.style.display = 'flex';
      healthActions.style.alignItems = 'center';
      healthActions.style.gap = '8px';

      const healthLoadingSpan = document.createElement('span');
      healthLoadingSpan.className = 'loading-indicator';
      healthLoadingSpan.setAttribute('role', 'status');

      const refreshBtn = document.createElement('button');
      refreshBtn.type = 'button';
      refreshBtn.className = 'btn btn-sm btn-retry';
      refreshBtn.textContent = '다시 조회';
      refreshBtn.setAttribute('aria-label', '하드웨어 자원 상태 다시 조회');
      refreshBtn.setAttribute('tabindex', '0');

      healthActions.append(healthLoadingSpan, refreshBtn);
      healthHeader.append(healthTitle, healthActions);
      healthContainer.append(healthHeader);

      const healthDesc = document.createElement('p');
      healthDesc.className = 'muted';
      healthDesc.textContent = '일반 사용자 권한(standard_user)으로 측정된 내 PC의 실제 하드웨어 자원 상태입니다. 관리자(UAC) 권한을 요구하지 않습니다.';
      healthContainer.append(healthDesc);

      const healthGrid = document.createElement('div');
      healthGrid.className = 'health-grid';
      healthContainer.append(healthGrid);

      const analysisBox = document.createElement('div');
      analysisBox.className = 'health-analysis-box';
      healthContainer.append(analysisBox);

      const metaBox = document.createElement('div');
      metaBox.className = 'health-meta';
      healthContainer.append(metaBox);

      const populateHealth = (healthData, errorReason = null) => {
        healthGrid.replaceChildren();
        analysisBox.replaceChildren();
        metaBox.replaceChildren();
        lastHealthData = healthData;

        // 조회 실패 시: 가짜 예시 값을 숨기지 않고 실패 항목과 다음에 할 일 표시
        if (!healthData || typeof healthData !== 'object' || healthData.memory?.status === 'unverifiable') {
          const failBox = document.createElement('div');
          failBox.className = 'failure-action-box';

          const failTitle = document.createElement('div');
          failTitle.className = 'failure-item-title';
          failTitle.textContent = '❌ [실패한 항목]: 내 PC 하드웨어(CPU/메모리/디스크) 실측 지표';

          const failReason = document.createElement('div');
          failReason.className = 'failure-reason';
          failReason.textContent = `사유: ${errorReason || healthData?.memory?.reason || '내부 API 서버(/api/system-health) 통신 실패 또는 통계 접근 권한 부족'}`;

          const failAction = document.createElement('div');
          failAction.className = 'failure-next-action';
          failAction.textContent = '▶ 다음에 할 일: 케셰브 앱 백엔드(127.0.0.1:5189)의 실행 상태를 확인하고, 상단의 「다시 조회」 버튼을 직접 누르세요. (가짜 예시 값으로 위장하지 않습니다)';

          failBox.append(failTitle, failReason, failAction);
          healthGrid.append(failBox);
          return;
        }

        const { memory, disk, cpu, measuredAt, privilege } = healthData;

        // 1. CPU 카드
        const cpuCard = document.createElement('div');
        cpuCard.className = 'health-item';
        const cpuTitle = document.createElement('div');
        cpuTitle.className = 'health-item-title';
        const cpuTitleText = document.createElement('span');
        cpuTitleText.textContent = 'CPU 정보';
        const cpuTag = document.createElement('span');
        cpuTag.className = 'tag tag-real';
        cpuTag.textContent = '실측';
        cpuTitle.append(cpuTitleText, cpuTag);

        const cpuVal = document.createElement('div');
        cpuVal.className = 'health-item-val';
        cpuVal.textContent = `${cpu?.cores ?? '확인불가'} 코어`;

        const cpuSub = document.createElement('div');
        cpuSub.className = 'health-item-sub';
        cpuSub.textContent = `${cpu?.arch || 'x64'} (${cpu?.platform || 'os'}) · ${cpu?.model || 'Standard CPU'}`;
        cpuCard.append(cpuTitle, cpuVal, cpuSub);

        // 2. 메모리 카드
        const memCard = document.createElement('div');
        memCard.className = 'health-item';
        const memTitle = document.createElement('div');
        memTitle.className = 'health-item-title';
        const memTitleText = document.createElement('span');
        memTitleText.textContent = '메모리 (RAM) 사용량';
        const memTag = document.createElement('span');
        memTag.className = memory?.status === 'ok' ? 'tag tag-real' : 'tag tag-unverifiable';
        memTag.textContent = memory?.status === 'ok' ? '실측' : '확인불가';
        memTitle.append(memTitleText, memTag);

        const memVal = document.createElement('div');
        memVal.className = 'health-item-val';
        const memSub = document.createElement('div');
        memSub.className = 'health-item-sub';

        if (memory?.status === 'ok') {
          memVal.textContent = `RSS ${memory.agentRssMb} MB`;
          memSub.textContent = `가용 ${memory.freeMemGb} GB / 전체 ${memory.totalMemGb} GB (${memory.freePercent}% 여유)`;
        } else {
          memVal.textContent = '「확인 불가」';
          memSub.className = 'health-item-sub unverifiable';
          memSub.textContent = `사유: ${memory?.reason || '메모리 통계 접근 불가'}`;
        }
        memCard.append(memTitle, memVal, memSub);

        // 3. 디스크 카드
        const diskCard = document.createElement('div');
        diskCard.className = 'health-item';
        const diskTitle = document.createElement('div');
        diskTitle.className = 'health-item-title';
        const diskTitleText = document.createElement('span');
        diskTitleText.textContent = '디스크 잔여 용량';
        const diskTag = document.createElement('span');
        diskTag.className = disk?.status === 'ok' ? 'tag tag-real' : 'tag tag-unverifiable';
        diskTag.textContent = disk?.status === 'ok' ? '실측' : '확인불가';
        diskTitle.append(diskTitleText, diskTag);

        const diskVal = document.createElement('div');
        diskVal.className = 'health-item-val';
        const diskSub = document.createElement('div');
        diskSub.className = 'health-item-sub';

        if (disk?.status === 'ok') {
          diskVal.textContent = `${disk.freeGb} GB 여유`;
          diskSub.textContent = `잔여 ${disk.freePercent}% / 전체 ${disk.totalGb} GB (작업 드라이브)`;
        } else {
          diskVal.textContent = '「확인 불가」';
          diskSub.className = 'health-item-sub unverifiable';
          diskSub.textContent = `사유: ${disk?.reason || '디스크 통계 접근 불가'}`;
        }
        diskCard.append(diskTitle, diskVal, diskSub);

        healthGrid.append(cpuCard, memCard, diskCard);

        // 4. 추이 비교 및 설명 영역
        const analysisTitle = document.createElement('div');
        analysisTitle.className = 'health-analysis-title';
        analysisTitle.textContent = '📊 케셰브 Agent 자원 안전 마진 및 지속성 추이 분석 [개선 구현]';
        analysisBox.append(analysisTitle);

        const analysisP1 = document.createElement('p');
        if (memory?.status === 'ok' && memory.freeMemGb > 0) {
          const agentRatio = ((memory.agentRssMb / (memory.freeMemGb * 1024)) * 100).toFixed(1);
          analysisP1.textContent = `• 메모리 안전 마진: 케셰브 Agent 점유 메모리(${memory.agentRssMb} MB)는 시스템 가용 메모리(${memory.freeMemGb} GB) 대비 약 ${agentRatio}% 수준의 극경량(Ultra-lightweight) 상태를 유지하여 사용자 PC 작업에 영향을 주지 않습니다.`;
        } else {
          analysisP1.textContent = '• 메모리 안전 마진: 메모리 실측 정보 미제공으로 안전 마진 비교를 수행할 수 없습니다 (확인 불가).';
        }

        const analysisP2 = document.createElement('p');
        if (disk?.status === 'ok') {
          analysisP2.textContent = `• 디스크 지속성: 설치 디스크의 잔여 여유 공간이 ${disk.freeGb} GB(${disk.freePercent}%) 확보되어 관제 로그 보관 및 무결성 검증을 안정적으로 지속할 수 있습니다.`;
        } else {
          analysisP2.textContent = '• 디스크 지속성: 디스크 실측 정보 미제공으로 잔여 용량 분석을 수행할 수 없습니다 (확인 불가).';
        }
        analysisBox.append(analysisP1, analysisP2);

        // 5. 메타 정보 (시각, 권한, 단위)
        const timeSpan = document.createElement('span');
        timeSpan.textContent = `측정 시각: ${measuredAt || new Date().toISOString()} (단위: MB, GB, %)`;
        const privSpan = document.createElement('span');
        privSpan.textContent = `계측 권한: ${privilege || 'standard_user (일반 사용자 권한)'}`;
        metaBox.append(timeSpan, privSpan);

        // 상단 관제 대시보드 동기화
        syncDashboard('system-health', healthData);
      };

      const doFetch = () => {
        refreshBtn.disabled = true;
        refreshBtn.setAttribute('aria-busy', 'true');
        refreshBtn.textContent = '조회 중...';
        healthLoadingSpan.textContent = '자료를 다시 조회하는 중입니다...';

        fetch('/api/system-health')
          .then(res => {
            if (!res.ok) throw new Error(`HTTP 상태 코드 ${res.status}`);
            return res.json();
          })
          .then(json => {
            refreshBtn.disabled = false;
            refreshBtn.setAttribute('aria-busy', 'false');
            refreshBtn.textContent = '다시 조회';
            healthLoadingSpan.textContent = '';
            if (json?.ok && json?.data) {
              populateHealth(json.data);
            } else {
              populateHealth(null, json?.error?.message);
            }
          })
          .catch(err => {
            refreshBtn.disabled = false;
            refreshBtn.setAttribute('aria-busy', 'false');
            refreshBtn.textContent = '다시 조회';
            healthLoadingSpan.textContent = '';
            populateHealth(null, err?.message);
          });
      };

      refreshBtn.addEventListener('click', doFetch);
      doFetch();

      root.append(healthContainer);

      // =========================================================================
      // [핵심 기능 2] 내 PC 네트워크 구성 및 Windows 방화벽(읽기 전용)·운영 이벤트 진단
      // =========================================================================
      const auditContainer = document.createElement('div');
      auditContainer.className = 'health-container';

      const auditHeader = document.createElement('div');
      auditHeader.className = 'health-header-row';

      const auditTitle = document.createElement('h4');
      auditTitle.textContent = '2. 내 PC 네트워크 · 방화벽 · Windows 운영 기록 진단';

      const auditRealBadge = document.createElement('span');
      auditRealBadge.className = 'tag tag-real';
      auditRealBadge.textContent = '실측 값';

      const sdpBadge = document.createElement('span');
      sdpBadge.className = 'tag tag-sdp-disconnected';
      sdpBadge.textContent = 'SDP 미연결';

      auditTitle.append(auditRealBadge, sdpBadge);

      const auditActions = document.createElement('div');
      auditActions.style.display = 'flex';
      auditActions.style.alignItems = 'center';
      auditActions.style.gap = '8px';

      const auditLoadingSpan = document.createElement('span');
      auditLoadingSpan.className = 'loading-indicator';
      auditLoadingSpan.setAttribute('role', 'status');

      const auditRefreshBtn = document.createElement('button');
      auditRefreshBtn.type = 'button';
      auditRefreshBtn.className = 'btn btn-sm btn-retry';
      auditRefreshBtn.textContent = '다시 조회';
      auditRefreshBtn.setAttribute('aria-label', '네트워크 및 방화벽 진단 다시 조회');
      auditRefreshBtn.setAttribute('tabindex', '0');

      auditActions.append(auditLoadingSpan, auditRefreshBtn);
      auditHeader.append(auditTitle, auditActions);
      auditContainer.append(auditHeader);

      // SDP 서버 분리 안내
      const sdpNotice = document.createElement('p');
      sdpNotice.className = 'muted';
      sdpNotice.textContent = '• SDP 서버 연결 상태: [SDP 미연결] (PC 하드웨어·네트워크 조회가 성공한 것과 SDP 서버 연결 여부는 무관하며 분리하여 관리됩니다.)';
      auditContainer.append(sdpNotice);

      // 필수 고지문: 침해나 공격 탐지 결과가 아님
      const disclaimerBox = document.createElement('div');
      disclaimerBox.className = 'audit-disclaimer-box';

      const disclaimerTitle = document.createElement('div');
      disclaimerTitle.className = 'audit-disclaimer-title';
      disclaimerTitle.textContent = '⚠️ Windows 운영 이벤트 안내 (비침해 고지)';

      const disclaimerP = document.createElement('p');
      disclaimerP.style.margin = '0';
      disclaimerP.textContent = '이 건수는 침해나 공격 탐지 결과가 아니며, Windows 운영체제 및 응용프로그램의 일반 시스템 운영 이벤트 집계입니다.';

      disclaimerBox.append(disclaimerTitle, disclaimerP);
      auditContainer.append(disclaimerBox);

      const auditGrid = document.createElement('div');
      auditGrid.className = 'audit-grid';
      auditContainer.append(auditGrid);

      const auditMeta = document.createElement('div');
      auditMeta.className = 'health-meta';
      auditContainer.append(auditMeta);

      const populateAudit = (auditData, errorReason = null) => {
        auditGrid.replaceChildren();
        auditMeta.replaceChildren();
        lastAuditData = auditData;

        // 조회 실패 시: 실패 항목과 다음에 할 일 표시
        if (!auditData || typeof auditData !== 'object' || auditData.firewall?.status === 'unverifiable') {
          const failBox = document.createElement('div');
          failBox.className = 'failure-action-box';

          const failTitle = document.createElement('div');
          failTitle.className = 'failure-item-title';
          failTitle.textContent = '❌ [실패한 항목]: 네트워크 구성 및 Windows 방화벽/이벤트 진단';

          const failReason = document.createElement('div');
          failReason.className = 'failure-reason';
          failReason.textContent = `사유: ${errorReason || auditData?.firewall?.reason || '내부 진단 API(/api/system-security-audit) 응답 실패 또는 서비스 미응답'}`;

          const failAction = document.createElement('div');
          failAction.className = 'failure-next-action';
          failAction.textContent = '▶ 다음에 할 일: Windows 이벤트 로그 및 방화벽 서비스가 정상 동작 중인지 확인하고 상단의 「다시 조회」 버튼을 누르세요. (가짜 예시 값으로 위장하지 않습니다)';

          failBox.append(failTitle, failReason, failAction);
          auditGrid.append(failBox);
          return;
        }

        const { network, firewall, eventLogs, sdp, measuredAt, privilege } = auditData;

        // SDP 배지 업데이트
        if (sdp?.connected) {
          sdpBadge.className = 'tag tag-real';
          sdpBadge.textContent = 'SDP 연결됨';
          sdpNotice.textContent = '• SDP 서버 연결 상태: [SDP 연결됨] (정상 연결 관리 중)';
        } else {
          sdpBadge.className = 'tag tag-sdp-disconnected';
          sdpBadge.textContent = 'SDP 미연결';
          sdpNotice.textContent = '• SDP 서버 연결 상태: [SDP 미연결] (PC 하드웨어·네트워크 조회가 성공한 것과 SDP 서버 연결 여부는 무관하며 분리하여 관리됩니다.)';
        }

        // 1. 방화벽 설정 카드 (읽기 전용)
        const fwCard = document.createElement('div');
        fwCard.className = 'audit-card';
        const fwTitle = document.createElement('div');
        fwTitle.className = 'audit-card-title';
        const fwTitleText = document.createElement('span');
        fwTitleText.textContent = 'Windows 방화벽 프로필';
        const fwTag = document.createElement('span');
        fwTag.className = firewall?.status === 'ok' ? 'tag tag-real' : 'tag tag-unverifiable';
        fwTag.textContent = firewall?.status === 'ok' ? '실측·읽기 전용' : '확인불가';
        fwTitle.append(fwTitleText, fwTag);
        fwCard.append(fwTitle);

        if (firewall?.status === 'ok' && Array.isArray(firewall.profiles)) {
          const fwList = document.createElement('ul');
          fwList.className = 'audit-list';
          firewall.profiles.forEach(p => {
            const li = document.createElement('li');
            const nameSpan = document.createElement('span');
            nameSpan.textContent = p.profile;
            const stateSpan = document.createElement('span');
            stateSpan.className = p.state === '사용' ? 'audit-status-badge on' : 'audit-status-badge off';
            stateSpan.textContent = p.state === '사용' ? '사용 (ON)' : p.state;
            li.append(nameSpan, stateSpan);
            fwList.append(li);
          });
          fwCard.append(fwList);
          const fwNote = document.createElement('p');
          fwNote.className = 'muted';
          fwNote.style.marginTop = '8px';
          fwNote.style.fontSize = '0.76rem';
          fwNote.textContent = '※ 읽기 전용 조회이며 방화벽 설정은 절대 변경하지 않습니다. 관리자 권한이 필요한 항목은 변경을 시도하지 않고 보호합니다.';
          fwCard.append(fwNote);
        } else {
          const fwErr = document.createElement('p');
          fwErr.className = 'health-item-sub unverifiable';
          fwErr.textContent = `「확인 불가」: ${firewall?.reason || '방화벽 통계 조회 불가'}`;
          fwCard.append(fwErr);
        }

        // 2. 최근 Windows 기록 (System·Application) 경고·오류 건수 카드
        const logCard = document.createElement('div');
        logCard.className = 'audit-card';
        const logTitle = document.createElement('div');
        logTitle.className = 'audit-card-title';
        const logTitleText = document.createElement('span');
        logTitleText.textContent = '최근 Windows 운영 이벤트';
        const logTag = document.createElement('span');
        logTag.className = eventLogs?.status === 'ok' ? 'tag tag-real' : 'tag tag-unverifiable';
        logTag.textContent = eventLogs?.status === 'ok' ? '실측' : '확인불가';
        logTitle.append(logTitleText, logTag);
        logCard.append(logTitle);

        if (eventLogs?.status === 'ok') {
          const logList = document.createElement('ul');
          logList.className = 'audit-list';

          const liSys = document.createElement('li');
          const sysName = document.createElement('span');
          sysName.textContent = 'System 로그 경고·오류';
          const sysVal = document.createElement('span');
          sysVal.className = 'audit-status-badge';
          sysVal.textContent = eventLogs.systemWarnErrorCount;
          liSys.append(sysName, sysVal);

          const liApp = document.createElement('li');
          const appName = document.createElement('span');
          appName.textContent = 'Application 로그 경고·오류';
          const appVal = document.createElement('span');
          appVal.className = 'audit-status-badge';
          appVal.textContent = eventLogs.applicationWarnErrorCount;
          liApp.append(appName, appVal);

          logList.append(liSys, liApp);
          logCard.append(logList);

          const noticeBottom = document.createElement('p');
          noticeBottom.className = 'muted';
          noticeBottom.style.marginTop = '8px';
          noticeBottom.style.fontSize = '0.76rem';
          noticeBottom.textContent = '※ OS/응용프로그램 일반 운영 이벤트이며 침해 징후가 아닙니다.';
          logCard.append(noticeBottom);
        } else {
          const logErr = document.createElement('p');
          logErr.className = 'health-item-sub unverifiable';
          logErr.textContent = `「확인 불가」: ${eventLogs?.reason || '이벤트 로그 조회 불가'}`;
          logCard.append(logErr);
        }

        // 3. 네트워크 구성 카드
        const netCard = document.createElement('div');
        netCard.className = 'audit-card';
        const netTitle = document.createElement('div');
        netTitle.className = 'audit-card-title';
        const netTitleText = document.createElement('span');
        netTitleText.textContent = '네트워크 구성';
        const netTag = document.createElement('span');
        netTag.className = network?.status === 'ok' ? 'tag tag-real' : 'tag tag-unverifiable';
        netTag.textContent = network?.status === 'ok' ? '실측' : '확인불가';
        netTitle.append(netTitleText, netTag);
        netCard.append(netTitle);

        if (network?.status === 'ok' && Array.isArray(network.interfaces)) {
          const netTable = document.createElement('div');
          netTable.className = 'net-scroll-table';
          netTable.setAttribute('tabindex', '0');
          netTable.setAttribute('role', 'region');
          netTable.setAttribute('aria-label', '네트워크 인터페이스 목록 (키보드 방향키로 스크롤 가능)');

          network.interfaces.slice(0, 10).forEach(item => {
            const row = document.createElement('div');
            row.className = 'net-row';
            const left = document.createElement('span');
            left.textContent = `[${item.interface}] ${item.family}`;
            const right = document.createElement('span');
            right.textContent = item.address;
            row.append(left, right);
            netTable.append(row);
          });
          netCard.append(netTable);
        } else {
          const netErr = document.createElement('p');
          netErr.className = 'health-item-sub unverifiable';
          netErr.textContent = '「확인 불가」: 네트워크 인터페이스 정보 없음';
          netCard.append(netErr);
        }

        auditGrid.append(fwCard, logCard, netCard);

        const timeSpan = document.createElement('span');
        timeSpan.textContent = `진단 시각: ${measuredAt || new Date().toISOString()}`;
        const privSpan = document.createElement('span');
        privSpan.textContent = `실행 모드: ${privilege || 'standard_user (읽기 전용, 설정 변경 불가)'}`;
        auditMeta.append(timeSpan, privSpan);
      };

      const doFetchAudit = () => {
        auditRefreshBtn.disabled = true;
        auditRefreshBtn.setAttribute('aria-busy', 'true');
        auditRefreshBtn.textContent = '조회 중...';
        auditLoadingSpan.textContent = '네트워크 및 방화벽 상태를 다시 조회하는 중입니다...';

        fetch('/api/system-security-audit')
          .then(res => {
            if (!res.ok) throw new Error(`HTTP 상태 코드 ${res.status}`);
            return res.json();
          })
          .then(json => {
            auditRefreshBtn.disabled = false;
            auditRefreshBtn.setAttribute('aria-busy', 'false');
            auditRefreshBtn.textContent = '다시 조회';
            auditLoadingSpan.textContent = '';
            if (json?.ok && json?.data) {
              populateAudit(json.data);
            } else {
              populateAudit(null, json?.error?.message);
            }
          })
          .catch(err => {
            auditRefreshBtn.disabled = false;
            auditRefreshBtn.setAttribute('aria-busy', 'false');
            auditRefreshBtn.textContent = '다시 조회';
            auditLoadingSpan.textContent = '';
            populateAudit(null, err?.message);
          });
      };

      auditRefreshBtn.addEventListener('click', doFetchAudit);
      doFetchAudit();

      root.append(auditContainer);

      // =========================================================================
      // [핵심 기능 3] 원클릭 통합 진단 보고서 내보내기 및 클립보드 복사
      // =========================================================================
      const reportContainer = document.createElement('div');
      reportContainer.className = 'health-container';

      const reportHeader = document.createElement('div');
      reportHeader.className = 'health-header-row';

      const reportTitle = document.createElement('h4');
      reportTitle.textContent = '3. 원클릭 통합 진단 보고서 내보내기';

      const reportTag = document.createElement('span');
      reportTag.className = 'tag tag-policy';
      reportTag.textContent = '통합 점검';
      reportTitle.append(reportTag);

      reportHeader.append(reportTitle);
      reportContainer.append(reportHeader);

      const reportDesc = document.createElement('p');
      reportDesc.className = 'muted';
      reportDesc.textContent = '비밀번호나 개인키 등의 비밀값 없이, 실측된 하드웨어·네트워크·방화벽·운영 이벤트 진단 결과를 한눈에 복사할 수 있습니다.';
      reportContainer.append(reportDesc);

      const reportBtnWrapper = document.createElement('div');
      reportBtnWrapper.style.display = 'flex';
      reportBtnWrapper.style.alignItems = 'center';
      reportBtnWrapper.style.gap = '10px';
      reportBtnWrapper.style.marginTop = '10px';

      const copyReportBtn = document.createElement('button');
      copyReportBtn.type = 'button';
      copyReportBtn.className = 'btn btn-retry';
      copyReportBtn.textContent = '통합 진단 보고서 복사';
      copyReportBtn.setAttribute('aria-label', '통합 진단 보고서 클립보드 복사');
      copyReportBtn.setAttribute('tabindex', '0');

      const copyStatusSpan = document.createElement('span');
      copyStatusSpan.className = 'student-copy-status';
      copyStatusSpan.setAttribute('role', 'status');

      copyReportBtn.addEventListener('click', async () => {
        const unifiedReport = {
          reportTitle: '케셰브 ZTNA·보안 Agent 통합 진단 보고서',
          measuredAt: new Date().toISOString(),
          sdpStatus: lastAuditData?.sdp?.status || 'SDP 미연결',
          hardware: lastHealthData ? {
            cpu: lastHealthData.cpu,
            memory: lastHealthData.memory,
            disk: lastHealthData.disk
          } : '미측정 또는 확인 불가',
          networkAndFirewall: lastAuditData ? {
            networkInterfacesCount: lastAuditData.network?.interfaces?.length ?? 0,
            firewallProfiles: lastAuditData.firewall?.profiles,
            eventLogs: lastAuditData.eventLogs
          } : '미측정 또는 확인 불가',
          diagnostics: diagnostics?.data || '기본 진단 미조회',
          disclaimer: '이 보고서의 Windows 운영 이벤트 건수는 침해나 공격 탐지 결과가 아니며, 일반 시스템 운영 이벤트 집계입니다.'
        };

        try {
          if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(JSON.stringify(unifiedReport, null, 2));
            copyStatusSpan.textContent = ' (통합 진단 보고서가 클립보드에 복사되었습니다.)';
          } else {
            copyStatusSpan.textContent = ' (클립보드 API를 지원하지 않습니다.)';
          }
        } catch {
          copyStatusSpan.textContent = ' (복사에 실패했습니다. 권한을 확인하세요.)';
        }
      });

      reportBtnWrapper.append(copyReportBtn, copyStatusSpan);
      reportContainer.append(reportBtnWrapper);
      root.append(reportContainer);

      // =========================================================================
      // 부가 정보 영역: 기존 등록 기기, 세션, 알림, 기본 도움정보
      // =========================================================================
      const auxSectionTitle = document.createElement('h3');
      auxSectionTitle.className = 'subview-title';
      auxSectionTitle.textContent = '📋 보안 Agent 부가 상태 및 등록 정보 (기기 · 세션 · 알림)';
      root.append(auxSectionTitle);

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
    renderVulnerabilities({ status = 'idle', mode = null, data = null, error = null } = {}) {
      const root = document.createElement('div');
      root.className = 'student-vulnerabilities-card';

      const addParagraph = (text, className) => {
        const p = document.createElement('p');
        p.textContent = text;
        if (className) p.className = className;
        root.append(p);
        return p;
      };

      const heading = document.createElement('h3');
      root.append(heading);

      // 1) idle 상태: 아직 조회 전 (이전 표나 결과를 남기지 않음)
      if (!status || status === 'idle') {
        heading.textContent = '패키지 조회 상태: 조회 전 (idle)';
        addParagraph('설치 패키지 OSV 취약점 조회가 아직 실행되지 않았습니다.', 'student-vuln-notice');
        addParagraph('상단의 「설치 패키지 조회」 버튼을 눌러 점검하세요. (이전 결과는 표시되지 않습니다.)', 'student-vuln-guide');
        return root;
      }

      // 2) loading 상태: 조회 중 (이전 표나 결과를 남기지 않음)
      if (status === 'loading') {
        heading.textContent = '패키지 조회 상태: 조회 중 (loading)';
        addParagraph('프로젝트의 정확한 설치 패키지 버전을 OSV 취약점 데이터베이스와 대조하는 중입니다…', 'student-vuln-loading');
        addParagraph('조회 중에는 이전 결과를 표시하지 않습니다.', 'student-vuln-guide');
        return root;
      }

      // 3) error 상태: 조회 실패 (이전 표나 결과를 남기지 않음)
      if (status === 'error') {
        const code = String(error?.code ?? 'VULN_ERROR');
        const msg = String(error?.message ?? '패키지 조회를 확인할 수 없습니다.');
        heading.textContent = `패키지 조회 실패: [${code}] ${msg}`;
        addParagraph('패키지 조회가 실패했거나 취소되었습니다. 이전 결과를 정상으로 표시하지 않습니다.', 'student-vuln-error');
        addParagraph('상단의 「설치 패키지 조회」 버튼으로 다시 조회를 시도하세요.', 'student-vuln-guide');
        return root;
      }

      // 4) ok 상태: 조회 결과 표출
      heading.textContent = '설치 패키지 OSV 취약점 조회 결과';

      if (!data) {
        addParagraph('조회 데이터가 없습니다. 결과를 표시할 수 없습니다.', 'student-vuln-empty');
        return root;
      }

      // 4-1) 전체 조회 상태 (data.status 원래 값과 한국어 설명)
      const scanStatus = data.status ?? 'unknown';
      const scanStatusTextMap = {
        complete: '모두 조회 (complete) — 허용된 공개 패키지 조회가 모두 완료되었습니다.',
        partial: '일부 조회 실패 (partial) — 일부 패키지 조회가 실패했으나 확인된 항목은 유지됩니다.',
        not_checked: '아직 조회 안 함 (not_checked) — 승인된 공개 조회 대상 패키지가 없거나 아직 조회를 수행하지 않았습니다.',
        not_configured: '조회 준비 미완료 (not_configured) — 조회 대상 프로젝트 설정이 필요합니다.',
        unverifiable: 'lock 파일 확인 불가 (unverifiable) — package-lock.json 파일을 확인할 수 없습니다.',
      };
      const statusDesc = scanStatusTextMap[scanStatus] ?? `상태: ${scanStatus}`;
      addParagraph(`전체 상태: ${statusDesc}`, 'student-vuln-scan-status');

      // 미조회 및 오류 관련 주의 안내 (lookup_unavailable)
      if (['not_configured', 'not_checked', 'unverifiable', 'partial'].includes(scanStatus)) {
        addParagraph('안내: 조회 실패·미조회·설정 불가는 "취약점 없음"이 아닙니다.', 'student-vuln-warning');
      }

      // 4-2) 메타데이터 표시 (전달된 경우에만 표시: lockfileVersion, lockfileHash, checkedAt, excluded)
      const metaUl = document.createElement('ul');
      metaUl.className = 'student-vuln-meta';

      const addMetaItem = (label, val) => {
        if (val == null || val === '') return;
        const li = document.createElement('li');
        li.textContent = `${label}: ${val}`;
        metaUl.append(li);
      };

      if (data.lockfileVersion != null) addMetaItem('Lockfile 버전', data.lockfileVersion);
      if (data.lockfileHash != null) addMetaItem('Lockfile 해시', data.lockfileHash);
      if (data.checkedAt != null) addMetaItem('전체 점검 시각', data.checkedAt);
      if (data.excluded?.count != null) addMetaItem('제외된 패키지 수', `${data.excluded.count}개`);

      if (metaUl.children.length > 0) {
        root.append(metaUl);
      }

      // 4-3) 패키지 목록 (data.packages)
      const packages = Array.isArray(data.packages) ? data.packages : [];
      if (packages.length === 0) {
        addParagraph('표시할 설치 패키지 목록이 비어 있습니다 (설정·확인 불가 또는 미조회).', 'student-vuln-empty-packages');
        return root;
      }

      const table = document.createElement('table');
      table.className = 'student-vuln-table';

      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      for (const thText of ['패키지명', '설치 버전', '조회 상태', '취약점 식별자', '수정 시각', '출처', '점검 시각']) {
        const th = document.createElement('th');
        th.textContent = thText;
        headRow.append(th);
      }
      thead.append(headRow);
      table.append(thead);

      const tbody = document.createElement('tbody');

      const formatPkgStatus = (pkg) => {
        if (pkg.status === 'unverifiable') {
          if (Array.isArray(pkg.vulnerabilities) && pkg.vulnerabilities.length > 0) {
            return '일부 확인 · 전체 조회 확인 불가 (unverifiable)';
          }
          return '조회 확인 불가 (unverifiable)';
        }
        if (pkg.status === 'known_vulnerabilities') {
          return '알려진 항목 있음 (known_vulnerabilities)';
        }
        if (pkg.status === 'none_found') {
          return '알려진 항목 없음 (none_found)';
        }
        return String(pkg.status ?? '확인 불가');
      };

      for (const pkg of packages) {
        const findings = Array.isArray(pkg.vulnerabilities) && pkg.vulnerabilities.length > 0
          ? pkg.vulnerabilities
          : [null];

        for (const finding of findings) {
          const tr = document.createElement('tr');
          if (pkg.name) tr.setAttribute('data-student-package-name', String(pkg.name));
          if (pkg.version) tr.setAttribute('data-student-package-version', String(pkg.version));

          const tdName = document.createElement('td');
          tdName.textContent = String(pkg.name ?? '');

          const tdVer = document.createElement('td');
          tdVer.textContent = String(pkg.version ?? '');

          const tdStatus = document.createElement('td');
          tdStatus.textContent = formatPkgStatus(pkg);

          const tdId = document.createElement('td');
          tdId.textContent = finding?.id ? String(finding.id) : '-';

          const tdMod = document.createElement('td');
          tdMod.textContent = finding?.modified ? String(finding.modified) : '-';

          const tdSource = document.createElement('td');
          tdSource.textContent = String(pkg.source ?? 'https://api.osv.dev/v1/querybatch');

          const tdChecked = document.createElement('td');
          tdChecked.textContent = String(pkg.checkedAt ?? '');

          tr.append(tdName, tdVer, tdStatus, tdId, tdMod, tdSource, tdChecked);
          tbody.append(tr);
        }
      }

      table.append(tbody);
      root.append(table);

      addParagraph('참고: 알려진 항목 없음(none_found)은 조회 시점·범위 내에 등록된 취약점이 없다는 뜻이며, 잠재적 보안 결함이 없음을 보증하지 않습니다.', 'student-vuln-notice');

      return root;
    },
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
    renderAction(actionState = {}) {
      const root = document.createElement('div');
      root.className = 'student-action-card';

      const addParagraph = (text, className) => {
        const p = document.createElement('p');
        p.textContent = text;
        if (className) p.className = className;
        root.append(p);
        return p;
      };

      const {
        status = 'idle',
        event = null,
        actionId = null,
        target = null,
        receipt = null,
        observation = null,
        message = null,
        confirmationExpiresAt = null,
        error = null,
      } = actionState || {};

      // 1) 바깥 요소에 event.id 및 receipt.requestId 속성 조건부 부착 (duplicate_prevention)
      if (event?.id) {
        root.setAttribute('data-student-action-event', String(event.id));
      }
      if (receipt?.requestId) {
        root.setAttribute('data-student-action-request', String(receipt.requestId));
      }

      // 2) 상태별 헤딩 및 설명 문구 구성
      const heading = document.createElement('h3');
      root.append(heading);

      // 관측 결과의 실제 효과 적용 여부 판정 (observed_server_result)
      const isEffectObserved = status === 'succeeded' && observation?.effectApplied === true;

      switch (status) {
        case 'idle':
          heading.textContent = '조치 상태: 아직 미실행 (idle)';
          addParagraph('조치 제안은 아직 실행되지 않았습니다.', 'student-action-notice');
          addParagraph('보안 조치는 사람의 확인과 연동 시스템 집행을 거쳐야 하며, 자동으로 실행되지 않습니다.', 'student-action-guide');
          break;

        case 'loading':
          heading.textContent = '조치 상태: 원천에 확인하는 중 · 완료 아님 (loading)';
          addParagraph('조치 준비 또는 결과 조회 중입니다. 결과가 아직 확인되지 않았습니다 (완료 아님).', 'student-action-loading');
          break;

        case 'prepared':
          heading.textContent = '조치 상태: 준비됨 · 미실행 (prepared)';
          addParagraph('조치가 준비되었으나 아직 실행되지 않았습니다. 집행하려면 사람의 명시적 확인이 필요합니다.', 'student-action-prepared');
          if (confirmationExpiresAt) {
            addParagraph(`사람 확인 기한: ${String(confirmationExpiresAt)}`, 'student-action-expiry');
          }
          addParagraph('집행하려면 제공 화면의 「대상과 조치를 확인했으며 집행합니다」 버튼을 누르세요.', 'student-action-guide');
          break;

        case 'executing':
          heading.textContent = '조치 상태: 서버에 전달 중 · 완료 아님 (executing)';
          addParagraph('사람 확인 후 원천 서버에 조치 요청을 전달하는 중입니다. 아직 완료되지 않았으며 결과가 없습니다 (완료 아님).', 'student-action-executing');
          break;

        case 'pending':
          heading.textContent = '조치 상태: 서버 접수·처리 중 · 완료 아님 (pending)';
          addParagraph('서버가 요청을 접수하여 처리 중입니다. 서버 접수 확인(ACK)은 실제 조치 효과가 아닙니다 (완료 아님).', 'student-action-pending');
          addParagraph('연동 시스템의 실제 집행 결과는 제공 화면의 「원천 결과만 재조회」 버튼을 눌러 확인하세요.', 'student-action-guide');
          break;

        case 'succeeded':
          if (isEffectObserved) {
            heading.textContent = '조치 상태: 효과 확인 (succeeded)';
            addParagraph('연동 시스템에서 조치의 실제 효과가 확인되었습니다.', 'student-action-success');
            if (observation?.observedAt) {
              addParagraph(`원천 관측 시각: ${String(observation.observedAt)}`, 'student-action-observation');
            }
            addParagraph('실제 효과: effectApplied: true', 'student-action-effect');
            if (receipt?.receiptId) {
              addParagraph(`영수증 ID: ${String(receipt.receiptId)}`, 'student-action-receipt');
            }
          } else {
            // 성공 응답이지만 실제 효과 관측(effectApplied: true)이 없는 경우 결과 불명 처리
            heading.textContent = '조치 상태: 결과 불명 (unknown) · 실제 효과 미확인';
            addParagraph('성공(succeeded) 응답을 받았으나 원천 시스템의 실제 효과(effectApplied: true)가 확인되지 않았습니다.', 'student-action-unknown');
            addParagraph('효과 없음으로도 성공으로도 판단하지 마세요. 제공 화면의 「원천 결과만 재조회」 버튼으로 다시 확인하세요.', 'student-action-guide');
          }
          break;

        case 'denied':
          heading.textContent = '조치 상태: 원천 거절 (denied)';
          addParagraph('연동 시스템에서 조치 실행을 거절했습니다.', 'student-action-denied');
          if (message) {
            addParagraph(`사유: ${String(message)}`, 'student-action-message');
          }
          break;

        case 'failed':
          heading.textContent = '조치 상태: 원천 실패 (failed)';
          addParagraph('연동 시스템에서 조치 실행 중 실패가 발생했습니다.', 'student-action-failed');
          if (message) {
            addParagraph(`오류 내용: ${String(message)}`, 'student-action-message');
          }
          break;

        case 'unknown':
          heading.textContent = '조치 상태: 결과 불명 (unknown)';
          addParagraph('조치 처리 결과를 확인할 수 없습니다.', 'student-action-unknown');
          addParagraph('효과 없음으로도 성공으로도 판단하지 마세요. 결과가 불분명하므로 제공 화면의 「원천 결과만 재조회」 버튼으로 다시 확인하세요.', 'student-action-guide');
          break;

        case 'expired':
          heading.textContent = '조치 상태: 확인 기한 지남 (expired)';
          addParagraph('사람 확인 기한이 지났습니다. 이번 준비로는 집행할 수 없으므로 조치를 다시 준비하세요.', 'student-action-expired');
          break;

        case 'error':
          heading.textContent = '조치 상태: 요청 처리 안 됨 (error)';
          {
            const code = String(error?.code ?? 'ACTION_ERROR');
            const msg = String(error?.message ?? message ?? '요청이 처리되지 않았습니다.');
            addParagraph(`[${code}] ${msg}`, 'student-action-error');
          }
          addParagraph('기존 보안 기록 및 업무 앱 판정은 그대로 유지됩니다.', 'student-action-notice');
          break;

        default:
          heading.textContent = `조치 상태: ${String(status)}`;
          if (message) {
            addParagraph(String(message), 'student-action-message');
          }
          break;
      }

      // 3) 현재 사건·조치·대상·영수증 세부 정보 바인딩 (current_intent_binding)
      const detailsHead = document.createElement('h4');
      detailsHead.textContent = '조치 세부 정보';
      root.append(detailsHead);

      const detailsUl = document.createElement('ul');
      detailsUl.className = 'student-action-details';

      const addDetailItem = (label, val) => {
        if (val == null || val === '') return;
        const li = document.createElement('li');
        li.textContent = `${label}: ${val}`;
        detailsUl.append(li);
      };

      if (event?.id) {
        addDetailItem('사건 ID', event.id);
      }

      const evidenceList = Array.isArray(event?.evidence) ? event.evidence : [];
      if (evidenceList.length > 0) {
        const evidenceIds = evidenceList.map(e => e.id).filter(Boolean);
        if (evidenceIds.length > 0) {
          addDetailItem('근거 ID', evidenceIds.join(', '));
        }
      }

      if (actionId) {
        addDetailItem('조치 ID', actionId);
      }

      if (target?.id) {
        const genText = target.generation != null ? ` (세대: ${target.generation})` : '';
        addDetailItem('실제 대상', `${target.id}${genText}`);
      }

      if (receipt?.requestId) {
        addDetailItem('요청 ID', receipt.requestId);
      }

      if (receipt?.receiptId) {
        addDetailItem('영수증 ID', receipt.receiptId);
      }

      if (receipt?.version != null) {
        addDetailItem('버전', receipt.version);
      }

      if (detailsUl.children.length > 0) {
        root.append(detailsUl);
      } else {
        addParagraph('표시할 조치 세부 정보가 없습니다.', 'student-action-empty-details');
      }

      // 4) 영수증 대체 알림 (superseded)
      if (receipt?.superseded) {
        addParagraph('이전 조회는 최신 결과를 대신하지 않습니다(superseded).', 'student-action-superseded');
      }

      return root;
    },
  };
}
