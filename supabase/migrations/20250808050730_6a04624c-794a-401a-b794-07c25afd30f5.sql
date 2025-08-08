-- Create function to increment user balance
CREATE OR REPLACE FUNCTION increment_user_balance(user_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users 
  SET balance = balance + amount 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle task completion and balance update
CREATE OR REPLACE FUNCTION complete_task_and_update_balance(task_id UUID, user_id UUID)
RETURNS VOID AS $$
DECLARE
  task_reward NUMERIC;
BEGIN
  -- Get the task reward and mark as completed
  UPDATE public.tasks 
  SET completed = true 
  WHERE id = task_id AND user_id = user_id AND completed = false
  RETURNING reward INTO task_reward;
  
  -- Update user balance if task was found and updated
  IF task_reward IS NOT NULL THEN
    UPDATE public.users 
    SET balance = balance + task_reward 
    WHERE id = user_id;
    
    -- Insert transaction record
    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (user_id, 'credit', task_reward, 'Task completion reward');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;