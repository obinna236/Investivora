import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';

const Auth = () => {
  const { user, signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [detectedRef, setDetectedRef] = useState<string>('');
  const navigate = useNavigate();

  // Capture referral code if user lands directly on /auth?ref=CODE
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref') || params.get('referral');
      if (ref && ref.trim()) {
        localStorage.setItem('referral_code', ref.trim().toUpperCase());
      }
      const existing = (localStorage.getItem('referral_code') || '').toUpperCase();
      if (existing) setDetectedRef(existing);
    } catch {}
  }, []);

  if (user) {
    const adminEmail = 'favourdeveloper8@gmail.com';
    return <Navigate to={user.email === adminEmail ? "/admin" : "/"} replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const { error } = await signIn(email, password);
    if (!error) {
      const adminEmail = 'favourdeveloper8@gmail.com';
      navigate(email === adminEmail ? '/admin' : '/', { replace: true });
    }
    setIsLoading(false);
  };

  const handlePasteReferralLink = () => {
    const url = window.prompt('Paste your referral link');
    if (!url) return;
    try {
      const u = new URL(url);
      const code = (u.searchParams.get('ref') || u.searchParams.get('referral') || '').toUpperCase();
      if (code) {
        localStorage.setItem('referral_code', code);
        setDetectedRef(code);
      } else {
        alert('No referral code found in the link.');
      }
    } catch {
      alert('Invalid link.');
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const referralCode = (formData.get('referralCode') as string) || detectedRef || '';

    await signUp(email, password, fullName, referralCode);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Task earning & Investment Platform</CardTitle>
          <CardDescription>
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-fullname">Full Name</Label>
                  <Input
                    id="signup-fullname"
                    name="fullName"
                    type="text"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-refcode">Referral Code (optional)</Label>
                  <Input
                    id="signup-refcode"
                    name="referralCode"
                    type="text"
                    placeholder="Enter referral code"
                    defaultValue={detectedRef}
                  />
                  <p className="text-xs text-muted-foreground">
                    Have a referral link?
                    <button type="button" className="underline ml-1" onClick={handlePasteReferralLink}>Paste link</button>
                    {detectedRef ? (
                      <span className="ml-2">Detected: {detectedRef} <button type="button" className="underline ml-1" onClick={() => { localStorage.removeItem('referral_code'); setDetectedRef(''); }}>clear</button></span>
                    ) : null}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="Create a password"
                    required
                    minLength={6}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
