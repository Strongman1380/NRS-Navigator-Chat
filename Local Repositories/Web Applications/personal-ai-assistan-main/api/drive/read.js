import { readFileContent } from '../services/googleDrive.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileId } = req.query;

    if (!fileId) {
      return res.status(400).json({ error: 'Missing fileId parameter' });
    }

    const file = await readFileContent(fileId);
    res.status(200).json({ success: true, file });
  } catch (error) {
    console.error('Error reading Drive file:', error);

    if (error.message.includes('No Google token') || error.message.includes('invalid_grant')) {
      return res.status(401).json({ error: 'Drive authorization required', needsAuth: true });
    }

    res.status(500).json({ error: error.message });
  }
}
