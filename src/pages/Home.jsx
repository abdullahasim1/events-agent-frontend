import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2, Clock, Calendar, X } from "lucide-react";
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

const getTodayIso = () => new Date().toISOString().slice(0, 10);
const getDefaultEndIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
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

  // Date range modal state
  const [showDateModal, setShowDateModal] = useState(false);
  const [startDate, setStartDate] = useState(getTodayIso);
  const [endDate, setEndDate] = useState(getDefaultEndIso);

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
      const clean = (t) =>
        (t || "")
          .toLowerCase()
          .replace(/\b(202[0-9]|annual|mn|minnesota)\b/g, "")
          .replace(/[^a-z0-9]/g, "");
      const itemFp = clean(item.title);
      const itemDate = (item.date || "").slice(0, 10);
      const idx = prev.findIndex(
        (e) =>
          e.id === item.id ||
          (clean(e.title) === itemFp &&
            (!itemDate || !e.date || (e.date || "").slice(0, 10) === itemDate)),
      );
      if (idx !== -1) {
        return prev.map((e, i) =>
          i === idx ? { ...e, ...item, isNew: e.isNew || isNew } : e,
        );
      }
      return isNew
        ? [{ ...item, isNew }, ...prev]
        : [...prev, { ...item, isNew }];
    });
  };

  const handleOpenDateModal = () => {
    if (isRunning) return;
    setShowDateModal(true);
  };

  const handleStartRun = () => {
    setShowDateModal(false);
    setEvents([]); // Clean table immediately so fresh data loads
    setIsRunning(true);

    runEventsStream({
      startDate,
      endDate,
      onEvent: (ev) => {
        addOrUpdate(ev, true);
      },
      onDone: () => {
        setIsRunning(false);
        setLastFetchedAt(new Date().toISOString());
      },
      onError: (err) => {
        console.error("Stream error:", err);
        setIsRunning(false);
      },
    });
  };

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      const matchSearch =
        !q ||
        [e.title, e.city, e.category, e.description].some((v) =>
          v?.toLowerCase().includes(q),
        );
      const matchStatus =
        statusFilter === "All Status" ||
        e.status?.toLowerCase() === statusFilter.toLowerCase();
      const matchType =
        typeFilter === "All Types" ||
        (e.type || e.category)
          ?.toLowerCase()
          .includes(typeFilter.toLowerCase());
      return matchSearch && matchStatus && matchType;
    });
  }, [events, search, statusFilter, typeFilter]);

  const statusOptions = useMemo(
    () => [
      "All Status",
      ...new Set(events.map((e) => e.status).filter(Boolean)),
    ],
    [events],
  );
  const typeOptions = useMemo(
    () => [
      "All Types",
      ...new Set(events.map((e) => e.type || e.category).filter(Boolean)),
    ],
    [events],
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
                onEnter={handleOpenDateModal}
                placeholder="Search by events..."
                containerClassName="w-[330px] h-[42px]"
              />
              <div className="mt-1.5 pl-1 flex items-center gap-1.5 text-[12px] text-[#6b7280]">
                <Clock className="w-3.5 h-3.5 text-[#9ca3af] shrink-0" />
                <span>
                  Last fetched:{" "}
                  <span className="font-medium text-[#111827]">
                    {formatDate(lastFetchedAt)}
                  </span>
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
            onClick={handleOpenDateModal}
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

      {/* Date Range Modal for Run Agent */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[14px] shadow-2xl border border-gray-100 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#eef6f0] flex items-center justify-center text-[#2d563c]">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[14.5px] font-bold text-[#080808]">
                    Select Date Range
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDateModal(false)}
                className="text-gray-400 hover:text-black p-1 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 py-5">
              <div>
                <label className="text-[11px] font-semibold text-[rgba(68,67,67,0.78)] mb-1.5 block">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-[#e2e2e2] rounded-[8px] px-3 py-2 text-[12.5px] font-medium text-[#080808] focus:outline-none focus:border-[#558066] focus:ring-1 focus:ring-[#558066] shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[rgba(68,67,67,0.78)] mb-1.5 block">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white border border-[#e2e2e2] rounded-[8px] px-3 py-2 text-[12.5px] font-medium text-[#080808] focus:outline-none focus:border-[#558066] focus:ring-1 focus:ring-[#558066] shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowDateModal(false)}
                className="px-3.5 py-1.5 text-[12px] font-medium text-gray-600 hover:text-black rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartRun}
                className="px-4 py-2 text-[12px] font-semibold text-white bg-[#558066] hover:bg-[#2d563c] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Agent</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
