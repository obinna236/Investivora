import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

const PAYSTACK_PUBLIC_KEY = 'pk_live_def7dc8da6b023edb7c1c5de995247e9b75917eb';

interface PaystackConfig {
  email: string;
  amount: number; // in kobo (smallest currency unit)
  currency?: string;
  reference?: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

interface PaystackResponse {
  reference: string;
  trans: string;
  status: string;
  message: string;
  transaction: string;
  trxref: string;
}

export const usePaystack = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const initializePayment = useCallback(async (config: PaystackConfig) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to make a payment",
        variant: "destructive"
      });
      return;
    }

    try {
      // Call edge function to initialize payment
      const { data, error } = await supabase.functions.invoke('paystack-initialize', {
        body: {
          email: config.email,
          amount: config.amount,
          currency: config.currency || 'NGN',
          metadata: {
            user_id: user.id,
            ...config.metadata
          }
        }
      });

      if (error) throw error;

      // Redirect to Paystack checkout with callback URL
      if (data?.authorization_url) {
        const callbackUrl = `${window.location.origin}/payment-success`;
        const urlWithCallback = `${data.authorization_url}&callback_url=${encodeURIComponent(callbackUrl)}`;
        window.location.href = urlWithCallback;
      }

      return data;
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }, [user, toast]);

  const verifyPayment = useCallback(async (reference: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('paystack-verify', {
        body: { reference }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Payment verification error:', error);
      toast({
        title: "Verification Error",
        description: "Failed to verify payment. Please contact support.",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  return {
    initializePayment,
    verifyPayment
  };
};