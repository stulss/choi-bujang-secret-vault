# 최부장의 비밀 금고 (BYTE BACK 방어전)

학생이 방어전 시작 틀(`ChoiTimo/aleph-defense-starter`)에서 출발해 1~12단계를 직접 만든 가상 자료실입니다. 메모는 모두 가상 자료이고, 실제 학생 자료·토큰·비밀키는 넣지 않습니다. 누가 무엇을 만들었는지는 바로 아래 표에 나눠 적었습니다.

## 누가 만든 것인가

| 구분 | 내용 | 위치 |
|---|---|---|
| **학생 몫** | 판정기 규칙 3개 (`device_registered`, `step_up_required`, `zone_partitioning`) | `src/decider.mjs` |
| **학생 몫** | 탐지 규칙 (10분 안 같은 사용자·기기의 GET 120건 초과 + 낯선 네트워크 → 회수 **제안**) | `src/detect.mjs` |
| **학생 몫** | 접속 앱 (설치형 웹앱 화면, 기기 승인·서명, 탈환 작전실 화면) | `public/index.html`, `public/sw.js`, `public/manifest.webmanifest`, `public/offline.html` |
| **학생 몫** | 자료실 서버 함수와 DB (로그인 중계, 메모, 공지, 복구, 기기 승인, 작전실 요약) | `api/*.js`, `src/verify-login.mjs`, `src/device-auth.mjs`, `src/note-owner.mjs`, `schema.sql` |
| **학생 몫** | 자기 점검 (제출 묶음·심판 runner·서버 점검 기록이 함께 쓰는 점검 목록과 그 서버 쪽 가상 입력) | `src/attack-check.mjs`, `src/checks.mjs`, `api/checks.js` |
| **학생 몫** | 정책 사본과 되돌리기 | `policy/`, `scripts/policy-restore.mjs` |
| **제공: ALEPH SDP 엔진** | 신원·기기·경로를 확인해 `aleph.decision.v1` 요청을 판정기에 전달하고 응답을 받는 엔진, 사건 전달, 접속 회수 집행과 경과 시간 측정, 심판 접수 | **이 저장소에 엔진 코드는 없습니다.** 계약만 `docs/DECIDER_REQUEST.md`(`student-kit/sdp-core/decision-contract.mjs` 설명)에 있고, 심판 접수 주소는 운영 측이 채운 `aleph.config.json`의 `judgeIssuer`입니다. |
| **제공: 시작 틀** (`ChoiTimo/aleph-defense-starter`) | 1단계 틀과 빌드, `src/decider.mjs`·`src/detect.mjs`의 출발 템플릿, 판정기 연습 도구 `scripts/decider-test.mjs`, 묶음 스크립트 `scripts/bundle.mjs`(12단계 runner 형식에 맞춰 학생이 고침), 보너스 연습 경보(`xdr/`), 배포 양식(`package/`) | 커밋 기록상 작성자 ChoiTimo (`0f9a3c9`, `de3cf4f`, `8fb5b6d`) |
| **제공 자료 (원 출처 미확인)** | 계약 문서 `docs/DECIDER_REQUEST.md`·`docs/DETECT_EVENTS.md`, 연습 도구 `scripts/detect-test.mjs`·`scripts/fixture-7.mjs` | 이 저장소에는 `chacha1650a`의 첫 커밋(`f14b7f7`, 2026-10-07)으로 들어왔습니다. 문서 본문은 ALEPH SDP 엔진의 계약(`student-kit/sdp-core`)을 설명하지만, 시작 틀에서 왔는지는 기록으로 확인하지 못했습니다. |
| **외부 서비스** | Supabase(로그인·DB), Vercel(배포) | 계정과 환경변수는 본인 것 |

`npm run decider:test`·`detect:test`·`fixture:7`과 이 저장소의 모든 로컬 시험은 **가상 요청 연습**입니다. ALEPH SDP 엔진이나 심판의 판정·회수 결과가 아닙니다. 접속 회수 API는 만들지 않았고, 탐지 규칙은 제안만 냅니다.

## 참고: 시작 틀 원문 — 학생이 하는 일: 세 걸음

이 절과 다음 절은 1단계 시작 틀의 안내 원문입니다. 지금 구현과 다를 수 있으며, 지금 동작은 아래 단계별 절과 「12단계」 절에 적었습니다.

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

배포가 끝나면 `/`에서 점령된 가상 자료실을 볼 수 있습니다. `/data.json`에는 같은 가상 메모가 공개됩니다. 이 공개 상태를 확인하는 것이 1단계의 출발점입니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 참고: 시작 틀 원문 — 자동 처리

`vercel.json`은 정적 결과물 `public`을 배포합니다. 빌드 명령 `npm run build`는 Vercel이 제공하는 GitHub 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증하고 `public/aleph.json`을 생성합니다. 이 값이 없으면 빌드가 실패하므로, 성공한 것처럼 빈 주소를 내보내지 않습니다. `aleph.json`의 내용만으로 저장소 소유권이나 방어 성공을 인정하지 않습니다. 심판이 공개 저장소의 실제 커밋과 배포된 자료를 따로 대조해야 합니다.

`aleph.config.json`의 `repoUrl`과 `publicAppUrl`은 이전 제출 묶음 방식의 자리표시자입니다. 1단계에서는 학생이 편집하지 않습니다. 2단계 이후 코딩 도구가 필요한 설정과 보호 기능을 단계별로 작성합니다. `npm run bundle`과 `bundle-notes.json`도 1단계의 세 걸음에는 포함되지 않습니다.

로컬에서 가상 화면만 확인할 때는 `npm run build -- --local`을 사용합니다. 로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다. 저장소의 `src/attack-check.mjs`는 실제 배포가 된 뒤 `/data.json`을 비로그인으로 요청해 공개 가상 메모의 확인 표시를 읽습니다.

