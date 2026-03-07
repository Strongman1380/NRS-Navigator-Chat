import { listCalendarEvents, isAuthorized } from '../services/googleCalendar.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!isAuthorized()) {
      return res.status(401).json({ error: 'Google Calendar not authorized', needsAuth: true });
    }

    const { timeMin, timeMax, maxResults } = req.query;

    const events = await listCalendarEvents({
      timeMin,
      timeMax,
      maxResults: maxResults ? parseInt(maxResults) : 10
    });

    res.status(200).json({ success: true, events });
  } catch (error) {
    console.error('Error listing events:', error);
    res.status(500).json({ error: error.message });
  }
}
