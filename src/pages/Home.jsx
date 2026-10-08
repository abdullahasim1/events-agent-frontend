import { useState, useMemo, useEffect } from "react";
import { Sparkles, Loader2, Clock } from "lucide-react";
import Sidebar from "../components/Sidebar";
import EventTable from "../components/EventTable";
import EventDetail from "./EventDetail";
import { SearchInput, Select, Button } from "../components/common";
import {
  fetchSavedEvents,
  runDefaultAgent,
  getRunCities,
  runCityChunk,
  runCityChunkStream,
} from "../services/api";

// Today's date in YYYY-MM-DD (used as the default run start date)
const todayStr = () => new Date().toISOString().slice(0, 10);

// Normalizes title: strips promotional noise, years, states, and punctuation
const getTitleFingerprint = (title = "") => {
  return String(title || "")
    .toLowerCase()
    .replace(/^(join us at|register (now )?for|welcome to|announcing)\s+/i, "")
    .replace(/\b(202[4-9]|203[0-9])\b/g, "") // remove 2025, 2026, 2027
    .replace(
      /\b(national|state|statewide|annual|biannual|biennial|the|1st|2nd|3rd|4th|5th|fall|spring|summer|winter|mn|minnesota)\b/g,
      "",
    )
    .replace(/[^a-z0-9]/g, "") // remove punctuation & whitespace
    .trim();
};

// Canonical date: converts any date string into canonical YYYY-MM-DD
const normalizeDateKey = (dateStr = "") => {
  if (!dateStr) return "";
  const match = String(dateStr).match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return String(dateStr).toLowerCase().replace(/[^a-z0-9]/g, "");
};

// Unique canonical event key
const getEventKey = (event = {}) => {
  const fp = getTitleFingerprint(event.title || event.name);
  const date = normalizeDateKey(event.date);
  return `${fp}|${date}`;
};

// Checks whether two events refer to the same real-world conference
const isSameEvent = (a, b) => {
  if (!a || !b) return false;
  const keyA = getEventKey(a);
  const keyB = getEventKey(b);
  if (keyA && keyB && keyA === keyB) return true;

  const dateA = normalizeDateKey(a.date);
  const dateB = normalizeDateKey(b.date);
  if (dateA && dateB && dateA !== dateB) return false;

  const fpA = getTitleFingerprint(a.title || a.name);
  const fpB = getTitleFingerprint(b.title || b.name);
  if (fpA && fpB) {
    if (fpA === fpB) return true;
    if (fpA.includes(fpB) || fpB.includes(fpA)) {
      const minLen = Math.min(fpA.length, fpB.length);
      const maxLen = Math.max(fpA.length, fpB.length);
      if (minLen / maxLen >= 0.6) return true;
    }
  }

  const urlA = String(a.ticketUrl || "").toLowerCase().split("?")[0].replace(/\/$/, "");
  const urlB = String(b.ticketUrl || "").toLowerCase().split("?")[0].replace(/\/$/, "");
  if (
    urlA &&
    urlB &&
    !urlA.includes("google.com") &&
    !urlA.includes("eventbrite.com/d/") &&
    urlA === urlB
  ) {
    return true;
  }

  return false;
};

