import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePaystack } from '@/hooks/usePaystack';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { verifyPayment } = usePaystack();
  const { toast } = useToast();

  useEffect(() => {
    const ref = searchParams.get('reference') || searchParams.get('trxref');

    // If no reference, assume cancelled/abandoned and go back to dashboard
    if (!ref) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const handleVerification = async () => {
      try {
        await verifyPayment(ref);
        setSuccess(true);
        toast({
          title: "Payment Successful",
          description: "Your deposit has been processed successfully!",
        });
        // Immediately send user to dashboard after verification
        navigate('/dashboard', { replace: true });
      } catch (error) {
        setSuccess(false);
        toast({
          title: "Payment Verification Failed",
          description: "There was an issue verifying your payment. Please contact support.",
          variant: "destructive"
        });
      } finally {
        setVerifying(false);
      }
    };

    handleVerification();
  }, [searchParams, verifyPayment, navigate, toast]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
            <CardTitle>Verifying Payment</CardTitle>
            <CardDescription>
              Please wait while we confirm your payment...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            success 
              ? 'bg-green-100 text-green-600' 
              : 'bg-red-100 text-red-600'
          }`}>
            {success ? (
              <CheckCircle className="h-6 w-6" />
            ) : (
              <XCircle className="h-6 w-6" />
            )}
          </div>
          <CardTitle>
            {success ? 'Payment Successful!' : 'Payment Failed'}
          </CardTitle>
          <CardDescription>
            {success 
              ? 'Your account has been credited successfully. Redirecting to dashboard...'
              : 'There was an issue processing your payment. Please try again or contact support.'
            }
          </CardDescription>
        </CardHeader>
        
        {!success && (
          <CardContent className="space-y-4">
            <Button 
              onClick={() => navigate('/deposit')} 
              className="w-full"
            >
              Try Again
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              variant="outline" 
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}