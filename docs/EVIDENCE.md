# 12단계 실측 증거 표

- 생성: `npm run evidence` · 2026-10-13T04:42:51.473Z · 검사한 배포 커밋 `e6441cf884d0f00ca5a6d99f03e296d34516b0bd`
- 행 38개 · 금지 요청 거부 23 / 다름 0 / 미실행 3 · 정상 요청 허용 10 / 다름 0 / 미실행 2
- 41종 공격: 실측 막음 10 · 실측 못 막음 0 · 미실행 31 (막음은 같은 종류의 요청을 실제로 보낸 결과만 셉니다)
- 요청 ID: 배포 주소는 응답 헤더 `x-vercel-id`(원본 API는 `sb-request-id`), 판정기·탐지기는 이번 실행에서 만든 UUID입니다. 표 SHA-256 `ccb942b6949dd4e7…`

| ID | 단계 | 구분 | 요청 | 기대 결과 | 실제 결과 | 판단 | 요청 ID | 확인 시각 |
|---|---|---|---|---|---|---|---|---|
| N01 | 1 | 정상 | GET /aleph.json | HTTP 200, 배포 커밋 확인 | HTTP 200, 커밋 e6441cf | 기대와 같음 | `icn1::wdn2p-1791866543079-9e12eb81b85f` | 2026-10-13T04:42:43.826Z |
| N02 | 11 | 정상 | GET / | HTTP 200 접속 화면 | HTTP 200 | 기대와 같음 | `icn1::2jtkw-1791866543354-1e7c4eafa37c` | 2026-10-13T04:42:44.307Z |
| N03 | 11 | 정상 | GET /manifest.webmanifest | HTTP 200, 앱 이름 있음 | HTTP 200, 이름 있음 | 기대와 같음 | `icn1::qs77v-1791866543822-a0566ad1faec` | 2026-10-13T04:42:44.607Z |
| N04 | 11 | 정상 | GET /offline.html | HTTP 200 오프라인 안내 | HTTP 200 | 기대와 같음 | `icn1::fz4mf-1791866544144-835f5deec2e7` | 2026-10-13T04:42:44.869Z |
| F01 | 1 | 금지 | GET /api/notes (토큰 없음) | HTTP 401, 메모 없음 | HTTP 401 | 기대와 같음 | `icn1::iad1::fz4mf-1791866544396-9889465691c7` | 2026-10-13T04:42:45.180Z |
| F02 | 1 | 금지 | GET /api/notes?id=<가상 UUID> (토큰 없음) | HTTP 401 | HTTP 401 | 기대와 같음 | `icn1::iad1::fsr5l-1791866544693-62103048c612` | 2026-10-13T04:42:45.608Z |
| F03 | 3 | 금지 | GET /api/notes (서명 위조 토큰) | HTTP 401 | HTTP 401 | 기대와 같음 | `icn1::iad1::7tdqh-1791866545119-7b95dec8ff84` | 2026-10-13T04:42:45.823Z |
| F04 | 2 | 금지 | GET /data.json (시드 검색) | 메모 0건, 확인 표식 없음 | HTTP 200, 메모 0건, 표식 없음 | 기대와 같음 | `icn1::7tdqh-1791866545342-a38ded10f0f9` | 2026-10-13T04:42:46.057Z |
| F05 | 2 | 금지 | GET / (배포 화면 비밀값·표식·저장소 검색) | 서버 키·개인키·표식·저장소 저장 코드 없음 | HTTP 200, 비밀값 없음, 표식 없음, 저장소 저장 없음 | 기대와 같음 | `icn1::g6gxt-1791866545577-a7699692b678` | 2026-10-13T04:42:46.088Z |
| F06 | 5 | 금지 | GET /aleph.config.json (서버 키 검색) | 서버 전용 키 없음 | HTTP 200, 서버 키 없음 | 기대와 같음 | `icn1::g6gxt-1791866545603-3877c0bdc70b` | 2026-10-13T04:42:46.329Z |
| F07 | 5 | 금지 | GET 원본 자료 API (공개 키만, 사용자 토큰 없음) | HTTP 401 또는 403 | HTTP 401 | 기대와 같음 | `01a13391-ad27-7a82-98f4-1a27998a78dc` | 2026-10-13T04:42:48.681Z |
| F08 | 8 | 금지 | GET /api/notes/export (토큰 없음) | HTTP 401 또는 404 | HTTP 401 | 기대와 같음 | `icn1::iad1::lhgfh-1791866548203-1f94dea122fc` | 2026-10-13T04:42:48.913Z |
| F09 | 8 | 금지 | GET /api/notices?id=notice-01 (토큰 없음) | HTTP 401 | HTTP 401 | 기대와 같음 | `icn1::iad1::9td6p-1791866548435-6e47759c483c` | 2026-10-13T04:42:49.223Z |
| F10 | 11 | 금지 | GET /api/device (토큰·서명 없음) | HTTP 401, 승인으로 처리 안 함 | HTTP 401 | 기대와 같음 | `icn1::iad1::bmnkc-1791866548753-e5dc67ff997d` | 2026-10-13T04:42:49.547Z |
| F11 | 10 | 금지 | HEAD /api/restore | 복원 없이 HTTP 401 또는 405 | HTTP 405 | 기대와 같음 | `icn1::iad1::lkwtz-1791866549074-ada7e75329c1` | 2026-10-13T04:42:49.797Z |
| F12 | 12 | 금지 | GET /api/ops (토큰 없음) | HTTP 401, 작전실 기록 없음 | HTTP 401 | 기대와 같음 | `icn1::iad1::lkwtz-1791866549309-c2ddb401bd12` | 2026-10-13T04:42:50.088Z |
| W01 | 3 | 금지 | POST /api/notes (토큰 없음) | HTTP 401, 저장 없음 | HTTP 401 | 기대와 같음 | `icn1::iad1::vsf2k-1791866549626-796488fa7b9a` | 2026-10-13T04:42:50.324Z |
| W02 | 10 | 금지 | POST /api/restore (토큰 없음) | HTTP 401, 저장 없음 | HTTP 401 | 기대와 같음 | `icn1::iad1::5xgr4-1791866549835-f052759f1774` | 2026-10-13T04:42:51.139Z |
| W03 | 8 | 금지 | PUT /api/notices?id=notice-01 (토큰 없음) | HTTP 401, 저장 없음 | HTTP 401 | 기대와 같음 | `icn1::iad1::gcrr4-1791866550662-ad9a4c21fa15` | 2026-10-13T04:42:51.389Z |
| L01 | 6 | 정상 | 판정기: 등록 기기 정상 요청 | allow | allow · approved | 기대와 같음 | `53b85e46-01ea-4b15-a39f-58823f5c4079` | 2026-10-13T04:42:51.394Z |
| L02 | 6 | 금지 | 판정기: 미등록 가상 기기 요청 | deny | deny · device_not_registered | 기대와 같음 | `13f445d8-80b6-41b2-b9ee-5f2095c0e6f5` | 2026-10-13T04:42:51.394Z |
| L03 | 7 | 금지 | 판정기: 복합 이상 접속 (재확인 전) | step_up | step_up · step_up_required | 기대와 같음 | `be5d74c1-7d7e-4644-9c67-23955e248bdd` | 2026-10-13T04:42:51.394Z |
| L04 | 7 | 정상 | 판정기: 복합 이상 접속 (재확인 뒤) | allow | allow · approved | 기대와 같음 | `b7e679d0-a6ce-4fae-91c2-fe2d63dfca20` | 2026-10-13T04:42:51.394Z |
| L05 | 8 | 금지 | 판정기: B가 A 메모 읽기 | deny | deny · zone_owner_forbidden | 기대와 같음 | `0a28ba90-3e00-4d13-b573-8c250a25539b` | 2026-10-13T04:42:51.394Z |
| L06 | 8 | 정상 | 판정기: B가 자기 메모 읽기 | allow | allow · approved | 기대와 같음 | `3cbc84a3-1c82-4ff2-84d2-07cdf08ee874` | 2026-10-13T04:42:51.394Z |
| L07 | 8 | 금지 | 판정기: 학생 공지 수정 | deny | deny · instructor_notice_forbidden | 기대와 같음 | `c04321c4-273b-4da4-8919-dcbe278fd425` | 2026-10-13T04:42:51.394Z |
| L08 | 8 | 금지 | 판정기: 메모 전체 목록 | deny | deny · zone_owner_forbidden | 기대와 같음 | `1e94715e-dd81-4d9e-b345-b9fb6254fb4c` | 2026-10-13T04:42:51.394Z |
| L09 | 9 | 금지 | 탐지기: 낯선 네트워크 + 10분 150건 가상 사건 | propose_revocation (기기 1개) | propose_revocation · burst_read · 기기 1개 | 기대와 같음 | `2414c0f5-d3b3-46cc-8b1e-95672dd89eae` | 2026-10-13T04:42:51.395Z |
| L10 | 9 | 정상 | 탐지기: 평소 네트워크 30건 | observe | observe | 기대와 같음 | `8117fd14-2540-4be6-bcf5-11a2e6466e43` | 2026-10-13T04:42:51.395Z |
| L11 | 9 | 정상 | 탐지기: 지역만 다른 150건 | observe | observe | 기대와 같음 | `c486e3cb-3558-4b66-9bdb-d0ba971ec0ed` | 2026-10-13T04:42:51.396Z |
| L12 | 10 | 정상 | 정책 사본 다시 읽기·SHA-256 검증 | 검증 통과 | 검증 통과 · v9-9f13368 | 기대와 같음 | `4f5bc73f-d645-42cc-a95c-8535c5a83203` | 2026-10-13T04:42:51.396Z |
| L13 | 10 | 금지 | 복원한 시험 정책: B가 A 메모 읽기 / A 자기 메모 | deny / allow | deny / allow | 기대와 같음 | `26a32b04-0568-4c3e-a73e-8f6257a018d4` | 2026-10-13T04:42:51.397Z |
| L14 | 2 | 금지 | git grep HEAD (비밀값 검색) | 서버 키·JWT·개인키 0건 | e6441cf에서 0개 파일 | 기대와 같음 | `2a81e93c-f17b-4e33-8df0-73015e947add` | 2026-10-13T04:42:51.473Z |
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
| 2 | REPOSITORY_SECRET_SCAN | 제출 커밋에서 시험 비밀값을 검색 | 실측 막음 | L14 |
| 2 | STATIC_SEED_DATA_SCAN | 공개 정적 파일에서 개인 메모 시드를 검색 | 실측 막음 | F04 |
| 3 | ANONYMOUS_NOTE_WRITE | 인증 없이 개인 메모를 추가 | 실측 막음 | W01 |
| 3 | EXPIRED_LOGIN_TOKEN | 만료된 로그인 토큰으로 조회 | 미실행 | - |
| 3 | FORGED_LOGIN_TOKEN | 서명이 위조된 로그인 토큰으로 조회 | 실측 막음 | F03 |
| 3 | MISSING_LOGIN_TOKEN | 로그인 토큰 없이 보호 API 조회 | 실측 막음 | F01 |
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
| 6 | UNREGISTERED_VIRTUAL_DEVICE_RULE | 판정기에 등록되지 않은 가상 기기 사건을 직접 입력 | 실측 막음 | L02 |
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
