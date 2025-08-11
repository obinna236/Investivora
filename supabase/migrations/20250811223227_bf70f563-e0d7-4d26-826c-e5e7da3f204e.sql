-- Add TTL column for withdrawals
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS expire_at timestamptz;

-- Ensure insert trigger exists (deduct balance & log debit)
CREATE OR REPLACE FUNCTION public.handle_withdrawal_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_balance numeric;
BEGIN
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be greater than 0';
  END IF;
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Withdrawal must have a user_id';
  END IF;

  -- Lock user row to prevent race conditions
  SELECT balance INTO current_balance FROM public.users WHERE id = NEW.user_id FOR UPDATE;
  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF current_balance < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient balance for withdrawal';
  END IF;

  -- Deduct balance immediately when withdrawal is created
  UPDATE public.users
  SET balance = balance - NEW.amount
  WHERE id = NEW.user_id;

  -- Record a debit transaction
  INSERT INTO public.transactions (user_id, type, amount, description)
  VALUES (NEW.user_id, 'debit', NEW.amount, 'Withdrawal request submitted');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_insert ON public.withdrawals;
CREATE TRIGGER trg_withdrawal_insert
BEFORE INSERT ON public.withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.handle_withdrawal_insert();

-- Update trigger: set TTL on approval/rejection and refund on rejection
CREATE OR REPLACE FUNCTION public.handle_withdrawal_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Apply TTL when finalized (approved or rejected)
  IF NEW.status IN ('approved','rejected') AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.expire_at IS NULL) THEN
    NEW.expire_at = now() + interval '1 minute';
  END IF;

  -- Refund on transition to rejected only
  IF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    UPDATE public.users
    SET balance = balance + COALESCE(NEW.amount, 0)
    WHERE id = NEW.user_id;

    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (NEW.user_id, 'credit', NEW.amount, 'Withdrawal request rejected - refund');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_update ON public.withdrawals;
CREATE TRIGGER trg_withdrawal_update
BEFORE UPDATE OF status ON public.withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.handle_withdrawal_update();