import { getAuthUrl } from '../services/googleCalendar.js';

export default async function handler(req, res) {
  try {
    const authUrl = getAuthUrl();
    res.status(200).json({
      authUrl,
      message: 'Visit this URL to authorize Google Calendar and Drive access'
    });
  } catch (error) {
    console.error('Error getting auth URL:', error);
    res.status(500).json({ error: error.message });
  }
}
