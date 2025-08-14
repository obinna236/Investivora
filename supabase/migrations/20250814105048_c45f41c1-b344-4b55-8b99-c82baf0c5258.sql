-- Trigger referral bonuses for existing users manually
-- This will award bonuses for first-time depositors who were referred

DO $$
DECLARE
  user_record RECORD;
  ref_code text;
  referrer_user_id uuid;
  referrer_bonus numeric;
  referred_bonus numeric;
BEGIN
  -- Process each user's first successful deposit for referral bonuses
  FOR user_record IN 
    SELECT DISTINCT ON (u.id) 
      u.id as user_id, 
      u.referred_by,
      d.amount,
      d.created_at
    FROM users u
    JOIN deposits d ON u.id = d.user_id
    WHERE d.status = 'success' 
      AND u.referred_by IS NOT NULL
      AND u.referred_by != ''
      AND NOT EXISTS (
        SELECT 1 FROM referrals r 
        WHERE r.referred_id = u.id AND r.first_deposit_bonus_awarded = true
      )
    ORDER BY u.id, d.created_at ASC
  LOOP
    ref_code := user_record.referred_by;
    
    -- Find referrer
    SELECT id INTO referrer_user_id 
    FROM public.users 
    WHERE referral_code = upper(ref_code) 
    LIMIT 1;
    
    -- Skip if referrer not found or self-referral
    IF referrer_user_id IS NULL OR referrer_user_id = user_record.user_id THEN
      CONTINUE;
    END IF;
    
    -- Calculate bonuses
    referrer_bonus := ROUND(user_record.amount * 0.10, 2);
    referred_bonus := ROUND(user_record.amount * 0.05, 2);
    
    -- Credit balances
    UPDATE public.users 
    SET balance = balance + referrer_bonus 
    WHERE id = referrer_user_id;
    
    UPDATE public.users 
    SET balance = balance + referred_bonus 
    WHERE id = user_record.user_id;
    
    -- Add transactions
    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES
      (referrer_user_id, 'credit', referrer_bonus, 'Referral bonus (10%) from referred user first deposit'),
      (user_record.user_id, 'credit', referred_bonus, 'Welcome bonus (5%) for first deposit via referral');
    
    -- Create or update referral record
    INSERT INTO public.referrals (referrer_id, referred_id, referred_email, first_deposit_bonus_awarded, first_deposit_amount, awarded_at)
    SELECT referrer_user_id, user_record.user_id, u.email, true, user_record.amount, now()
    FROM users u WHERE u.id = user_record.user_id
    ON CONFLICT (referrer_id, referred_id) 
    DO UPDATE SET 
      first_deposit_bonus_awarded = true,
      first_deposit_amount = user_record.amount,
      awarded_at = now();
    
    RAISE NOTICE 'Awarded referral bonus: referrer % got %, referred % got %', referrer_user_id, referrer_bonus, user_record.user_id, referred_bonus;
  END LOOP;
END $$;