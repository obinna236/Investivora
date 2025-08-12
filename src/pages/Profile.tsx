import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Calendar, Share2, Edit } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface ProfileForm {
  fullName: string;
  email: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  referral_code: string;
  balance: number;
  created_at: string;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
        reset({
          fullName: data.full_name || '',
          email: data.email || ''
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive"
        });
      }
    };

    fetchProfile();
  }, [user, reset, toast]);

  const onSubmit = async (data: ProfileForm) => {
    if (!user || !profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: data.fullName,
          email: data.email
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, full_name: data.fullName, email: data.email });
      setEditing(false);

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard"
      });
    }
  };

  const referralLink = useMemo(() => (
    profile ? `${window.location.origin}/?ref=${profile.referral_code}` : ''
  ), [profile]);

  const copyReferralLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({ title: 'Copied!', description: 'Referral link copied to clipboard' });
    } catch {}
  };

  const shareReferralLink = async () => {
    if (!referralLink) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join Taskvest',
          text: 'Sign up and earn bonuses with my referral link:',
          url: referralLink
        });
      } else {
        await copyReferralLink();
        toast({ title: 'Link copied', description: 'Share it with your friends!' });
      }
    } catch {}
  };

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-2">Manage your account information</p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
              <CardDescription>Your account details and settings</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(!editing)}
            >
              <Edit className="h-4 w-4 mr-2" />
              {editing ? 'Cancel' : 'Edit'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  {...register('fullName', { required: 'Full name is required' })}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Invalid email address'
                    }
                  })}
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium mr-2">Name:</span>
                <span>{profile.full_name || 'Not set'}</span>
              </div>
              
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium mr-2">Email:</span>
                <span>{profile.email}</span>
              </div>

              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium mr-2">Joined:</span>
                <span>{new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Balance */}
      <Card>
        <CardHeader>
          <CardTitle>Account Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">₦{profile.balance.toLocaleString()}</div>
          <p className="text-sm text-muted-foreground">Available for withdrawal</p>
        </CardContent>
      </Card>

      {/* Referral Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Share2 className="h-5 w-5 mr-2" />
            Referral Program
          </CardTitle>
          <CardDescription>Earn rewards by referring friends</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Your Referral Code</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 p-2 bg-muted rounded-md font-mono text-lg">
                {profile.referral_code}
              </div>
              <Button onClick={copyReferralCode} variant="outline">
                Copy
              </Button>
            </div>
          </div>

          <div>
            <Label>Your Referral Link</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input readOnly value={referralLink} />
              <Button variant="outline" onClick={copyReferralLink}>Copy Link</Button>
              <Button onClick={shareReferralLink}>Share</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Friends who sign up using this link will automatically apply your code.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-semibold">How it works:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Share your referral code with friends</li>
              <li>• Earn 10% of their first deposit as bonus</li>
              <li>• Your referral gets 5% bonus on their first deposit</li>
              <li>• No limit on number of referrals</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Account Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Account Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-muted-foreground">Successful Referrals</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">₦0</div>
              <div className="text-sm text-muted-foreground">Total Earnings</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}