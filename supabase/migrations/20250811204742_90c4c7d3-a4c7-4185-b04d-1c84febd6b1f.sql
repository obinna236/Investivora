-- Task templates to define daily, plan-specific tasks with links and rewards
CREATE TABLE IF NOT EXISTS public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  link_url text,
  embed_url text,
  duration_seconds integer NOT NULL DEFAULT 30 CHECK (duration_seconds > 0),
  plan_id text NOT NULL,
  reward numeric NOT NULL DEFAULT 0 CHECK (reward >= 0),
  active_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY IF NOT EXISTS "Admins can view all task templates"
ON public.task_templates
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY IF NOT EXISTS "Admins can insert task templates"
ON public.task_templates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY IF NOT EXISTS "Admins can update task templates"
ON public.task_templates
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY IF NOT EXISTS "Admins can delete task templates"
ON public.task_templates
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view today's active tasks for their plan
CREATE POLICY IF NOT EXISTS "Users can view today's templates for their plan"
ON public.task_templates
FOR SELECT
USING (
  is_active = true
  AND active_date = CURRENT_DATE
  AND plan_id = (SELECT active_plan_id FROM public.users WHERE id = auth.uid())
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_task_templates_active_date ON public.task_templates(active_date);
CREATE INDEX IF NOT EXISTS idx_task_templates_plan_date ON public.task_templates(plan_id, active_date);

-- Per-user task status to prevent duplicates and enforce timer
CREATE TABLE IF NOT EXISTS public.user_task_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_template_id uuid NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  started_at timestamptz,
  completed_at timestamptz,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_task_unique UNIQUE (user_id, task_template_id)
);

ALTER TABLE public.user_task_status ENABLE ROW LEVEL SECURITY;

-- RLS for user_task_status
CREATE POLICY IF NOT EXISTS "Admins can view all user task statuses"
ON public.user_task_status
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY IF NOT EXISTS "Users can view their user task statuses"
ON public.user_task_status
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can create their user task statuses"
ON public.user_task_status
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their user task statuses"
ON public.user_task_status
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to start a task (records start time, validates eligibility)
CREATE OR REPLACE FUNCTION public.start_task(template_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_plan text;
  template_plan text;
  template_active_date date;
  template_is_active boolean;
BEGIN
  -- Validate template is for today and active, and matches user's plan
  SELECT plan_id, active_date, is_active
  INTO template_plan, template_active_date, template_is_active
  FROM public.task_templates
  WHERE id = template_id;

  IF template_plan IS NULL THEN
    RAISE EXCEPTION 'Task template not found';
  END IF;

  SELECT active_plan_id INTO user_plan FROM public.users WHERE id = _user_id;

  IF user_plan IS NULL OR user_plan <> template_plan THEN
    RAISE EXCEPTION 'Task not available for your plan';
  END IF;

  IF template_active_date <> CURRENT_DATE OR template_is_active = false THEN
    RAISE EXCEPTION 'Task not active today';
  END IF;

  INSERT INTO public.user_task_status (user_id, task_template_id, started_at)
  VALUES (_user_id, template_id, now())
  ON CONFLICT (user_id, task_template_id)
  DO UPDATE SET started_at = COALESCE(public.user_task_status.started_at, EXCLUDED.started_at);
END;
$function$;

-- Function to complete a task after required seconds and credit reward
CREATE OR REPLACE FUNCTION public.complete_task_by_template(template_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  reward_amount numeric;
  required_seconds int;
  started_time timestamptz;
  updated_row public.user_task_status%ROWTYPE;
BEGIN
  -- Get template details
  SELECT reward, duration_seconds
  INTO reward_amount, required_seconds
  FROM public.task_templates
  WHERE id = template_id
    AND is_active = true
    AND active_date = CURRENT_DATE;

  IF reward_amount IS NULL THEN
    RAISE EXCEPTION 'Task template not active today';
  END IF;

  -- Verify started and required time elapsed
  SELECT started_at INTO started_time
  FROM public.user_task_status
  WHERE user_id = _user_id AND task_template_id = template_id;

  IF started_time IS NULL THEN
    RAISE EXCEPTION 'Task not started';
  END IF;

  IF now() < started_time + make_interval(secs => required_seconds) THEN
    RAISE EXCEPTION 'You must spend at least % seconds on the task', required_seconds;
  END IF;

  -- Mark completed if not already
  UPDATE public.user_task_status
  SET completed = true, completed_at = now()
  WHERE user_id = _user_id
    AND task_template_id = template_id
    AND completed = false
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    -- Either already completed or row missing
    RAISE EXCEPTION 'Task already completed or not started';
  END IF;

  -- Credit user and record transaction
  UPDATE public.users
  SET balance = balance + reward_amount
  WHERE id = _user_id;

  INSERT INTO public.transactions (user_id, type, amount, description)
  VALUES (_user_id, 'credit', reward_amount, 'Task completion reward');
END;
$function$;