import { useState, useMemo, useEffect } from "react";
import { Sparkles, Trash2, Loader2 } from "lucide-react";
import Sidebar from "../components/Sidebar";
import EventTable from "../components/EventTable";
import EventDetail from "./EventDetail";
import { SearchInput, Select, Button } from "../components/common";
import {
  fetchSavedEvents,
  clearSavedEventsApi,
  runDefaultAgent,
  getRunCities,
  runCityChunk,
} from "../services/api";

const STORAGE_KEY = "eventscout_api_events";

const getSavedEvents = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) || [] : [];
  } catch {
    return [];
  }
};

// Today's date in YYYY-MM-DD (used as the default run start date)
const todayStr = () => new Date().toISOString().slice(0, 10);

const Home = () => {
  const [events, setEvents] = useState(getSavedEvents);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [activeTab, setActiveTab] = useState("events");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(null); // { done, total, currentCity }

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

  // Warn before closing the tab mid-run (a full run takes minutes)
  useEffect(() => {
    if (!isRunning) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isRunning]);

  // Client-side filtering
  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      const matchSearch =
        !q ||
        [
          e.title,
          e.name,
          e.city,
          e.location,
          e.category,
          e.type,
          e.description,
        ].some((v) => v?.toLowerCase().includes(q));
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

  // Merge newly found events into state (dedupe by title|date), persist to localStorage
  const mergeEvents = (items) => {
    setEvents((prev) => {
      const existingKeys = new Set(
        prev.map(
          (e) =>
            `${(e.title || "").trim().toLowerCase()}|${(e.date || "").trim()}`,
        ),
      );
      const toAdd = items.filter((e) => {
        const k = `${(e.title || "").trim().toLowerCase()}|${(e.date || "").trim()}`;
        return k && !existingKeys.has(k) && existingKeys.add(k);
      });
      const updated = [...toAdd, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // 1-Click Run Agent: Run cities in parallel batches (3 at a time)
  // As soon as each city finishes, events stream into the UI immediately!
  const handleRunAgent = async () => {
    if (isRunning) return;
    setIsRunning(true);
    const startDate = todayStr();
    const days = 7;
    try {
      const matrix = await getRunCities();
      const cities = matrix.cities;
      const total = cities.length;
      let completedCount = 0;

      setRunProgress({ done: 0, total, currentCity: "Starting scan…" });

      // Process 3 cities in parallel at a time (Fast & safe for Vercel)
      const CONCURRENCY = 3;
      for (let i = 0; i < cities.length; i += CONCURRENCY) {
        const batch = cities.slice(i, i + CONCURRENCY);
        await Promise.all(
          batch.map(async (city) => {
            try {
              const chunk = await runCityChunk({ city, startDate, days });
              if (chunk.events && chunk.events.length > 0) {
                mergeEvents(chunk.events); // Instantly shows in UI!
              }
            } catch (chunkErr) {
              console.warn(`Chunk failed for ${city}:`, chunkErr.message);
            } finally {
              completedCount++;
              setRunProgress({
                done: completedCount,
                total,
                currentCity: city,
              });
            }
          }),
        );
      }
    } catch (err) {
      console.warn(
        "Chunked run unavailable, falling back to single run:",
        err.message,
      );
      try {
        const newEvents = await runDefaultAgent({ startDate });
        const items = Array.isArray(newEvents) ? newEvents : [newEvents];
        mergeEvents(items);
      } catch (fallbackErr) {
        console.error("Agent run failed:", fallbackErr.message);
        alert(fallbackErr.message || "Failed to run agent.");
      }
    } finally {
      setIsRunning(false);
      setRunProgress(null);
    }
  };

  const handleClearEvents = () => {
    if (
      !window.confirm(
        "Delete ALL events from the database? This cannot be undone.",
      )
    )
      return;
    setEvents([]);
    localStorage.removeItem(STORAGE_KEY);
    clearSavedEventsApi();
  };

  const runButtonLabel = () => {
    if (!isRunning) return "Run Agent";
    if (runProgress) return `Fetching …`;
    return "Starting…";
  };

  if (selectedEvent) {
    return (
      <EventDetail
        event={selectedEvent}
        onBack={() => setSelectedEvent(null)}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f1f1] text-[#1a1a1a] font-sans antialiased">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 min-w-0 h-full overflow-y-auto flex flex-col pl-[25px] pr-[25px] pt-5 pb-5">
        <div className="mt-[26px]">
          <h1 className="text-[16px] leading-[25px] text-[rgba(8,8,8,0.87)] [-webkit-text-stroke-width:0.29px]">
            Events
          </h1>
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

          <div className="flex items-center gap-2">
            {events.length > 0 && (
              <Button
                variant="danger"
                size="lg"
                icon={Trash2}
                onClick={handleClearEvents}
                title="Clear all events from table"
                disabled={isRunning}
              >
                Clear
              </Button>
            )}
            <Button
              variant="primary"
              size="lg"
              icon={isRunning ? Loader2 : Sparkles}
              onClick={handleRunAgent}
              disabled={isRunning}
              className={isRunning ? "opacity-80 cursor-wait" : ""}
            >
              {runButtonLabel()}
            </Button>
          </div>
        </div>

        {isRunning && runProgress && (
          <div className="mt-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-semibold">⚡ Fetching Events:</span>
            </div>
            <div className="font-medium text-emerald-700">
              {events.length} events discovered so far
            </div>
          </div>
        )}

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
