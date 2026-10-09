import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2, Clock } from "lucide-react";
import Sidebar from "../components/Sidebar";
import EventTable from "../components/EventTable";
import { SearchInput, Select, Button } from "../components/common";
import { fetchSavedEvents, runEventsStream } from "../services/api";

const formatDate = (val) => {
  if (!val) return "Never";
  const d = new Date(val);
  return isNaN(d)
    ? "Unknown"
    : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} at ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
};

const Home = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  useEffect(() => {
    fetchSavedEvents()
      .then((data) => {
        if (Array.isArray(data)) {
          setEvents(data);
          setLastFetchedAt(data.lastFetchedAt || new Date().toISOString());
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const addOrUpdate = (item, isNew = false) => {
    setEvents((prev) => {
      const clean = (t) => (t || "").toLowerCase().replace(/\b(202[0-9]|annual|mn|minnesota)\b/g, "").replace(/[^a-z0-9]/g, "");
      const itemFp = clean(item.title);
      const itemDate = (item.date || "").slice(0, 10);
      const idx = prev.findIndex(
        (e) =>
          e.id === item.id ||
          (clean(e.title) === itemFp && (!itemDate || !e.date || (e.date || "").slice(0, 10) === itemDate))
      );
      if (idx !== -1) {
        return prev.map((e, i) => (i === idx ? { ...e, ...item, isNew: e.isNew || isNew } : e));
      }
      return isNew ? [{ ...item, isNew }, ...prev] : [...prev, { ...item, isNew }];
    });
  };

  const handleRunAgent = () => {
    if (isRunning) return;
    setEvents([]); // Table clears immediately on Run Agent
    setIsRunning(true);

    runEventsStream({
      onEvent: (ev) => {
        const isNew = Boolean(ev.isNew || !ev.fromDb);
        addOrUpdate(ev, isNew);
      },
      onDone: () => {
        setIsRunning(false);
        setLastFetchedAt(new Date().toISOString());
      },
    });
  };

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      const matchSearch =
        !q || [e.title, e.city, e.category, e.description].some((v) => v?.toLowerCase().includes(q));
      const matchStatus =
        statusFilter === "All Status" || e.status?.toLowerCase() === statusFilter.toLowerCase();
      const matchType =
        typeFilter === "All Types" || (e.type || e.category)?.toLowerCase().includes(typeFilter.toLowerCase());
      return matchSearch && matchStatus && matchType;
    });
  }, [events, search, statusFilter, typeFilter]);

  const statusOptions = useMemo(
    () => ["All Status", ...new Set(events.map((e) => e.status).filter(Boolean))],
    [events]
  );
  const typeOptions = useMemo(
    () => ["All Types", ...new Set(events.map((e) => e.type || e.category).filter(Boolean))],
    [events]
  );

  const handleViewEvent = (event) => {
    if (!event) return;
    navigate(`/events/${event.id}`, { state: { event } });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f1f1] text-[#1a1a1a] font-sans antialiased">
      <Sidebar />

      <div className="flex-1 min-w-0 h-full overflow-y-auto flex flex-col pl-[25px] pr-[25px] pt-5 pb-5">
        <div className="mt-[26px]">
          <h1 className="text-[16px] leading-[25px] text-[rgba(8,8,8,0.87)] [-webkit-text-stroke-width:0.29px]">
            Events
          </h1>
        </div>

        <div className="mt-[26px] flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start flex-wrap gap-y-2">
            <div className="flex flex-col mr-[10px]">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onEnter={handleRunAgent}
                placeholder="Search by events..."
                containerClassName="w-[330px] h-[42px]"
              />
              <div className="mt-1.5 pl-1 flex items-center gap-1.5 text-[12px] text-[#6b7280]">
                <Clock className="w-3.5 h-3.5 text-[#9ca3af] shrink-0" />
                <span>
                  Last fetched:{" "}
                  <span className="font-medium text-[#111827]">{formatDate(lastFetchedAt)}</span>
                </span>
              </div>
            </div>

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
              containerClassName="w-[155px] h-[42px] mr-[14px]"
            />
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={typeOptions}
              containerClassName="w-[155px] h-[42px]"
            />
          </div>
          <Button
            variant="primary"
            size="lg"
            icon={isRunning ? Loader2 : Sparkles}
            onClick={handleRunAgent}
            disabled={isRunning}
            className={isRunning ? "opacity-80 cursor-wait" : ""}
          >
            {isRunning ? "Fetching…" : "Run Agent"}
          </Button>
        </div>

        {isRunning && (
          <div className="mt-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-semibold text-[13px]">Fetching...</span>
            </div>
          </div>
        )}

        <EventTable
          events={filteredEvents}
          loading={loading && events.length === 0}
          onViewEvent={handleViewEvent}
        />
      </div>
    </div>
  );
};

export default Home;
