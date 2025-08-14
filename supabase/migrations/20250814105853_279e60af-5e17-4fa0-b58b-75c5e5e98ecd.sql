-- Fix autodivinedestiny@gmail.com balance to only one 50,000 deposit
-- Remove the extra deposit and adjust balance

DO $$
DECLARE
  user_uuid uuid := '65421c88-7fd9-4f3d-a4fa-553f71cc533b';
BEGIN
  -- Set balance to 52,500 (50,000 deposit + 2,500 referral bonus)
  UPDATE public.users 
  SET balance = 52500 
  WHERE id = user_uuid;
  
  -- Remove one of the duplicate deposit transaction records
  DELETE FROM public.transactions 
  WHERE user_id = user_uuid 
    AND description = 'Deposit via Paystack - x75ydfvzi9'
    AND amount = 50000;
  
  -- Update one deposit back to pending status
  UPDATE public.deposits 
  SET status = 'pending' 
  WHERE user_id = user_uuid 
    AND reference = 'x75ydfvzi9';
  
  RAISE NOTICE 'Corrected balance for autodivinedestiny@gmail.com: now 52,500 (50,000 deposit + 2,500 bonus)';
END $$;