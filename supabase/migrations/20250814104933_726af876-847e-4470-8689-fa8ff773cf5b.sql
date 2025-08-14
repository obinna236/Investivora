-- Fix the referral bonus function and update existing deposits

-- First, fix the ambiguous column reference in the referral bonus function
CREATE OR REPLACE FUNCTION public.award_referral_bonus_on_first_successful_deposit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  prior_success_count int;
  depositor uuid;
  ref_code text;
  referrer_user_id uuid;
  amt numeric;
  referrer_bonus numeric;
  referred_bonus numeric;
BEGIN
  -- Only act on successful deposits
  IF NEW.status <> 'success' THEN
    RETURN NEW;
  END IF;

  depositor := NEW.user_id;
  IF depositor IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check it's the user's first successful deposit
  SELECT COUNT(*) INTO prior_success_count
  FROM public.deposits
  WHERE user_id = depositor AND status = 'success' AND id <> NEW.id;

  IF prior_success_count > 0 THEN
    RETURN NEW;
  END IF;

  -- Get referral code of depositor
  SELECT referred_by INTO ref_code FROM public.users WHERE id = depositor;
  IF ref_code IS NULL OR length(trim(ref_code)) = 0 THEN
    RETURN NEW;
  END IF;

  -- Find referrer by referral_code
  SELECT id INTO referrer_user_id FROM public.users WHERE referral_code = upper(ref_code) LIMIT 1;
  IF referrer_user_id IS NULL OR referrer_user_id = depositor THEN
    RETURN NEW;
  END IF;

  amt := COALESCE(NEW.amount, 0);
  IF amt <= 0 THEN
    RETURN NEW;
  END IF;

  -- Calculate bonuses
  referrer_bonus := ROUND(amt * 0.10, 2);
  referred_bonus := ROUND(amt * 0.05, 2);

  -- Credit balances
  UPDATE public.users SET balance = balance + referrer_bonus WHERE id = referrer_user_id;
  UPDATE public.users SET balance = balance + referred_bonus WHERE id = depositor;

  -- Add transactions
  INSERT INTO public.transactions (user_id, type, amount, description)
  VALUES
    (referrer_user_id, 'credit', referrer_bonus, 'Referral bonus (10%) from referred user first deposit'),
    (depositor, 'credit', referred_bonus, 'Welcome bonus (5%) for first deposit via referral');

  -- Mark referral record as awarded (fix ambiguous reference)
  UPDATE public.referrals
  SET first_deposit_bonus_awarded = true,
      first_deposit_amount = amt,
      awarded_at = now()
  WHERE public.referrals.referrer_id = referrer_user_id AND public.referrals.referred_id = depositor;

  RETURN NEW;
END;
$function$;

-- Update all completed deposits to success
UPDATE public.deposits SET status = 'success' WHERE status = 'completed';