// Formats "Last fetched" timestamp with user-friendly clock time and relative duration
const formatLastFetched = (dateVal) => {
  if (!dateVal) return "Never";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "Unknown";

  const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  const isToday = d.toDateString() === new Date().toDateString();

  let relative = "";
  if (diffSec < 60) {
    relative = "just now";
  } else if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    relative = `${mins}m ago`;
  } else if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    relative = `${hours}h ago`;
  }

  if (isToday) {
    return relative ? `Today at ${timeStr} (${relative})` : `Today at ${timeStr}`;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${timeStr}`;
  }

  const dateStr = d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  return `${dateStr} at ${timeStr}`;
};

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
  const [lastFetchedAt, setLastFetchedAt] = useState(() => {
    try {
      return localStorage.getItem("events_last_fetched_at") || null;
    } catch (_) {
      return null;
    }
  });

  // Ticker to refresh relative time ("just now", "2m ago") every 30 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Load saved events from Database on mount (Deduplicated Single Source of Truth)
  useEffect(() => {
    let isMounted = true;
    setIsInitialLoading(true);
    fetchSavedEvents()
      .then((dbEvents) => {
        if (!isMounted) return;
        if (dbEvents && Array.isArray(dbEvents)) {
          // Collapse any duplicate variants into one canonical item
          const clean = [];
          for (const ev of dbEvents) {
            const exists = clean.some((existing) => isSameEvent(existing, ev));
            if (!exists) {
              clean.push(ev);
            }
          }
          setEvents(clean);

          // Extract latest update timestamp from DB events
          let latest = null;
          for (const ev of dbEvents) {
            const t = ev.updatedAt || ev.createdAt;
            if (t && (!latest || new Date(t) > new Date(latest))) {
              latest = t;
            }
          }
          const finalTimestamp = dbEvents.lastFetchedAt || latest || new Date().toISOString();
          setLastFetchedAt(finalTimestamp);
          try {
            localStorage.setItem("events_last_fetched_at", finalTimestamp);
          } catch (_) {}
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
        const existingIndex = prev.findIndex((e) => isSameEvent(e, item));
        if (existingIndex !== -1) {
          return prev.map((e, idx) => {
            if (idx === existingIndex) {
              const longerTitle =
                (item.title || "").length > (e.title || "").length &&
                !String(item.title || "").toLowerCase().startsWith("join us")
                  ? item.title
                  : e.title;
              return {
                ...e,
                ...item,
                title: longerTitle,
                // Preserve isNew if already marked new, but DO NOT flip existing DB event to new
                isNew: Boolean(e.isNew || (isNewFlag && !e.id)),
              };
            }
            return e;
          });
        }
        // If it's a new live event, prepend to top; if DB event, append to bottom
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
  // - Starts loader immediately
  // - DB events stream in steadily so user NEVER waits ("bech bech ma aty rhy")
  // - Loader keeps running in table & header throughout entire search
  // - ONLY TRULY NEW events (not previously in DB or in earlier chunks) get marked with the green NEW badge
  const handleRunAgent = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setEvents([]); // Table clears immediately -> triggers active table loader!
    setRunProgress({
      done: 0,
      total: 10,
      currentCity: "Initializing agent & loading database...",
    });

    const startDate = todayStr();
    const days = 7;

    try {
      // 1. Fetch current database events right away
      const dbFetchPromise = fetchSavedEvents().catch(() => []);

      // 2. Fetch target cities to run
      const matrix = await getRunCities();
      const cities = matrix.cities || [];
      const total = cities.length;
      let completedCount = 0;

      // Await DB events (usually takes < 150ms)
      const rawDbEvents = (await dbFetchPromise) || [];
      // Deduplicate DB events
      const allDbEvents = [];
      for (const ev of rawDbEvents) {
        if (!allDbEvents.some((existing) => isSameEvent(existing, ev))) {
          allDbEvents.push(ev);
        }
      }

      // Track known events across chunks and DB so duplicates NEVER get marked as new
      const knownKeys = new Set(
        allDbEvents.map((e) => getEventKey(e)).filter(Boolean),
      );
      const knownEvents = [...allDbEvents];

      const checkIfKnown = (ev) => {
        const k = getEventKey(ev);
        if (k && knownKeys.has(k)) return true;
        return knownEvents.some((existing) => isSameEvent(existing, ev));
      };

      const markAsKnown = (ev) => {
        const k = getEventKey(ev);
        if (k) knownKeys.add(k);
        knownEvents.push(ev);
      };

      // Divide DB events across city batches so they keep coming in smoothly ("bech bech ma aty rhy")
      const CONCURRENCY = 3;
      const totalBatches = Math.max(1, Math.ceil(cities.length / CONCURRENCY));
      const dbChunkSize = Math.ceil(allDbEvents.length / totalBatches);

      let dbIndex = 0;
      let streamQueue = Promise.resolve();

      const enqueueStream = (items, isNew, delay) => {
        streamQueue = streamQueue.then(() =>
          streamInEvents(items, isNew, delay),
        );
        return streamQueue;
      };

      for (let i = 0; i < cities.length; i += CONCURRENCY) {
        const batch = cities.slice(i, i + CONCURRENCY);
        const batchLabel = batch.join(", ");

        setRunProgress((prev) => ({
          ...(prev || {}),
          done: completedCount,
          total,
          currentCity: batchLabel,
        }));

        // Stream a batch of DB events immediately so user sees events without waiting
        if (dbIndex < allDbEvents.length) {
          const dbSlice = allDbEvents.slice(dbIndex, dbIndex + dbChunkSize);
          dbIndex += dbChunkSize;
          enqueueStream(dbSlice, false, 180);
        }

        // Run this city batch with the AI agent using REAL-TIME Claude SSE streaming
        await Promise.all(
          batch.map(async (city) => {
            try {
              await runCityChunkStream({
                city,
                startDate,
                days,
                onStatus: (st) => {
                  setRunProgress((prev) => ({
                    ...(prev || {}),
                    currentCity: `${city} • ${st.message || "Searching..."}`,
                  }));
                },
                onEvent: (ev) => {
                  // As soon as Claude outputs each event, it fires here in real time!
                  const alreadyKnown = checkIfKnown(ev);
                  markAsKnown(ev);
                  // Only mark isNew if it wasn't already in the DB or already found in an earlier chunk!
                  enqueueStream([ev], !alreadyKnown, 180);
                },
              });
            } catch (chunkErr) {
              console.warn(
                `Chunk stream failed for ${city}:`,
                chunkErr.message,
              );
              // Fallback to regular chunk if stream fails
              try {
                const chunk = await runCityChunk({ city, startDate, days });
                if (chunk.events && chunk.events.length > 0) {
                  for (const ev of chunk.events) {
                    const alreadyKnown = checkIfKnown(ev);
                    markAsKnown(ev);
                    enqueueStream([ev], !alreadyKnown, 180);
                  }
                }
              } catch (_) {}
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

      // If any DB events remain, stream them at the bottom
      if (dbIndex < allDbEvents.length) {
        const remainingDb = allDbEvents.slice(dbIndex);
        enqueueStream(remainingDb, false, 180);
      }

      // Wait until all event streaming animations finish
      await streamQueue;
    } catch (err) {
      console.warn(
        "Chunked run unavailable, falling back to single run:",
        err.message,
      );
      try {
        const newEvents = await runDefaultAgent({ startDate });
        const items = Array.isArray(newEvents) ? newEvents : [newEvents];
        await streamInEvents(items, true, 300);
      } catch (fallbackErr) {
        console.error("Agent run failed:", fallbackErr.message);
      }
    } finally {
      setIsRunning(false);
      setRunProgress(null);
      const nowIso = new Date().toISOString();
      setLastFetchedAt(nowIso);
      try {
        localStorage.setItem("events_last_fetched_at", nowIso);
      } catch (_) {}
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
                  <span className="font-medium text-[#111827]">
                    {formatLastFetched(lastFetchedAt)}
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
