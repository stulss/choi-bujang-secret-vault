# BYTE BACK 방어전 시작 틀 R5

이 저장소는 1단계에서 학생 본인이 GitHub 저장소와 Vercel 배포를 만드는 출발점입니다. 포함된 메모 네 건은 가상 자료입니다. 실제 학생 자료, 토큰, 비밀키를 넣지 마세요.

## 학생이 하는 일: 세 걸음

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

배포가 끝나면 `/`에서 점령된 가상 자료실을 볼 수 있습니다. `/data.json`에는 같은 가상 메모가 공개됩니다. 이 공개 상태를 확인하는 것이 1단계의 출발점입니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 시작 틀의 자동 처리

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


## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 2단계부터는 자료 보호를 구현할 때 `public/data.json`을 복사하는 1단계 빌드 흐름도 함께 바꿔야 합니다. 3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.