## 2단계: 자료를 코드 밖으로 옮깁니다

- 정적 파일(`data.json`, `public/data.json`) 및 저장소 최신 버전에서 가상 메모 문장을 제거했습니다.
- 가상 메모는 외부 학습용 데이터베이스(Supabase)의 `notes` 테이블로 이전했습니다.
- 브라우저 메인 화면은 서버리스 함수 `/api/notes`를 호출하여 가상 메모 목록을 렌더링합니다.
- 서버 함수는 환경변수 `SUPABASE_URL`과 `SUPABASE_SECRET_KEY`를 서버 런타임에서만 읽으며 브라우저 파일, 응답 본문, 로그에 비밀키를 일체 노출하지 않습니다.

### 최신 파일 및 배포의 가상 메모 검색 확인 절차
1. **GitHub 최신 파일 검색**:
   - 최신 작업 트리 및 HEAD 커밋에서 이전 가상 메모 문장이 남아 있는지 검색합니다:
     ```bash
     git grep "실습용" HEAD
     ```
   - **확인 결과**: `data.json` 및 `public/data.json`에서 가상 메모 문장이 검색되지 않아야 하며, `notes: []` 상태여야 합니다.
2. **현재 Vercel 배포 정적 파일 확인**:
   - 브라우저 또는 curl로 최신 배포의 정적 파일을 직접 조회합니다:
     ```bash
     curl -s https://stulss-choi-bujang-secret-vault.vercel.app/data.json
     ```
   - **확인 결과**: `{"notes":[]}`가 반환되어 정적 파일에 가상 메모 문장 및 1단계 확인 표시(`SAMPLE_NOTE_1`)가 일체 노출되지 않아야 합니다.

### 2단계 취약점 및 관찰 포인트
- **과거 노출 미해소 (옛 공개 커밋·옛 배포 잔존)**:
  - 현재 최신 커밋과 최신 배포 파일에서는 메모가 제거되었으나, 1단계의 **옛 공개 커밋 이력(`git log`)**과 Vercel의 **과거 불변 배포 URL(Immutable Deployment Snapshot)**에는 여전히 가상 메모가 영구적으로 남아 있습니다.
  - 따라서 옛 공개 커밋과 옛 배포가 존재하는 한 **과거에 발생한 노출은 완전히 해소된 것이 아니며**, 일단 공개된 저장소·배포에 올라간 기록은 덮어쓰더라도 흔적이 남는다는 점을 인식해야 합니다.
- **공개 API의 남은 약점**:
  - 새로 추가된 서버 함수 `/api/notes`는 데이터베이스에서 자료를 안전하게 읽어오지만, 아직 호출자의 신원을 검증하거나 인가를 확인하는 검문소가 없는 **공개 주소**입니다.
  - 따라서 누구나 `https://stulss-choi-bujang-secret-vault.vercel.app/api/notes`를 직접 호출하면 가상 메모 4건을 그대로 응답받을 수 있는 약점이 여전히 남아 있으며, 이는 3단계 이후 신원 확인 및 ZTNA 검문소를 통해 보호해야 합니다.

## 3단계: 진짜 로그인을 붙입니다

- **Supabase Auth 이메일/비밀번호 로그인·로그아웃**: 브라우저 화면(`public/index.html`)에 공식 SDK 흐름을 사용하는 로그인/로그아웃 기능을 구현했습니다.
- **서버 토큰 검증**: Vercel 서버리스 함수(`/api/notes`)에서 `src/verify-login.mjs`의 `createLoginVerifier`를 사용하여 요청 헤더의 Bearer 토큰을 검증합니다.
- **비인가 요청 차단**: 토큰이 없거나 유효하지 않은 요청은 HTTP 401로 즉시 거부하며, 정상 로그인한 사용자만 자료 API를 사용할 수 있습니다.
- **메모 CRUD 기능**: 로그인한 사용자가 가상 메모를 추가(POST), 조회(GET), 수정(PUT), 삭제(DELETE)할 수 있는 API와 화면을 구현했습니다. 추가 시에는 서버가 확인한 사용자 ID가 `owner_id`로 저장됩니다.
- **설정 등록**: `aleph.config.json`에 `identityProvider` (발급자·대상·JWKS 주소) 및 `allowedRoutes` (실제 API 경로)를 등록했습니다.

## 4단계: 로그인해도 내 자료만 보이게 합니다

- **API 계층 소유자 검증 (인가 구현)**:
  - 서버리스 함수(`/api/notes`)에서 토큰 검증으로 확보한 사용자 ID(`verified.userId`)와 DB의 `owner_id`를 대조하여 본인 소유의 메모만 CRUD를 허용하도록 인가를 구현했습니다.
  - 목록 조회(`GET /api/notes`) 시 본인 소유(`owner_id = verified.userId`)의 메모만 반환합니다.
  - 타 사용자의 메모 단건 조회(`GET /api/notes/:id`), 수정(`PUT /api/notes/:id`), 삭제(`DELETE /api/notes/:id`) 시 존재 여부 자체를 보호하기 위해 심판 검증 기준에 맞춘 **HTTP 404 NOTE_NOT_FOUND**를 반환하여 엄격히 격리합니다.
  - 추가(`POST /api/notes`) 시 클라이언트가 전달한 `owner_id`를 신뢰하지 않고 검증된 사용자 ID로 강제 바인딩합니다.
- **데이터베이스 계층 최소 권한 및 RLS 적용**:
  - `public.notes` 테이블에 대해 `PUBLIC`, `anon`, `authenticated` 직접 접근 권한을 회수하고 RLS를 적용하여 다중 테넌트 간의 데이터 접근을 엄격히 차단했습니다.

