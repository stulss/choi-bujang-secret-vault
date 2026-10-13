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

-- ==============================================================================
-- 10단계: 비공개 가상 메모 사본과 복구 감사 기록
-- Supabase SQL Editor에서 이 아래 부분만 한 번 실행합니다. 기존 notes 자료는 바꾸지 않습니다.
-- ==============================================================================

-- 7. 메모를 만들 때의 내용과 내용 해시를 남기는 비공개 사본 (서버 전용 키로만 접근)
CREATE TABLE IF NOT EXISTS public.note_backups (
    note_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    content_hash TEXT NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. 복구 요청마다 한 줄씩 추가만 하는 감사 기록 (본문은 남기지 않음)
CREATE TABLE IF NOT EXISTS public.restore_audit (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    note_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    stage TEXT NOT NULL,
    result TEXT NOT NULL,
    action TEXT,
    dry_run BOOLEAN NOT NULL DEFAULT false,
    at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. 사본과 감사 기록은 고치거나 지울 수 없게 막습니다 (서버 전용 키도 동일)
CREATE OR REPLACE FUNCTION public.reject_backup_audit_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS note_backups_append_only ON public.note_backups;
CREATE TRIGGER note_backups_append_only BEFORE UPDATE OR DELETE ON public.note_backups
  FOR EACH ROW EXECUTE FUNCTION public.reject_backup_audit_change();

DROP TRIGGER IF EXISTS restore_audit_append_only ON public.restore_audit;
CREATE TRIGGER restore_audit_append_only BEFORE UPDATE OR DELETE ON public.restore_audit
  FOR EACH ROW EXECUTE FUNCTION public.reject_backup_audit_change();

-- 10. 브라우저 키(anon)와 로그인 사용자(authenticated)의 직접 접근 권한 회수
REVOKE ALL ON TABLE public.note_backups, public.restore_audit FROM PUBLIC, anon, authenticated;
ALTER TABLE public.note_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_audit ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 11단계: 승인 기기 등록부 (기기 공개키만 저장, 개인키는 저장하지 않음)
-- Supabase SQL Editor에서 이 아래 부분만 한 번 실행합니다. 기존 자료와 10단계 테이블은 바꾸지 않습니다.
-- ==============================================================================

-- 11. 서버가 개인키 보유 증명을 확인한 기기만 approved로 기록합니다
CREATE TABLE IF NOT EXISTS public.devices (
    owner_id UUID NOT NULL,
    device_id TEXT NOT NULL CHECK (device_id ~ '^[0-9a-f]{16}$'),
    public_key JSONB NOT NULL CHECK (NOT (public_key ? 'd')),
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (owner_id, device_id)
);

-- 12. 브라우저 키(anon)와 로그인 사용자(authenticated)의 직접 접근 권한 회수
REVOKE ALL ON TABLE public.devices FROM PUBLIC, anon, authenticated;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
