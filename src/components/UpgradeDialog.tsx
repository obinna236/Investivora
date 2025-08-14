import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Star, Diamond, Gem, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
}

export function UpgradeDialog({ open, onOpenChange, currentPlan }: UpgradeDialogProps) {
  const navigate = useNavigate();

  const planHierarchy = ['basic', 'premium', 'pro', 'diamond', 'royal'];
  const currentIndex = planHierarchy.indexOf(currentPlan);
  
  const availableUpgrades = [
    {
      id: 'premium',
      name: 'Premium',
      price: 5000,
      icon: Star,
      color: 'bg-purple-500',
      description: 'Unlock higher withdrawal limits'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 10000,
      icon: Crown,
      color: 'bg-orange-500',
      description: 'Access exclusive tasks and higher returns'
    },
    {
      id: 'diamond',
      name: 'Diamond',
      price: 50000,
      icon: Diamond,
      color: 'bg-gradient-to-r from-purple-600 to-pink-600',
      description: 'VIP support and maximum benefits'
    },
    {
      id: 'royal',
      name: 'Royal',
      price: 100000,
      icon: Gem,
      color: 'bg-gradient-to-r from-yellow-400 to-yellow-600',
      description: 'Ultimate plan with premium features'
    }
  ].filter((_, index) => index > currentIndex);

  const handleUpgrade = () => {
    navigate('/investment-plans');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-primary" />
            Upgrade Required
          </DialogTitle>
          <DialogDescription>
            You've reached your withdrawal limit for the {currentPlan} plan. Upgrade to continue withdrawing funds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Upgrade to unlock higher withdrawal limits and exclusive benefits
            </p>
          </div>

          {availableUpgrades.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Available Upgrades:</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableUpgrades.slice(0, 2).map((plan) => {
                  const Icon = plan.icon;
                  return (
                    <Card key={plan.id} className="p-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full ${plan.color} flex items-center justify-center`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{plan.name}</div>
                          <div className="text-sm text-muted-foreground">{plan.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">₦{plan.price.toLocaleString()}</div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Later
            </Button>
            <Button onClick={handleUpgrade} className="flex-1">
              Upgrade Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}