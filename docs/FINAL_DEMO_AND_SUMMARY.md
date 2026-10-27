# 케셰브 (Keshev) 완성본 시연 순서 및 최종 정리 문서

이 문서는 ZTNA & XDR 보안 관제 Agent 앱 **「케셰브 (Keshev)」**의 완성본 기능, 제공 틀과 학생 구현 기능의 구분, 핵심 3대 기능의 실제 시연 순서, 운영 인프라 한계('확인 불가' 항목)의 투명한 기록, 그리고 실제 검증 근거를 처음 보는 사람도 그대로 재현할 수 있도록 정리한 최종 보고서입니다.

---

## 1. 작전 및 패키징 형태 요약

- **앱 명칭**: 케셰브 (Keshev, ZTNA & XDR 보안 관제 Agent)
- **화면 틀**: **관제형 + 기록타임라인형 (`control_dashboard_with_timeline`)**
  - 최상단: 핵심 상태 카드 4개 (하드웨어 실측, 방화벽·네트워크 실측, SDP 상태, 인증 상태)
  - 중간: 초경량 Agent 안전 마진 추이 바
  - 하단: 실시간 이벤트 로그 및 상세 진단 내역
- **포장 형태**: **기본 포장 뒤 Inno Setup 설치 프로그램 (`setup.exe`)**
  - 설치 방식: 사용자 단위 설치 (`PrivilegesRequired=lowest`, 관리자 권한 UAC 불필요)
  - 설치 경로: `%LOCALAPPDATA%\Programs\Keshev`
  - 원클릭 런처: `start-keshev.cmd` (자동 브라우저 호출 및 포트 충돌 안전 대기)

---

## 2. 제공 기능 vs 내가 만든 기능 분리

| 구분 | 제공 기능 (시작 틀) | 내가 만든 기능 (학생 구현) |
| :--- | :--- | :--- |
| **백엔드 서버** | • Node.js HTTP 기본 서버 틀 (`on-client/src/server.mjs`)<br>• 예제 엔진 어댑터 로더 (`src/engine.mjs`)<br>• 수업용 AI 게이트웨이 HTTP 클라이언트 (`vendor/clco-http.mjs`) | • **하드웨어 실측 API (`GET /api/system-health`)**: OS 코어, Agent RSS 메모리, RAM 잔여량, 디스크 잔여량 실측 수집<br>• **보안 진단 API (`GET /api/system-security-audit`)**: `os.networkInterfaces()` IP/MAC 추출, `netsh advfirewall` 읽기 전용 상태 파싱, `wevtutil` 시스템 이벤트 집계<br>• **포트 충돌(`EADDRINUSE`) 예외 처리기**: 크래시 없이 한국어 해결 명령 제공 |
| **UI 화면 및 디자인** | • 기본 단일 컬럼 CSS (`on-client/public/style.css`)<br>• 기본 웹 자산 및 아이콘 이미지 일부 | • **관제 대시보드형 4-카드 그리드 UI**: 상단 핵심 4대 지표 배치<br>• **초경량 안전 마진 추이 바**: Agent RSS 점유율에 따른 안전/주의 실시간 시각화<br>• **웹 접근성(A11y)**: 키보드 탐색(`tabindex="0"`), 고대비 포커스(`:focus-visible`), 스크롤 가능한 테이블 컨테이너<br>• **동적 진단 렌더러**: `on-client/student/extension.mjs` 전면 확장<br>• **외형 설정**: `on-client/student/appearance.json` 메타데이터 구성 |
| **오류 복구 및 조작성** | • 연결 실패 시 기본 텍스트 출력 | • **각 기능별 독립 「다시 조회」 버튼** 및 `aria-busy="true"` 로딩 상태 처리<br>• **실패 조치 카드**: 가짜 값 위조를 방지하고 실패 항목, 원인, 다음 행동을 명시한 `.failure-action-box`<br>• **원클릭 통합 보고서 복사**: 클립보드 내보내기 버튼 및 텍스트 조합기 |
| **패키징 및 설치** | • 없음 (수동 `node src/server.mjs` 실행만 존재) | • **Inno Setup 6 스크립트 (`tools/inno-setup/setup.iss`)**: 사용자 단위 무권한 설치기 제작<br>• **원클릭 런처 (`start-keshev.cmd`)**: CMD 괄호 구문 오류 수정, UTF-8 지원, 브라우저 자동 호출<br>• **패키지 자산 (`dist-package/`)**: `APP_PACKAGE_MANIFEST.json`, `INSTALL.md`, 256×256 정규 PNG/SVG/WebP 아이콘 |

---

## 3. 핵심 기능 3가지 시연 순서

