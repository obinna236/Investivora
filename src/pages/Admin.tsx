import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  DollarSign, 
  CheckSquare, 
  TrendingUp,
  Shield,
  Plus,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';

interface User {
  id: string;
  email: string;
  full_name: string;
  balance: number;
  created_at: string;
  active_plan_name?: string | null;
  active_plan_price?: number | null;
}

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  bank_name?: string | null;
  account_number?: string | null;
  account_name?: string | null;
}

interface TaskTemplate {
  id: string;
  title: string;
  link_url?: string | null;
  embed_url?: string | null;
  duration_seconds: number;
  plan_id: string;
  reward: number;
  active_date: string;
  is_active: boolean;
  created_at: string;
}

interface TaskTemplateForm {
  title: string;
  reward: number;
  plan_id: string;
  duration_seconds: number;
  link_url?: string;
  embed_url?: string;
  active_date?: string;
  is_active?: boolean;
}

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
const [users, setUsers] = useState<User[]>([]);
const [transactions, setTransactions] = useState<Transaction[]>([]);
const [tasks, setTasks] = useState<TaskTemplate[]>([]);
const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
const [loading, setLoading] = useState(true);
const [stats, setStats] = useState({
  totalUsers: 0,
  totalDeposits: 0,
  totalWithdrawals: 0,
  totalTasks: 0,
  monthlyDeposits: 0
});

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<TaskTemplateForm>({
    defaultValues: {
      duration_seconds: 30,
      is_active: true,
      active_date: new Date().toISOString().slice(0,10)
    }
  });

// Admin role check
const [isAdmin, setIsAdmin] = useState(false);
const [adminLoading, setAdminLoading] = useState(true);

useEffect(() => {
  if (!user) return;
  (async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!data);
    setAdminLoading(false);
  })();
}, [user]);

