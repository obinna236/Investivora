import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface InvestmentPlan {
  id: string;
  name: string;
  price: number;
}

export const useInvestmentPlan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const purchasePlan = useCallback(async (plan: InvestmentPlan) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase a plan",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get user's current balance and active plan
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('balance, active_plan_id, active_plan_price, active_plan_name')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        toast({
          title: "Error",
          description: "Failed to check your account. Please try again.",
          variant: "destructive"
        });
        return;
      }

      const currentBalance = Number(userData?.balance || 0);
      const currentPlanId = userData?.active_plan_id as string | null;
      const currentPlanPrice = Number(userData?.active_plan_price || 0);

      // Block re-purchasing the same plan
      if (currentPlanId && currentPlanId === plan.id) {
        toast({
          title: "Already Purchased",
          description: `You already own the ${plan.name} plan. You can only upgrade to a higher plan.`,
          variant: "destructive"
        });
        return;
      }

      // Enforce upgrade-only (new plan must be more expensive than current if any)
      if (currentPlanId && plan.price <= currentPlanPrice) {
        toast({
          title: "Upgrade Only",
          description: `You can only upgrade to a plan higher than ₦${currentPlanPrice.toLocaleString()}.`,
          variant: "destructive"
        });
        return;
      }

      // Calculate amount to charge (difference for upgrades)
      const amountToCharge = Math.max(plan.price - currentPlanPrice, 0);

      if (currentBalance < amountToCharge) {
        toast({
          title: "Insufficient Balance",
          description: `You need ₦${amountToCharge.toLocaleString()} to proceed. Please deposit funds first.`,
          variant: "destructive"
        });
        navigate('/deposit');
        return;
      }

      // Update user balance and active plan atomically-ish (single update)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          balance: currentBalance - amountToCharge,
          active_plan_id: plan.id,
          active_plan_name: plan.name,
          active_plan_price: plan.price,
          active_plan_purchased_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating user for purchase:', updateError);
        toast({
          title: "Purchase Failed",
          description: "Failed to process your purchase. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Create transaction record for the charged amount
      if (amountToCharge > 0) {
        await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: 'debit',
            amount: amountToCharge,
            description: currentPlanId
              ? `Upgrade to ${plan.name} plan`
              : `Investment plan purchase - ${plan.name}`
          });
      }

      toast({
        title: "Purchase Successful",
        description: currentPlanId
          ? `Upgraded to ${plan.name} plan!`
          : `You have successfully purchased the ${plan.name} plan!`,
      });

      // Redirect to dashboard
      navigate('/');
    

    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: "Purchase Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  }, [user, toast, navigate]);

  return {
    purchasePlan
  };
};