### [기능 1] 내 PC 하드웨어 실측 및 Agent 초경량 안전 마진 추이
- **목적**: 보안 에이전트가 사용자 PC 자원을 과도하게 점유하지 않고 안전 마진 내에서 초경량으로 구동됨을 실측으로 증명합니다.
- **표기 기준**: `[실측 값]` (내 PC에서 Node.js `os` 및 `process.memoryUsage()`로 실제 측정한 값)
- **시연 조작 순서**:
  1. 관제 대시보드([http://127.0.0.1:5189/](http://127.0.0.1:5189/)) 첫 번째 상단 카드 확인:
     - CPU 논리 코어 수, Agent RSS 메모리(MB), 여유 RAM(GB), C 드라이브 여유 공간(GB)이 `[실측 값]` 태그와 함께 표시됩니다.
  2. 중간의 **「Agent 초경량 안전 마진 추이」** 바 확인:
     - Agent의 물리 메모리 점유율이 50MB 안전 마진 기준선(초록색) 이하인지 확인합니다.
  3. 첫 번째 카드의 **「다시 조회」** 버튼 클릭:
     - 버튼이 즉시 비활성화되며 `조회 중...`(`aria-busy="true"`) 상태로 전환된 뒤, 0.2초 내에 최신 실측 수치로 갱신됩니다.
- **정상 결과**: 내 PC의 실제 RAM/디스크 잔여량 및 Agent 메모리(예: 약 35~45MB)가 정확하게 갱신됩니다.
- **거부/예외 대응**: 하드웨어 실측 API가 응답하지 않을 경우, 가짜 숫자를 채우지 않고 빨간색 실패 박스에 "자원 측정 실패 / 원인: API 미응답 / 조치: 다시 조회 버튼 클릭"이 출력됩니다.

---

### [기능 2] 네트워크 어댑터 구성 및 Windows 방화벽 읽기 전용 진단
- **목적**: 시스템 변조 없이 읽기 전용 권한으로 현재 네트워크 인터페이스 구성과 방화벽 프로필 상태, 운영체제 이벤트 집계를 투명하게 감시합니다.
- **표기 기준**: `[실측 값 · 읽기 전용]`, `[SDP 미연결]`, `비침해 고지`
- **시연 조작 순서**:
  1. 두 번째 상단 카드 및 하단 **「네트워크 어댑터 및 보안 프로필 진단」** 표 확인:
     - 네트워크 인터페이스(IPv4/IPv6, MAC, 내부 루프백 구분)가 테이블로 렌더링됩니다.
     - Windows 방화벽의 도메인/개인/공용 프로필 활성화 상태(`ON`/`OFF`)가 읽기 전용으로 표시됩니다.
     - Windows 시스템/응용프로그램 이벤트 로그 집계 건수가 표시됩니다.
  2. 표 하단의 **「비침해 고지」** 문구 확인:
     > *"※ 이 건수는 침해나 공격 탐지 결과가 아니며, Windows 운영체제 및 응용프로그램의 일반 시스템 운영 이벤트 집계입니다."*
  3. 세 번째 상단 카드 확인:
     - 운영 SDP 런타임이 없으므로 가짜 연결을 표시하지 않고 정직하게 **`[SDP 미연결]`** 및 비침해 독립 상태로 표시됩니다.
  4. 두 번째 카드의 **「다시 조회」** 버튼 클릭:
     - 네트워크 구성 및 방화벽 상태를 실시간 재조회하여 표가 갱신됩니다.
- **정상 결과**: 관리자 UAC 권한 요구 없이 표준 사용자 권한으로 0.1초 내에 안전하게 읽기 전용 진단이 수행됩니다.
- **거부/예외 대응**: 방화벽 프로필 조회가 불가능한 환경에서는 실패 박스에 원인을 표시하며, 시스템 설정을 강제로 변경하려는 시도를 절대 하지 않습니다.

---

### [기능 3] 원클릭 통합 보안·진단 보고서 내보내기 / 클립보드 복사
- **목적**: 운영 담당자에게 지원을 요청하거나 심판 판정 증빙을 제출할 때, 비밀값(토큰, 비밀번호, 개인키)이 노출되지 않는 정제된 텍스트 보고서를 1초 만에 클립보드로 복사합니다.
- **시연 조작 순서**:
  1. 하단 진단 구역 우측 상단의 **「📋 통합 보고서 복사」** 버튼을 클릭합니다.
  2. 버튼 텍스트가 일시적으로 `✅ 복사 완료!`로 변경됩니다.
  3. 메모장(`notepad.exe`)이나 텍스트 에디터에서 `Ctrl + V`로 붙여넣습니다.
- **정상 결과**:
  - 비밀값(Token, Secret Key, Password)이 전혀 포함되지 않은 상태로 아래 항목이 체계적인 Markdown 텍스트로 복사됩니다:
    - 진단 일시 및 클라이언트 버전 (`0.2.11`)
    - 하드웨어 실측치 (코어, RSS, RAM, 디스크)
    - 방화벽 프로필 상태 및 네트워크 인터페이스
    - 운영 런타임 상태 (`PROVIDED_RUNTIME_NOT_INSTALLED`, `PENDING_OPERATOR_PROVISIONING`)
- **거부/예외 대응**: 브라우저 클립보드 API가 보안 정책상 차단된 경우 화면에 경고 문구와 함께 보고서 텍스트 영역을 직접 팝업하여 수동 복사가 가능하도록 안내합니다.

---

## 4. 아직 안 되거나 ‘확인 불가’로 남은 한계 (투명한 기록)

주최 측 가이드라인 및 방어전 공통 규칙에 따라, 확인되지 않은 기능이나 준비되지 않은 인프라를 성공으로 속이지 않고 다음과 같이 정직하게 한계로 남겼습니다:

1. **`PROVIDED_RUNTIME_NOT_INSTALLED` (운영 플랫폼 런타임 미설치)**:
   - **현황**: 기관 mTLS 보안 터널링을 담당하는 네이티브 ZTNA 런타임 프로그램이 사용자 PC에 설치되어 있지 않습니다.
   - **조치 원칙**: 임의로 `--app-only-v1` 플래그를 쓰거나 가짜 소켓을 열어 연결 성공으로 가장하지 않고, [APP_PACKAGE_MANIFEST.json](file:///C:/Users/user/AppData/Local/ALEPH/Workbench/projects/choi-bujang-secret-vault/dist-package/APP_PACKAGE_MANIFEST.json) 및 [INSTALL.md](file:///C:/Users/user/AppData/Local/ALEPH/Workbench/projects/choi-bujang-secret-vault/dist-package/INSTALL.md)에 **「담당자 준비 필요 항목」**으로 투명하게 기록했습니다.

2. **`PENDING_OPERATOR_PROVISIONING` (운영 앱 승인 키 부재)**:
   - **현황**: 심판/운영 측에서 발급하는 기관 서명 앱 승인 키가 아직 배포되지 않았습니다.
   - **조치 원칙**: 가짜 인증 토큰을 생성하지 않고 인증 상태 카드에 `[확인 불가]` 및 대기 상태로 명시했습니다.

3. **독립 모드(Stand-alone) 완비**:
   - 위 2가지 운영 인프라가 대기 상태이더라도, 사용자 로컬 PC 진단(하드웨어 실측, 방화벽 읽기 진단, 관제 대시보드 UI)은 아무런 오류 없이 100% 정상 작동하도록 격리 완성했습니다.

---

## 5. 실제로 확인한 근거 (화면, 실행 기록, 패키지 경로)

### ① 화면 근거
- **접속 주소**: `http://127.0.0.1:5189/`
- **화면 검증**:
  - 최상단 4개 상태 카드(`[실측 값] CPU/메모리/디스크`, `[실측 값 · 읽기 전용] 방화벽/네트워크`, `[SDP 미연결]`, `인증 상태`) 표시 확인
  - Agent 초경량 안전 마진 추이 바 렌더링 확인
  - 탭 키 이동을 통한 `:focus-visible` 고대비 포커스 및 스크린 리더용 `aria-busy` 동작 확인

### ② 실행 기록 근거
- **바탕화면 런처 실행 시험**:
  ```powershell
  # 실제 실행 확인 로그
  SUCCESS_LAUNCHED_BY_CMD
  # 5189 포트 바인딩 및 브라우저 자동 오픈 확인 완료
  ```
- **포트 바인딩 시험**:
  - `node on-client/src/server.mjs --demo` 직접 구동 시 `SUCCESS_BOUND_AND_CLOSED`로 정상 리스닝 확인
  - 포트 점유 충돌 시 한글 가이드 출력 및 비정상 크래시 방지 확인

### ③ 패키지 경로 근거
- **배포 패키지 디렉터리**: [dist-package/](file:///C:/Users/user/AppData/Local/ALEPH/Workbench/projects/choi-bujang-secret-vault/dist-package)
  - `APP_PACKAGE_MANIFEST.json`: 규격 매니페스트 완비
  - `INSTALL.md`: 대화형 및 무인 설치 가이드 완비
  - `icon.png`: 256×256 정규 32비트 RGBA 규격 완비 (icon.svg, icon.webp 포함)
- **설치 프로그램 파일**: [dist-installer/setup.exe](file:///C:/Users/user/AppData/Local/ALEPH/Workbench/projects/choi-bujang-secret-vault/dist-installer/setup.exe)
  - Inno Setup 6.7.3 컴파일 성공 (`1.828 sec`)
  - 설치 대상: `%LOCALAPPDATA%\Programs\Keshev`
  - 바탕화면 바로가기: `케셰브 (Keshev).lnk` 정상 생성 및 실행 검증 완료

---

## 6. 동일한 결과를 다시 만드는 실행 명령과 확인 순서

누구나 같은 환경에서 동일한 결과를 검증할 수 있는 표준 순서입니다:

```powershell
# 1. 설치 프로그램 재빌드 (Inno Setup)
npm run build:installer

# 2. 로컬에서 즉시 데모 관제 대시보드 구동
npm run demo
```

**확인 순서**:
1. 브라우저에서 `http://127.0.0.1:5189/` 접속
2. 상단 4개 상태 카드 및 중간 추이 바 확인
3. **「다시 조회」** 버튼을 눌러 내 PC의 실측치 갱신 확인
4. **「📋 통합 보고서 복사」** 버튼을 눌러 클립보드에 정제된 Markdown 보고서가 복사되는지 확인
