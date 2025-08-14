-- Add withdrawal tracking columns to users table
ALTER TABLE public.users 
ADD COLUMN total_withdrawn NUMERIC DEFAULT 0,
ADD COLUMN withdrawal_limit NUMERIC DEFAULT 0;

-- Update withdrawal limits based on existing plans
UPDATE public.users 
SET withdrawal_limit = CASE 
  WHEN active_plan_id = 'basic' THEN 1500
  WHEN active_plan_id = 'premium' THEN 3000
  WHEN active_plan_id = 'pro' THEN 7000
  WHEN active_plan_id = 'diamond' THEN 40000
  ELSE 0
END
WHERE active_plan_id IS NOT NULL;