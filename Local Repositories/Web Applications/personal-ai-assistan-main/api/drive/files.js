import { listFiles, listFolders } from '../services/googleDrive.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, folderId, pageSize, pageToken, mimeType, foldersOnly } = req.query;

    let result;
    if (foldersOnly === 'true') {
      result = await listFolders(folderId);
    } else {
      result = await listFiles({
        query,
        folderId,
        pageSize: pageSize ? parseInt(pageSize) : 20,
        pageToken,
        mimeType
      });
    }

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Error listing Drive files:', error);

    if (error.message.includes('No Google token') || error.message.includes('invalid_grant')) {
      return res.status(401).json({ error: 'Drive authorization required', needsAuth: true });
    }

    res.status(500).json({ error: error.message });
  }
}
