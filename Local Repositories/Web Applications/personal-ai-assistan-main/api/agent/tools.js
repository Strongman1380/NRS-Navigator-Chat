// Unified Pica Passthrough agent tools endpoint
// Supports: Gmail, Google Calendar, Google Drive, Tavily Web Search, Firecrawl Scrape, Browserbase

const PICA_BASE = 'https://api.picaos.com/v1/passthrough';

function getConnKey(platform) {
  const map = {
    'gmail': process.env.PICA_GMAIL_CONNECTION_KEY,
    'google-calendar': process.env.PICA_GOOGLE_CALENDAR_CONNECTION_KEY,
    'google-drive': process.env.PICA_GOOGLE_DRIVE_CONNECTION_KEY,
    'tavily': process.env.PICA_TAVILY_CONNECTION_KEY,
    'firecrawl': process.env.PICA_FIRECRAWL_CONNECTION_KEY,
    'browserbase': process.env.PICA_BROWSERBASE_CONNECTION_KEY,
  };
  const key = map[platform];
  if (!key) throw new Error(`Missing connection key for platform: ${platform}`);
  return key;
}

function base64UrlEncode(input) {
  const b64 = Buffer.from(input, 'utf-8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function buildMimeEmail({ to, cc, bcc, from, replyTo, subject, body, isHtml, headers }) {
  const lines = [];
  lines.push(`To: ${to.join(', ')}`);
  if (cc?.length) lines.push(`Cc: ${cc.join(', ')}`);
  if (bcc?.length) lines.push(`Bcc: ${bcc.join(', ')}`);
  if (from) lines.push(`From: ${from}`);
  if (replyTo) lines.push(`Reply-To: ${replyTo}`);
  lines.push(`Subject: ${subject}`);
  lines.push(`Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`);
  lines.push('MIME-Version: 1.0');

  if (headers) {
    for (const [k, v] of Object.entries(headers)) {
      if (/\r|\n/.test(k) || /\r|\n/.test(v)) continue;
      lines.push(`${k}: ${v}`);
    }
  }

  lines.push('');
  lines.push(body);
  lines.push('');
  return lines.join('\r\n');
}

async function picaFetch({ platform, actionId, path, method, queryParams, body }) {
  const secret = process.env.PICA_SECRET_KEY;
  if (!secret) throw new Error('Missing PICA_SECRET_KEY');

  const connKey = getConnKey(platform);
  const url = new URL(`${PICA_BASE}/${path.replace(/^\//, '')}`);

  if (queryParams) {
    for (const [k, v] of Object.entries(queryParams)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const fetchOpts = {
    method,
    headers: {
      'x-pica-secret': secret,
      'x-pica-connection-key': connKey,
      'x-pica-action-id': actionId,
      'Content-Type': 'application/json',
    },
  };

  if (method !== 'GET' && body !== undefined) {
    fetchOpts.body = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), fetchOpts);
  const rawText = await res.text();
  let data = null;
  try { data = rawText ? JSON.parse(rawText) : null; } catch { data = { rawText }; }
  return { status: res.status, data, rawText };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: { message: 'Method not allowed' } });
  }

  try {
    const { action, input } = req.body;

    if (!action || !input) {
      return res.status(400).json({ ok: false, error: { message: 'Missing action or input' } });
    }

    let result;

    switch (action) {
      case 'gmail.sendMail': {
        const { to, subject, body } = input;
        if (!Array.isArray(to) || to.length === 0) throw new Error('gmail.sendMail requires input.to (non-empty array)');
        if (!subject) throw new Error('gmail.sendMail requires input.subject');

        const mime = buildMimeEmail(input);
        const raw = base64UrlEncode(mime);

        const call = await picaFetch({
          platform: 'gmail',
          actionId: 'conn_mod_def::F_JeJ_A_TKg::cc2kvVQQTiiIiLEDauy6zQ',
          path: 'users/me/messages/send',
          method: 'POST',
          body: { raw },
        });
        if (call.status >= 400) throw new Error(`Gmail send failed (${call.status}): ${call.rawText}`);
        result = call.data;
        break;
      }

      case 'gcal.createEvent': {
        const { calendarId, event, queryParams } = input;
        if (!calendarId) throw new Error('gcal.createEvent requires input.calendarId');
        if (!event?.start || !event?.end) throw new Error('gcal.createEvent requires event.start and event.end');

        const call = await picaFetch({
          platform: 'google-calendar',
          actionId: 'conn_mod_def::F_JeDmpsPL4::1PhPKt9MRPmDDgUVS8Yd3Q',
          path: `calendars/${encodeURIComponent(calendarId)}/events`,
          method: 'POST',
          queryParams,
          body: event,
        });
        if (call.status >= 400) throw new Error(`Calendar create failed (${call.status}): ${call.rawText}`);
        result = call.data;
        break;
      }

      case 'gcal.updateEvent': {
        const { calendarId, eventId, event, queryParams } = input;
        if (!calendarId) throw new Error('gcal.updateEvent requires input.calendarId');
        if (!eventId) throw new Error('gcal.updateEvent requires input.eventId');

        const call = await picaFetch({
          platform: 'google-calendar',
          actionId: 'conn_mod_def::F_JdznL9bj4::WBnlseGvQ_2eTA5lvkbhfQ',
          path: `calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
          method: 'PUT',
          queryParams,
          body: event,
        });
        if (call.status >= 400) throw new Error(`Calendar update failed (${call.status}): ${call.rawText}`);
        result = call.data;
        break;
      }

      case 'gdrive.listFiles': {
        const call = await picaFetch({
          platform: 'google-drive',
          actionId: 'conn_mod_def::F_JAdK0r65A::IwQnCSpVSSCFUR8QsdeIjQ',
          path: 'files',
          method: 'GET',
          queryParams: input.queryParams,
        });
        if (call.status >= 400) throw new Error(`Drive list failed (${call.status}): ${call.rawText}`);
        result = call.data;
        break;
      }

      case 'web.search': {
        if (!input.query) throw new Error('web.search requires input.query');

        const call = await picaFetch({
          platform: 'tavily',
          actionId: 'conn_mod_def::GCMZGXIH9aE::u-LjTRVgSdC0O_VGbS317w',
          path: 'search',
          method: 'POST',
          body: input,
        });
        if (call.status >= 400) throw new Error(`Web search failed (${call.status}): ${call.rawText}`);
        result = call.data;
        break;
      }

      case 'web.scrape': {
        if (!input.url) throw new Error('web.scrape requires input.url');

        const call = await picaFetch({
          platform: 'firecrawl',
          actionId: 'conn_mod_def::GClH_gYvdtQ::cbt1pY3eSOW7SsB6Ezov8A',
          path: 'v1/scrape',
          method: 'POST',
          body: input,
        });
        if (call.status >= 400) throw new Error(`Scrape failed (${call.status}): ${call.rawText}`);
        result = call.data;
        break;
      }

      case 'browser.createSession': {
        if (!input.projectId) throw new Error('browser.createSession requires input.projectId');

        const call = await picaFetch({
          platform: 'browserbase',
          actionId: 'conn_mod_def::GD3OCHUdKaE::nmXQtKidR5y-gyVBKdgoJA',
          path: 'v1/sessions',
          method: 'POST',
          body: input,
        });
        if (call.status >= 400) throw new Error(`Browser session failed (${call.status}): ${call.rawText}`);
        result = call.data;
        break;
      }

      default:
        return res.status(400).json({ ok: false, error: { message: `Unknown action: ${action}` } });
    }

    res.status(200).json({ ok: true, action, data: result });
  } catch (error) {
    console.error('Agent tools error:', error);
    res.status(500).json({ ok: false, action: req.body?.action, error: { message: error.message } });
  }
}
