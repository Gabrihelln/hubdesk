import { ReactNode, useState, useEffect } from 'react';
import { 
  LogOut,
  Search,
  Moon,
  Sun,
  Settings,
  Layout as LayoutIcon,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard } from '../contexts/DashboardContext';
import { cn } from '../lib/utils';

export default function Layout({ children }: { children: ReactNode }) {
  const { profile, logout } = useAuth();
  const dashboard = useDashboard();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  return (
    <div className={cn(
      "flex h-screen transition-colors duration-300",
      "bg-background text-foreground"
    )}>
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className={cn(
          "h-20 border-b flex items-center justify-between px-4 sm:px-10 shrink-0 transition-colors duration-300",
          "bg-card border-card-border"
        )}>
          <div className="flex items-center gap-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              H
            </div>
            <span className="text-2xl font-bold tracking-tight hidden sm:block">HubDesk</span>
          </div>

          <div className="flex-1"></div>

          <div className="flex items-center gap-4">
            {dashboard && (
              <div className="relative">
                <button 
                  onClick={() => setShowLayoutSettings(!showLayoutSettings)}
                  className={cn(
                    "p-2.5 rounded-xl transition-colors",
                    showLayoutSettings ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                  )}
                  title="Configurações de Layout"
                >
                  <Settings className={cn("w-5 h-5", showLayoutSettings && "animate-spin-slow")} />
                </button>

                {showLayoutSettings && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Modo de Edição</p>
                      <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                        <button 
                          onClick={() => dashboard.setIsDraggable(false)}
                          className={cn(
                            "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2",
                            !dashboard.isDraggable 
                              ? "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm" 
                              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          )}
                        >
                          <LayoutIcon className="w-3.5 h-3.5" /> Visualizar
                        </button>
                        <button 
                          onClick={() => dashboard.setIsDraggable(true)}
                          className={cn(
                            "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2",
                            dashboard.isDraggable 
                              ? "bg-blue-600 text-white shadow-sm" 
                              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          )}
                        >
                          <Plus className="w-3.5 h-3.5" /> Editar
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        dashboard.triggerReset();
                        setShowLayoutSettings(false);
                      }}
                      className="w-full py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Resetar Layout
                    </button>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={cn(
                "p-2.5 rounded-xl transition-colors",
                isDarkMode ? "text-yellow-400 hover:bg-slate-800" : "text-slate-600 hover:bg-gray-100"
              )}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <div className={cn("flex items-center gap-4 pl-4 border-l", isDarkMode ? "border-slate-800" : "border-[#E2E8F0]")}>
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold truncate max-w-[150px]">{profile?.name}</p>
                <p className="text-xs text-[#64748B] truncate max-w-[150px]">{profile?.email}</p>
              </div>
              <img 
                src={profile?.picture} 
                alt={profile?.name} 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={logout}
                title="Sair"
                className={cn(
                  "p-2.5 rounded-xl transition-colors",
                  isDarkMode ? "text-slate-400 hover:bg-red-900/20 hover:text-red-400" : "text-[#64748B] hover:bg-red-50 hover:text-red-600"
                )}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
