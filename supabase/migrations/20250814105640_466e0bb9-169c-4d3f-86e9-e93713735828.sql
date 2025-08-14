-- Simple fix for autodivinedestiny@gmail.com deposits and balance
-- Update their pending deposits to success and credit their balance

DO $$
DECLARE
  user_uuid uuid := '65421c88-7fd9-4f3d-a4fa-553f71cc533b';
  total_amount numeric := 100000; -- 2 deposits of 50000 each
BEGIN
  -- Update all pending deposits for this user to success
  UPDATE public.deposits 
  SET status = 'success' 
  WHERE user_id = user_uuid AND status = 'pending';
  
  -- Update user balance to reflect both deposits
  UPDATE public.users 
  SET balance = total_amount 
  WHERE id = user_uuid;
  
  -- Create transaction records for both deposits
  INSERT INTO public.transactions (user_id, type, amount, description)
  VALUES 
    (user_uuid, 'credit', 50000, 'Deposit via Paystack - 5d8gdbj3yf'),
    (user_uuid, 'credit', 50000, 'Deposit via Paystack - x75ydfvzi9');
  
  -- Add referral bonuses separately
  -- First deposit referral bonus (5% for referred user)
  UPDATE public.users 
  SET balance = balance + 2500 
  WHERE id = user_uuid;
  
  INSERT INTO public.transactions (user_id, type, amount, description)
  VALUES (user_uuid, 'credit', 2500, 'Welcome bonus (5%) for first deposit via referral');
  
  RAISE NOTICE 'Fixed balance for autodivinedestiny@gmail.com: total balance now %', total_amount + 2500;
END $$;