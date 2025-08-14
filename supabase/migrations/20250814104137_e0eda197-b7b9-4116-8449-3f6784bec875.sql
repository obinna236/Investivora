-- Create missing triggers for user signup and referral bonuses

-- Trigger for handling new user signup (creates user profile and handles referrals)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger for handling referral signup
CREATE TRIGGER on_auth_user_referral_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_referral_on_signup();

-- Trigger for awarding referral bonuses on successful deposits
CREATE TRIGGER on_deposit_success_referral_bonus
  AFTER UPDATE ON public.deposits
  FOR EACH ROW
  WHEN (NEW.status = 'success' AND OLD.status IS DISTINCT FROM 'success')
  EXECUTE FUNCTION public.award_referral_bonus_on_first_successful_deposit();