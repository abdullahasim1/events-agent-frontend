const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const fetchSavedEvents = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/events`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && Array.isArray(data.events)) {
      const list = data.events;
      list.lastFetchedAt = data.lastFetchedAt || null;
      return list;
    }
  } catch (err) {
    console.warn("Could not fetch saved events:", err.message);
  }
  return null;
};

export const runEventsStream = async ({
  onEvent = () => {},
  onDone = () => {},
} = {}) => {
  try {
    const res = await fetch(`${API_BASE_URL}/events/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ days: 7 }),
    });

    if (!res.ok) throw new Error(`Stream request failed (${res.status})`);

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
          if (line.startsWith("event:")) eventType = line.slice(6).trim();
          else if (line.startsWith("data:")) dataStr = line.slice(5).trim();
        }

        if (dataStr) {
          try {
            const parsed = JSON.parse(dataStr);
            if (eventType === "event") onEvent(parsed);
            else if (eventType === "done") onDone(parsed);
          } catch (_) {}
        }
      }
    }
  } catch (err) {
    console.error("Stream error:", err.message);
  } finally {
    onDone();
  }
};
