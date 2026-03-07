// Google Drive via Pica Passthrough
const PICA_BASE = 'https://api.picaos.com/v1/passthrough';

async function picaDriveFetch(path, method = 'GET', body) {
  const secret = process.env.PICA_SECRET_KEY;
  const connKey = process.env.PICA_GOOGLE_DRIVE_CONNECTION_KEY;

  if (!secret || !connKey) {
    throw new Error('Missing PICA_SECRET_KEY or PICA_GOOGLE_DRIVE_CONNECTION_KEY');
  }

  const url = `${PICA_BASE}/${path.replace(/^\//, '')}`;

  const opts = {
    method,
    headers: {
      'x-pica-secret': secret,
      'x-pica-connection-key': connKey,
      'x-pica-action-id': 'conn_mod_def::F_JAdK0r65A::IwQnCSpVSSCFUR8QsdeIjQ',
      'Content-Type': 'application/json',
    },
  };

  if (method !== 'GET' && body) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Drive API error (${res.status}): ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

export async function listFiles({ query, folderId, pageSize = 20, pageToken } = {}) {
  let q = 'trashed = false';
  if (folderId) q += ` and '${folderId}' in parents`;
  if (query) q += ` and (name contains '${query}' or fullText contains '${query}')`;

  const params = new URLSearchParams({
    q,
    pageSize: String(pageSize),
    fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,size,parents,webViewLink)',
    orderBy: 'modifiedTime desc'
  });

  if (pageToken) params.set('pageToken', pageToken);

  const data = await picaDriveFetch(`files?${params}`);

  return {
    files: data?.files || [],
    nextPageToken: data?.nextPageToken
  };
}

export async function readFileContent(fileId) {
  // Get metadata
  const meta = await picaDriveFetch(`files/${fileId}?fields=id,name,mimeType,size,modifiedTime`);
  const { mimeType, name } = meta;
  let content = '';

  const exportMap = {
    'application/vnd.google-apps.document': 'text/plain',
    'application/vnd.google-apps.spreadsheet': 'text/csv',
    'application/vnd.google-apps.presentation': 'text/plain',
  };

  if (exportMap[mimeType]) {
    // Export Google Workspace files
    const exportMime = exportMap[mimeType];
    const res = await fetch(`${PICA_BASE}/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`, {
      headers: {
        'x-pica-secret': process.env.PICA_SECRET_KEY,
        'x-pica-connection-key': process.env.PICA_GOOGLE_DRIVE_CONNECTION_KEY,
        'x-pica-action-id': 'conn_mod_def::F_JAdK0r65A::IwQnCSpVSSCFUR8QsdeIjQ',
      },
    });
    content = await res.text();
  } else if (mimeType === 'application/pdf') {
    content = `[PDF file: ${name} - PDF content extraction requires additional processing]`;
  } else if (mimeType?.startsWith('text/') || mimeType === 'application/json') {
    const res = await fetch(`${PICA_BASE}/files/${fileId}?alt=media`, {
      headers: {
        'x-pica-secret': process.env.PICA_SECRET_KEY,
        'x-pica-connection-key': process.env.PICA_GOOGLE_DRIVE_CONNECTION_KEY,
        'x-pica-action-id': 'conn_mod_def::F_JAdK0r65A::IwQnCSpVSSCFUR8QsdeIjQ',
      },
    });
    content = await res.text();
  } else {
    content = `[Binary file: ${name} (${mimeType}) - cannot extract text content]`;
  }

  return { id: meta.id, name, mimeType, modifiedTime: meta.modifiedTime, content };
}

export async function listFolders(parentId) {
  return listFiles({
    folderId: parentId,
    pageSize: 50
  });
}

export function isDriveAuthorized() {
  return !!(process.env.PICA_SECRET_KEY && process.env.PICA_GOOGLE_DRIVE_CONNECTION_KEY);
}
