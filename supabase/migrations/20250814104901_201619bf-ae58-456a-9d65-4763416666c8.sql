-- Fix existing completed deposits to success and trigger referral bonuses for users who deserve them

-- Update all 'completed' deposits to 'success' to trigger referral bonuses
UPDATE public.deposits 
SET status = 'success' 
WHERE status = 'completed';

-- Manually award referral bonuses for users who made their first successful deposits
-- This will credit referrers with 10% and new users with 5% for their first deposits
DO $$
DECLARE
  deposit_record RECORD;
  ref_code text;
  referrer_id uuid;
  referrer_bonus numeric;
  referred_bonus numeric;
BEGIN
  -- Process each user's first successful deposit for referral bonuses
  FOR deposit_record IN 
    SELECT DISTINCT ON (user_id) 
      user_id, amount, reference
    FROM public.deposits 
    WHERE status = 'success' 
    ORDER BY user_id, created_at ASC
  LOOP
    -- Get user's referral code
    SELECT referred_by INTO ref_code 
    FROM public.users 
    WHERE id = deposit_record.user_id;
    
    -- Skip if no referral code
    IF ref_code IS NULL OR length(trim(ref_code)) = 0 THEN
      CONTINUE;
    END IF;
    
    -- Find referrer
    SELECT id INTO referrer_id 
    FROM public.users 
    WHERE referral_code = upper(ref_code) 
    LIMIT 1;
    
    -- Skip if referrer not found or self-referral
    IF referrer_id IS NULL OR referrer_id = deposit_record.user_id THEN
      CONTINUE;
    END IF;
    
    -- Check if bonus already awarded
    IF EXISTS (
      SELECT 1 FROM public.referrals 
      WHERE referrer_id = referrer_id 
        AND referred_id = deposit_record.user_id 
        AND first_deposit_bonus_awarded = true
    ) THEN
      CONTINUE;
    END IF;
    
    -- Calculate bonuses
    referrer_bonus := ROUND(deposit_record.amount * 0.10, 2);
    referred_bonus := ROUND(deposit_record.amount * 0.05, 2);
    
    -- Credit balances
    UPDATE public.users 
    SET balance = balance + referrer_bonus 
    WHERE id = referrer_id;
    
    UPDATE public.users 
    SET balance = balance + referred_bonus 
    WHERE id = deposit_record.user_id;
    
    -- Add transactions
    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES
      (referrer_id, 'credit', referrer_bonus, 'Referral bonus (10%) from referred user first deposit'),
      (deposit_record.user_id, 'credit', referred_bonus, 'Welcome bonus (5%) for first deposit via referral');
    
    -- Mark referral record as awarded
    UPDATE public.referrals
    SET first_deposit_bonus_awarded = true,
        first_deposit_amount = deposit_record.amount,
        awarded_at = now()
    WHERE referrer_id = referrer_id AND referred_id = deposit_record.user_id;
    
    RAISE NOTICE 'Awarded referral bonus for user % (amount: %)', deposit_record.user_id, deposit_record.amount;
  END LOOP;
END $$;