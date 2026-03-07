// Google Calendar via Pica Passthrough
const PICA_BASE = 'https://api.picaos.com/v1/passthrough';

async function picaCalFetch(path, method = 'GET', body) {
  const secret = process.env.PICA_SECRET_KEY;
  const connKey = process.env.PICA_GOOGLE_CALENDAR_CONNECTION_KEY;

  if (!secret || !connKey) {
    throw new Error('Missing PICA_SECRET_KEY or PICA_GOOGLE_CALENDAR_CONNECTION_KEY');
  }

  const url = `${PICA_BASE}/${path.replace(/^\//, '')}`;

  const opts = {
    method,
    headers: {
      'x-pica-secret': secret,
      'x-pica-connection-key': connKey,
      'x-pica-action-id': 'conn_mod_def::F_JeDmpsPL4::1PhPKt9MRPmDDgUVS8Yd3Q',
      'Content-Type': 'application/json',
    },
  };

  if (method !== 'GET' && body) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Calendar API error (${res.status}): ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

export async function createCalendarEvent(eventData) {
  const event = {
    summary: eventData.title,
    description: eventData.notes || '',
    start: {
      dateTime: eventData.start,
      timeZone: 'America/Chicago',
    },
    end: {
      dateTime: eventData.end,
      timeZone: 'America/Chicago',
    },
  };

  if (eventData.reminderMinutes) {
    event.reminders = {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: eventData.reminderMinutes }],
    };
  }

  const response = await picaCalFetch('calendars/primary/events', 'POST', event);

  return {
    success: true,
    eventId: response.id,
    htmlLink: response.htmlLink,
    message: 'Event created successfully!',
  };
}

export async function listCalendarEvents({ timeMin, timeMax, maxResults = 10 } = {}) {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: timeMin || new Date().toISOString(),
  });

  if (timeMax) params.set('timeMax', timeMax);

  const data = await picaCalFetch(`calendars/primary/events?${params}`);
  return data?.items || [];
}

export function isAuthorized() {
  return !!(process.env.PICA_SECRET_KEY && process.env.PICA_GOOGLE_CALENDAR_CONNECTION_KEY);
}

// These are no longer needed with Pica (OAuth is handled by Pica)
// but kept for API route compatibility
export function getAuthUrl() {
  return 'https://app.picaos.com/connections';
}

export async function exchangeCode() {
  throw new Error('OAuth is handled through Pica. Visit https://app.picaos.com/connections');
}