useEffect(() => {
  if (!isAdmin) return;
  fetchAdminData();
}, [isAdmin]);

  const fetchAdminData = async () => {
    try {
      // Fetch users
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch task templates
      const { data: tasksData } = await (supabase as any)
        .from('task_templates')
        .select('*')
        .order('active_date', { ascending: false })
        .order('created_at', { ascending: false });

      // Fetch deposits (all completed)
      const { data: depositsData } = await supabase
        .from('deposits')
        .select('amount, created_at')
        .eq('status', 'completed');

      // Fetch withdrawals (all)
      const { data: withdrawalsData } = await supabase
        .from('withdrawals')
        .select('*');

      setUsers(usersData || []);
      setTransactions(transactionsData || []);
      setTasks(tasksData || []);
      setWithdrawals(withdrawalsData || []);

      const totalDeposits = depositsData?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

      // Monthly deposits progress
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyDeposits = (depositsData || [])
        .filter((d) => new Date(d.created_at) >= firstOfMonth)
        .reduce((sum, d) => sum + Number(d.amount), 0);

      const totalWithdrawals = withdrawalsData?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

      setStats({
        totalUsers: usersData?.length || 0,
        totalDeposits,
        totalWithdrawals,
        totalTasks: tasksData?.length || 0,
        monthlyDeposits
      });

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

const createTask = async (data: TaskTemplateForm) => {
  try {
    const payload = {
      title: data.title,
      reward: data.reward,
      plan_id: data.plan_id,
      duration_seconds: data.duration_seconds,
      link_url: data.link_url || null,
      embed_url: data.embed_url || null,
      active_date: data.active_date || new Date().toISOString().slice(0, 10),
      is_active: data.is_active ?? true,
    };

    const { error } = await (supabase as any)
      .from('task_templates')
      .insert(payload);

    if (error) throw error;

    toast({
      title: "Task Created",
      description: "New task template created for the selected plan"
    });

    reset();
    fetchAdminData();
  } catch (error) {
    console.error('Error creating task template:', error);
    toast({
      title: "Error",
      description: "Failed to create task template",
      variant: "destructive"
    });
  }
};

const deleteTask = async (taskId: string) => {
  try {
    const { error } = await (supabase as any)
      .from('task_templates')
      .delete()
      .eq('id', taskId);
    if (error) throw error;
    toast({ title: 'Task Deleted', description: 'The task template has been removed.' });
    fetchAdminData();
  } catch (error) {
    console.error('Error deleting task template:', error);
    toast({ title: 'Error', description: 'Failed to delete task template', variant: 'destructive' });
  }
};

const updateWithdrawalStatus = async (withdrawalId: string, status: 'approved' | 'rejected') => {
  try {
    const { error } = await supabase
      .from('withdrawals')
      .update({ status })
      .eq('id', withdrawalId);
    if (error) throw error;
    toast({ title: 'Withdrawal Updated', description: `Marked as ${status}.` });
    fetchAdminData();
  } catch (error) {
    console.error('Error updating withdrawal:', error);
    toast({ title: 'Error', description: 'Failed to update withdrawal', variant: 'destructive' });
  }
};

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking admin access...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">You don't have permission to access the admin panel</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your investment platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.totalDeposits.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.totalWithdrawals.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Goal Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 text-sm text-muted-foreground">₦{stats.monthlyDeposits.toLocaleString()} / ₦{(1000000).toLocaleString()}</div>
            <Progress value={Math.min(100, Math.round((stats.monthlyDeposits / 1000000) * 100))} />
          </CardContent>
        </Card>
      </div>

      {/* Admin Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="tasks">Task Templates</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage all registered users</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Active Plan</TableHead>
                    <TableHead>Plan Price</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.full_name || 'Not set'}</TableCell>
                      <TableCell>₦{Number(user.balance).toLocaleString()}</TableCell>
                      <TableCell>{user.active_plan_name || '-'}</TableCell>
                      <TableCell>{user.active_plan_price ? `₦${Number(user.active_plan_price).toLocaleString()}` : '-'}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>View all platform transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <Badge variant={transaction.type === 'credit' ? 'default' : 'destructive'}>
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell>₦{Number(transaction.amount).toLocaleString()}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <div className="space-y-4">
            {/* Create Task Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Task
                </CardTitle>
              </CardHeader>
              <CardContent>
<form onSubmit={handleSubmit(createTask)} className="space-y-4">
  <div className="grid gap-4 md:grid-cols-3">
    <div>
      <Label htmlFor="title">Task Title</Label>
      <Input
        id="title"
        placeholder="Enter task title"
        {...register('title', { required: 'Task title is required' })}
      />
      {errors.title && (
        <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
      )}
    </div>

    <div>
      <Label>Plan</Label>
      <Controller
        name="plan_id"
        control={control}
        rules={{ required: 'Plan is required' }}
        render={({ field }) => (
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <SelectTrigger>
              <SelectValue placeholder="Select plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="diamond">Diamond</SelectItem>
            </SelectContent>
          </Select>
        )}
      />
      {errors.plan_id && (
        <p className="text-sm text-destructive mt-1">{errors.plan_id.message}</p>
      )}
    </div>

    <div>
      <Label htmlFor="reward">Reward (₦)</Label>
      <Input
        id="reward"
        type="number"
        placeholder="Enter reward amount"
        {...register('reward', {
          required: 'Reward is required',
          min: { value: 1, message: 'Reward must be at least ₦1' }
        })}
      />
      {errors.reward && (
        <p className="text-sm text-destructive mt-1">{errors.reward.message}</p>
      )}
    </div>

    <div>
      <Label htmlFor="duration_seconds">Duration (seconds)</Label>
      <Input
        id="duration_seconds"
        type="number"
        placeholder="30"
        {...register('duration_seconds', { required: 'Duration is required', min: { value: 5, message: 'Min 5 seconds' } })}
      />
      {errors.duration_seconds && (
        <p className="text-sm text-destructive mt-1">{errors.duration_seconds.message}</p>
      )}
    </div>

    <div>
      <Label htmlFor="link_url">Task Link URL</Label>
      <Input id="link_url" placeholder="https://..." {...register('link_url')} />
    </div>

    <div>
      <Label htmlFor="embed_url">YouTube Embed URL (optional)</Label>
      <Input id="embed_url" placeholder="https://www.youtube.com/embed/..." {...register('embed_url')} />
    </div>

    <div>
      <Label htmlFor="active_date">Active Date</Label>
      <Input id="active_date" type="date" {...register('active_date')} />
    </div>
  </div>

  <Button type="submit">Create Task</Button>
</form>
              </CardContent>
            </Card>

            {/* Tasks List */}
            <Card>
<CardHeader>
  <CardTitle>Task Templates</CardTitle>
  <CardDescription>Manage daily task templates</CardDescription>
</CardHeader>
              <CardContent>
                <Table>
<TableHeader>
  <TableRow>
    <TableHead>Title</TableHead>
    <TableHead>Plan</TableHead>
    <TableHead>Reward</TableHead>
    <TableHead>Duration</TableHead>
    <TableHead>Active Date</TableHead>
    <TableHead>Status</TableHead>
    <TableHead>Actions</TableHead>
  </TableRow>
</TableHeader>
                  <TableBody>
{tasks.map((task) => (
  <TableRow key={task.id}>
    <TableCell>{task.title}</TableCell>
    <TableCell className="uppercase">{task.plan_id}</TableCell>
    <TableCell>₦{Number(task.reward).toLocaleString()}</TableCell>
    <TableCell>{task.duration_seconds}s</TableCell>
    <TableCell>{new Date(task.active_date).toLocaleDateString()}</TableCell>
    <TableCell>
      <Badge variant={task.is_active ? 'default' : 'outline'}>
        {task.is_active ? 'Active' : 'Inactive'}
      </Badge>
    </TableCell>
    <TableCell>
      <Button variant="outline" size="sm" onClick={() => deleteTask(task.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </TableCell>
  </TableRow>
))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Requests</CardTitle>
              <CardDescription>Review and process user withdrawals</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Account Number</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-sm">{w.user_id}</TableCell>
                      <TableCell>{w.account_name || '-'}</TableCell>
                      <TableCell className="font-mono">{w.account_number || '-'}</TableCell>
                      <TableCell>{w.bank_name || '-'}</TableCell>
                      <TableCell>₦{Number(w.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={w.status === 'approved' ? 'default' : w.status === 'rejected' ? 'destructive' : 'outline'}>
                          {w.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(w.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateWithdrawalStatus(w.id, 'approved')} disabled={w.status !== 'pending'}>
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => updateWithdrawalStatus(w.id, 'rejected')} disabled={w.status !== 'pending'}>
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}