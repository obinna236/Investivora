-- 1) Add referral award tracking columns
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS first_deposit_bonus_awarded boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS first_deposit_amount numeric,
ADD COLUMN IF NOT EXISTS awarded_at timestamptz;

-- 2) Create function to handle referral capture on signup
CREATE OR REPLACE FUNCTION public.handle_referral_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  ref_code text;
  referrer uuid;
BEGIN
  -- Read referral code from auth metadata provided at signup
  ref_code := COALESCE(NEW.raw_user_meta_data->>'referred_by', NULL);
  IF ref_code IS NULL OR length(trim(ref_code)) = 0 THEN
    RETURN NEW;
  END IF;

  -- Normalize to uppercase
  ref_code := upper(ref_code);

  -- Lookup referrer by public.users.referral_code
  SELECT id INTO referrer
  FROM public.users
  WHERE referral_code = ref_code
  LIMIT 1;

  -- Ignore missing or self-referrals
  IF referrer IS NULL OR referrer = NEW.id THEN
    RETURN NEW;
  END IF;

  -- Ensure users row exists and persist referred_by
  INSERT INTO public.users (id, email, full_name, referral_code, balance, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    UPPER(SUBSTRING(MD5(NEW.id::text) FROM 1 FOR 8)),
    0,
    ref_code
  )
  ON CONFLICT (id) DO UPDATE
  SET referred_by = EXCLUDED.referred_by;

  -- Record referral link if not already present
  INSERT INTO public.referrals (referrer_id, referred_id, referred_email)
  VALUES (referrer, NEW.id, NEW.email)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$fn$;

-- 3) Ensure triggers on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_referral ON auth.users;
CREATE TRIGGER on_auth_user_created_referral
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_referral_on_signup();

-- 4) Award referral bonuses on first successful deposit
CREATE OR REPLACE FUNCTION public.award_referral_bonus_on_first_successful_deposit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $body$
DECLARE
  prior_success_count int;
  depositor uuid;
  ref_code text;
  referrer_id uuid;
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
  SELECT id INTO referrer_id FROM public.users WHERE referral_code = upper(ref_code) LIMIT 1;
  IF referrer_id IS NULL OR referrer_id = depositor THEN
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
  UPDATE public.users SET balance = balance + referrer_bonus WHERE id = referrer_id;
  UPDATE public.users SET balance = balance + referred_bonus WHERE id = depositor;

  -- Add transactions
  INSERT INTO public.transactions (user_id, type, amount, description)
  VALUES
    (referrer_id, 'credit', referrer_bonus, 'Referral bonus (10%) from referred user first deposit'),
    (depositor, 'credit', referred_bonus, 'Welcome bonus (5%) for first deposit via referral');

  -- Mark referral record as awarded
  UPDATE public.referrals
  SET first_deposit_bonus_awarded = true,
      first_deposit_amount = amt,
      awarded_at = now()
  WHERE referrer_id = referrer_id AND referred_id = depositor;

  RETURN NEW;
END;
$body$;

DROP TRIGGER IF EXISTS on_deposit_success_referral_bonus ON public.deposits;
CREATE TRIGGER on_deposit_success_referral_bonus
AFTER INSERT OR UPDATE ON public.deposits
FOR EACH ROW
WHEN (NEW.status = 'success')
EXECUTE FUNCTION public.award_referral_bonus_on_first_successful_deposit();