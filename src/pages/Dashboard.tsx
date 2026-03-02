import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard } from '../contexts/DashboardContext';
import { supabase } from '../lib/supabase';
import { 
  Calendar as CalendarIcon, 
  Mail, 
  HardDrive, 
  CheckCircle2, 
  Clock,
  ChevronRight,
  Plus,
  MoreVertical,
  Cloud,
  Users,
  Video,
  RefreshCw,
  Layout as LayoutIcon,
  Lock,
  Unlock,
  Search,
  Bell,
  MessageSquare,
  FileText,
  FileCode,
  FileVideo,
  FileImage,
  ChevronLeft,
  ArrowLeft,
  Send,
  X,
  StickyNote,
  Link,
  ExternalLink,
  Trash2,
  Edit2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Default layout matching the 3-column structure of the image
const defaultLayout = [
  { i: 'events', x: 0, y: 0, w: 3, h: 10, minW: 2, minH: 4 },
  { i: 'mail', x: 3, y: 0, w: 5, h: 14, minW: 3, minH: 6 },
  { i: 'weather', x: 8, y: 0, w: 2, h: 6, minW: 2, minH: 4 },
  { i: 'quick-links', x: 10, y: 0, w: 2, h: 6, minW: 2, minH: 4 },
  { i: 'conference', x: 8, y: 6, w: 4, h: 8, minW: 2, minH: 4 },
  { i: 'drive', x: 8, y: 14, w: 4, h: 10, minW: 2, minH: 4 },
  { i: 'tasks', x: 0, y: 10, w: 4, h: 12, minW: 2, minH: 6 },
  { i: 'quick-notes', x: 4, y: 14, w: 4, h: 8, minW: 2, minH: 4 },
];

const smLayout = [
  { i: 'events', x: 0, y: 0, w: 3, h: 10, minW: 2, minH: 4 },
  { i: 'mail', x: 3, y: 0, w: 3, h: 14, minW: 3, minH: 6 },
  { i: 'weather', x: 0, y: 10, w: 3, h: 6, minW: 2, minH: 4 },
  { i: 'quick-links', x: 3, y: 10, w: 3, h: 6, minW: 2, minH: 4 },
  { i: 'conference', x: 0, y: 16, w: 6, h: 8, minW: 2, minH: 4 },
  { i: 'drive', x: 0, y: 24, w: 6, h: 10, minW: 2, minH: 4 },
  { i: 'tasks', x: 0, y: 34, w: 6, h: 12, minW: 2, minH: 6 },
  { i: 'quick-notes', x: 0, y: 46, w: 6, h: 8, minW: 2, minH: 4 },
];

const xsLayout = [
  { i: 'events', x: 0, y: 0, w: 4, h: 10, minW: 2, minH: 4 },
  { i: 'mail', x: 0, y: 10, w: 4, h: 14, minW: 3, minH: 6 },
  { i: 'weather', x: 0, y: 24, w: 2, h: 6, minW: 2, minH: 4 },
  { i: 'quick-links', x: 2, y: 24, w: 2, h: 6, minW: 2, minH: 4 },
  { i: 'conference', x: 0, y: 30, w: 4, h: 8, minW: 2, minH: 4 },
  { i: 'drive', x: 0, y: 38, w: 4, h: 10, minW: 2, minH: 4 },
  { i: 'tasks', x: 0, y: 48, w: 4, h: 12, minW: 2, minH: 6 },
  { i: 'quick-notes', x: 0, y: 60, w: 4, h: 8, minW: 2, minH: 4 },
];

const xxsLayout = [
  { i: 'events', x: 0, y: 0, w: 2, h: 10, minW: 1, minH: 4 },
  { i: 'mail', x: 0, y: 10, w: 2, h: 14, minW: 1, minH: 6 },
  { i: 'weather', x: 0, y: 24, w: 2, h: 6, minW: 1, minH: 4 },
  { i: 'quick-links', x: 0, y: 30, w: 2, h: 6, minW: 1, minH: 4 },
  { i: 'conference', x: 0, y: 36, w: 2, h: 8, minW: 1, minH: 4 },
  { i: 'drive', x: 0, y: 44, w: 2, h: 10, minW: 1, minH: 4 },
  { i: 'tasks', x: 0, y: 54, w: 2, h: 12, minW: 1, minH: 6 },
  { i: 'quick-notes', x: 0, y: 66, w: 2, h: 8, minW: 1, minH: 4 },
];

export default function Dashboard() {
  const { profile, user, connectGoogle, disconnectGoogle, refreshProfile } = useAuth();
  const dashboard = useDashboard();
  const isDraggable = dashboard?.isDraggable || false;
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [isAddingTaskInModal, setIsAddingTaskInModal] = useState(false);
  const [isAddingNoteInModal, setIsAddingNoteInModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [taskCreationConfig, setTaskCreationConfig] = useState({ priority: 'Medium', dueDate: new Date().toISOString().split('T')[0] });
  const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number, text: string } | null>(null);
  
  const safeFormat = (date: any, formatStr: string, options?: any) => {
    try {
      if (!date) return 'N/A';
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      return format(d, formatStr, options);
    } catch (e) {
      return 'N/A';
    }
  };

  const [events, setEvents] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [isViewingEmail, setIsViewingEmail] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [citySaveStatus, setCitySaveStatus] = useState<string | null>(null);
  const [debouncedCityInput, setDebouncedCityInput] = useState('');
  const [nextConference, setNextConference] = useState<any>(null);
  const [countdown, setCountdown] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce city input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCityInput(cityInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [cityInput]);

  // Fetch suggestions when debounced input changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedCityInput.length < 2) {
        setCitySuggestions([]);
        return;
      }
      try {
        const res = await fetch(`/api/cities?search=${encodeURIComponent(debouncedCityInput)}`);
        if (res.ok) {
          const suggestions = await res.json();
          setCitySuggestions(suggestions);
        }
      } catch (e) {
        console.error("Error fetching city suggestions:", e);
      }
    };
    fetchSuggestions();
  }, [debouncedCityInput]);
  
  const [tasks, setTasks] = useState<any[]>(() => {
    try {
      const saved = user?.user_metadata?.dashboard_tasks;
      return saved ? JSON.parse(saved) : [
        { id: 1, title: 'Weekly Team Update', priority: 'Medium', dueDate: '2021-10-08', completed: false, category: 'Design 2021' },
        { id: 2, title: 'Project Kickoff Plan', priority: 'High', dueDate: '2021-10-12', completed: false, category: 'Marketing' }
      ];
    } catch (e) {
      return [];
    }
  });
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'Medium', dueDate: format(new Date(), 'yyyy-MM-dd') });

  const [notes, setNotes] = useState<any[]>(() => {
    try {
      const saved = user?.user_metadata?.dashboard_notes;
      return saved ? JSON.parse(saved) : [
        { id: 1, title: 'Project Ideas', content: '<p>Focus on user experience and speed.</p>', date: new Date().toISOString(), starred: true },
        { id: 2, title: 'Meeting Notes', content: '<p>Discussed the new dashboard layout.</p>', date: new Date().toISOString(), starred: false }
      ];
    } catch (e) {
      return [];
    }
  });
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '' });

  const [quickLinks, setQuickLinks] = useState<any[]>(() => {
    try {
      const saved = user?.user_metadata?.dashboard_quick_links;
      return saved ? JSON.parse(saved) : [
        { id: 1, title: 'Google', url: 'https://google.com' },
        { id: 2, title: 'GitHub', url: 'https://github.com' }
      ];
    } catch (e) {
      return [];
    }
  });
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLink, setNewLink] = useState({ title: '', url: '' });

  const [hasLoadedLayout, setHasLoadedLayout] = useState(false);

  const [layouts, setLayouts] = useState<any>(() => {
    return { lg: defaultLayout, md: defaultLayout, sm: smLayout, xs: xsLayout, xxs: xxsLayout };
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (profile?.dashboard_layouts && !hasLoadedLayout) {
      try {
        const parsed = JSON.parse(profile.dashboard_layouts);
        setLayouts({
          lg: parsed.lg || defaultLayout,
          md: parsed.md || parsed.lg || defaultLayout,
          sm: parsed.sm || smLayout,
          xs: parsed.xs || xsLayout,
          xxs: parsed.xxs || xxsLayout,
        });
        setHasLoadedLayout(true);
      } catch (e) {
        console.error("Error loading saved layouts:", e);
      }
    }
  }, [profile?.dashboard_layouts, hasLoadedLayout]);

  // Handle reset signal from context
  useEffect(() => {
    if (dashboard?.resetSignal && dashboard.resetSignal > 0) {
      const reset = async () => {
        const newLayouts = { lg: defaultLayout, md: defaultLayout, sm: defaultLayout, xs: defaultLayout, xxs: defaultLayout };
        setLayouts(newLayouts);
        setHasLoadedLayout(true);
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await fetch('/api/profile/metadata', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${session.access_token}` 
              },
              body: JSON.stringify({ dashboard_layouts: JSON.stringify(newLayouts) })
            });
          }
        } catch (e) {
          console.error("Error resetting layout:", e);
        }
      };
      reset();
    }
  }, [dashboard?.resetSignal]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const headers = { 
        'Authorization': `Bearer ${session.access_token}`,
        'Accept': 'application/json'
      };

      const [weatherRes, tasksRes, notesRes, linksRes] = await Promise.all([
        fetch(`/api/weather?city=${encodeURIComponent(profile?.city || 'São Luís')}`, { headers }),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('notes').select('*').order('created_at', { ascending: false }),
        supabase.from('quick_links').select('*').order('created_at', { ascending: false })
      ]);

      if (weatherRes.ok && weatherRes.headers.get("content-type")?.includes("application/json")) setWeather(await weatherRes.json());
      if (tasksRes.data) setTasks(tasksRes.data);
      if (notesRes.data) setNotes(notesRes.data);
      if (linksRes.data) setQuickLinks(linksRes.data);

      if (profile?.google_connected) {
        const [calRes, mailRes, driveRes] = await Promise.all([
          fetch('/api/google/calendar?today=true', { headers }),
          fetch('/api/google/gmail?unread=true', { headers }),
          fetch('/api/google/drive', { headers })
        ]);
        if (calRes.ok && calRes.headers.get("content-type")?.includes("application/json")) setEvents(await calRes.json());
        if (mailRes.ok && mailRes.headers.get("content-type")?.includes("application/json")) setEmails(await mailRes.json());
        if (driveRes.ok && driveRes.headers.get("content-type")?.includes("application/json")) setFiles(await driveRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [profile?.google_connected, profile?.city]);

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
    if (!id || id === 'undefined') return;
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
        setIsViewingEmail(true);
        
        // Mark as read
        const readRes = await fetch(`/api/google/gmail/${encodeURIComponent(id)}/read`, { method: 'POST', headers });
        if (!readRes.ok) {
          const errData = await readRes.json();
          if (errData.code === 'INSUFFICIENT_SCOPES') {
            setGmailError(errData.error);
          }
        } else {
          setGmailError(null);
          // Remove from dashboard list as it's no longer "unread"
          setEmails(prev => prev.filter(e => e.id !== id));
        }
      } else {
        const errData = await res.json().catch(() => ({ error: 'Failed to parse error JSON' }));
        console.error("Error response from Gmail detail:", res.status, errData);
      }
    } catch (err) {
      console.error("Error fetching email detail:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const upcomingEvents = events.filter(event => {
    const end = new Date(event.end?.dateTime || event.end?.date).getTime();
    return end > currentTime.getTime();
  });

  useEffect(() => {
    if (upcomingEvents.length > 0) {
      setNextConference(upcomingEvents[0]);
    } else {
      setNextConference(null);
    }
  }, [upcomingEvents]);

  useEffect(() => {
    if (!nextConference) return;

    const start = new Date(nextConference.start.dateTime || nextConference.start.date).getTime();
    const now = currentTime.getTime();
    const diff = start - now;

    if (diff > 0) {
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown({ d, h, m, s });
    } else {
      setCountdown({ d: 0, h: 0, m: 0, s: 0 });
    }
  }, [nextConference, currentTime]);

  const getEventDuration = (event: any) => {
    if (!event?.start || !event?.end) return '30m';
    const start = new Date(event.start.dateTime || event.start.date).getTime();
    const end = new Date(event.end.dateTime || event.end.date).getTime();
    const diffMs = end - start;
    const diffMins = Math.round(diffMs / (1000 * 60));
    
    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getMeetingLink = (event: any) => {
    if (!event) return '#';
    
    // 1. Google Meet specific link
    if (event.hangoutLink) return event.hangoutLink;
    
    // 2. Conference Data (Meet, Zoom, etc integrated)
    const conferenceLink = event.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri;
    if (conferenceLink) return conferenceLink;
    
    // 3. Location if it's a URL
    if (event.location && (event.location.startsWith('http') || event.location.includes('zoom.us') || event.location.includes('meet.google.com'))) {
      let loc = event.location.trim();
      if (!loc.startsWith('http')) loc = `https://${loc}`;
      return loc;
    }
    
    // 4. Search in description for any URL that looks like a meeting
    if (event.description) {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = event.description.match(urlRegex);
      if (matches) {
        const meetingUrl = matches.find((url: string) => 
          url.includes('zoom.us') || 
          url.includes('meet.google.com') || 
          url.includes('teams.microsoft.com') ||
          url.includes('webex.com')
        );
        if (meetingUrl) return meetingUrl;
        // Fallback to first URL in description if no specific meeting provider found
        return matches[0];
      }
    }
    
    // 5. Fallback to the event page itself
    return event.htmlLink || '#';
  };

  const isJoinable = (event: any) => {
    if (!event?.start) return false;
    const start = new Date(event.start.dateTime || event.start.date).getTime();
    const now = currentTime.getTime();
    const diffMins = (start - now) / (1000 * 60);
    
    // Joinable if it starts in 2 minutes or less, or if it has already started
    return diffMins <= 2;
  };

  const handleLayoutChange = (currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    
    if (!isDraggable || !hasLoadedLayout) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        await fetch('/api/profile/metadata', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${session.access_token}` 
          },
          body: JSON.stringify({ dashboard_layouts: JSON.stringify(allLayouts) })
        });
      } catch (err) {
        console.error("Error saving layout:", err);
      }
    }, 1000);
  };

  const handleCitySubmit = async (city: string) => {
    if (!city.trim()) return;
    
    // Save the full city name to be more accurate on reload
    const cityName = city.trim();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await fetch('/api/profile/metadata', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ city: cityName })
      });
      
      if (res.ok) {
        await refreshProfile();
        setCitySaveStatus('Salvo!');
        setTimeout(() => setCitySaveStatus(null), 2000);
        setIsEditingCity(false);
        setCitySuggestions([]);
        setCityInput('');
      }
    } catch (err) {
      console.error("Error updating city:", err);
    }
  };

  const saveTasks = async (newTasks: any[]) => {
    setTasks(newTasks);
    // We'll let the individual handlers handle the database sync for better performance
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          user_id: user.id,
          title: newTask.title,
          priority: newTask.priority,
          due_date: newTask.dueDate,
          completed: false,
          category: 'General'
        }])
        .select()
        .single();

      if (error) throw error;
      setTasks([data, ...tasks]);
      setNewTask({ title: '', priority: 'Medium', dueDate: format(new Date(), 'yyyy-MM-dd') });
      setIsAddingTask(false);
      setIsAddingTaskInModal(false);
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };

  const toggleTask = async (id: any) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newCompleted = !task.completed;
    const newTasks = tasks.map(t => t.id === id ? { ...t, completed: newCompleted } : t);
    setTasks(newTasks);

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: newCompleted })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Error toggling task:", err);
      // Rollback on error
      setTasks(tasks);
    }
  };

  const saveNotes = async (newNotes: any[]) => {
    setNotes(newNotes);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.title.trim() || !newNote.content.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notes')
        .insert([{
          user_id: user.id,
          title: newNote.title,
          content: `<p>${newNote.content}</p>`,
          starred: false
        }])
        .select()
        .single();

      if (error) throw error;
      setNotes([data, ...notes]);
      setNewNote({ title: '', content: '' });
      setIsAddingNote(false);
      setIsAddingNoteInModal(false);
    } catch (err) {
      console.error("Error adding note:", err);
    }
  };

  const handleTextSelection = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect) {
        setSelectionMenu({
          x: rect.left + window.scrollX + (rect.width / 2),
          y: rect.top + window.scrollY - 40,
          text: text
        });
      }
    } else {
      setSelectionMenu(null);
    }
  };

  const createTaskFromSelection = async () => {
    if (!selectionMenu) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          user_id: user.id,
          title: selectionMenu.text,
          completed: false,
          priority: taskCreationConfig.priority,
          due_date: taskCreationConfig.dueDate,
          category: 'General'
        }])
        .select()
        .single();

      if (error) throw error;
      setTasks([data, ...tasks]);
      setSelectionMenu(null);
      window.getSelection()?.removeAllRanges();
    } catch (err) {
      console.error("Error creating task from selection:", err);
    }
  };

  const handleDeleteTask = async (id: any) => {
    const originalTasks = [...tasks];
    setTasks(tasks.filter(t => t.id !== id));
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Error deleting task:", err);
      setTasks(originalTasks);
    }
  };

  const handleDeleteNote = async (id: any) => {
    const originalNotes = [...notes];
    setNotes(notes.filter(n => n.id !== id));
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Error deleting note:", err);
      setNotes(originalNotes);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: editingTask.title,
          priority: editingTask.priority,
          due_date: editingTask.due_date || editingTask.dueDate,
          completed: editingTask.completed
        })
        .eq('id', editingTask.id);

      if (error) throw error;
      const updatedTasks = tasks.map(t => t.id === editingTask.id ? editingTask : t);
      setTasks(updatedTasks);
      setEditingTask(null);
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: editingNote.title,
          content: editingNote.content,
          starred: editingNote.starred
        })
        .eq('id', editingNote.id);

      if (error) throw error;
      const updatedNotes = notes.map(n => n.id === editingNote.id ? editingNote : n);
      setNotes(updatedNotes);
      setEditingNote(null);
    } catch (err) {
      console.error("Error updating note:", err);
    }
  };

  const saveQuickLinks = async (links: any[]) => {
    setQuickLinks(links);
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.title.trim() || !newLink.url.trim()) return;
    
    let url = newLink.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('quick_links')
        .insert([{
          user_id: user.id,
          title: newLink.title,
          url: url
        }])
        .select()
        .single();

      if (error) throw error;
      setQuickLinks([data, ...quickLinks]);
      setNewLink({ title: '', url: '' });
      setIsAddingLink(false);
    } catch (err) {
      console.error("Error adding quick link:", err);
    }
  };

  const removeLink = async (id: any) => {
    const originalLinks = [...quickLinks];
    setQuickLinks(quickLinks.filter(l => l.id !== id));
    try {
      const { error } = await supabase.from('quick_links').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Error removing quick link:", err);
      setQuickLinks(originalLinks);
    }
  };

  const ConnectWidget = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3">
      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs font-medium text-slate-500">Conecte sua conta Google para ver {title}</p>
      <button onClick={connectGoogle} className="text-xs font-bold text-blue-600 hover:underline">Conectar Agora</button>
    </div>
  );

  const getGreeting = () => {
    const hour = currentTime.getHours();
    
    // Try to get a better first name. Priority: profile.name (if not email-like), then user_metadata
    let nameToUse = profile?.name || '';
    
    // If name looks like an email prefix (no spaces, contains numbers/special chars), try metadata
    if (nameToUse === user?.email?.split('@')[0]) {
      nameToUse = user?.user_metadata?.full_name || user?.user_metadata?.name || nameToUse;
    }
    
    const firstName = nameToUse.split(' ')[0];
    
    let timeGreeting = '';
    if (hour >= 5 && hour < 12) timeGreeting = 'Bom dia';
    else if (hour >= 12 && hour < 18) timeGreeting = 'Boa tarde';
    else timeGreeting = 'Boa noite';

    const phrases = [
      `${timeGreeting},`,
      'O que temos para hoje?',
      'Como está seu dia?',
      'Pronto para ser produtivo?',
      'Vamos organizar suas tarefas?',
      'Que tal conferir seus compromissos?',
      'Olá,',
      'Vamos trabalhar?'
    ];
    
    // Use a more stable index based on the hour to avoid flickering every minute if the user prefers
    // But since they asked for "alternancia", maybe random or minute-based is what they want.
    // Let's use hour + (minute / 10) to change every 10 mins, or just use a state to pick one on mount.
    // For now, let's use a simple stable-ish index.
    const phraseIndex = (currentTime.getHours() * 6 + Math.floor(currentTime.getMinutes() / 10)) % phrases.length;
    const greetingBase = phrases[phraseIndex];
    
    return { greetingBase, firstName };
  };

  const { greetingBase, firstName } = getGreeting();

  return (
    <div className="min-h-full transition-colors duration-300">
      {/* Welcome Section */}
      <div className="px-4 mb-10">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white flex items-baseline gap-3 flex-wrap">
          <span>{greetingBase} {firstName} 👋</span>
        </h1>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-2">Hoje você tem :</span>
          <span className="flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-blue-500" /> <span className="text-slate-700 dark:text-slate-200 font-bold">{upcomingEvents.length} reuniões</span> para hoje</span>
          {/* <span className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /> <span className="text-slate-700 dark:text-slate-200 font-bold">1 conferência</span> para participar</span> */}
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> <span className="text-slate-700 dark:text-slate-200 font-bold">{tasks.filter(t => !t.completed).length} tarefas</span> para completar</span>
          <span className="flex items-center gap-2"><Mail className="w-4 h-4 text-blue-500" /> <span className="text-slate-700 dark:text-slate-200 font-bold">{emails.length} mensagens</span> para ler</span>
        </div>
      </div>

      {/* Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={30}
        draggableHandle=".drag-handle"
        isDraggable={isDraggable}
        isResizable={isDraggable}
        resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
        onLayoutChange={handleLayoutChange}
        margin={{ lg: [24, 24], md: [20, 20], sm: [16, 16], xs: [12, 12], xxs: [8, 8] }}
        useCSSTransforms={true}
      >
        {/* EVENTS */}
        <div key="events" className="bg-card text-card-foreground rounded-3xl border border-card-border shadow-sm overflow-hidden flex flex-col transition-colors">
          <div className={cn("p-6 flex items-center justify-between", isDraggable && "drag-handle cursor-move bg-slate-50/50 dark:bg-slate-700/50")}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Minha Agenda</h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500">
              Hoje <ChevronRight className="w-4 h-4" />
            </div>
          </div>
          <div className="flex-1 px-6 pb-6 overflow-y-auto space-y-8">
            {profile?.google_connected ? (
              upcomingEvents.length > 0 ? upcomingEvents.map((event, i) => (
                <div key={i} className="flex gap-5 group cursor-pointer">
                  <div className="text-center shrink-0 w-14">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{safeFormat(event.start.dateTime || event.start.date, 'HH:mm')}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">AM</p>
                  </div>
                  <div className="flex-1 pl-5 border-l-2 border-fuchsia-400 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50 rounded-r-2xl transition-colors py-1.5">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{event.summary}</h3>
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" /> Até {safeFormat(event.end.dateTime || event.end.date, 'HH:mm')} AM
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 self-center" />
                </div>
              )) : <p className="text-center text-sm text-slate-400 py-10">Sem reuniões para hoje</p>
            ) : <ConnectWidget icon={CalendarIcon} title="Calendário" />}
          </div>
        </div>

        {/* CONFERENCE SOON */}
        <div key="conference" className="bg-card text-card-foreground rounded-3xl border border-card-border shadow-sm p-6 flex flex-col transition-colors">
          <div className={cn("flex items-center justify-between mb-6", isDraggable && "drag-handle cursor-move")}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center border border-blue-100 dark:border-blue-800">
                <Video className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Reuniões Próximas</h2>
            </div>
            <button 
              onClick={() => fetchData()}
              className={cn(
                "p-2 text-slate-400 hover:text-blue-500 transition-colors",
                isRefreshing && "animate-spin text-blue-500"
              )}
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          {nextConference ? (
            <>
              {/* Main Highlight Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-5 gap-4">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-2xl"></div>
                <div className="space-y-4 flex-1 pl-2">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">{nextConference.summary}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-medium">
                          {safeFormat(nextConference.start.dateTime || nextConference.start.date, "EEEE, HH:mm a", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-medium">{getEventDuration(nextConference)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Smaller Countdown inside the left section */}
                  <div className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-600">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{countdown.d}d</span>
                    </div>
                    <div className="w-px h-3 bg-slate-200 dark:bg-slate-600"></div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{countdown.h}h</span>
                    </div>
                    <div className="w-px h-3 bg-slate-200 dark:bg-slate-600"></div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{countdown.m}m</span>
                    </div>
                    <div className="w-px h-3 bg-slate-200 dark:bg-slate-600"></div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{countdown.s}s</span>
                    </div>
                  </div>
                </div>

                {/* Join Button on the right side */}
                {isJoinable(nextConference) ? (
                  <a 
                    href={getMeetingLink(nextConference)} 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-[#2D4A5E] hover:bg-[#1e3240] text-white px-6 py-3 rounded-2xl flex flex-col items-center justify-center gap-0.5 shadow-lg transition-all active:scale-95 group min-w-[120px]"
                  >
                    <Video className="w-4 h-4 mb-0.5 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Participar</span>
                    <span className="text-[9px] opacity-60 font-medium">Agora</span>
                  </a>
                ) : (
                  <div 
                    className="bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 px-6 py-3 rounded-2xl flex flex-col items-center justify-center gap-0.5 min-w-[120px] cursor-default border border-slate-200 dark:border-slate-700"
                    title="Disponível 2 minutos antes do início"
                  >
                    <Clock className="w-4 h-4 mb-0.5 opacity-50" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Em breve</span>
                  </div>
                )}
              </div>

              {/* Secondary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                {upcomingEvents
                  .filter(e => e.id !== nextConference.id)
                  .slice(0, 2)
                  .map((meeting, i) => (
                    <div key={i} className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{meeting.summary}</h4>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-slate-400">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-medium">
                            {safeFormat(meeting.start.dateTime || meeting.start.date, "dd MMM yyyy, HH:mm a", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-medium">{getEventDuration(meeting)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-3 py-10">
              <Video className="w-10 h-10 opacity-20" />
              <p className="text-sm font-medium">Nenhuma reunião agendada</p>
              {!profile?.google_connected && (
                <button 
                  onClick={connectGoogle}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Conectar Google Calendar
                </button>
              )}
            </div>
          )}
        </div>

        {/* PROJECT TASKS */}
        <div key="tasks" className="bg-card text-card-foreground rounded-3xl border border-card-border shadow-sm p-6 flex flex-col transition-colors">
          <div className={cn("flex items-center justify-between mb-6", isDraggable && "drag-handle cursor-move")}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Minhas Tarefas</h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsAddingTask(!isAddingTask)}
                className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsTasksModalOpen(true)}
                className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {isAddingTask && (
            <form onSubmit={handleAddTask} className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
              <input 
                type="text" 
                placeholder="Título da tarefa..."
                value={newTask.title}
                onChange={e => setNewTask({...newTask, title: e.target.value})}
                className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="flex gap-2">
                <select 
                  value={newTask.priority}
                  onChange={e => setNewTask({...newTask, priority: e.target.value})}
                  className="flex-1 bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Low">Baixa</option>
                  <option value="Medium">Média</option>
                  <option value="High">Alta</option>
                </select>
                <input 
                  type="date" 
                  value={newTask.dueDate}
                  onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                  className="flex-1 bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">Adicionar Tarefa</button>
                <button type="button" onClick={() => setIsAddingTask(false)} className="flex-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 py-2 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors">Cancelar</button>
              </div>
            </form>
          )}

          <div className="flex border-b border-slate-100 dark:border-slate-700 mb-6">
            <button className="px-6 py-3 text-xs font-bold text-blue-600 border-b-2 border-blue-600">Atribuídas Recentemente</button>
            <button className="px-6 py-3 text-xs font-bold text-slate-400">Prazo Próximo</button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-6 scrollbar-thin">
            {tasks.length > 0 ? tasks.map((task) => (
              <div key={task.id} className={cn("flex items-center gap-4 group transition-opacity", task.completed && "opacity-50")}>
                <button 
                  onClick={() => toggleTask(task.id)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                    task.completed ? "bg-emerald-500 border-emerald-500" : "border-slate-200 dark:border-slate-600 hover:border-blue-500"
                  )}
                >
                  {task.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-bold text-slate-800 dark:text-slate-200 truncate", task.completed && "line-through")}>{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                      task.priority === 'High' ? "bg-red-100 text-red-600" :
                      task.priority === 'Medium' ? "bg-amber-100 text-amber-600" :
                      "bg-blue-100 text-blue-600"
                    )}>
                      {task.priority === 'High' ? 'Alta' : task.priority === 'Medium' ? 'Média' : 'Baixa'}
                    </span>
                    <p className="text-xs text-slate-400">{safeFormat(task.due_date || task.dueDate, 'dd MMM yyyy')} • {task.category}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 opacity-20" />
                <p className="text-sm">Nenhuma tarefa encontrada</p>
              </div>
            )}
          </div>
        </div>

        {/* MAIL */}
        <div key="mail" className="bg-card text-card-foreground rounded-3xl border border-card-border shadow-sm overflow-hidden flex flex-col transition-colors">
          <div className={cn("p-6 flex items-center justify-between", isDraggable && "drag-handle cursor-move bg-slate-50/50 dark:bg-slate-700/50")}>
            <div className="flex items-center gap-4">
              {isViewingEmail ? (
                <button 
                  onClick={() => { setIsViewingEmail(false); setSelectedEmail(null); }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-500" />
                </button>
              ) : (
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
              )}
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                {isViewingEmail ? 'Visualizar E-mail' : 'Meus E-mails'}
              </h2>
            </div>
            {isViewingEmail && selectedEmail && (
              <a 
                href={`https://mail.google.com/mail/u/${profile?.email}/#inbox/${selectedEmail.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
              >
                <Mail className="w-3 h-3" />
                Abrir no Gmail
              </a>
            )}
          </div>
          
          <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-700/30 border-y border-slate-100 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">
              {isViewingEmail ? selectedEmail?.subject : `Entrada: ${profile?.email || 'estherh@gmail.com'}`}
            </p>
          </div>

          {gmailError && (
            <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/40 flex items-center justify-between gap-4">
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 leading-tight flex-1">
                {gmailError}
              </p>
              <button 
                onClick={connectGoogle}
                className="shrink-0 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-[10px] font-bold hover:bg-amber-700 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" /> Reconectar
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {profile?.google_connected ? (
              isViewingEmail && selectedEmail ? (
                <div className="p-6 space-y-6">
                  {/* Email Header */}
                  <div className="flex items-start gap-4">
                    <img src={`https://ui-avatars.com/api/?name=${selectedEmail.from}&background=random`} className="w-12 h-12 rounded-full shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedEmail.from}</h4>
                          <p className="text-xs text-slate-400">Para: {selectedEmail.to}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-slate-400">{selectedEmail.date}</span>
                        </div>
                      </div>
                    </div>
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
                      style={{ height: '500px' }}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {emails.length > 0 ? emails.map((email, i) => (
                    <div 
                      key={i} 
                      onClick={() => fetchEmailDetail(email.id)}
                      className={cn(
                        "flex gap-4 group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 p-2 -m-2 rounded-2xl transition-colors relative",
                        email.unread && "bg-blue-50/30 dark:bg-blue-900/10"
                      )}
                    >
                      {email.unread && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full"></div>
                      )}
                      <img src={`https://ui-avatars.com/api/?name=${email.from}&background=random`} className="w-10 h-10 rounded-full shadow-sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className={cn("text-xs font-bold truncate", email.unread ? "text-blue-600 dark:text-blue-400" : "text-slate-800 dark:text-slate-200")}>
                            {email.from?.split('<')[0]}
                          </h4>
                          <span className="text-xs font-bold text-slate-400">{email.date ? safeFormat(email.date, 'HH:mm') : 'Hoje'}</span>
                        </div>
                        <p className={cn("text-xs truncate mb-0.5", email.unread ? "font-bold text-slate-900 dark:text-slate-100" : "font-bold text-slate-700 dark:text-slate-300")}>
                          {email.subject}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{email.snippet}</p>
                      </div>
                    </div>
                  )) : <p className="text-center text-sm text-slate-400 py-10">Nenhum e-mail encontrado</p>}
                </div>
              )
            ) : <div className="p-6"><ConnectWidget icon={Mail} title="E-mail" /></div>}
          </div>
        </div>

        {/* DRIVE */}
        <div key="drive" className="bg-card text-card-foreground rounded-3xl border border-card-border shadow-sm overflow-hidden flex flex-col transition-colors">
          <div className={cn("p-6 flex items-center justify-between", isDraggable && "drag-handle cursor-move bg-slate-50/50 dark:bg-slate-700/50")}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Meu Drive</h2>
            </div>
          </div>
          <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-700/30 border-y border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Itens Compartilhados Recentes</p>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 cursor-pointer hover:text-slate-600">Todos <ChevronRight className="w-4 h-4" /></div>
          </div>
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            {profile?.google_connected ? (
              files.length > 0 ? files.map((file, i) => (
                <div key={i} className="flex items-center gap-4 group cursor-pointer">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                    {file.mimeType?.includes('pdf') ? <FileText className="w-5 h-5 text-red-500" /> :
                     file.mimeType?.includes('word') ? <FileCode className="w-5 h-5 text-blue-500" /> :
                     file.mimeType?.includes('video') ? <FileVideo className="w-5 h-5 text-purple-500" /> :
                     <FileImage className="w-5 h-5 text-emerald-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{file.name}</h4>
                    <p className="text-xs text-slate-400">Compartilhado há 4 minutos</p>
                  </div>
                </div>
              )) : <p className="text-center text-sm text-slate-400 py-10">Nenhum arquivo encontrado</p>
            ) : <ConnectWidget icon={HardDrive} title="Meu Drive" />}
          </div>
        </div>

        {/* WEATHER */}
        <div key="weather" className="bg-card text-card-foreground rounded-3xl border border-card-border shadow-sm p-8 flex flex-col justify-between transition-colors">
          <div className={cn("flex justify-between items-start", isDraggable && "drag-handle cursor-move")}>
            <div className="flex-1">
              <div className="flex items-center gap-3 text-slate-400 text-xs font-bold relative">
                {isEditingCity ? (
                  <div className="relative flex-1 max-w-[200px]">
                    <input 
                      autoFocus
                      type="text" 
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && cityInput.trim()) {
                          handleCitySubmit(cityInput);
                        } else if (e.key === 'Escape') {
                          setIsEditingCity(false);
                        }
                      }}
                      onBlur={() => {
                        // Small delay to allow onMouseDown to fire
                        setTimeout(() => setIsEditingCity(false), 200);
                      }}
                      placeholder="Digite a cidade..."
                      className="w-full bg-slate-100 dark:bg-slate-700 border-none rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {citySuggestions.length > 0 && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                        {citySuggestions.map((city, i) => (
                          <button 
                            key={i}
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent blur before selection
                              handleCitySubmit(city);
                            }}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-50 dark:border-slate-700 last:border-none"
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group cursor-pointer" onClick={() => {
                    setCityInput(profile?.city || '');
                    setIsEditingCity(true);
                  }}>
                    <span className="hover:text-blue-500 transition-colors">
                      {citySaveStatus ? (
                        <span className="text-emerald-500 font-bold">{citySaveStatus}</span>
                      ) : (
                        weather?.city ? `${weather.city}${weather.region ? `, ${weather.region}` : ''}` : (profile?.city || 'São Luís')
                      )}
                    </span>
                    <Search className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
              <div className="mt-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{weather?.description || 'Céu limpo'}</p>
                <p className="text-5xl font-extrabold text-slate-800 dark:text-white">{weather?.temp ? `${Math.round(weather.temp)}°C` : '25°C'}</p>
                <div className="mt-4 text-sm font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                  {new Intl.DateTimeFormat('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: weather?.timezone || 'America/Sao_Paulo',
                    hour12: false
                  }).format(currentTime)}
                </div>
              </div>
            </div>
            <div className="text-5xl flex items-center justify-center w-20 h-20 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl">
              {weather?.icon ? (
                <img 
                  src={`https://openweathermap.org/img/wn/${weather.icon}@4x.png`} 
                  className="w-20 h-20 object-contain" 
                  alt="ícone do clima"
                />
              ) : '☀️'}
            </div>
          </div>
        </div>

        {/* QUICK LINKS */}
        <div key="quick-links" className="bg-card text-card-foreground rounded-3xl border border-card-border shadow-sm overflow-hidden flex flex-col transition-colors">
          <div className={cn("p-6 flex items-center justify-between", isDraggable && "drag-handle cursor-move bg-slate-50/50 dark:bg-slate-700/50")}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                <Link className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Links Rápidos</h2>
            </div>
            <button 
              onClick={() => setIsAddingLink(!isAddingLink)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
            {isAddingLink && (
              <form onSubmit={handleAddLink} className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Nome do link"
                  value={newLink.title}
                  onChange={e => setNewLink({ ...newLink, title: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input 
                  type="text" 
                  placeholder="URL (ex: google.com)"
                  value={newLink.url}
                  onChange={e => setNewLink({ ...newLink, url: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-xs font-bold hover:bg-blue-700 transition-colors">
                    Adicionar
                  </button>
                  <button type="button" onClick={() => setIsAddingLink(false)} className="flex-1 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-xl py-2 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 gap-3">
              {quickLinks.length > 0 ? quickLinks.map((link) => (
                <div key={link.id} className="group flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all">
                  <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 flex items-center gap-3 min-w-0"
                  >
                    <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm">
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{link.title}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{link.url.replace(/^https?:\/\//, '')}</p>
                    </div>
                  </a>
                  <button 
                    onClick={() => removeLink(link.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )) : (
                <div className="text-center py-10 space-y-2">
                  <Link className="w-8 h-8 text-slate-200 mx-auto" />
                  <p className="text-sm text-slate-400">Nenhum link adicionado</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* QUICK NOTES */}
        <div key="quick-notes" className="bg-card text-card-foreground rounded-3xl border border-card-border shadow-sm p-6 flex flex-col transition-colors h-full">
          <div className={cn("flex items-center justify-between mb-6", isDraggable && "drag-handle cursor-move")}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                <StickyNote className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Notas Rápidas</h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsAddingNote(!isAddingNote)}
                className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsNotesModalOpen(true)}
                className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {isAddingNote && (
            <form onSubmit={handleAddNote} className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
              <input 
                type="text" 
                placeholder="Título da nota..."
                value={newNote.title}
                onChange={e => setNewNote({...newNote, title: e.target.value})}
                className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <textarea 
                placeholder="Conteúdo da nota..."
                value={newNote.content}
                onChange={e => setNewNote({...newNote, content: e.target.value})}
                className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                required
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">Salvar Nota</button>
                <button type="button" onClick={() => setIsAddingNote(false)} className="flex-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 py-2 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors">Cancelar</button>
              </div>
            </form>
          )}

          <div className="flex-1 overflow-y-auto space-y-4 scrollbar-thin">
            {notes.length > 0 ? notes.map((note) => (
              <div key={note.id} className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700 group hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{note.title}</h4>
                  <span className="text-[10px] text-slate-400">{safeFormat(note.created_at || note.date, 'dd MMM')}</span>
                </div>
                <div 
                  onMouseUp={handleTextSelection}
                  className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                <StickyNote className="w-8 h-8 opacity-20" />
                <p className="text-sm">Nenhuma nota encontrada</p>
              </div>
            )}
          </div>
        </div>

      </ResponsiveGridLayout>

      {/* Floating Selection Menu */}
      {selectionMenu && (
        <div 
          className="fixed z-[120] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in zoom-in duration-200 w-64"
          style={{ left: selectionMenu.x, top: selectionMenu.y, transform: 'translateX(-50%)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Criar Tarefa</span>
            <button onClick={() => setSelectionMenu(null)} className="text-slate-400 hover:text-red-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-2 italic">"{selectionMenu.text}"</p>
          
          <div className="space-y-2">
            <div className="flex gap-2">
              <select 
                value={taskCreationConfig.priority}
                onChange={e => setTaskCreationConfig({...taskCreationConfig, priority: e.target.value})}
                className="flex-1 bg-slate-50 dark:bg-slate-700 border-none rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Low">Baixa</option>
                <option value="Medium">Média</option>
                <option value="High">Alta</option>
              </select>
              <input 
                type="date" 
                value={taskCreationConfig.dueDate}
                onChange={e => setTaskCreationConfig({...taskCreationConfig, dueDate: e.target.value})}
                className="flex-1 bg-slate-50 dark:bg-slate-700 border-none rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button 
              onClick={createTaskFromSelection}
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Confirmar Tarefa
            </button>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {isNotesModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => {
            setIsNotesModalOpen(false);
            setIsAddingNoteInModal(false);
            setEditingNote(null);
          }}></div>
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                  <StickyNote className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">Todas as Notas</h2>
                  <p className="text-sm text-slate-500">{notes.length} notas salvas</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsAddingNoteInModal(!isAddingNoteInModal)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Nova Nota
                </button>
                <button 
                  onClick={() => {
                    setIsNotesModalOpen(false);
                    setIsAddingNoteInModal(false);
                    setEditingNote(null);
                  }}
                  className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
              {/* Add/Edit Form in Modal */}
              {(isAddingNoteInModal || editingNote) && (
                <form 
                  onSubmit={editingNote ? handleUpdateNote : handleAddNote}
                  className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-4 animate-in slide-in-from-top-4 duration-300"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                      {editingNote ? 'Editar Nota' : 'Nova Nota'}
                    </h3>
                    <button 
                      type="button"
                      onClick={() => { setIsAddingNoteInModal(false); setEditingNote(null); }}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Título da nota..."
                    value={editingNote ? editingNote.title : newNote.title}
                    onChange={e => editingNote ? setEditingNote({...editingNote, title: e.target.value}) : setNewNote({...newNote, title: e.target.value})}
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <textarea 
                    placeholder="Conteúdo da nota..."
                    value={editingNote ? editingNote.content.replace(/<[^>]*>/g, '') : newNote.content}
                    onChange={e => editingNote ? setEditingNote({...editingNote, content: `<p>${e.target.value}</p>`}) : setNewNote({...newNote, content: e.target.value})}
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                    required
                  />
                  <div className="flex gap-3">
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                      {editingNote ? 'Salvar Alterações' : 'Criar Nota'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setIsAddingNoteInModal(false); setEditingNote(null); }}
                      className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {notes.map((note) => (
                  <div key={note.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-900/50 transition-all group relative">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 truncate">{note.title}</h4>
                        <span className="text-xs font-bold text-slate-400">{safeFormat(note.created_at || note.date, 'dd MMM yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingNote(note)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div 
                      onMouseUp={handleTextSelection}
                      className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Modal */}
      {isTasksModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => {
            setIsTasksModalOpen(false);
            setIsAddingTaskInModal(false);
            setEditingTask(null);
          }}></div>
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">Minhas Tarefas</h2>
                  <p className="text-sm text-slate-500">{tasks.filter(t => !t.completed).length} pendentes</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsAddingTaskInModal(!isAddingTaskInModal)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Nova Tarefa
                </button>
                <button 
                  onClick={() => {
                    setIsTasksModalOpen(false);
                    setIsAddingTaskInModal(false);
                    setEditingTask(null);
                  }}
                  className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-thin">
              {/* Add/Edit Form in Modal */}
              {(isAddingTaskInModal || editingTask) && (
                <form 
                  onSubmit={editingTask ? handleUpdateTask : handleAddTask}
                  className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-4 animate-in slide-in-from-top-4 duration-300"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                      {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
                    </h3>
                    <button 
                      type="button"
                      onClick={() => { setIsAddingTaskInModal(false); setEditingTask(null); }}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Título da tarefa..."
                    value={editingTask ? editingTask.title : newTask.title}
                    onChange={e => editingTask ? setEditingTask({...editingTask, title: e.target.value}) : setNewTask({...newTask, title: e.target.value})}
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <div className="flex gap-3">
                    <select 
                      value={editingTask ? editingTask.priority : newTask.priority}
                      onChange={e => editingTask ? setEditingTask({...editingTask, priority: e.target.value}) : setNewTask({...newTask, priority: e.target.value})}
                      className="flex-1 bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Low">Baixa</option>
                      <option value="Medium">Média</option>
                      <option value="High">Alta</option>
                    </select>
                    <input 
                      type="date" 
                      value={editingTask ? editingTask.dueDate : newTask.dueDate}
                      onChange={e => editingTask ? setEditingTask({...editingTask, dueDate: e.target.value}) : setNewTask({...newTask, dueDate: e.target.value})}
                      className="flex-1 bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" className="flex-1 bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20">
                      {editingTask ? 'Salvar Alterações' : 'Criar Tarefa'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setIsAddingTaskInModal(false); setEditingTask(null); }}
                      className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {tasks.map((task) => (
                <div key={task.id} className={cn("flex items-center gap-6 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group", task.completed && "opacity-50")}>
                  <button 
                    onClick={() => toggleTask(task.id)}
                    className={cn(
                      "w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all",
                      task.completed ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20" : "border-slate-200 dark:border-slate-700 hover:border-blue-500"
                    )}
                  >
                    {task.completed && <CheckCircle2 className="w-5 h-5 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-base font-bold text-slate-800 dark:text-slate-200 truncate", task.completed && "line-through")}>{task.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                        task.priority === 'High' ? "bg-red-100 text-red-600" :
                        task.priority === 'Medium' ? "bg-amber-100 text-amber-600" :
                        "bg-blue-100 text-blue-600"
                      )}>
                        {task.priority === 'High' ? 'Alta' : task.priority === 'Medium' ? 'Média' : 'Baixa'}
                      </span>
                      <p className="text-xs font-bold text-slate-400">{safeFormat(task.due_date || task.dueDate, 'dd MMM yyyy')} • {task.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setEditingTask(task)}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
