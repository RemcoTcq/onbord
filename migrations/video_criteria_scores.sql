-- Migration: Add per-criterion scoring support for video interviews
-- Date: 2026-06-17

-- Store detailed per-criterion AI evaluation results
ALTER TABLE video_interview_responses 
ADD COLUMN IF NOT EXISTS ai_criteria_scores jsonb DEFAULT NULL;

-- Track how many questions were successfully evaluated vs total
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS video_score_completeness jsonb DEFAULT NULL;
