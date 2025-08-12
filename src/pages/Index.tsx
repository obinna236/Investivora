import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckSquare, Users, Wallet, ArrowRight, Sparkles } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // SEO tags
    document.title = 'Earn by Investing & Tasks | Affiliate Rewards Platform';
    const desc = 'Join an investment and task earning platform with affiliate rewards. Grow your income with daily tasks and secure plans.';
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = desc;
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + '/';

    // Structured Data
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'InvestApp',
      url: window.location.origin,
      description: desc
    };
    let ldEl = document.getElementById('ld-org') as HTMLScriptElement | null;
    if (!ldEl) {
      ldEl = document.createElement('script') as HTMLScriptElement;
      ldEl.id = 'ld-org';
      ldEl.type = 'application/ld+json';
      document.head.appendChild(ldEl);
    }
    ldEl.textContent = JSON.stringify(ld);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-bold">Taskvest</span>
          </div>
          <div className="space-x-3">
            <Button asChild variant="ghost"><Link to="/auth">Login</Link></Button>
            <Button asChild><Link to="/auth">Get Started</Link></Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
            <div className="grid gap-10 md:grid-cols-2 place-items-center">
              <div className="animate-fade-in">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                  Invest, Complete Tasks, and Earn Daily
                </h1>
                <p className="text-muted-foreground mb-6">
                  Build wealth with flexible investment plans, daily task rewards, and an affiliate program that pays.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg" className="hover-scale">
                    <Link to="/auth">Start Earning</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="hover-scale">
                    <Link to="#features">See How It Works</Link>
                  </Button>
                </div>
              </div>

              <div className="w-full animate-scale-in">
                <Card className="bg-card/60 backdrop-blur-sm shadow-lg">
                  <CardContent className="p-6 grid gap-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">Total Investors</div>
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-3xl font-bold">10,000+</div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">Daily Tasks Completed</div>
                      <CheckSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-3xl font-bold">50,000+</div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">Total Payouts</div>
                      <Wallet className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-3xl font-bold">₦120M+</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Why Choose Our Platform</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="hover-scale">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Wallet className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Smart Investment Plans</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Pick from flexible plans tailored to your goals, with transparent returns.</p>
                </CardContent>
              </Card>
              <Card className="hover-scale">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Daily Task Earnings</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Complete simple tasks to earn extra income every day.</p>
                </CardContent>
              </Card>
              <Card className="hover-scale">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Affiliate Rewards</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Invite friends and earn referral bonuses as your network grows.</p>
                </CardContent>
              </Card>
            </div>
            <div className="text-center mt-8">
              <Button asChild>
                <Link to="/auth" className="inline-flex items-center">Join Now <ArrowRight className="h-4 w-4 ml-2" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} TaskVest. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;
