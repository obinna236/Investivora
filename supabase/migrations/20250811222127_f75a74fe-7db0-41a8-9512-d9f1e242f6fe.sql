-- 1) Add bank detail columns to withdrawals to snapshot user-provided info
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS account_name text;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS account_number text;

-- 2) Create function to handle balance deduction and transaction log on insert
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

-- 3) Create function to refund on rejection (status change to 'rejected')
CREATE OR REPLACE FUNCTION public.handle_withdrawal_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only act when status becomes 'rejected' and wasn't rejected before
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

-- 4) Attach triggers
DROP TRIGGER IF EXISTS trg_withdrawal_insert ON public.withdrawals;
CREATE TRIGGER trg_withdrawal_insert
BEFORE INSERT ON public.withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.handle_withdrawal_insert();

DROP TRIGGER IF EXISTS trg_withdrawal_update ON public.withdrawals;
CREATE TRIGGER trg_withdrawal_update
AFTER UPDATE OF status ON public.withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.handle_withdrawal_update();