import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, RefreshCw, Clock, MapPin, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { cn } from '../lib/utils';

export default function Calendar() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const headers = { 
        'Authorization': `Bearer ${session.access_token}`,
        'Accept': 'application/json'
      };
      
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart);
      const endDate = endOfWeek(monthEnd);
      
      const res = await fetch(`/api/google/calendar?timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}`, { headers });
      if (res.ok) setEvents(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.google_connected) {
      fetchEvents();
    }
  }, [profile?.google_connected, currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date);
      return isSameDay(day, eventDate);
    });
  };

  if (!profile?.google_connected) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-3xl flex items-center justify-center mb-6">
          <CalendarIcon className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Conectar Calendário</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
          Sincronize seu Google Agenda para gerenciar sua programação e reuniões.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card text-card-foreground overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-card-border flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Calendário</h1>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 px-4 capitalize">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all">
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchEvents} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <RefreshCw className={cn("w-5 h-5 text-slate-500", loading && "animate-spin")} />
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Novo Evento
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="bg-slate-50 dark:bg-slate-900 p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                {day}
              </div>
            ))}
            {calendarDays.map((day, i) => {
              const dayEvents = getEventsForDay(day);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, monthStart);
              
              return (
                <div 
                  key={i} 
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "bg-card min-h-[120px] p-2 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    !isCurrentMonth && "opacity-30",
                    isSelected && "ring-2 ring-inset ring-blue-500 z-10"
                  )}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={cn(
                      "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full",
                      isSameDay(day, new Date()) ? "bg-blue-600 text-white" : "text-slate-700 dark:text-slate-200"
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event, idx) => (
                      <div key={idx} className="text-[10px] font-bold px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 truncate">
                        {event.summary}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] font-bold text-slate-400 pl-2">
                        + mais {dayEvents.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Details */}
        <div className="w-80 border-l border-card-border p-6 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/30">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">
            {format(selectedDate, 'EEEE, MMM dd')}
          </h2>
          <div className="space-y-6">
            {getEventsForDay(selectedDate).length > 0 ? (
              getEventsForDay(selectedDate).map((event, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">{event.summary}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      {format(new Date(event.start.dateTime || event.start.date), 'HH:mm')} - {format(new Date(event.end.dateTime || event.end.date), 'HH:mm')}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5" />
                        {event.location}
                      </div>
                    )}
                    {event.attendees && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Users className="w-3.5 h-3.5" />
                        {event.attendees.length} Participantes
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400">
                <p className="text-sm">Nenhum evento agendado para este dia.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
