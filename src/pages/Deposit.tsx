import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { usePaystack } from '@/hooks/usePaystack';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Wallet, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface DepositForm {
  amount: number;
}

export default function Deposit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { initializePayment } = usePaystack();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<DepositForm>();

  const onSubmit = async (data: DepositForm) => {
    if (!user) return;

    setLoading(true);
    try {
      // Initialize Paystack payment
      await initializePayment({
        email: user.email || '',
        amount: data.amount,
        metadata: {
          user_id: user.id,
          type: 'deposit'
        }
      });

      toast({
        title: "Redirecting to Payment",
        description: "You will be redirected to complete your payment"
      });

    } catch (error) {
      console.error('Error initializing payment:', error);
      toast({
        title: "Error",
        description: "Failed to initialize payment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Make a Deposit</h1>
        <p className="text-muted-foreground mt-2">Fund your investment account</p>
      </div>

      {/* Deposit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Deposit Funds
          </CardTitle>
          <CardDescription>
            Enter the amount you want to deposit to your investment account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (₦)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter deposit amount"
                {...register('amount', {
                  required: 'Amount is required',
                  min: { value: 100, message: 'Minimum deposit is ₦100' },
                  max: { value: 1000000, message: 'Maximum deposit is ₦1,000,000' }
                })}
              />
              {errors.amount && (
                <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Processing...' : 'Pay with Paystack'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Payment Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Bank Transfer Details</h3>
            <div className="space-y-1 text-sm">
              <p><strong>Bank:</strong> Example Bank</p>
              <p><strong>Account Name:</strong> InvestApp Limited</p>
              <p><strong>Account Number:</strong> 1234567890</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</div>
              <div>
                <p className="font-medium">Submit deposit request</p>
                <p className="text-sm text-muted-foreground">Fill out the form above with your deposit amount</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</div>
              <div>
                <p className="font-medium">Make bank transfer</p>
                <p className="text-sm text-muted-foreground">Transfer the exact amount to our bank account</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</div>
              <div>
                <p className="font-medium">Wait for confirmation</p>
                <p className="text-sm text-muted-foreground">Your deposit will be confirmed within 24 hours</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Amounts */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Amounts</CardTitle>
          <CardDescription>Select a common deposit amount</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1000, 5000, 10000, 50000].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                onClick={() => {
                  const event = { target: { value: amount.toString() } };
                  register('amount').onChange(event);
                }}
                className="h-12"
              >
                ₦{amount.toLocaleString()}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Processing Time
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Bank Transfer</span>
            <Badge variant="outline">24 hours</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Minimum Deposit</span>
            <Badge>₦100</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Maximum Deposit</span>
            <Badge>₦1,000,000</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}