import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Plus, Search, Filter, MoreVertical, Calendar, Clock, Tag, Trash2, Edit2, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'Medium', dueDate: format(new Date(), 'yyyy-MM-dd'), category: 'General' });
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    const loadTasks = () => {
      try {
        const saved = user?.user_metadata?.dashboard_tasks;
        if (saved) {
          setTasks(JSON.parse(saved));
        } else {
          setTasks([
            { id: 1, title: 'Weekly Team Update', priority: 'Medium', dueDate: '2021-10-08', completed: false, category: 'Design' },
            { id: 2, title: 'Project Kickoff Plan', priority: 'High', dueDate: '2021-10-12', completed: false, category: 'Marketing' }
          ]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, [user?.user_metadata?.dashboard_tasks]);

  const saveTasks = async (newTasks: any[]) => {
    setTasks(newTasks);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/profile/metadata', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ dashboard_tasks: JSON.stringify(newTasks) })
      });
    } catch (err) {
      console.error("Error saving tasks:", err);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    const task = {
      ...newTask,
      id: Date.now(),
      completed: false
    };
    saveTasks([task, ...tasks]);
    setNewTask({ title: '', priority: 'Medium', dueDate: format(new Date(), 'yyyy-MM-dd'), category: 'General' });
    setIsAddingTask(false);
  };

  const toggleTask = (id: number) => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTasks(newTasks);
  };

  const deleteTask = (id: number) => {
    const newTasks = tasks.filter(t => t.id !== id);
    saveTasks(newTasks);
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-card text-card-foreground overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-card-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Tarefas</h1>
          <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
            {(['all', 'active', 'completed'] as const).map((f) => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                  filter === f ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600" : "text-slate-400"
                )}
              >
                {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : 'Concluídas'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Pesquisar tarefas..." 
              className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          <button 
            onClick={() => setIsAddingTask(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Tarefa
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {isAddingTask && (
            <div className="mb-8 bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-card-border shadow-sm">
              <form onSubmit={handleAddTask} className="space-y-4">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="O que precisa ser feito?"
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full bg-card text-card-foreground border-none rounded-2xl px-6 py-4 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  required
                />
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Prioridade</label>
                    <select 
                      value={newTask.priority}
                      onChange={e => setNewTask({...newTask, priority: e.target.value})}
                      className="w-full bg-card text-card-foreground border-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    >
                      <option value="Low">Baixa</option>
                      <option value="Medium">Média</option>
                      <option value="High">Alta</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data de Entrega</label>
                    <input 
                      type="date" 
                      value={newTask.dueDate}
                      onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                      className="w-full bg-card text-card-foreground border-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                    <input 
                      type="text" 
                      placeholder="ex: Trabalho"
                      value={newTask.category}
                      onChange={e => setNewTask({...newTask, category: e.target.value})}
                      className="w-full bg-card text-card-foreground border-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-2xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-md">Criar Tarefa</button>
                  <button type="button" onClick={() => setIsAddingTask(false)} className="px-8 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-2xl text-sm font-bold hover:bg-slate-300 transition-colors">Cancelar</button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredTasks.length > 0 ? filteredTasks.map((task) => (
              <div 
                key={task.id} 
                className={cn(
                  "bg-card text-card-foreground p-5 rounded-3xl border border-card-border shadow-sm flex items-center gap-6 group transition-all",
                  task.completed && "opacity-60"
                )}
              >
                <button 
                  onClick={() => toggleTask(task.id)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                    task.completed ? "bg-emerald-500 border-emerald-500" : "border-slate-200 dark:border-slate-600 hover:border-blue-500"
                  )}
                >
                  {task.completed && <CheckCircle2 className="w-5 h-5 text-white" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <h3 className={cn("text-base font-bold text-slate-800 dark:text-slate-200 truncate mb-2", task.completed && "line-through")}>
                    {task.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider",
                      task.priority === 'High' ? "bg-red-100 text-red-600" :
                      task.priority === 'Medium' ? "bg-amber-100 text-amber-600" :
                      "bg-blue-100 text-blue-600"
                    )}>
                      {task.priority === 'High' ? 'Alta' : task.priority === 'Medium' ? 'Média' : 'Baixa'}
                    </span>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(task.dueDate), 'dd MMM yyyy')}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <Tag className="w-3.5 h-3.5" />
                      {task.category}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-slate-400"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteTask(task.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )) : (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <CheckCircle2 className="w-16 h-16 opacity-10 mb-6" />
                <p className="text-lg font-bold">Tudo em dia!</p>
                <p className="text-sm">Você não tem tarefas {filter !== 'all' ? (filter === 'active' ? 'ativas' : 'concluídas') : ''} para mostrar.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
