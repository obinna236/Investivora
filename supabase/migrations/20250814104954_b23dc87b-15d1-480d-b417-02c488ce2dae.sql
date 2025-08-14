-- Manually credit balances for existing users who made deposits
-- Add missing deposit amounts to user balances and create transaction records

DO $$
DECLARE
  user_record RECORD;
  total_deposits numeric;
BEGIN
  -- For each user who made successful deposits, ensure their balance reflects the deposits
  FOR user_record IN 
    SELECT 
      d.user_id,
      u.balance as current_balance,
      SUM(d.amount) as total_deposit_amount,
      MIN(d.created_at) as first_deposit_date
    FROM deposits d
    JOIN users u ON d.user_id = u.id
    WHERE d.status = 'success'
    GROUP BY d.user_id, u.balance
    HAVING u.balance < SUM(d.amount)
  LOOP
    -- Calculate missing balance
    total_deposits := user_record.total_deposit_amount - user_record.current_balance;
    
    IF total_deposits > 0 THEN
      -- Update user balance
      UPDATE public.users 
      SET balance = balance + total_deposits 
      WHERE id = user_record.user_id;
      
      -- Create transaction record for the missing balance
      INSERT INTO public.transactions (user_id, type, amount, description)
      VALUES (user_record.user_id, 'credit', total_deposits, 'Balance correction for missed deposits');
      
      RAISE NOTICE 'Credited % balance for user %', total_deposits, user_record.user_id;
    END IF;
  END LOOP;
END $$;