## 5단계: 자료 요청을 서버 한곳으로 모읍니다

- **자료 요청 서버 일원화**: 브라우저 클라이언트가 원본 DB(PostgREST)에 직접 접근하지 않고 모든 가상 메모 조회·추가·수정·삭제를 서버리스 함수(`/api/notes`)를 통해서만 수행하도록 일원화했습니다.
- **원본 DB 직접 접근 권한 차단**: `public.notes` 테이블에 대해 `PUBLIC`, `anon`, `authenticated` 역할의 모든 직접 권한을 완전 회수(`REVOKE ALL ... FROM PUBLIC, anon, authenticated`)하여 외부에서 `anon` 키 또는 사용자 토큰으로 PostgREST API에 직접 접근하는 시도를 원천 차단했습니다.
- **원본 API 경로 설정**: `aleph.config.json`에 쿼리 없는 원본 자료 HTTPS 경로(`originalApiUrl: https://kolzruwueiachnjjkcya.supabase.co/rest/v1/notes`)를 등록했습니다. 심판의 직접 요청 시 HTTP 401(권한 거부)로 차단됨을 확인했습니다.
- **기존 인가 및 정상 동작 보존**: 서버 함수 내부에서는 서버 전용 키를 사용해 인증된 본인 메모의 CRUD 정상 동작과 소유자 인가를 완벽히 유지했습니다.

### 5단계 점검 항목 및 검증 절차
1. **브라우저의 서버 함수 단일 창구 호출 검증**:
   - 화면 소스코드(`public/index.html`, `public/app.js` 등)에서 Supabase PostgREST(`rest/v1`)를 직접 호출하는 코드가 일체 없으며, 메모 요청은 동일 호스트의 `/api/notes`로만 전달됨을 확인했습니다.
   - 브라우저 JS 번들 및 정적 파일에 서버 전용 키(`service_role`, `sb_secret_`, 개인키)가 포함되지 않음을 확인했습니다.
2. **A 정상 · B 거부 · 무로그인 확인 절차**:
   - **무로그인 거절**: 인증 헤더 없이 `GET /api/notes` 호출 시 HTTP 401 Unauthorized가 반환되며 자료가 유출되지 않음을 확인했습니다.
   - **A 계정 정상 동작**: A 사용자로 로그인한 후 메모 조회(GET), 추가(POST), 수정(PUT), 삭제(DELETE)가 정상 수행됨을 확인했습니다.
   - **B 계정 접근 격리**: B 사용자로 로그인한 후 A 사용자의 메모 ID로 직접 조회/수정/삭제를 시도할 경우 HTTP 404(`NOTE_NOT_FOUND`)로 거부되어 엄격한 소유자 인가가 유지됨을 확인했습니다.
3. **원본 자료 주소 직접 접근 차단 검증**:
   - 공개 키(`anon` 키) 및 임의 인증 헤더를 붙여 원본 자료 주소(`originalApiUrl: https://kolzruwueiachnjjkcya.supabase.co/rest/v1/notes`)로 직접 `GET`, `POST`, `PATCH`, `DELETE` 요청을 보냈을 때 `401 Unauthorized` 또는 `403 Forbidden` (`permission denied for table notes`)이 반환되며 가상 메모 데이터가 일체 반환되지 않음을 확인했습니다.
4. **학습용 메모 테이블 권한 회수 SQL 및 적용 전후 확인 방법 (BUILD 2)**:
   - **권한 회수 SQL**:
     ```sql
     REVOKE ALL ON TABLE public.notes FROM PUBLIC, anon, authenticated;
     ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
     ```
   - **확인 방법 1: `information_schema.role_table_grants`**:
     ```sql
     SELECT grantee, table_schema, table_name, privilege_type
     FROM information_schema.role_table_grants
     WHERE table_schema = 'public' AND table_name = 'notes';
     ```
     - 결과: `anon` 및 `authenticated` 역할에 대한 권한 행이 일체 조회되지 않음(권한 회수 확인).
   - **확인 방법 2: `has_table_privilege` 함수**:
     ```sql
     SELECT
       has_table_privilege('anon', 'public.notes', 'select') AS anon_select,
       has_table_privilege('anon', 'public.notes', 'insert') AS anon_insert,
       has_table_privilege('authenticated', 'public.notes', 'select') AS auth_select,
       has_table_privilege('authenticated', 'public.notes', 'insert') AS auth_insert;
     ```
     - 결과: `anon_select`, `anon_insert`, `auth_select`, `auth_insert` 모두 `false`로 반환되어 직접 접근 차단 확인.


## 6단계: 등록한 기기만 자료실에 들어옵니다

- **판정기 기기 등록 검증 규칙 구현 (`src/decider.mjs`)**:
  - ALEPH SDP 판정 계약(`aleph.decision.v1`)에 따라 전달된 `request.deviceRegistered` 값을 검증합니다.
  - 등록된 기기(`request.deviceRegistered === true`)의 요청만 `allow`(이유 코드: `approved`, 규칙: `device_registered`)로 허용합니다.
  - 미등록 기기이거나 값이 없는 요청은 `deny`(이유 코드: `device_not_registered`, 규칙: `device_registered`)로 즉시 거부합니다.
  - `RULE_IDS`에는 실제로 구현한 `device_registered` 규칙만 등록했습니다.

### 6단계 확인 순서
1. **판정기 검증 시험 실행**:
   ```bash
   npm run decider:test
   ```
2. **출력 결과 확인**:
   - `통과 · 등록 기기의 정상 요청` (등록 기기 요청이 allow로 승인됨)
   - `통과 · 미등록 기기의 가상 요청` (미등록 기기 요청이 deny / device_not_registered로 거부됨)
   - 별도의 클라이언트 접속 프로그램 설치는 필요하지 않으며, 미등록 기기를 통한 공격 시뮬레이션 및 실제 검증은 심판이 수행합니다.

