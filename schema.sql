-- ==============================================================================
-- BYTE BACK 방어전 데이터베이스 스키마 및 권한 관리 (1~5단계 종합)
-- ==============================================================================

-- 1. 학습용 notes 테이블 생성
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    body TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 가상 메모 4건 데이터 삽입
INSERT INTO public.notes (title, content, body)
VALUES
    ('과제', '실습용 가상 과제 기록', '실습용 가상 과제 기록'),
    ('포트폴리오', '실습용 가상 포트폴리오 기록', '실습용 가상 포트폴리오 기록'),
    ('아침 리추얼', '실습용 가상 리추얼 기록', '실습용 가상 리추얼 기록'),
    ('훈련 행정 자료', '실습용 가상 행정 기록', '실습용 가상 행정 기록')
ON CONFLICT DO NOTHING;

-- 3. body 컬럼 동기화 보완
UPDATE public.notes SET body = content WHERE body IS NULL;

-- 4. 4단계 소유자 ID 할당 (A: 3건, B: 1건)
-- User A (5e5e2177-7eb4-4453-86b7-ed3728b479dc): 과제, 포트폴리오, 아침 리추얼
-- User B (beb71205-ea72-448b-87f1-11ebab475fd7): 훈련 행정 자료
UPDATE public.notes
SET owner_id = '5e5e2177-7eb4-4453-86b7-ed3728b479dc'
WHERE title IN ('과제', '포트폴리오', '아침 리추얼');

UPDATE public.notes
SET owner_id = 'beb71205-ea72-448b-87f1-11ebab475fd7'
WHERE title = '훈련 행정 자료';

-- 5. 5단계 자료 요청 서버 일원화: PUBLIC, anon, authenticated 직접 테이블 접근 권한 완전 회수
REVOKE ALL ON TABLE public.notes FROM PUBLIC, anon, authenticated;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 6. 5단계 적용 전후 권한 확인 방법 (BUILD 2 검증 쿼리)
-- 확인 1: information_schema.role_table_grants 조회 (anon, authenticated 권한이 전혀 없어야 함)
SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'notes';

-- 확인 2: has_table_privilege 함수로 직접 권한 확인 (모두 false 반환되어야 함)
SELECT
    has_table_privilege('anon', 'public.notes', 'select') AS anon_select,
    has_table_privilege('anon', 'public.notes', 'insert') AS anon_insert,
    has_table_privilege('authenticated', 'public.notes', 'select') AS auth_select,
    has_table_privilege('authenticated', 'public.notes', 'insert') AS auth_insert;
