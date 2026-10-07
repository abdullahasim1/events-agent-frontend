const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const normalizeEvent = (e, idx = 0) => {
  const isGenericId = !e.id || /^event-\d+$/i.test(e.id);
  const id = isGenericId ? `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${idx}` : e.id;
  return {
    ...e,
    id,
    title: e.title || e.name || 'Untitled Event',
    location: e.location || e.city || 'Location TBA',
    category: e.category || e.type || 'General',
    organization: e.organization || e.organizer || '',
    opportunityType: e.opportunityType || '',
    audienceType: e.audienceType || '',
    contactInfo: e.contactInfo || e.email || '',
    registrationDeadline: e.registrationDeadline || '-',
    proposalDeadline: e.proposalDeadline || '-',
    description: e.description || e.notes || '',
    status: e.status || 'Upcoming',
    date: e.date || '',
    time: e.time || '',
    venue: e.venue || (e.location ? `${e.location} Venue` : 'Venue TBA'),
    ticketUrl: e.ticketUrl || e.link || '#',
    source: e.source || 'Agent Scraper',
    proximityTier: Number(e.proximityTier) || 99,
  };
};

export const fetchSavedEvents = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/events`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && Array.isArray(data.events)) {
      return data.events.map(normalizeEvent);
    }
  } catch (err) {
    console.warn('Could not fetch saved events from server:', err.message);
  }
  return null;
};

export const clearSavedEventsApi = async () => {
  try {
    await fetch(`${API_BASE_URL}/events`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Could not clear events on server:', err.message);
  }
};

export const runDefaultAgent = async ({ startDate = null } = {}) => {
  const res = await fetch(`${API_BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      startDate: startDate || null,
      days: 7,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || `Agent run failed (${res.status})`);

  const events = (data.events || []).map(normalizeEvent);
  const seen = new Set();
  return events.filter((ev) => {
    const key = `${(ev.title || '').trim().toLowerCase()}|${(ev.date || '').trim()}`;
    return key && !seen.has(key) && seen.add(key);
  });
};
