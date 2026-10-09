const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const normalizeEvent = (e, idx = 0) => {
  const isGenericId = !e.id || /^event-\d+$/i.test(e.id);
  const id = isGenericId
    ? `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${idx}`
    : e.id;
  return {
    ...e,
    id,
    title: e.title || e.name || "Untitled Event",
    location: e.location || e.city || "Location TBA",
    category: e.category || e.type || "General",
    organization: e.organization || e.organizer || "",
    opportunityType: e.opportunityType || "",
    audienceType: e.audienceType || "",
    contactInfo: e.contactInfo || e.email || "",
    registrationDeadline: e.registrationDeadline || "-",
    proposalDeadline: e.proposalDeadline || "-",
    description: e.description || e.notes || "",
    status: e.status || "Upcoming",
    date: e.date || "",
    time: e.time || "",
    venue: e.venue || (e.location ? `${e.location} Venue` : "Venue TBA"),
    ticketUrl: e.ticketUrl || e.link || "#",
    source: e.source || "Agent Scraper",
    proximityTier: Number(e.proximityTier) || 99,
  };
};

export const fetchSavedEvents = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/events`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && Array.isArray(data.events)) {
      const events = data.events.map(normalizeEvent);
      events.lastFetchedAt = data.lastFetchedAt || null;
      return events;
    }
  } catch (err) {
    console.warn("Could not fetch saved events from server:", err.message);
  }
  return null;
};

export const clearSavedEventsApi = async () => {
  try {
    await fetch(`${API_BASE_URL}/events`, { method: "DELETE" });
  } catch (err) {
    console.warn("Could not clear events on server:", err.message);
  }
};

export const updateEventApi = async (id, fields) => {
  try {
    const res = await fetch(`${API_BASE_URL}/events/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.event : null;
  } catch (err) {
    console.warn("Could not update event:", err.message);
    return null;
  }
};

export const runDefaultAgent = async ({ startDate = null } = {}) => {
  const res = await fetch(`${API_BASE_URL}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      startDate: startDate || null,
      days: 7,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success)
    throw new Error(data.message || `Agent run failed (${res.status})`);

  const events = (data.events || []).map(normalizeEvent);
  const seen = new Set();
  return events.filter((ev) => {
    const key = `${(ev.title || "").trim().toLowerCase()}|${(ev.date || "").trim()}`;
    return key && !seen.has(key) && seen.add(key);
  });
};

// Fetch the city/type matrix the backend will run. Used for per-city chunked runs.
export const getRunCities = async () => {
  const res = await fetch(`${API_BASE_URL}/events/run/cities`, {
    headers: { Accept: "application/json" },
  });
  const data = await res.json();
  if (!res.ok || !data.success || !Array.isArray(data.cities)) {
    throw new Error(
      data.message || `Could not load run cities (${res.status})`,
    );
  }
  return data; // { success, cities, types, defaultDays }
};

// Run the agent for a single city chunk (keeps each backend call inside its timeout).
// Returns { city, status, eventsFound, events }.
export const runCityChunk = async ({
  city,
  startDate = null,
  days = 7,
} = {}) => {
  const res = await fetch(`${API_BASE_URL}/events/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      city,
      startDate: startDate || null,
      days,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success)
    throw new Error(data.message || `Chunk failed for ${city} (${res.status})`);

  const events = (data.events || []).map(normalizeEvent);
  const seen = new Set();
  return {
    city: data.city || city,
    status: data.status || "done",
    eventsFound: data.eventsFound ?? events.length,
    events: events.filter((ev) => {
      const key = `${(ev.title || "").trim().toLowerCase()}|${(ev.date || "").trim()}`;
      return key && !seen.has(key) && seen.add(key);
    }),
  };
};

// Run the agent for a single city chunk using REAL-TIME Server-Sent Events (SSE).
// Emits each event via onEvent as soon as Claude outputs it.
export const runCityChunkStream = async ({
  city,
  startDate = null,
  days = 7,
  onEvent = () => {},
  onStatus = () => {},
} = {}) => {
  const url = `${API_BASE_URL}/events/stream`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      city,
      startDate: startDate || null,
      days,
    }),
  });

  if (!res.ok) {
    throw new Error(`Chunk stream failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const messages = buffer.split("\n\n");
    buffer = messages.pop() || "";

    for (const msg of messages) {
      if (!msg.trim()) continue;
      const lines = msg.split("\n");
      let eventType = "message";
      let dataStr = "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataStr = line.slice(5).trim();
        }
      }

      if (dataStr) {
        try {
          const parsed = JSON.parse(dataStr);
          if (eventType === "event") {
            onEvent(normalizeEvent(parsed));
          } else if (eventType === "status") {
            onStatus(parsed);
          } else if (eventType === "error") {
            console.warn(`[Stream ${city}] Error:`, parsed.message);
          }
        } catch (_) {}
      }
    }
  }

  return { success: true, city };
};