## 7단계: 평소와 다른 접속은 다시 확인합니다

- **판정기 복합 이상 사건 검사 및 재인증 규칙 구현 (`src/decider.mjs`)**:
  - ALEPH SDP 계약(`aleph.decision.v1`)에 따라 엔진이 검증해 넘긴 신뢰 신호 출처(`signals.source: judge_fixture` 또는 `engine`)만 판정에 반영하고, 위조 가능한 클라이언트 헤더를 신뢰 정보로 승격하지 않습니다.
  - 평소와 다른 시각, 처음 보는 네트워크(`unusual`), 대량 자료 읽기 급증의 복합 사건 발생 시 `step_up`(이유 코드: `step_up_required`, 규칙: `step_up_required`)으로 추가 본인 확인을 요청합니다.
  - 지역(`region`) 단독만으로 영구 차단(`deny`)하지 않고, 복합 이상 징후를 판정하여 사유를 남기며 `step_up`으로 처리합니다.
  - 재인증이 완료된 요청(`request.stepUp.verified === true`, 900초 이내)은 정상 허용(`allow`, 이유 코드: `approved`)합니다.
  - 기존 6단계 등록 기기 검증 규칙(`device_registered`)은 보존되며, `RULE_IDS`에 `['device_registered', 'step_up_required']`를 등록했습니다.
- **재로그인 시각 확인 계약 점검 결과**:
  - 현재 엔진 계약(`docs/DECIDER_REQUEST.md`)에는 실제 계정의 재로그인 시각을 확인하는 별도 계약이 없으므로, 가상 사건 규칙만 시험하고 실제 자료 차단 실측은 안전하게 미실행으로 유지했습니다.

### 7단계 확인 순서
1. **가상 사건 픽스처 시험 실행**:
   ```bash
   npm run fixture:7
   ```
   - 정상 사건: `allow`
   - 복합 이상 사건: `step_up`
2. **판정기 규칙 통합 시험 실행**:
   ```bash
   npm run decider:test
   ```
   - `통과 · 등록 기기의 정상 요청` (allow)
   - `통과 · 미등록 기기의 가상 요청` (deny · device_not_registered)
   - `통과 · 복합 이상 접속` (step_up · step_up_required)
   - `통과 · 다시 확인한 복합 이상 접속` (allow)

## 8단계: 자료마다 갈 수 있는 구역을 나눕니다

- **판정기 구역 규칙 (`src/decider.mjs`, `zone_partitioning`)** — 엔진이 확인한 사용자(`subjectId`)·기기(`deviceRegistered`, `deviceId`)·메서드·정확한 경로만으로 판정합니다.
  - 메서드와 경로가 `aleph.config.json`의 허용 경로 10개 모양과 정확히 맞지 않으면 `deny`(`unknown_path`)입니다. PATCH, `/materials`, `/notes/:id/export`, `/notes/export`, `?action=` 요청이 여기에 해당합니다.
  - 공지(`/notices`)는 읽기만 허용합니다. 계약에 강사 역할 값이 없으므로 POST·PUT·DELETE는 `deny`(`instructor_notice_forbidden`)입니다.
  - 메모 ID에 주인이 드러나면(`owner_a_item`, `b-note-1`) 요청한 주체와 같을 때만 허용하고, 다르면 `deny`(`zone_owner_forbidden`)입니다. 주인 표시가 없는 ID(UUID 등)는 서버 API의 owner_id 대조가 막습니다.
  - 7단계 재인증을 마친 요청에도 구역 규칙을 그대로 적용합니다.
  - `RULE_IDS`: `['device_registered', 'step_up_required', 'zone_partitioning']`
- **자료 API 구역 분리 (`api/notes.js`, `api/notices.js`)**:
  - 메모 구역은 메모 ID(UUID)만, 공지 구역은 공지 ID(`notice-…` 또는 번호)만 받습니다. 다른 구역의 ID로 요청하면 HTTP 404입니다. 판정기도 같은 기준으로 거부합니다.
  - 메모 주인은 토큰 검증 신원으로 정합니다. 심판 토큰은 `sub`에 실행 ID와 a/b 신원까지 묶어 A·B 구역이 섞이지 않습니다. 새 메모 ID는 서버가 만들고, 본문의 `id`·`owner_id`·`role`은 믿지 않습니다.
  - 다른 사람 메모는 HTTP 403/404, 학생의 공지 수정은 HTTP 403입니다.

### 8단계 확인 순서
1. `npm run decider:test` — 7개 모두 `통과` (가상 요청 연습이며 심판 판정이 아님)
2. `npm run fixture:7` — 정상 요청 `allow`, 복합 이상 요청 `step_up`
3. 화면에서 A 계정으로 로그인해 내 메모 목록과 공지 조회가 열리는지 확인합니다. B 계정 토큰으로 A 메모 ID를 직접 요청하면 거부되어야 합니다.

## 9단계: 도플갱어를 찾고 권한을 거둡니다

- **탐지 규칙 (`src/detect.mjs`)**: 가상 사건에서 가명 사용자(`identity.sub`)·기기(`deviceId`)·요청 종류(`method`)·판정·네트워크·시각만 읽습니다. 메모 본문·토큰·실명은 읽지도 남기지도 않습니다.
  - 같은 사용자·같은 기기의 GET이 10분 안에 120건을 넘고, 사건에 네트워크 값이 있으면 평소와 다른 네트워크(`unusual`)가 함께일 때만 의심으로 봅니다. 지역 값 하나만으로는 제안하지 않습니다.
  - 의심이면 별도 탐지 결과로 `{ action: 'propose_revocation', reasonCode: 'burst_read', subject, deviceId }`를 냅니다. 대상은 확인된 가상 기기 한 개이며, 정상 사건은 `{ action: 'observe' }`입니다.
