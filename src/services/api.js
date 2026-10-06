const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const normalizeEvent = (e, idx = 0) => {
  const isGenericId = !e.id || /^event-\d+$/i.test(e.id);
  const id = isGenericId ? `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${idx}` : e.id;
  return {
    ...e,
    id,
    name: e.name || e.title || 'Untitled Event',
    title: e.title || e.name || 'Untitled Event',
    location: e.location || e.city || 'Location TBA',
    city: e.city || e.location || 'Location TBA',
    type: e.type || e.category || 'General',
    category: e.category || e.type || 'General',
    organization: e.organization || e.organizer || '',
    opportunityType: e.opportunityType || '',
    audienceType: e.audienceType || '',
    contactInfo: e.contactInfo || e.email || '',
    registrationDeadline: e.registrationDeadline || '',
    proposalDeadline: e.proposalDeadline || '',
    notes: e.notes || e.description || '',
    status: e.status || 'Upcoming',
    date: e.date || 'TBA',
    time: e.time || 'TBA',
    venue: e.venue || (e.city ? `${e.city} Venue` : 'Venue TBA'),
    link: e.link || e.ticketUrl || '#',
    ticketUrl: e.ticketUrl || e.link || '#',
    description: e.description || '',
    source: e.source || 'Agent Scraper',
  };
};

export const searchEventsBatch = async ({ cities = [], types = [], startDate = null, days = 14 } = {}) => {
  const locations = Array.isArray(cities) ? cities : [cities].filter(Boolean);
  const eventTypes = Array.isArray(types) ? types : [types].filter(Boolean);

  if (!locations.length || !eventTypes.length) {
    throw new Error('Please select at least one location and one event category.');
  }

  // Exactly 1 single network request from browser!
  const res = await fetch(`${API_BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      locations,
      eventTypes,
      startDate: startDate || null,
      days: Number(days) || 14,
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

export const triggerAgentRun = ({ location = '', city = '', eventType = '', type = '', startDate = '', days = 14 } = {}) =>
  searchEventsBatch({
    cities: [location || city].filter(Boolean),
    types: [eventType || type].filter(Boolean),
    startDate,
    days,
  }).then((events) => ({ success: true, count: events.length, events }));
