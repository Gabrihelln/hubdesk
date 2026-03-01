import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FileText, Plus, Search, Trash2, Edit2, Clock, Star, Tag, ChevronRight, RefreshCw, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    const loadNotes = () => {
      try {
        const saved = user?.user_metadata?.dashboard_notes;
        if (saved) {
          setNotes(JSON.parse(saved));
        } else {
          setNotes([
            { id: 1, title: 'Project Ideas', content: '<p>Focus on user experience and speed.</p>', date: new Date().toISOString(), starred: true },
            { id: 2, title: 'Meeting Notes', content: '<p>Discussed the new dashboard layout.</p>', date: new Date().toISOString(), starred: false }
          ]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadNotes();
  }, [user?.user_metadata?.dashboard_notes]);

  const saveNotes = async (newNotes: any[]) => {
    setNotes(newNotes);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/profile/metadata', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ dashboard_notes: JSON.stringify(newNotes) })
      });
    } catch (err) {
      console.error("Error saving notes:", err);
    }
  };

  const handleAddNote = () => {
    const newNote = {
      id: Date.now(),
      title: 'Nota sem título',
      content: '',
      date: new Date().toISOString(),
      starred: false
    };
    const updatedNotes = [newNote, ...notes];
    saveNotes(updatedNotes);
    setSelectedNote(newNote);
    setIsEditing(true);
    setEditTitle(newNote.title);
    setEditContent(newNote.content);
  };

  const handleSaveNote = () => {
    if (!selectedNote) return;
    const updatedNotes = notes.map(n => 
      n.id === selectedNote.id 
        ? { ...n, title: editTitle, content: editContent, date: new Date().toISOString() } 
        : n
    );
    saveNotes(updatedNotes);
    setIsEditing(false);
    setSelectedNote({ ...selectedNote, title: editTitle, content: editContent });
  };

  const deleteNote = (id: number) => {
    const updatedNotes = notes.filter(n => n.id !== id);
    saveNotes(updatedNotes);
    if (selectedNote?.id === id) {
      setSelectedNote(null);
      setIsEditing(false);
    }
  };

  const toggleStar = (id: number) => {
    const updatedNotes = notes.map(n => n.id === id ? { ...n, starred: !n.starred } : n);
    saveNotes(updatedNotes);
  };

  return (
    <div className="h-full flex flex-col bg-card text-card-foreground overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-card-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Notas</h1>
          <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg">
            {notes.length} Total
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Pesquisar notas..." 
              className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          <button 
            onClick={handleAddNote}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Nota
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* List */}
        <div className={cn("w-80 border-r border-card-border flex flex-col", selectedNote && "hidden md:flex")}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notes.map((note) => (
              <div 
                key={note.id}
                onClick={() => {
                  setSelectedNote(note);
                  setIsEditing(false);
                  setEditTitle(note.title);
                  setEditContent(note.content);
                }}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer group",
                  selectedNote?.id === note.id 
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 shadow-sm" 
                    : "bg-card border-card-border hover:border-blue-200 dark:hover:border-blue-900"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate pr-4">{note.title}</h3>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleStar(note.id); }}
                    className={cn("transition-colors", note.starred ? "text-amber-400" : "text-slate-300 hover:text-amber-400")}
                  >
                    <Star className={cn("w-4 h-4", note.starred && "fill-current")} />
                  </button>
                </div>
                <div 
                  className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3"
                  dangerouslySetInnerHTML={{ __html: note.content || 'Sem conteúdo' }}
                />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {format(new Date(note.date), 'MMM dd')}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/30 flex flex-col">
          {selectedNote ? (
            <div className="flex-1 flex flex-col p-8 lg:p-12 max-w-4xl mx-auto w-full">
              <div className="flex items-center justify-between mb-8">
                <div className="flex-1">
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full bg-transparent border-none text-3xl font-extrabold text-slate-800 dark:text-white outline-none focus:ring-0 p-0"
                      placeholder="Título da Nota"
                    />
                  ) : (
                    <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">{selectedNote.title}</h1>
                  )}
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Editado pela última vez em {format(new Date(selectedNote.date), 'dd MMM yyyy HH:mm')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <button 
                      onClick={handleSaveNote}
                      className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-md"
                    >
                      <Save className="w-4 h-4" /> Salvar Nota
                    </button>
                  ) : (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" /> Editar
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 bg-card text-card-foreground rounded-3xl border border-card-border shadow-sm overflow-hidden flex flex-col">
                {isEditing ? (
                  <div className="flex-1 flex flex-col">
                    <ReactQuill 
                      theme="snow" 
                      value={editContent} 
                      onChange={setEditContent}
                      className="flex-1 flex flex-col"
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                          ['link', 'image'],
                          ['clean']
                        ],
                      }}
                    />
                  </div>
                ) : (
                  <div className="p-8 lg:p-12 prose dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: selectedNote.content || '<p className="text-slate-400 italic">Sem conteúdo ainda...</p>' }} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <FileText className="w-20 h-20 opacity-10 mb-6" />
              <p className="text-lg font-bold">Selecione uma nota para visualizar ou editar</p>
              <button onClick={handleAddNote} className="mt-4 text-blue-600 font-bold hover:underline">Ou crie uma nova</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
