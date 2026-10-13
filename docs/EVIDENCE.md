# 12단계 실측 증거 표

- 생성: `npm run evidence` · 2026-10-13T06:43:21.101Z · 검사한 배포 커밋 `8b2c59ffd4ac6b44148918a98ca4149a0bc9e97a`
- 행 38개 · 실제 API 응답: 금지 요청 거부 12 / 다름 0 / 미실행 7 · 정상 요청 허용 4 / 다름 0 / 미실행 2
- 학생 판정기·탐지기·정책 함수의 로컬 실행(요청 아님): 기대와 같음 13 / 다름 0 — 공격 막음 수에 넣지 않습니다
- 41종 공격: 실측 막음 4 · 실측 못 막음 0 · 미실행 37 (막음은 실제 HTTP 요청이 막힌 공격만 셉니다)
- 요청 ID: 배포 주소는 응답 헤더 `x-vercel-id`(원본 API는 `sb-request-id`), 판정기·탐지기는 이번 실행에서 만든 UUID입니다. 표 SHA-256 `517d0acf06c505fd…`

| ID | 단계 | 구분 | 요청 | 기대 결과 | 실제 결과 | 판단 | 요청 ID | 확인 시각 |
|---|---|---|---|---|---|---|---|---|
| N01 | 1 | 정상 | GET /aleph.json | HTTP 200, 배포 커밋 확인 | HTTP 200, 커밋 8b2c59f | 기대와 같음 | `icn1::dk7dc-1791873775553-2a2199191658` | 2026-10-13T06:43:16.365Z |
| N02 | 11 | 정상 | GET / | HTTP 200 접속 화면 | HTTP 200 | 기대와 같음 | `icn1::6mv52-1791873775821-d6be48ee0cee` | 2026-10-13T06:43:16.839Z |
| N03 | 11 | 정상 | GET /manifest.webmanifest | HTTP 200, 앱 이름 있음 | HTTP 200, 이름 있음 | 기대와 같음 | `icn1::6mv52-1791873776282-e95637acc51a` | 2026-10-13T06:43:17.070Z |
| N04 | 11 | 정상 | GET /offline.html | HTTP 200 오프라인 안내 | HTTP 200 | 기대와 같음 | `icn1::4stk2-1791873776850-225e521d7233` | 2026-10-13T06:43:17.889Z |
| F01 | 1 | 금지 | GET /api/notes (토큰 없음) | HTTP 401, 메모 없음 | HTTP 401 | 기대와 같음 | `icn1::iad1::2xzgt-1791873777345-ca20b32d8f27` | 2026-10-13T06:43:18.207Z |
| F02 | 1 | 금지 | GET /api/notes?id=<가상 UUID> (토큰 없음) | HTTP 401 | HTTP 401 | 기대와 같음 | `icn1::iad1::flxdk-1791873777666-860d5d98af82` | 2026-10-13T06:43:18.662Z |
| F03 | 3 | 금지 | GET /api/notes (서명 위조 토큰) | HTTP 401 | HTTP 401 | 기대와 같음 | `icn1::iad1::wqqsj-1791873778118-7d08a5562c58` | 2026-10-13T06:43:18.910Z |
| F04 | 2 | 금지 | GET /data.json (시드 검색) | 메모 0건, 확인 표식 없음 | HTTP 200, 메모 0건, 표식 없음 | 기대와 같음 | `icn1::67tlz-1791873778359-c9e363db4fb6` | 2026-10-13T06:43:19.150Z |
| F05 | 2 | 금지 | GET / (배포 화면 비밀값·표식·저장소 검색) | 서버 키·개인키·표식·저장소 저장 코드 없음 | HTTP 200, 비밀값 없음, 표식 없음, 저장소 저장 없음 | 기대와 같음 | `icn1::dqdcs-1791873778605-f85137e86ef7` | 2026-10-13T06:43:19.197Z |
| F06 | 5 | 금지 | GET /aleph.config.json (서버 키 검색) | 서버 전용 키 없음 | HTTP 200, 서버 키 없음 | 기대와 같음 | `icn1::bmnkc-1791873778650-84840dc56e10` | 2026-10-13T06:43:19.441Z |
| F07 | 5 | 금지 | GET 원본 자료 API (공개 키만, 사용자 토큰 없음) | HTTP 401 또는 403 | HTTP 401 | 기대와 같음 | `01a13400-0505-76bc-b645-ccb5c5a8fc11` | 2026-10-13T06:43:19.672Z |
| F08 | 8 | 금지 | GET /api/notes/export (토큰 없음) | HTTP 401 또는 404 | HTTP 401 | 기대와 같음 | `icn1::iad1::fz4mf-1791873779126-52ba008f05c4` | 2026-10-13T06:43:19.927Z |
| F09 | 8 | 금지 | GET /api/notices?id=notice-01 (토큰 없음) | HTTP 401 | HTTP 401 | 기대와 같음 | `icn1::iad1::288dj-1791873779372-ff9a4bc4727b` | 2026-10-13T06:43:20.234Z |
| F10 | 11 | 금지 | GET /api/device (토큰·서명 없음) | HTTP 401, 승인으로 처리 안 함 | HTTP 401 | 기대와 같음 | `icn1::iad1::zptv9-1791873779680-bf6d88145865` | 2026-10-13T06:43:20.534Z |
| F11 | 10 | 금지 | HEAD /api/restore | 복원 없이 HTTP 401 또는 405 | HTTP 405 | 기대와 같음 | `icn1::iad1::dk7dc-1791873779978-30b935d03947` | 2026-10-13T06:43:20.769Z |
| F12 | 12 | 금지 | GET /api/ops (토큰 없음) | HTTP 401, 작전실 기록 없음 | HTTP 401 | 기대와 같음 | `icn1::iad1::fz4mf-1791873780217-f5180efbbc90` | 2026-10-13T06:43:21.088Z |
| W01 | 3 | 금지 | POST /api/notes (토큰 없음) | HTTP 401, 저장 없음 | not_run (격리 환경은 GET·HEAD만 허용) | 미실행 | - | - |
| W02 | 10 | 금지 | POST /api/restore (토큰 없음) | HTTP 401, 저장 없음 | not_run (격리 환경은 GET·HEAD만 허용) | 미실행 | - | - |
| W03 | 8 | 금지 | PUT /api/notices?id=notice-01 (토큰 없음) | HTTP 401, 저장 없음 | not_run (격리 환경은 GET·HEAD만 허용) | 미실행 | - | - |
| L01 | 6 | 정상 | 판정기: 등록 기기 정상 요청 | allow | allow · approved | 기대와 같음 | `82f385cf-89b3-4bd8-a2a9-c89d64b6afdf` | 2026-10-13T06:43:21.094Z |
| L02 | 6 | 금지 | 판정기: 미등록 가상 기기 요청 | deny | deny · device_not_registered | 기대와 같음 | `187be5d1-ac1b-43e3-be6e-fb4112356a7f` | 2026-10-13T06:43:21.094Z |
| L03 | 7 | 금지 | 판정기: 복합 이상 접속 (재확인 전) | step_up | step_up · step_up_required | 기대와 같음 | `c93f5814-6c9c-4625-aa1e-95d3ca692ce4` | 2026-10-13T06:43:21.094Z |
| L04 | 7 | 정상 | 판정기: 복합 이상 접속 (재확인 뒤) | allow | allow · approved | 기대와 같음 | `49b254d6-2e59-409b-8f1f-9e6aa215ff3d` | 2026-10-13T06:43:21.094Z |
| L05 | 8 | 금지 | 판정기: B가 A 메모 읽기 | deny | deny · zone_owner_forbidden | 기대와 같음 | `93b4967f-7b13-4fc7-9321-62093b6c018a` | 2026-10-13T06:43:21.095Z |
| L06 | 8 | 정상 | 판정기: B가 자기 메모 읽기 | allow | allow · approved | 기대와 같음 | `fd8651ba-e969-4141-92c9-1a8a0458c6a8` | 2026-10-13T06:43:21.095Z |
| L07 | 8 | 금지 | 판정기: 학생 공지 수정 | deny | deny · instructor_notice_forbidden | 기대와 같음 | `aedf0267-2236-4f8f-a7d9-ad185da895b5` | 2026-10-13T06:43:21.095Z |
| L08 | 8 | 금지 | 판정기: 메모 전체 목록 | deny | deny · zone_owner_forbidden | 기대와 같음 | `531b4b79-ae38-45c9-b872-05513a707a1d` | 2026-10-13T06:43:21.095Z |
| L09 | 9 | 금지 | 탐지기: 낯선 네트워크 + 10분 150건 가상 사건 | propose_revocation (기기 1개) | propose_revocation · burst_read · 기기 1개 | 기대와 같음 | `943b7f79-5a0b-45a5-b2a1-cb188a9ac342` | 2026-10-13T06:43:21.096Z |
| L10 | 9 | 정상 | 탐지기: 평소 네트워크 30건 | observe | observe | 기대와 같음 | `5da6953d-4aec-4c59-93dd-4405ac2c1f16` | 2026-10-13T06:43:21.096Z |
| L11 | 9 | 정상 | 탐지기: 지역만 다른 150건 | observe | observe | 기대와 같음 | `10c1e47b-8c83-4e0a-96b8-35e0ae903143` | 2026-10-13T06:43:21.097Z |
| L12 | 10 | 정상 | 정책 사본 다시 읽기·SHA-256 검증 | 검증 통과 | 검증 통과 · v9-9f13368 | 기대와 같음 | `ebfa78dc-cf06-4fd8-8440-f899df39aeca` | 2026-10-13T06:43:21.099Z |
| L13 | 10 | 금지 | 복원한 시험 정책: B가 A 메모 읽기 / A 자기 메모 | deny / allow | deny / allow | 기대와 같음 | `ac8cc8b8-3cc0-4b66-94ef-5f8227ae1a6a` | 2026-10-13T06:43:21.101Z |
| L14 | 2 | 금지 | git grep HEAD (비밀값 검색) | 서버 키·JWT·개인키 0건 | not_run (격리 환경은 제출 묶음 확인용 git 읽기만 허용, 로컬 npm run evidence에서 실행) | 미실행 | - | - |
| T01 | 4 | 정상 | A 토큰으로 자기 메모 조회 | HTTP 200 | not_run (시험 계정 토큰·기기 서명 없이 실행하지 않음) | 미실행 | - | - |
| T02 | 4 | 금지 | B 토큰으로 A 메모 조회·삭제 | HTTP 403/404 | not_run (시험 계정 토큰·기기 서명 없이 실행하지 않음) | 미실행 | - | - |
| T03 | 10 | 금지 | B 메모 변조·삭제 뒤 POST /api/restore | ID·소유자·해시 일치 | not_run (시험 계정 토큰·기기 서명 없이 실행하지 않음) | 미실행 | - | - |
| T04 | 11 | 금지 | 승인 기기 계정의 서명 없는 요청·서명 뒤 경로·본문 변경 | HTTP 401 | not_run (시험 계정 토큰·기기 서명 없이 실행하지 않음) | 미실행 | - | - |
| T05 | 11 | 정상 | 승인 기기에서 서명한 메모 목록 | HTTP 200 | not_run (시험 계정 토큰·기기 서명 없이 실행하지 않음) | 미실행 | - | - |

