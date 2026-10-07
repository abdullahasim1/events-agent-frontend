import { useState, useMemo, useEffect } from 'react';
import { Sparkles, Trash2, Loader2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import EventTable from '../components/EventTable';
import EventDetail from './EventDetail';
import { SearchInput, Select, Button } from '../components/common';
import { fetchSavedEvents, clearSavedEventsApi, runDefaultAgent } from '../services/api';

const STORAGE_KEY = 'eventscout_api_events';

const getSavedEvents = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) || [] : [];
  } catch {
    return [];
  }
};

const Home = () => {
  const [events, setEvents] = useState(getSavedEvents);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [activeTab, setActiveTab] = useState('events');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  // Load saved events from PostgreSQL Database on mount
  useEffect(() => {
    fetchSavedEvents().then((dbEvents) => {
      if (dbEvents && dbEvents.length > 0) {
        setEvents(dbEvents);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dbEvents));
        } catch {}
      }
    });
  }, []);

  // Client-side filtering
  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      const matchSearch = !q || [e.title, e.name, e.city, e.location, e.category, e.type, e.description].some((v) => v?.toLowerCase().includes(q));
      const matchStatus = statusFilter === 'All Status' || e.status?.toLowerCase() === statusFilter.toLowerCase();
      const matchType = typeFilter === 'All Types' || (e.type || e.category)?.toLowerCase().includes(typeFilter.toLowerCase());
      return matchSearch && matchStatus && matchType;
    });
  }, [events, search, statusFilter, typeFilter]);

  const statusOptions = useMemo(() => ['All Status', ...new Set(events.map((e) => e.status).filter(Boolean))], [events]);
  const typeOptions = useMemo(() => ['All Types', ...new Set(events.map((e) => e.type || e.category).filter(Boolean))], [events]);

  // 1-Click Run Agent without modal
  const handleRunAgent = async () => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      const newEvents = await runDefaultAgent({ startDate: '2026-10-07' });
      const items = Array.isArray(newEvents) ? newEvents : [newEvents];
      setEvents((prev) => {
        const existingKeys = new Set(prev.map((e) => `${(e.title || '').trim().toLowerCase()}|${(e.date || '').trim()}`));
        const toAdd = items.filter((e) => {
          const k = `${(e.title || '').trim().toLowerCase()}|${(e.date || '').trim()}`;
          return k && !existingKeys.has(k) && existingKeys.add(k);
        });
        const updated = [...toAdd, ...prev];
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
        return updated;
      });
    } catch (err) {
      console.error('Agent run failed:', err.message);
      alert(err.message || 'Failed to run agent.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleClearEvents = () => {
    setEvents([]);
    localStorage.removeItem(STORAGE_KEY);
    clearSavedEventsApi();
  };

  if (selectedEvent) {
    return <EventDetail event={selectedEvent} onBack={() => setSelectedEvent(null)} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f1f1] text-[#1a1a1a] font-sans antialiased">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 min-w-0 h-full overflow-y-auto flex flex-col pl-[25px] pr-[25px] pt-5 pb-5">
        <Header globalSearch={search} onGlobalSearchChange={setSearch} />

        <div className="mt-[26px]">
          <h1 className="text-[16px] leading-[25px] text-[rgba(8,8,8,0.87)] [-webkit-text-stroke-width:0.29px]">Events</h1>
        </div>

        <div className="mt-[26px] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center flex-wrap gap-y-2">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onEnter={handleRunAgent}
              placeholder="Search by events..."
              containerClassName="w-[330px] h-[42px] mr-[10px]"
            />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={statusOptions} containerClassName="w-[155px] h-[42px] mr-[14px]" />
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={typeOptions} containerClassName="w-[155px] h-[42px]" />
          </div>

          <div className="flex items-center gap-2">
            {events.length > 0 && (
              <Button variant="danger" size="lg" icon={Trash2} onClick={handleClearEvents} title="Clear all events from table" disabled={isRunning}>
                Clear
              </Button>
            )}
            <Button
              variant="primary"
              size="lg"
              icon={isRunning ? Loader2 : Sparkles}
              onClick={handleRunAgent}
              disabled={isRunning}
              className={isRunning ? 'opacity-80 cursor-wait' : ''}
            >
              {isRunning ? 'Scanning Next 7 Days...' : 'Run Agent'}
            </Button>
          </div>
        </div>

        <EventTable
          events={filteredEvents}
          loading={isRunning}
          onViewEvent={setSelectedEvent}
          onOpenRunModal={handleRunAgent}
        />
      </div>
    </div>
  );
};

export default Home;
