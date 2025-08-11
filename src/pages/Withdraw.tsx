import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Wallet, AlertCircle, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface WithdrawForm {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export default function Withdraw() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<WithdrawForm>();

  const withdrawAmount = watch('amount');

  useEffect(() => {
    const fetchBalance = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from('users')
          .select('balance')
          .eq('id', user.id)
          .single();

        setUserBalance(Number(data?.balance) || 0);
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    };

    fetchBalance();
  }, [user]);

  const onSubmit = async (data: WithdrawForm) => {
    if (!user) return;

    if (data.amount > userBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance for this withdrawal",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount: data.amount,
          status: 'pending',
          bank_name: data.bankName,
          account_number: data.accountNumber,
          account_name: data.accountName,
        });

      if (error) throw error;

      toast({
        title: "Withdrawal Request Submitted",
        description: `Your withdrawal of ₦${data.amount.toLocaleString()} is being processed`
      });

      setUserBalance((b) => Math.max(0, Number(b) - Number(data.amount)));
      reset();
    } catch (error) {
      console.error('Error creating withdrawal:', error);
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Withdraw Funds</h1>
        <p className="text-muted-foreground mt-2">Cash out your earnings</p>
      </div>

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="h-5 w-5 mr-2" />
            Available Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">₦{userBalance.toLocaleString()}</div>
          <p className="text-sm text-muted-foreground">Available for withdrawal</p>
        </CardContent>
      </Card>

      {/* Withdrawal Form */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Request</CardTitle>
          <CardDescription>
            Enter your withdrawal details below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (₦)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter withdrawal amount"
                {...register('amount', {
                  required: 'Amount is required',
                  min: { value: 100, message: 'Minimum withdrawal is ₦100' },
                  max: { value: userBalance, message: 'Amount exceeds available balance' }
                })}
              />
              {errors.amount && (
                <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>
              )}
              {withdrawAmount > userBalance && (
                <div className="flex items-center mt-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Insufficient balance
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                placeholder="Enter your bank name"
                {...register('bankName', { required: 'Bank name is required' })}
              />
              {errors.bankName && (
                <p className="text-sm text-destructive mt-1">{errors.bankName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                placeholder="Enter your account number"
                {...register('accountNumber', {
                  required: 'Account number is required',
                  pattern: {
                    value: /^\d{10}$/,
                    message: 'Account number must be 10 digits'
                  }
                })}
              />
              {errors.accountNumber && (
                <p className="text-sm text-destructive mt-1">{errors.accountNumber.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                placeholder="Enter your account name"
                {...register('accountName', { required: 'Account name is required' })}
              />
              {errors.accountName && (
                <p className="text-sm text-destructive mt-1">{errors.accountName.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || withdrawAmount > userBalance}
            >
              {loading ? 'Processing...' : 'Submit Withdrawal Request'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Withdrawal Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Minimum Withdrawal</span>
            <Badge>₦100</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Processing Time</span>
            <Badge variant="outline">24-48 hours</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Withdrawal Fee</span>
            <Badge variant="outline">Free</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick Amounts */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Amounts</CardTitle>
          <CardDescription>Select a common withdrawal amount</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1000, 5000, 10000, 25000].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                onClick={() => {
                  const event = { target: { value: amount.toString() } };
                  register('amount').onChange(event);
                }}
                disabled={amount > userBalance}
                className="h-12"
              >
                ₦{amount.toLocaleString()}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Processing Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Important Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• All withdrawal requests are processed within 24-48 hours</p>
          <p>• Ensure your bank details are correct to avoid delays</p>
          <p>• Contact support if you don't receive your funds within 48 hours</p>
          <p>• Withdrawal fees may apply for amounts below ₦1,000</p>
        </CardContent>
      </Card>
    </div>
  );
}