import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Star, Diamond, Zap } from 'lucide-react';
import { useInvestmentPlan } from '@/hooks/useInvestmentPlan';

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 1000,
    icon: Zap,
    color: 'bg-blue-500',
    features: [
      'Minimum investment: ₦1,000',
      'Maximum withdrawal: ₦1,500',
      'Minimum withdrawal: ₦100',
      '5% daily returns',
      'Basic support'
    ],
    popular: false
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 5000,
    icon: Star,
    color: 'bg-purple-500',
    features: [
      'Minimum investment: ₦5,000',
      'Maximum withdrawal: ₦10,000',
      'Minimum withdrawal: ₦100',
      '7% daily returns',
      'Priority support',
      'Bonus referral rewards'
    ],
    popular: true
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 10000,
    icon: Crown,
    color: 'bg-orange-500',
    features: [
      'Minimum investment: ₦10,000',
      'Maximum withdrawal: ₦20,000',
      'Minimum withdrawal: ₦100',
      '10% daily returns',
      'Premium support',
      'Exclusive tasks',
      'Higher referral bonuses'
    ],
    popular: false
  },
  {
    id: 'diamond',
    name: 'Diamond',
    price: 50000,
    icon: Diamond,
    color: 'bg-gradient-to-r from-purple-600 to-pink-600',
    features: [
      'Minimum investment: ₦50,000',
      'Maximum withdrawal: ₦100,000',
      'Minimum withdrawal: ₦100',
      '15% daily returns',
      'VIP support',
      'Exclusive high-value tasks',
      'Maximum referral bonuses',
      'Personal account manager'
    ],
    popular: false
  }
];

export default function InvestmentPlans() {
  const { purchasePlan } = useInvestmentPlan();

  const handlePurchase = (plan: typeof plans[0]) => {
    purchasePlan({
      id: plan.id,
      name: plan.name,
      price: plan.price
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Investment Plans</h1>
        <p className="text-muted-foreground mt-2">Choose the plan that fits your investment goals</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card key={plan.id} className={`relative ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
              {plan.popular && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`w-12 h-12 mx-auto rounded-full ${plan.color} flex items-center justify-center mb-4`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">₦{plan.price.toLocaleString()}</span>
                  <span className="text-sm"> minimum</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className="w-full" 
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handlePurchase(plan)}
                >
                  Choose {plan.name}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">1</div>
            <h3 className="font-semibold">Choose a Plan</h3>
            <p className="text-sm text-muted-foreground">Select the investment plan that suits your budget and goals</p>
          </div>
          <div className="text-center space-y-2">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">2</div>
            <h3 className="font-semibold">Complete Tasks</h3>
            <p className="text-sm text-muted-foreground">Earn daily returns by completing simple tasks assigned to your plan</p>
          </div>
          <div className="text-center space-y-2">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">3</div>
            <h3 className="font-semibold">Withdraw Earnings</h3>
            <p className="text-sm text-muted-foreground">Withdraw your earnings anytime within your plan limits</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}