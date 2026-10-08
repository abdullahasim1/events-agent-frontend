import { useState, useMemo, useEffect } from "react";
import { Sparkles, Trash2, Loader2 } from "lucide-react";
import Sidebar from "../components/Sidebar";
import EventTable from "../components/EventTable";
import EventDetail from "./EventDetail";
import { SearchInput, Select, Button } from "../components/common";
import {
  fetchSavedEvents,
  runDefaultAgent,
  getRunCities,
  runCityChunk,
} from "../services/api";

// Today's date in YYYY-MM-DD (used as the default run start date)
const todayStr = () => new Date().toISOString().slice(0, 10);

const Home = () => {
  const [events, setEvents] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [activeTab, setActiveTab] = useState("events");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(null); // { done, total, currentCity }

  // Load saved events from Database on mount (Single Source of Truth)
  useEffect(() => {
    let isMounted = true;
    setIsInitialLoading(true);
    fetchSavedEvents()
      .then((dbEvents) => {
        if (!isMounted) return;
        if (dbEvents && Array.isArray(dbEvents)) {
          setEvents(dbEvents);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch events from DB:", err);
      })
      .finally(() => {
        if (isMounted) setIsInitialLoading(false);
      });

    return () => {
      isMounted = false;
    };
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

  // Always strictly equal to the number of events currently marked with isNew in the table
  const newlyAddedCount = useMemo(
    () => events.filter((e) => Boolean(e.isNew)).length,
    [events],
  );

  // Stream events into state one by one with a smooth, comfortable visual pace (not rushed)
  const streamInEvents = async (items, isNewFlag = false, delayMs = 350) => {
    if (!items || !items.length) return;
    for (const item of items) {
      setEvents((prev) => {
        const key = `${(item.title || "").trim().toLowerCase()}|${(item.date || "").trim()}`;
        const exists = prev.some(
          (e) =>
            `${(e.title || "").trim().toLowerCase()}|${(e.date || "").trim()}` ===
            key,
        );
        if (exists) {
          return prev.map((e) =>
            `${(e.title || "").trim().toLowerCase()}|${(e.date || "").trim()}` ===
            key
              ? { ...e, ...item, isNew: isNewFlag ? true : e.isNew }
              : e,
          );
        }
        // If it's a new live event, prepend to top; if remaining DB events, append to bottom
        return isNewFlag
          ? [{ ...item, isNew: true }, ...prev]
          : [...prev, { ...item, isNew: false }];
      });
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  };

  // Mark event as seen when user views details, immediately removing the NEW badge
  const handleViewEvent = (event) => {
    if (!event) return;
    if (event.isNew) {
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, isNew: false } : e)),
      );
    }
    setSelectedEvent({ ...event, isNew: false });
  };

  // 1-Click Run Agent:
  // 1. Table clears & loader starts immediately
  // 2. NEW events from AI stream in FIRST (comfortable pace, 350ms delay)
  // 3. Remaining DB events stream in AFTERWARDS at the bottom
  const handleRunAgent = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setEvents([]); // Table clears immediately -> triggers active table loader!
    setRunProgress({
      done: 0,
      total: 10,
      currentCity: "Searching cities for new events...",
    });

    const startDate = todayStr();
    const days = 7;

    try {
      // Step 1: Run AI agent across target cities to find NEW events FIRST
      const matrix = await getRunCities();
      const cities = matrix.cities;
      const total = cities.length;
      let completedCount = 0;

      const firstBatchLabel = cities.slice(0, 3).join(", ");
      setRunProgress({ done: 0, total, currentCity: firstBatchLabel });

      // Track newly added event keys so we know what is already on screen
      const addedKeys = new Set();
      let streamQueue = Promise.resolve();

      // Process 3 cities in parallel at a time (Fast & safe for Vercel)
      const CONCURRENCY = 3;
      for (let i = 0; i < cities.length; i += CONCURRENCY) {
        const batch = cities.slice(i, i + CONCURRENCY);
        await Promise.all(
          batch.map(async (city) => {
            try {
              const chunk = await runCityChunk({ city, startDate, days });
              if (chunk.events && chunk.events.length > 0) {
                // Stream NEW events into table FIRST with a smooth, comfortable pace (350ms per item)
                for (const ev of chunk.events) {
                  const key = `${(ev.title || "").trim().toLowerCase()}|${(ev.date || "").trim()}`;
                  addedKeys.add(key);
                }
                streamQueue = streamQueue.then(() =>
                  streamInEvents(chunk.events, true, 350),
                );
                await streamQueue;
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

      // Step 2: Now load remaining DB events AFTER the new ones
      setRunProgress((prev) => ({
        ...(prev || {}),
        currentCity: "Loading remaining database events...",
      }));
      const dbEvents = await fetchSavedEvents();
      if (dbEvents && dbEvents.length > 0) {
        // Filter only those DB events that aren't already shown
        const remainingDb = dbEvents.filter((e) => {
          const key = `${(e.title || "").trim().toLowerCase()}|${(e.date || "").trim()}`;
          return !addedKeys.has(key);
        });
        if (remainingDb.length > 0) {
          // Stream remaining DB events at the bottom with a smooth pace (300ms per item)
          await streamInEvents(remainingDb, false, 300);
        }
      }
    } catch (err) {
      console.warn(
        "Chunked run unavailable, falling back to single run:",
        err.message,
      );
      try {
        const newEvents = await runDefaultAgent({ startDate });
        const items = Array.isArray(newEvents) ? newEvents : [newEvents];
        await streamInEvents(items, true, 350);
      } catch (fallbackErr) {
        console.error("Agent run failed:", fallbackErr.message);
      }
    } finally {
      setIsRunning(false);
      setRunProgress(null);
    }
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

        {isRunning && runProgress && (
          <div className="mt-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-semibold text-[13px]">Fetching</span>
            </div>
            <div className="flex items-center gap-3">
              {newlyAddedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[11px] animate-bounce">
                  +{newlyAddedCount} New Added!
                </span>
              )}
              <span className="font-medium text-emerald-700">
                {events.length} total events
              </span>
            </div>
          </div>
        )}

        <EventTable
          events={filteredEvents}
          loading={isInitialLoading || isRunning}
          onViewEvent={handleViewEvent}
          onOpenRunModal={handleRunAgent}
        />
      </div>
    </div>
  );
};

export default Home;
