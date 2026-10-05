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
