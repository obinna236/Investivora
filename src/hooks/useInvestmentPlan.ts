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
      // Get user's current balance
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('balance')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user balance:', userError);
        toast({
          title: "Error",
          description: "Failed to check your balance. Please try again.",
          variant: "destructive"
        });
        return;
      }

      const currentBalance = userData?.balance || 0;

      // Check if user has sufficient balance
      if (currentBalance < plan.price) {
        toast({
          title: "Insufficient Balance",
          description: `You need ₦${plan.price.toLocaleString()} to purchase the ${plan.name} plan. Please deposit funds first.`,
          variant: "destructive"
        });
        // Redirect to deposit page
        navigate('/deposit');
        return;
      }

      // Deduct amount from user balance
      const newBalance = currentBalance - plan.price;
      const { error: updateError } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating balance:', updateError);
        toast({
          title: "Purchase Failed",
          description: "Failed to process your purchase. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'debit',
          amount: plan.price,
          description: `Investment plan purchase - ${plan.name}`
        });

      toast({
        title: "Purchase Successful",
        description: `You have successfully purchased the ${plan.name} plan!`,
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