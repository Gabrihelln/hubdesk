import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Mail as MailIcon, Search, Star, Archive, Trash2, Send, Inbox, AlertCircle, ChevronRight, RefreshCw, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function Mail() {
  const { profile, connectGoogle } = useAuth();
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [gmailError, setGmailError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'setHeight') {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          if (iframe.srcdoc?.includes(`id: '${event.data.id}'`)) {
            iframe.style.height = `${event.data.height}px`;
          }
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchEmailDetail = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const headers = { 
        'Authorization': `Bearer ${session.access_token}`,
        'Accept': 'application/json'
      };
      
      const res = await fetch(`/api/google/gmail/${encodeURIComponent(id)}`, { headers });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setSelectedEmail(data);
        setGmailError(null);
        
        // Mark as read
        const readRes = await fetch(`/api/google/gmail/${encodeURIComponent(id)}/read`, { method: 'POST', headers });
        if (!readRes.ok) {
          const errData = await readRes.json();
          if (errData.code === 'INSUFFICIENT_SCOPES') {
            setGmailError(errData.error);
          }
        } else {
          setGmailError(null);
          // Update local state to reflect read status
          setEmails(prev => prev.map(e => e.id === id ? { ...e, unread: false } : e));
        }
      }
    } catch (err) {
      console.error("Error fetching email detail:", err);
    }
  };
  const fetchEmails = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const headers = { 
        'Authorization': `Bearer ${session.access_token}`,
        'Accept': 'application/json'
      };
      const res = await fetch('/api/google/gmail', { headers });
      if (res.ok && res.headers.get("content-type")?.includes("application/json")) setEmails(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.google_connected) {
      fetchEmails();
    }
  }, [profile?.google_connected]);

  if (!profile?.google_connected) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-3xl flex items-center justify-center mb-6">
          <MailIcon className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Conectar Gmail</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
          Integre sua conta Google para gerenciar seus e-mails diretamente do seu painel.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card text-card-foreground overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-card-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">E-mail</h1>
          <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg">
            {emails.filter(e => e.unread).length} Não lidas
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchEmails} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <RefreshCw className={cn("w-5 h-5 text-slate-500", loading && "animate-spin")} />
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Escrever
          </button>
        </div>
      </div>

      {gmailError && (
        <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/40 flex items-center justify-between gap-4">
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 leading-tight flex-1">
            {gmailError}
          </p>
          <button 
            onClick={connectGoogle}
            className="shrink-0 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Reconectar Google
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-card-border p-4 space-y-2 hidden md:block">
          {[
            { icon: Inbox, label: 'Entrada', count: emails.length, active: true },
            { icon: Star, label: 'Com estrela', count: 0 },
            { icon: Send, label: 'Enviados', count: 0 },
            { icon: Archive, label: 'Arquivo', count: 0 },
            { icon: Trash2, label: 'Lixeira', count: 0 },
            { icon: AlertCircle, label: 'Spam', count: 0 },
          ].map((item, i) => (
            <button 
              key={i} 
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-colors",
                item.active 
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
              {item.count > 0 && <span>{item.count}</span>}
            </button>
          ))}
        </div>

        {/* List */}
        <div className={cn("flex-1 overflow-y-auto", selectedEmail ? "hidden lg:block" : "block")}>
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : emails.length > 0 ? (
            emails.map((email) => (
              <div 
                key={email.id} 
                onClick={() => fetchEmailDetail(email.id)}
                className={cn(
                  "p-4 border-b border-slate-50 dark:border-slate-800 flex gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative",
                  selectedEmail?.id === email.id && "bg-blue-50/50 dark:bg-blue-900/10",
                  email.unread && "bg-blue-50/30 dark:bg-blue-900/5"
                )}
              >
                {email.unread && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full"></div>
                )}
                <img src={`https://ui-avatars.com/api/?name=${email.from}&background=random`} className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className={cn("text-sm truncate", email.unread ? "font-bold text-blue-600 dark:text-blue-400" : "text-slate-800 dark:text-slate-200")}>
                      {email.from?.split('<')[0]}
                    </h4>
                    <span className="text-xs text-slate-400">{email.date ? format(new Date(email.date), 'HH:mm') : 'Hoje'}</span>
                  </div>
                  <h5 className={cn("text-xs truncate mb-1", email.unread ? "font-bold text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300")}>
                    {email.subject}
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{email.snippet}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Inbox className="w-12 h-12 opacity-20 mb-4" />
              <p>Nenhum e-mail encontrado</p>
            </div>
          )}
        </div>

        {/* Content */}
        {selectedEmail && (
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="max-w-3xl mx-auto bg-card text-card-foreground rounded-3xl border border-card-border shadow-sm p-8">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <img src={`https://ui-avatars.com/api/?name=${selectedEmail.from}&background=random`} className="w-12 h-12 rounded-full" />
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">{selectedEmail.from}</h2>
                    <p className="text-sm text-slate-500">Para: {profile?.email}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedEmail.date ? format(new Date(selectedEmail.date), 'MMM dd, yyyy') : 'Hoje'}</p>
                    <p className="text-xs text-slate-400">{selectedEmail.date ? format(new Date(selectedEmail.date), 'HH:mm') : ''}</p>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-6">
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                  {selectedEmail.subject}
                </h1>
                <a 
                  href={`https://mail.google.com/mail/u/${profile?.email}/#inbox/${selectedEmail.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                  <MailIcon className="w-4 h-4" />
                  Abrir no Gmail
                </a>
              </div>

              {/* Email Body */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                <iframe
                  title="Email Content"
                  srcDoc={`
                    <html>
                      <head>
                        <style>
                          body { 
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            font-size: 14px;
                            line-height: 1.6;
                            color: #334155;
                            margin: 0;
                            padding: 20px;
                          }
                          @media (prefers-color-scheme: dark) {
                            body { color: #cbd5e1; }
                          }
                          img { max-width: 100%; height: auto; }
                        </style>
                      </head>
                      <body>${selectedEmail.body || selectedEmail.snippet}</body>
                      <script>
                        window.onload = () => {
                          window.parent.postMessage({ 
                            type: 'setHeight', 
                            height: document.body.scrollHeight,
                            id: '${selectedEmail.id}'
                          }, '*');
                        };
                      </script>
                    </html>
                  `}
                  className="w-full border-none"
                  style={{ height: '600px' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
