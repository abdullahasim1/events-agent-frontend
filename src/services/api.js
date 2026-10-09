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
    opportunityType: e.opportunityType || e.opportunity_type || "",
    audienceType: e.audienceType || e.audience_type || "",
    contactInfo: e.contactInfo || e.contact_info || e.email || "",
    registrationDeadline: e.registrationDeadline || e.registration_deadline || "-",
    proposalDeadline: e.proposalDeadline || e.proposal_deadline || "-",
    description: e.description || e.notes || "",
    status: e.status || "Upcoming",
    date: e.date || "",
    time: e.time || "",
    venue: e.venue || (e.location ? `${e.location} Venue` : "Venue TBA"),
    ticketUrl: (e.ticketUrl && e.ticketUrl !== "#" ? e.ticketUrl : null) || (e.ticket_url && e.ticket_url !== "#" ? e.ticket_url : null) || e.link || e.url || "#",
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
    console.warn("Could not fetch saved events:", err.message);
  }
  return null;
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

export const runEventsStream = async ({
  startDate = null,
  endDate = null,
  days = 7,
  onEvent = () => {},
  onDone = () => {},
  onError = () => {},
} = {}) => {
  try {
    const res = await fetch(`${API_BASE_URL}/events/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        startDate: startDate || null,
        endDate: endDate || null,
        days,
      }),
    });

    if (!res.ok) throw new Error(`Stream failed (${res.status})`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        if (!part.trim()) continue;
        const matchData = part.match(/(?:^|\n)data:\s*(.*)/);
        if (!matchData) continue;

        try {
          const parsed = JSON.parse(matchData[1]);
          if (part.includes("event: done")) {
            onDone();
            return;
          }
          if (parsed && (parsed.title || parsed.name)) {
            onEvent(normalizeEvent(parsed));
          }
        } catch (_) {}
      }
    }
    onDone();
  } catch (err) {
    onError(err);
    onDone();
  }
};
