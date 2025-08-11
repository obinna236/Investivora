import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CheckSquare, Clock, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TaskTemplate {
  id: string;
  title: string;
  reward: number;
  duration_seconds: number;
  link_url?: string | null;
  embed_url?: string | null;
  created_at: string;
}

interface TaskView {
  id: string;
  title: string;
  reward: number;
  completed: boolean;
  created_at: string;
}

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TaskView[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<TaskTemplate | null>(null);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) return;

      try {
        const { data: templatesData, error: tError } = await supabase
          .from('task_templates')
          .select('*')
          .order('created_at', { ascending: false });

        if (tError) throw tError;

        setTemplates(templatesData || []);

        const templateIds = (templatesData || []).map((t) => t.id);
        let statuses: any[] = [];
        if (templateIds.length > 0) {
          const { data: statusData, error: sError } = await supabase
            .from('user_task_status')
            .select('*')
            .in('task_template_id', templateIds);
          if (sError) throw sError;
          statuses = statusData || [];
        }

        const statusMap = new Map(statuses.map((s) => [s.task_template_id, s.completed]));
        const mapped: TaskView[] = (templatesData || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          reward: Number(t.reward || 0),
          completed: !!statusMap.get(t.id),
          created_at: t.created_at,
        }));

        setTasks(mapped);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: "Error",
          description: "Failed to load tasks",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user, toast]);

  const handlePerform = async (templateId: string, reward: number) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('start_task', {
        template_id: templateId,
        _user_id: user.id
      });
      if (error) throw error;

      const tpl = templates.find((t) => t.id === templateId);
      if (tpl) {
        setActiveTemplate(tpl);
        setTimer(tpl.duration_seconds || 30);
        setModalOpen(true);
      }
    } catch (error) {
      console.error('Error starting task:', error);
      toast({
        title: "Error",
        description: "Failed to start task",
        variant: "destructive"
      });
    }
  };

  const completeActiveTask = async () => {
    if (!user || !activeTemplate) return;

    try {
      const { error } = await supabase.rpc('complete_task_by_template', {
        template_id: activeTemplate.id,
        _user_id: user.id
      });

      if (error) throw error;

      setTasks((prev) => prev.map((t) =>
        t.id === activeTemplate.id ? { ...t, completed: true } : t
      ));

      toast({
        title: "Task Completed!",
        description: `You earned ₦${Number(activeTemplate.reward).toLocaleString()}`
      });

      setModalOpen(false);
      setActiveTemplate(null);
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: "Failed to complete task",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-10 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const completedTasks = tasks.filter(task => task.completed);
  const pendingTasks = tasks.filter(task => !task.completed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tasks</h1>
        <p className="text-muted-foreground">Complete tasks to earn rewards</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckSquare className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{completedTasks.reduce((sum, task) => sum + task.reward, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Pending Tasks</h2>
          <div className="space-y-4">
            {pendingTasks.map((task) => (
              <Card key={task.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                  <CardDescription>
                    Reward: ₦{task.reward.toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => handlePerform(task.id, task.reward)}
                    className="w-full md:w-auto"
                  >
                    Perform Task
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Completed Tasks</h2>
          <div className="space-y-4">
            {completedTasks.map((task) => (
              <Card key={task.id} className="opacity-75">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    <Badge variant="default" className="bg-green-600">
                      <CheckSquare className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  </div>
                  <CardDescription>
                    Earned: ₦{task.reward.toLocaleString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

{tasks.length === 0 && (
  <Card>
    <CardContent className="text-center py-12">
      <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">No tasks available</h3>
      <p className="text-muted-foreground">Check back later for new tasks to complete</p>
    </CardContent>
  </Card>
)}

<Dialog open={modalOpen} onOpenChange={setModalOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Perform Task</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <p className="text-muted-foreground">Spend at least {activeTemplate?.duration_seconds || 30} seconds on the task.</p>
      {activeTemplate?.embed_url ? (
        <div className="aspect-video w-full">
          <iframe
            src={activeTemplate.embed_url}
            title={activeTemplate.title}
            className="w-full h-full rounded"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : activeTemplate?.link_url ? (
        <Button asChild variant="outline">
          <a href={activeTemplate.link_url} target="_blank" rel="noopener noreferrer">Open Task Link</a>
        </Button>
      ) : null}
      <div className="text-sm text-muted-foreground">Time remaining: {Math.max(0, timer)}s</div>
    </div>
    <DialogFooter>
      <Button onClick={completeActiveTask} disabled={timer > 0 || !activeTemplate}>Mark as Completed</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  );
}