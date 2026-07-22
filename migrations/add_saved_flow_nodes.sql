ALTER TABLE public.jobs
ADD COLUMN saved_flow_nodes JSONB DEFAULT '[]'::jsonb;
