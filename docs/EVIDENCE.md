# 12단계 실측 증거 표

- 생성: `npm run evidence` · 2026-10-13T06:14:07.800Z · 검사한 배포 커밋 `7c2d1d2f7ff166d7785f6af4809acd08b29cb1ad`
- 행 38개 · 실제 API 응답: 금지 요청 거부 12 / 다름 0 / 미실행 7 · 정상 요청 허용 4 / 다름 0 / 미실행 2
- 학생 판정기·탐지기·정책 함수의 로컬 실행(요청 아님): 기대와 같음 13 / 다름 0 — 공격 막음 수에 넣지 않습니다
- 41종 공격: 실측 막음 7 · 실측 못 막음 0 · 미실행 34 (막음은 실제 HTTP 요청이 막힌 공격만 셉니다)
- 요청 ID: 배포 주소는 응답 헤더 `x-vercel-id`(원본 API는 `sb-request-id`), 판정기·탐지기는 이번 실행에서 만든 UUID입니다. 표 SHA-256 `48308944a87bfad6…`

| ID | 단계 | 구분 | 요청 | 기대 결과 | 실제 결과 | 판단 | 요청 ID | 확인 시각 |
|---|---|---|---|---|---|---|---|---|
| N01 | 1 | 정상 | GET /aleph.json | HTTP 200, 배포 커밋 확인 | HTTP 200, 커밋 7c2d1d2 | 기대와 같음 | `icn1::wdn2p-1791872020452-13ebeb3a9254` | 2026-10-13T06:14:01.064Z |
| N02 | 11 | 정상 | GET / | HTTP 200 접속 화면 | HTTP 200 | 기대와 같음 | `icn1::wdn2p-1791872020527-9f780d372006` | 2026-10-13T06:14:01.086Z |
| N03 | 11 | 정상 | GET /manifest.webmanifest | HTTP 200, 앱 이름 있음 | HTTP 200, 이름 있음 | 기대와 같음 | `icn1::wdn2p-1791872020549-e711bf800d88` | 2026-10-13T06:14:01.353Z |
| N04 | 11 | 정상 | GET /offline.html | HTTP 200 오프라인 안내 | HTTP 200 | 기대와 같음 | `icn1::7vpjp-1791872020839-294f3c92552e` | 2026-10-13T06:14:01.613Z |
| F01 | 1 | 금지 | GET /api/notes (토큰 없음) | HTTP 401, 메모 없음 | HTTP 401 | 기대와 같음 | `icn1::iad1::5qdvj-1791872021074-81c15a0ff622` | 2026-10-13T06:14:02.460Z |
| F02 | 1 | 금지 | GET /api/notes?id=<가상 UUID> (토큰 없음) | HTTP 401 | HTTP 401 | 기대와 같음 | `icn1::iad1::7vpjp-1791872021929-a84033e50ccf` | 2026-10-13T06:14:02.687Z |
| F03 | 3 | 금지 | GET /api/notes (서명 위조 토큰) | HTTP 401 | HTTP 401 | 기대와 같음 | `icn1::iad1::g6gxt-1791872022150-b09bbf6eecbc` | 2026-10-13T06:14:02.914Z |
| F04 | 2 | 금지 | GET /data.json (시드 검색) | 메모 0건, 확인 표식 없음 | HTTP 200, 메모 0건, 표식 없음 | 기대와 같음 | `icn1::vsf2k-1791872022382-f0b06f213210` | 2026-10-13T06:14:02.940Z |
| F05 | 2 | 금지 | GET / (배포 화면 비밀값·표식·저장소 검색) | 서버 키·개인키·표식·저장소 저장 코드 없음 | HTTP 200, 비밀값 없음, 표식 없음, 저장소 저장 없음 | 기대와 같음 | `icn1::g6gxt-1791872022400-abe5423a3fcd` | 2026-10-13T06:14:02.969Z |
| F06 | 5 | 금지 | GET /aleph.config.json (서버 키 검색) | 서버 전용 키 없음 | HTTP 200, 서버 키 없음 | 기대와 같음 | `icn1::dhgnr-1791872022445-01ebd560fe80` | 2026-10-13T06:14:03.007Z |
| F07 | 5 | 금지 | GET 원본 자료 API (공개 키만, 사용자 토큰 없음) | HTTP 401 또는 403 | HTTP 401 | 기대와 같음 | `01a133e5-3908-7dd7-a244-e1c149a1fe18` | 2026-10-13T06:14:03.779Z |
| F08 | 8 | 금지 | GET /api/notes/export (토큰 없음) | HTTP 401 또는 404 | HTTP 401 | 기대와 같음 | `icn1::iad1::dk7dc-1791872023241-63f3b20cd9cd` | 2026-10-13T06:14:03.994Z |
| F09 | 8 | 금지 | GET /api/notices?id=notice-01 (토큰 없음) | HTTP 401 | HTTP 401 | 기대와 같음 | `icn1::iad1::gcrr4-1791872023456-0a075100f968` | 2026-10-13T06:14:04.909Z |
| F10 | 11 | 금지 | GET /api/device (토큰·서명 없음) | HTTP 401, 승인으로 처리 안 함 | HTTP 401 | 기대와 같음 | `icn1::iad1::xpg22-1791872024373-fc2624cedaa1` | 2026-10-13T06:14:06.019Z |
| F11 | 10 | 금지 | HEAD /api/restore | 복원 없이 HTTP 401 또는 405 | HTTP 405 | 기대와 같음 | `icn1::iad1::lh6zs-1791872025492-07c85b563b98` | 2026-10-13T06:14:06.826Z |
| F12 | 12 | 금지 | GET /api/ops (토큰 없음) | HTTP 401, 작전실 기록 없음 | HTTP 401 | 기대와 같음 | `icn1::iad1::fqkds-1791872026303-5cf2ee8d320a` | 2026-10-13T06:14:07.792Z |
| W01 | 3 | 금지 | POST /api/notes (토큰 없음) | HTTP 401, 저장 없음 | not_run (격리 환경은 GET·HEAD만 허용) | 미실행 | - | - |
| W02 | 10 | 금지 | POST /api/restore (토큰 없음) | HTTP 401, 저장 없음 | not_run (격리 환경은 GET·HEAD만 허용) | 미실행 | - | - |
| W03 | 8 | 금지 | PUT /api/notices?id=notice-01 (토큰 없음) | HTTP 401, 저장 없음 | not_run (격리 환경은 GET·HEAD만 허용) | 미실행 | - | - |
| L01 | 6 | 정상 | 판정기: 등록 기기 정상 요청 | allow | allow · approved | 기대와 같음 | `a7b588d6-73d9-4d3f-989b-4ce6322f8dbb` | 2026-10-13T06:14:07.795Z |
| L02 | 6 | 금지 | 판정기: 미등록 가상 기기 요청 | deny | deny · device_not_registered | 기대와 같음 | `d012531f-d5de-4f94-b8da-de386d78ee4c` | 2026-10-13T06:14:07.795Z |
| L03 | 7 | 금지 | 판정기: 복합 이상 접속 (재확인 전) | step_up | step_up · step_up_required | 기대와 같음 | `29c0129d-a8d3-4cb6-83d1-1fb8734c79bd` | 2026-10-13T06:14:07.795Z |
| L04 | 7 | 정상 | 판정기: 복합 이상 접속 (재확인 뒤) | allow | allow · approved | 기대와 같음 | `a179c2e4-042f-4a62-8ff5-a533f2c822cb` | 2026-10-13T06:14:07.795Z |
| L05 | 8 | 금지 | 판정기: B가 A 메모 읽기 | deny | deny · zone_owner_forbidden | 기대와 같음 | `4451eb0b-dc09-4ee0-8ff1-4fb4c438ae40` | 2026-10-13T06:14:07.795Z |
| L06 | 8 | 정상 | 판정기: B가 자기 메모 읽기 | allow | allow · approved | 기대와 같음 | `0f97639e-312e-4654-8618-9877f61d0560` | 2026-10-13T06:14:07.795Z |
| L07 | 8 | 금지 | 판정기: 학생 공지 수정 | deny | deny · instructor_notice_forbidden | 기대와 같음 | `39041bb5-ec2f-4a6b-a1c4-ec083aa4db1c` | 2026-10-13T06:14:07.795Z |
| L08 | 8 | 금지 | 판정기: 메모 전체 목록 | deny | deny · zone_owner_forbidden | 기대와 같음 | `3c4fb4df-0a3b-4dfa-900b-5e10db308c6f` | 2026-10-13T06:14:07.795Z |
| L09 | 9 | 금지 | 탐지기: 낯선 네트워크 + 10분 150건 가상 사건 | propose_revocation (기기 1개) | propose_revocation · burst_read · 기기 1개 | 기대와 같음 | `9cd335dd-1917-4d58-ba6e-a1a792c0f78a` | 2026-10-13T06:14:07.796Z |
| L10 | 9 | 정상 | 탐지기: 평소 네트워크 30건 | observe | observe | 기대와 같음 | `5ed6ac02-594c-4cc2-83c7-4594d572c49d` | 2026-10-13T06:14:07.796Z |
| L11 | 9 | 정상 | 탐지기: 지역만 다른 150건 | observe | observe | 기대와 같음 | `015e5032-d2ef-4c0a-8685-dae0121af19c` | 2026-10-13T06:14:07.797Z |
| L12 | 10 | 정상 | 정책 사본 다시 읽기·SHA-256 검증 | 검증 통과 | 검증 통과 · v9-9f13368 | 기대와 같음 | `a35315c1-c595-4d71-8d0c-0386ca34a9c1` | 2026-10-13T06:14:07.799Z |
| L13 | 10 | 금지 | 복원한 시험 정책: B가 A 메모 읽기 / A 자기 메모 | deny / allow | deny / allow | 기대와 같음 | `f1ca159a-a32c-4c66-afd5-faf64baa0567` | 2026-10-13T06:14:07.800Z |
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
| 2 | BUILT_BUNDLE_SECRET_SCAN | 배포 번들에서 시험 비밀값을 검색 | 실측 막음 | F05 |
| 2 | REPOSITORY_SECRET_SCAN | 제출 커밋에서 시험 비밀값을 검색 | 미실행 | - |
| 2 | STATIC_SEED_DATA_SCAN | 공개 정적 파일에서 개인 메모 시드를 검색 | 실측 막음 | F04 |
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
| 5 | ORIGIN_ALIAS_BYPASS | 공개 정적 파일과 브라우저 묶음에서 서버 전용 키·시드 표식 검색 | 실측 막음 | F05, F06, F04 |
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
