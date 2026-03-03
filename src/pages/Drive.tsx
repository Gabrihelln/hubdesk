import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { HardDrive, Search, Grid, List as ListIcon, MoreVertical, FileText, FileCode, FileVideo, FileImage, File, ChevronRight, RefreshCw, Plus, Download, Trash2, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface DriveProps {
  filter?: 'docs' | 'sheets' | 'all';
  title?: string;
}

export default function Drive({ filter = 'all', title = 'Drive' }: DriveProps) {
  const { profile } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'docs' | 'sheets' | 'pdf'>(filter as any);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const headers = { 
        'Authorization': `Bearer ${session.access_token}`,
        'Accept': 'application/json'
      };
      const res = await fetch('/api/google/drive', { headers });
      if (res.ok) {
        let allFiles = await res.json();
        if (filter === 'docs') {
          allFiles = allFiles.filter((f: any) => f.mimeType?.includes('document'));
        } else if (filter === 'sheets') {
          allFiles = allFiles.filter((f: any) => f.mimeType?.includes('spreadsheet'));
        }
        setFiles(allFiles);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.google_connected) {
      fetchFiles();
    }
  }, [profile?.google_connected, filter]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="w-6 h-6 text-red-500" />;
    if (mimeType.includes('document')) return <FileCode className="w-6 h-6 text-blue-500" />;
    if (mimeType.includes('spreadsheet')) return <FileText className="w-6 h-6 text-emerald-500" />;
    if (mimeType.includes('presentation')) return <FileText className="w-6 h-6 text-amber-500" />;
    if (mimeType.includes('video')) return <FileVideo className="w-6 h-6 text-purple-500" />;
    if (mimeType.includes('image')) return <FileImage className="w-6 h-6 text-pink-500" />;
    return <File className="w-6 h-6 text-slate-400" />;
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeFilter === 'all') return matchesSearch;
    if (activeFilter === 'docs') return matchesSearch && (file.mimeType?.includes('document') || file.mimeType?.includes('word'));
    if (activeFilter === 'sheets') return matchesSearch && (file.mimeType?.includes('spreadsheet') || file.mimeType?.includes('excel'));
    if (activeFilter === 'pdf') return matchesSearch && file.mimeType?.includes('pdf');
    return matchesSearch;
  });

  if (!profile?.google_connected) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-3xl flex items-center justify-center mb-6">
          <HardDrive className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Conectar Google Drive</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
          Acesse e gerencie seus arquivos, documentos e planilhas do Google Drive.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card text-card-foreground overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-card-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{title === 'Drive' ? 'Drive' : title === 'Docs' ? 'Documentos' : title === 'Sheets' ? 'Planilhas' : title}</h1>
          <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg">
            {filteredFiles.length} Itens
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
            {(['all', 'docs', 'sheets', 'pdf'] as const).map((f) => (
              <button 
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                  activeFilter === f ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600" : "text-slate-400"
                )}
              >
                {f === 'all' ? 'Tudo' : f === 'docs' ? 'Docs' : f === 'sheets' ? 'Sheets' : 'PDFs'}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Pesquisar arquivos..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          <div className="flex items-center bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600" : "text-slate-400")}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600" : "text-slate-400")}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
          <button onClick={fetchFiles} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <RefreshCw className={cn("w-5 h-5 text-slate-500", loading && "animate-spin")} />
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Upload
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredFiles.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredFiles.map((file) => (
                <div key={file.id} className="bg-card text-card-foreground border border-card-border rounded-3xl p-5 hover:shadow-md transition-all group cursor-pointer relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-2xl group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                      {getFileIcon(file.mimeType)}
                    </div>
                    <button className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-400">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate mb-1">{file.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Modificado em {file.modifiedTime ? format(new Date(file.modifiedTime), 'dd MMM yyyy') : 'Recentemente'}
                  </p>
                  
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button className="p-3 bg-white dark:bg-slate-700 rounded-full shadow-sm hover:text-blue-600 transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                    <button className="p-3 bg-white dark:bg-slate-700 rounded-full shadow-sm hover:text-blue-600 transition-colors">
                      <Share2 className="w-5 h-5" />
                    </button>
                    <button className="p-3 bg-white dark:bg-slate-700 rounded-full shadow-sm hover:text-red-600 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card text-card-foreground border border-card-border rounded-3xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Nome</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Última Modificação</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="border-b border-slate-50 dark:border-slate-800 last:border-none hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {getFileIcon(file.mimeType)}
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-xs">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                        {file.modifiedTime ? format(new Date(file.modifiedTime), 'dd MMM yyyy HH:mm') : 'Recentemente'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-400 rounded uppercase tracking-widest">
                          {file.mimeType?.split('.').pop()?.split('/').pop() || 'Arquivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-500"><Download className="w-4 h-4" /></button>
                          <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-500"><Share2 className="w-4 h-4" /></button>
                          <button className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <HardDrive className="w-12 h-12 opacity-20 mb-4" />
            <p>Nenhum arquivo encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