- 판정기(`src/decider.mjs`)의 허용·거부 응답 5항목은 그대로입니다. 회수 API는 만들지 않았고, 실제 회수와 경과 시간은 심판이 가상 사건으로 확인합니다.

### 9단계 확인 순서
1. `npm run detect:test` — 6개 모두 `통과` (가상 사건 연습이며 실제 회수나 심판 판정이 아님)
2. `npm run decider:test`, `npm run fixture:7` — 정상 기기 `allow` 유지

## 10단계: 백업에서 자료실을 되살립니다

### 메모 한 건 복구 경로
- **서비스·경로**: Vercel 서버 함수 `api/restore.js` · `POST /api/restore` (`aleph.config.json`의 `restoreRoute`)
- **요청**: 로그인 토큰(`Authorization: Bearer …`)과 본문 `{ "id": "<메모 UUID>" }`. `"dryRun": true`를 붙이면 복원하지 않고 사본 버전(`backupVersion`)과 바뀔 항목(`changes`)만 돌려줍니다. `/api/restore/<id>`, `?id=`도 같습니다.
- **사본**: 메모를 만들 때 서버가 비공개 사본 테이블 `note_backups`에 ID·소유자·제목·본문과 내용 해시(SHA-256)를 남깁니다. 이후 수정은 사본에 반영하지 않습니다.
- **순서**: 감사 기록(`restore_audit`) 추가 → 사본 다시 읽기·해시 재계산 대조 → ID·소유자 대조 → 그 한 건만 되돌림(삭제됐으면 같은 ID로 다시 만듦) → 다시 읽어 ID·소유자·내용 해시가 사본과 같은지 확인 → 감사 기록 추가
- **멈춤**: 사본 없음 404 · 사본 해시 불일치 409 · 현재 소유자 불일치 409 · 감사 기록 불가 503 · 비로그인 401. 다른 사람의 메모 ID는 사본 없음과 같은 404입니다.
- **보존**: 다른 메모, 사본, 감사 기록은 바꾸거나 지우지 않습니다. `note_backups`·`restore_audit`는 트리거로 수정·삭제가 막혀 있습니다. 응답과 감사 기록에 메모 본문은 남기지 않습니다.
- **처음 한 번**: Supabase SQL Editor에서 `schema.sql`의 「10단계」 부분을 실행해야 두 테이블이 생깁니다. 그 전에 만든 메모는 사본이 없어 복구하지 않습니다. 시험 계정 B로 새 메모를 만든 뒤 확인합니다.

### 시험 정책 사본 비교·되돌리기
- 침해 전 사본: `policy/backups/policy-v9-9f13368.json` (9단계 통과 커밋 `9f13368`의 판정 규칙) · SHA-256은 `policy/backups/manifest.json`
- 현재 시험 정책: `policy/test-policy.json` (3차 침공 가상 사건으로 notes 규칙이 바뀐 상태에서 출발) · 감사 기록: `policy/audit.log.jsonl` (추가만)
- `npm run policy:diff` — 사본을 다시 읽어 검증하고, 복원할 버전과 바뀔 항목만 보여 줍니다. 사본이 없거나 해시가 다르면 **중단**합니다.
- `npm run policy:restore -- --service notes --version v9-9f13368 --yes` — 확인한 서비스 하나만 사본으로 되돌리고 감사 기록 한 줄을 추가합니다. `--yes`가 없거나 버전이 다르면 아무것도 바꾸지 않고 멈춥니다. 다른 서비스 규칙(예: notices의 `noticeIdPattern`)은 그대로 둡니다.
- 실제 운영 판정기 `src/decider.mjs`는 이 도구가 바꾸지 않습니다.

### 복구 뒤 1~9단계 재시험 순서
| 순서 | 명령·요청 | 정상 기대 | 금지 기대 | 이번 저장점 결과 |
|---|---|---|---|---|
| 1 | `npm run policy:diff` | 사본 재검증 통과, notes 차이 없음 | — | 실행함 (로컬): 통과, B→A deny · A→A allow |
| 2 | `npm run decider:test` / `npm run fixture:7` | 정상 기기 allow, 복합 이상 step_up | 미등록 기기 deny | 실행함 (로컬): 7개 통과 / allow·step_up |
| 3 | `npm run detect:test` | 정상 observe | 폭주 propose_revocation | 실행함 (로컬): 6개 통과 |
| 4 | `node --test test/<파일>` 4개 | 14건 통과 | — | 실행함 (로컬): 14건 통과 |
| 5 | 복구 API 로컬 시험 (가짜 DB·가짜 A/B 토큰) | B 메모 변조·삭제 뒤 복구 시 ID·소유자·해시 일치, A 정상 읽기 유지 | A·B 교차 복구 404, 비로그인 401, 사본 변조 409 | 실행함 (로컬, 저장소 밖 임시 시험) |
| 6 | `npm run bundle` (배포 주소에 실제 요청) | 1~9단계 점검 + 복구 경로 점검 | 비로그인 401 등 | 저장점 커밋 뒤 실행, 결과는 제출 묶음에 그대로 기록 |
| 7 | 시험 계정 B로 배포된 `POST /api/restore` 호출 | 사본과 같은 ID·소유자·해시 | A 메모 ID 404 | **미실행** (B 토큰으로 직접 호출하지 않음) |
| 8 | 화면에서 A 로그인 → 내 메모 목록·공지 | 열림 | B 토큰으로 A 메모 직접 요청 거부 | **미실행** |