## 41종 공격 실행 여부

| 단계 | 코드 | 공격 | 상태 | 근거 행 |
|---|---|---|---|---|
| 1 | ANONYMOUS_NOTE_LIST | 인증 없이 개인 메모 목록을 조회 | 실측 막음 | F01 |
| 1 | ANONYMOUS_NOTE_READ | 인증 없이 개인 메모를 조회 | 실측 막음 | F02 |
| 2 | BUILT_BUNDLE_SECRET_SCAN | 배포 번들에서 시험 비밀값을 검색 | 미실행 | - |
| 2 | REPOSITORY_SECRET_SCAN | 제출 커밋에서 시험 비밀값을 검색 | 미실행 | - |
| 2 | STATIC_SEED_DATA_SCAN | 공개 정적 파일에서 개인 메모 시드를 검색 | 미실행 | - |
| 3 | ANONYMOUS_NOTE_WRITE | 인증 없이 개인 메모를 추가 | 미실행 | - |
| 3 | EXPIRED_LOGIN_TOKEN | 만료된 로그인 토큰으로 조회 | 미실행 | - |
| 3 | FORGED_LOGIN_TOKEN | 서명이 위조된 로그인 토큰으로 조회 | 실측 막음 | F03 |
| 3 | MISSING_LOGIN_TOKEN | 로그인 토큰 없이 보호 API 조회 | 실측 막음 | F09, F10, F12 |
| 3 | TOKEN_WRONG_AUDIENCE | 다른 서비스용으로 발급된 로그인 토큰으로 메모 조회 | 미실행 | - |
| 4 | FOREIGN_NOTE_DELETE | 시험 계정 B로 A의 메모 삭제 | 미실행 | - |
| 4 | R3_JUDGE_OWNED_NOTE | 학생 시험 신원으로 심판 소유 메모 조회 | 미실행 | - |
| 4 | R3_JUDGE_OWNED_NOTE_WRITE | 학생 시험 신원으로 심판 소유 메모 수정 | 미실행 | - |
| 5 | DIRECT_ORIGIN_NOTE_READ | 공개 키와 시험 계정 토큰으로 원본 Supabase 자료 API 직접 조회 | 미실행 | - |
| 5 | DIRECT_ORIGIN_NOTE_WRITE | 공개 키와 시험 계정 토큰으로 원본 Supabase 자료 API 직접 수정 | 미실행 | - |
| 5 | ORIGIN_ALIAS_BYPASS | 공개 정적 파일과 브라우저 묶음에서 서버 전용 키·시드 표식 검색 | 미실행 | - |
| 6 | DEVICE_SUBJECT_MISMATCH | 등록 기기와 다른 사용자 토큰을 조합 | 미실행 | - |
| 6 | MISSING_CLIENT_CERTIFICATE | 클라이언트 인증서 없이 mTLS 통로 요청 | 미실행 | - |
| 6 | UNREGISTERED_DEVICE | 미등록 기기 인증서로 자료실 조회 | 미실행 | - |
| 6 | UNREGISTERED_VIRTUAL_DEVICE_RULE | 판정기에 등록되지 않은 가상 기기 사건을 직접 입력 | 미실행 | - |
| 7 | ANOMALOUS_HOUR_EVENT | 평소와 다른 시각의 가상 접속 사건을 입력 | 미실행 | - |
| 7 | ANOMALOUS_NETWORK_ACTION | 낯선 네트워크에서 대량 수정하는 가상 사건을 입력 | 미실행 | - |
| 7 | ANOMALOUS_REGION_EVENT | 가상 접속 지역이 급변한 사건을 판정기에 입력 | 미실행 | - |
| 7 | MISSING_STEP_UP | 추가 인증을 마치지 않은 토큰으로 민감 메모 조회 | 미실행 | - |
| 8 | CROSS_ZONE_NOTE_LIST | 다른 구역의 메모 목록을 API로 조회 | 미실행 | - |
| 8 | CROSS_ZONE_NOTE_READ | 다른 구역 메모를 API로 조회 | 미실행 | - |
| 8 | CROSS_ZONE_NOTE_WRITE | 다른 구역 메모를 API로 수정 | 미실행 | - |
| 8 | STUDENT_EDITS_INSTRUCTOR_NOTICE | 학생 시험 계정으로 강사 공지 수정 | 미실행 | - |
| 9 | DOPPELGANGER_DETECTION | 합성 도플갱어 접속 사건을 기록과 탐지기에 입력 | 미실행 | - |
| 9 | REVOKED_IDENTITY_REUSE | 회수된 신원으로 다음 요청을 재시도 | 미실행 | - |
| 9 | REVOKED_LATERAL_ROUTE | 회수된 도플갱어가 다른 자원으로 이동 | 미실행 | - |
| 9 | STOLEN_SESSION_AFTER_REVOKE | 회수 뒤 남은 탈취 세션으로 재접속 | 미실행 | - |
| 10 | RESTORE_CHANGED_NOTE | 시험 계정 B의 메모를 변조한 뒤 학생이 제출한 복구 경로를 호출 | 미실행 | - |
| 10 | RESTORE_DEFENSE_REPLAY | 시험 계정 B의 자료를 복구한 직후 1~9단계 대표 공격을 다시 전송 | 미실행 | - |
| 10 | RESTORE_DELETED_NOTE | 시험 계정 B의 메모를 삭제한 뒤 학생이 제출한 복구 경로를 호출 | 미실행 | - |
| 11 | SIGNED_BODY_TAMPER | 서명 뒤 수정 본문을 변경 | 미실행 | - |
| 11 | SIGNED_PATH_TAMPER | 서명 뒤 요청 경로를 변경 | 미실행 | - |
| 11 | UNSIGNED_CLIENT_REQUEST | 설치형 앱 서명 없이 보호 요청 | 미실행 | - |
| 12 | COMBINED_ANONYMOUS_OWNER_ATTACK | 무인증 조회와 타인 메모 조회를 같은 제출본에 연속 전송 | 미실행 | - |
| 12 | COMBINED_DEVICE_REVOCATION_ATTACK | 미등록 기기 요청 뒤 회수된 신원으로 다시 전송 | 미실행 | - |
| 12 | COMBINED_RESTORE_SIGNATURE_ATTACK | 복구 뒤 서명 없는 변경 요청과 구역 밖 조회를 전송 | 미실행 | - |
