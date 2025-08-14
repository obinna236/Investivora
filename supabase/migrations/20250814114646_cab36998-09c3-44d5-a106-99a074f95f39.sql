-- Clear balances for all users with investment plans except autodivinedestiny@gmail.com
UPDATE public.users 
SET balance = 0 
WHERE active_plan_id IS NOT NULL 
  AND email != 'autodivinedestiny@gmail.com';