## 11단계: 나만의 접속 앱을 완성합니다

### 설치형 웹앱 화면
- `public/manifest.webmanifest` (앱 이름 「최부장 비밀 자료실」, `display: standalone`), `public/icon.svg`, `public/offline.html`, `public/sw.js`
- 서비스 워커는 오프라인 안내 화면·manifest·아이콘만 저장합니다. `/api/*` 응답, 메모, 토큰, 기기 키는 저장하지 않습니다.
- 화면의 「앱 실행 방식」 표시는 설치형으로 실행 중인지만 알려 줍니다. **설치 표시는 기기 확인이 아닙니다.** 따로 설치하는 접속 프로그램은 없습니다.

### 기기 승인 흐름 (`api/device.js`, `src/device-auth.mjs`)
1. 로그인하면 기기 승인 칸이 열립니다. 승인 전에는 메모를 불러오지 않고 메모 칸도 비어 있습니다.
2. 「이 기기 승인 요청」은 탭 메모리 안에서 **꺼낼 수 없는** P-256 기기 키를 만들고, 공개키와 개인키 보유 증명(서명)을 `POST /api/device`로 보냅니다. 버튼은 요청만 보냅니다.
3. 서버가 로그인 토큰·증명 서명·시각(±2분)·계정당 기기 수를 확인한 뒤에만 공개키를 `devices` 테이블에 승인 기기로 기록합니다. 개인키(`d`)가 섞인 요청은 거부합니다.
4. 화면은 승인 응답만으로 열지 않고, 서명한 `GET /api/device`로 서버가 등록 기기임을 다시 확인한 뒤에만 기존 자료실을 엽니다.
5. 이후 모든 보호 요청(`/api/notes`, `/api/notices`, `/api/restore`)은 `X-Aleph-Device-Id`, `X-Aleph-Timestamp`, `X-Aleph-Signature` 헤더로 「버전·메서드·경로(쿼리 포함)·본문 SHA-256·시각·기기 ID」에 서명합니다.
   - 서명 헤더가 있으면 모두 맞아야 합니다. 서명 뒤 경로·메서드·본문을 바꾸거나, 승인 안 된 기기·다른 계정·2분 넘은 서명이면 HTTP 401입니다.
   - 승인 기기가 있는 계정은 서명 없는 보호 요청을 HTTP 401(`DEVICE_SIGNATURE_REQUIRED`)로 거부합니다. 승인 기기가 없는 계정은 10단계까지와 같이 동작합니다.
6. 토큰과 기기 키는 메모리에만 있습니다(localStorage·sessionStorage·IndexedDB 사용 안 함). 새로고침하면 다시 로그인하고 승인합니다.
- **처음 한 번**: Supabase SQL Editor에서 `schema.sql`의 「11단계」 부분(11~12번)을 실행해야 `devices` 테이블이 생깁니다.

### 11단계 확인 순서
| 순서 | 명령·화면 | 정상 기대 | 금지 기대 | 이번 저장점 결과 |
|---|---|---|---|---|
| 1 | 로컬 시험: 화면과 같은 방식의 서명으로 실제 API 함수 호출 (가짜 DB·가짜 A/B 토큰) | 승인 뒤 서명한 목록·수정·공지·복구 정상 | 승인 전 서명 없는 상태 확인, 잘못된 증명, 개인키 포함, 서명 뒤 본문·경로·메서드 변경, 오래된 서명, 다른 계정 재사용 모두 거부 | 실행함 (로컬, 저장소 밖 임시 시험): 통과 |
| 2 | `npm run decider:test`, `npm run fixture:7`, `npm run detect:test`, `npm run policy:diff`, `node --test test/<파일>` | 1~10단계 결과 유지 | — | 실행함 (로컬): 7개·allow/step_up·6개·B→A deny·14건 통과 |
| 3 | `npm run bundle` (배포 주소에 실제 요청) | manifest 제공, 서명 없는 기기 상태 401, 배포 화면에 저장소 저장 코드 없음 | — | 저장점 커밋 뒤 실행, 결과는 제출 묶음에 그대로 기록 |
| 4 | 화면: 로그인 → 승인 전 메모 없음 → 승인 요청 → 「서버 확인 완료」 뒤 메모 목록 | 승인 뒤 기존 자료실 열림 | 승인 전 메모 없음 | **미실행** (실제 계정으로 화면을 직접 조작하지 않음) |
| 5 | 승인한 계정 토큰으로 서명 없이 `GET /api/notes` | — | HTTP 401 | **미실행** (배포 환경) |

## 12단계: 설치·실행·중지·복구 안내

### 기준 커밋과 범위
- **검사한 커밋**: `3b5bb78` (12단계 저장점, 배포 커밋 `3b5bb784f69d…`). 2026-10-13 `npm run evidence`가 배포 주소의 `GET /aleph.json`에서 읽은 값입니다. `docs/EVIDENCE.md`와 아래 「재현 순서」의 배포 실측은 이 배포를 대상으로 했습니다.
- 그 뒤의 보완(이 안내가 들어 있는 커밋): `ffbb4d1` 제출(45점)에서 심판 runner가 점검 코드를 불러오지 못해(`runner_import_failed`) 실제 API 결과가 없었고, 그래서 화면 수치와 대조할 수 없었습니다(`S12_SCREEN_MISMATCH`). 원인은 `src/attack-check.mjs`가 12단계에서 `src/checks.mjs`를 불러오고, 그 파일이 다시 `scripts/`와 내장 모듈을 불러온 것입니다. 그래서 점검 목록을 다른 파일을 하나도 불러오지 않는 `src/attack-check.mjs` 한 파일로 옮기고(인자는 배포 주소 문자열, 결과 항목 `attackId·stage·expected·observed·result`), 판정기·탐지·정책 점검은 배포의 `GET /api/checks?case=…` 응답(`ready`)으로 확인하게 했으며, 「서버 점검 기록」을 로그인 없이 첫 화면에서 `/api/checks` 수치 그대로 보이게 했습니다. 이 보완이 배포되기 전에는 배포 주소에서 바뀐 `/api/checks`를 확인할 수 없습니다.
- 출처(학생 몫과 제공 엔진)는 README 맨 위 「누가 만든 것인가」 표에 있습니다.

