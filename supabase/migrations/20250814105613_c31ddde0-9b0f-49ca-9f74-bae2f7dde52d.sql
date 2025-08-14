-- Fix autodivinedestiny@gmail.com deposits and balance
-- Update their pending deposits to success and credit their balance

DO $$
DECLARE
  user_uuid uuid := '65421c88-7fd9-4f3d-a4fa-553f71cc533b';
  total_deposit_amount numeric := 0;
  deposit_record RECORD;
  ref_code text;
  referrer_user_id uuid;
  referrer_bonus numeric;
  referred_bonus numeric;
  first_deposit_amount numeric;
BEGIN
  -- Update all pending deposits for this user to success
  UPDATE public.deposits 
  SET status = 'success' 
  WHERE user_id = user_uuid AND status = 'pending';
  
  -- Calculate total successful deposits for this user
  SELECT SUM(amount) INTO total_deposit_amount
  FROM public.deposits 
  WHERE user_id = user_uuid AND status = 'success';
  
  -- Update user balance
  UPDATE public.users 
  SET balance = total_deposit_amount 
  WHERE id = user_uuid;
  
  -- Create transaction records for all deposits
  FOR deposit_record IN 
    SELECT amount, reference FROM public.deposits 
    WHERE user_id = user_uuid AND status = 'success'
  LOOP
    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (user_uuid, 'credit', deposit_record.amount, 'Deposit via Paystack - ' || deposit_record.reference);
  END LOOP;
  
  -- Handle referral bonus for first deposit (they were referred by 05FE9AF6)
  SELECT referred_by INTO ref_code FROM public.users WHERE id = user_uuid;
  
  IF ref_code IS NOT NULL AND ref_code != '' THEN
    -- Find referrer
    SELECT id INTO referrer_user_id 
    FROM public.users 
    WHERE referral_code = upper(ref_code) 
    LIMIT 1;
    
    IF referrer_user_id IS NOT NULL AND referrer_user_id != user_uuid THEN
      -- Get first deposit amount
      SELECT amount INTO first_deposit_amount
      FROM public.deposits 
      WHERE user_id = user_uuid AND status = 'success'
      ORDER BY created_at ASC
      LIMIT 1;
      
      -- Calculate bonuses
      referrer_bonus := ROUND(first_deposit_amount * 0.10, 2);
      referred_bonus := ROUND(first_deposit_amount * 0.05, 2);
      
      -- Credit additional bonuses
      UPDATE public.users SET balance = balance + referrer_bonus WHERE id = referrer_user_id;
      UPDATE public.users SET balance = balance + referred_bonus WHERE id = user_uuid;
      
      -- Add bonus transactions
      INSERT INTO public.transactions (user_id, type, amount, description)
      VALUES
        (referrer_user_id, 'credit', referrer_bonus, 'Referral bonus (10%) from referred user first deposit'),
        (user_uuid, 'credit', referred_bonus, 'Welcome bonus (5%) for first deposit via referral');
      
      -- Update referral record
      UPDATE public.referrals
      SET first_deposit_bonus_awarded = true,
          first_deposit_amount = first_deposit_amount,
          awarded_at = now()
      WHERE referrer_id = referrer_user_id AND referred_id = user_uuid;
      
      RAISE NOTICE 'Awarded referral bonuses: referrer got %, referred got %', referrer_bonus, referred_bonus;
    END IF;
  END IF;
  
  RAISE NOTICE 'Fixed balance for user autodivinedestiny@gmail.com: credited total %', total_deposit_amount;
END $$;