-- Fix linter: set immutable search_path for functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Update existing functions to set search_path
CREATE OR REPLACE FUNCTION public.increment_user_balance(user_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE public.users 
  SET balance = balance + amount 
  WHERE id = user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_task_and_update_balance(task_id uuid, user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
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
$function$;