### 설치 (처음 한 번)
1. 준비: Node 22 이상, Git, GitHub·Vercel·Supabase 계정.
2. `git clone <본인 저장소 주소>` 후 `npm install`.
3. Supabase SQL Editor에서 `schema.sql`을 위에서부터 실행합니다 (기본 표와 5단계 권한 회수 → 「10단계」 부분 → 「11단계」 부분). 가상 메모 4건이 들어갑니다.
4. Vercel에서 **새 프로젝트**로 저장소를 연결하고 환경변수 **이름** 두 개를 비밀 입력란에 직접 넣습니다: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`(서버 전용). 로그인 중계가 공개 키를 환경변수로 받으려면 `SUPABASE_PUBLISHABLE_KEY`도 쓸 수 있습니다(없으면 `aleph.config.json`의 값을 씁니다). **값은 README, 코드, Git, 제출 묶음, 캡처에 쓰지 않습니다.**
5. 배포합니다. 빌드 명령 `npm run build`는 Vercel이 주는 저장소·커밋·배포 URL이 없으면 일부러 실패합니다.

### 실행
- 로컬 연습 (엔진·배포 없이): `npm run decider:test` · `npm run fixture:7` · `npm run detect:test` · `npm run policy:diff` · `node --test test/checks.test.mjs test/screen.test.mjs test/ops-summary.test.mjs test/evidence.test.mjs test/package-starter.test.mjs test/r5.test.mjs test/xdr-brute-force.test.mjs test/xdr-run.test.mjs`
- 배포 화면: 주소를 열면 로그인 없이 맨 아래 「탈환 작전실 · 서버 점검 기록」이 보입니다. 시험 계정으로 로그인 → 「이 기기 승인 요청」 → 「서버 확인 완료」 뒤 자료실과 「탈환 작전실」(내 계정 요약)이 열립니다. 승인 전에는 메모를 불러오지 않습니다.
- 실측 표 (1~11단계 정상·금지 요청 한 장): `npm run evidence` → `docs/EVIDENCE.md`. 로그인 없는 요청만 보냅니다. 시험 계정 요청까지 보내려면 본인 터미널에서 환경변수 `EVIDENCE_EMAIL`·`EVIDENCE_PASSWORD`(A 계정), `EVIDENCE_B_EMAIL`·`EVIDENCE_B_PASSWORD`(B 계정, 남의 메모 접근 거부 확인용)를 직접 넣고 `npm run evidence -- --with-account`를 실행합니다. 이 명령은 계정마다 승인 기기 1개를 남기고 A 계정에 가상 메모 1건을 만들었다 지웁니다(복구용 비공개 사본은 추가 전용이라 남습니다). 계정 값은 화면·표·기록·Git에 남지 않으며, 실행 기록 `artifacts/evidence.json`은 커밋하지 않습니다.
- 12단계 서버 점검 기록: `GET /api/checks` (로그인 불필요). 제출 묶음(`npm run bundle`)·심판 runner와 같은 함수(`src/attack-check.mjs`의 `runAttackChecks`)를 이 배포에 실제로 보내 받은 결과 `attempts`와 수치 `total`(점검 항목)·`blocked`(막은 공격)·`failed`(뚫린 공격)·`notRun`(실행하지 않은 점검)을 돌려줍니다. 점검 19개 가운데 16개가 배포 주소 한 곳에 보내는 GET 요청이고(코드 상한 24건), 쓰기 요청(로그인 없는 복구 `POST`)·로그인과 기기 서명이 필요한 정상 요청·배포 주소가 아닌 원본 API 직접 조회 3개는 보내지 않고 `not_run`입니다. `observed`에는 `HTTP 401`, `HTTP 200; jsonReady=true`처럼 같은 요청 기록과 대조할 수 있는 값만 적습니다. 판정기·탐지·정책 점검 7개는 `GET /api/checks?case=<점검 이름>`이 고정된 가상 입력을 학생 코드로 실행한 응답(`ready`)이며, ALEPH SDP 엔진이 실제로 집행했는지는 `engineEnforced: not_run`입니다. 화면의 「탈환 작전실 · 서버 점검 기록」은 이 수치를 계산하지 않고 그대로 보여 주고, 같은 `attempts`에서 다시 센 값과 다를 때만 「불일치」를 표시합니다.
- 41종 공격 전체는 심판이 보내며 이 저장소에서는 실행하지 않았습니다. 표에 없는 공격을 통과로 적지 않습니다.

### 중지
- 로컬에는 계속 떠 있는 서버가 없습니다. 위 명령은 한 번 실행하고 끝납니다.
- 화면 사용 중지: 「로그아웃」을 누르거나 탭을 닫으면 토큰과 기기 키가 사라집니다(저장소에 저장하지 않음). 다시 쓰려면 로그인하고 기기를 다시 승인합니다.
- 기기 하나만 막기: Supabase SQL Editor에서 `update public.devices set status = 'revoked' where owner_id = '<계정 UUID>' and device_id = '<기기 ID 16자리>';` 이후 그 기기의 서명 요청은 거부되고 같은 기기의 재승인도 거부됩니다(`DEVICE_REVOKED`). 탐지 제안을 자동으로 집행하는 경로는 없으므로 이 절차는 사람이 합니다.
- 서비스 전체 중지: Vercel에서 프로젝트(또는 배포)를 삭제합니다. 이 안내의 중지 절차는 이번 점검에서 **실행하지 않았습니다**.

### 복구
| 대상 | 방법 |
|---|---|
| 메모 한 건 | 로그인·기기 서명 후 `POST /api/restore`, 본문 `{"id":"<메모 UUID>","dryRun":true}`로 먼저 계획만 확인하고 `dryRun` 없이 다시 보냅니다. 사본이 없거나 해시가 다르면 멈춥니다. (위 「10단계」 참고) |
| 시험 정책 | `npm run policy:diff`로 사본 검증과 바뀔 항목 확인 → `npm run policy:restore -- --service notes --version v9-9f13368 --yes` |
| 코드 | 되돌릴 커밋을 `git revert`로 되돌립니다. `git reset --hard`는 쓰지 않습니다. (`5ec5f26`이 11단계 저장점 `25f906c`로 되돌린 기록입니다.) |

**줄바꿈 문제와 해결**: 줄바꿈 변환(`core.autocrlf=true`, Windows)이 켜진 PC에서는 정책 사본 `policy/backups/policy-v9-9f13368.json`이 CRLF로 체크아웃되어 SHA-256이 `manifest.json`과 달라지고, `policy:diff`와 작전실의 정책 사본 칸이 「중단·읽지 못함」으로 나왔습니다. 사본 내용이 바뀐 것은 아니었고 커밋된 파일의 해시는 기록과 같았습니다. `.gitattributes`에 `policy/backups/*.json text eol=lf`를 추가해 이 파일들을 LF로 고정했습니다. **이미 CRLF로 받아 둔 PC에서는** 두 파일(`policy-v9-9f13368.json`, `manifest.json`)을 지우고 `git checkout -- policy/backups`로 다시 받아야 LF가 됩니다(내용 변경이 없는 파일에만 하세요). 이 PC에서는 그렇게 해서 `policy:diff`가 「검증 통과」가 되었습니다. 사본의 SHA-256이 다르면 어떤 환경에서도 버전을 믿지 않고 멈추는 동작은 그대로입니다.

### 재현 순서와 이번 기준 결과

| 순서 | 명령·화면 | 정상 기대 | 거부 기대 | 이번 결과 |
|---|---|---|---|---|
| 1 | `node --test` 8개 파일 | 50건 | — | 실행함 (로컬, 작업 트리 기준, 가짜 응답): 성공 49 · 실패 1. 실패 1건은 `test/ops-summary.test.mjs`의 `GET /api/ops` 시험으로, 이 PC에 `npm install`을 하지 않아 `@supabase/supabase-js`를 찾지 못한 것입니다. 점검 코드를 옆 파일 없이(data: 주소) 불러와 실행, 로그인 없이도 화면 수치가 `/api/checks` 응답과 같음, 응답 수치를 바꾸면 「불일치」가 뜨는 것도 포함 |
| 2 | `npm run decider:test` / `fixture:7` / `detect:test` | 7개 / allow·step_up / 6개 | 미등록 기기 deny | 실행함 (로컬, 가상 요청 연습): 판정기 7건 기대와 같음 · 정상 allow·복합 이상 step_up · 탐지 6건 기대와 같음 |
| 3 | `npm run evidence` (로그인 없음, 배포 `3b5bb78`) | 정상 4건 허용 (HTTP 200) | 금지 15건 거부 (HTTP 401/405 등) | 실행함: 정상 4 허용 · 금지 15 거부 · 다름 0 (요청 ID·시각은 `docs/EVIDENCE.md`) |
| 4 | 같은 표의 함수 호출 행 (판정기·탐지기·정책) | 13건 기대와 같음 | — | 실행함 (요청 아님): 13건 같음 · 다름 0 (정책 사본 SHA-256 검증 통과) |
| 5 | 12단계 점검 목록 (`src/attack-check.mjs`, 점검 19개) | 정상 요청 1개는 로그인·기기 서명이 필요해 보내지 않음 | 금지 요청 GET 16건 (판정기·탐지·정책 `?case=` 7건 포함) | 배포 주소 대상: **미실행** (이 보완을 커밋·배포한 뒤 `npm run bundle`로 실행). 바뀌기 전 목록은 배포 `3b5bb78`에서 전체 20 · 막음 14 · 허용 5 · 다름 0 · 미실행 1이었습니다 |
| 6 | 41종 공격 | — | — | 실행하지 않음. 심판이 보내는 시험입니다 |
| 7 | `npm run evidence -- --with-account` | 로그인 후 서명 요청 허용 (A 계정 기준) | 서명 없음·변경·B 계정의 A 메모 접근 거부 | **미실행** (계정 값은 사용자가 본인 터미널에서 넣어야 함). 계정 필요 행 정상 11 · 금지 10건이 표에 미실행으로 남아 있음 |
| 8 | 실제 브라우저에서 첫 화면 → 로그인 → 기기 승인 → 작전실 확인 | 로그인 전에도 서버 점검 기록 보임, 승인 뒤 자료실·작전실 열림 | 승인 전 메모 없음 | **미실행** (화면을 직접 조작하지 않음) |
| 9 | 이 보완을 배포한 뒤 `GET /api/checks`와 `npm run bundle` | 두 결과의 `attackId`·`stage`·`expected`·`observed`·`result`가 같음 | — | **미실행** (커밋·배포 뒤 실행, 결과는 제출 묶음에 그대로 기록) |

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 2단계부터는 자료 보호를 구현할 때 `public/data.json`을 복사하는 1단계 빌드 흐름도 함께 바꿔야 합니다. 3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.

