import { isDriveAuthorized } from '../services/googleDrive.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authorized = isDriveAuthorized();

  if (authorized) {
    res.status(200).json({ authorized: true });
  } else {
    res.status(200).json({
      authorized: false,
      authUrl: 'https://app.picaos.com/connections',
      message: 'Please connect Google Drive in your Pica dashboard'
    });
  }
}
