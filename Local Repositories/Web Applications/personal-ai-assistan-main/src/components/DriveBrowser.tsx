import { useState, useEffect } from 'react';
import { HardDrive, MagnifyingGlass, FolderOpen, File, FileDoc, FileXls, FilePpt, FileText, ArrowLeft, CloudArrowDown, SpinnerGap } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
};

type FolderBreadcrumb = {
  id: string | null;
  name: string;
};

type IngestResult = {
  file: { name: string; mimeType: string };
  memoriesAdded: number;
  memories: Array<{ id: string; content: string; category: string }>;
  truncated: boolean;
};

const MIME_ICONS: Record<string, typeof File> = {
  'application/vnd.google-apps.folder': FolderOpen,
  'application/vnd.google-apps.document': FileDoc,
  'application/vnd.google-apps.spreadsheet': FileXls,
  'application/vnd.google-apps.presentation': FilePpt,
  'text/plain': FileText,
  'application/json': FileText,
};

function getFileIcon(mimeType: string) {
  const Icon = MIME_ICONS[mimeType] || File;
  return <Icon size={20} weight="duotone" />;
}

function canIngest(mimeType: string): boolean {
  return [
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.google-apps.presentation',
    'text/plain',
    'text/csv',
    'application/json',
  ].includes(mimeType);
}

export function DriveBrowser() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [authUrl, setAuthUrl] = useState('');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<FolderBreadcrumb[]>([{ id: null, name: 'My Drive' }]);
  const [ingesting, setIngesting] = useState<string | null>(null);
  const [ingestResult, setIngestResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/drive/auth-status');
      const data = await res.json();
      setAuthorized(data.authorized);
      if (!data.authorized && data.authUrl) {
        setAuthUrl(data.authUrl);
      }
      if (data.authorized) {
        loadFiles();
      }
    } catch {
      setAuthorized(false);
    }
  };

  const loadFiles = async (folderId?: string, query?: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (folderId) params.set('folderId', folderId);
      if (query) params.set('query', query);

      const res = await fetch(`/api/drive/files?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setFiles(data.files || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load files';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      loadFiles(currentFolderId() || undefined);
      return;
    }
    loadFiles(undefined, searchQuery.trim());
  };

  const currentFolderId = () => {
    const last = breadcrumbs[breadcrumbs.length - 1];
    return last?.id || null;
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
    setSearchQuery('');
    loadFiles(folderId);
  };

  const navigateToBreadcrumb = (index: number) => {
    const newCrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newCrumbs);
    setSearchQuery('');
    const folderId = newCrumbs[newCrumbs.length - 1]?.id;
    loadFiles(folderId || undefined);
  };

  const handleFileClick = (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      navigateToFolder(file.id, file.name);
    } else if (file.webViewLink) {
      window.open(file.webViewLink, '_blank');
    }
  };

  const handleIngest = async (file: DriveFile) => {
    setIngesting(file.id);
    setIngestResult(null);
    try {
      const res = await fetch('/api/drive/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      if (data.memoriesAdded === 0) {
        toast.info('No extractable memories found in this document.');
      } else {
        setIngestResult(data);
        toast.success(`Extracted ${data.memoriesAdded} memories from ${data.file.name}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to ingest file';
      toast.error(message);
    } finally {
      setIngesting(null);
    }
  };

  if (authorized === null) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <SpinnerGap size={24} className="mx-auto animate-spin mb-2" />
        <p className="text-sm">Checking Drive access...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="text-center py-8">
        <HardDrive size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" weight="duotone" />
        <p className="text-muted-foreground mb-4">Google Drive is not connected yet.</p>
        {authUrl ? (
          <a
            href={authUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <Button style={{ backgroundColor: 'var(--teal-accent, #0d9488)' }}>
              Connect Google Drive
            </Button>
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">
            Set up Google credentials in your environment variables first.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search your Drive..."
            className="w-full p-2 border rounded-md text-sm"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading} size="sm" variant="outline">
          <MagnifyingGlass size={16} />
        </Button>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <div className="flex items-center gap-1 text-sm flex-wrap">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-muted-foreground">/</span>}
              <button
                onClick={() => navigateToBreadcrumb(i)}
                className="text-primary hover:underline text-sm"
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      )}

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Ingest Result */}
      {ingestResult && (
        <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-sm text-green-800 dark:text-green-300 mb-2">
                Extracted {ingestResult.memoriesAdded} memories from {ingestResult.file.name}
              </p>
              <div className="space-y-1">
                {ingestResult.memories.slice(0, 3).map((m) => (
                  <div key={m.id} className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs mr-1">{m.category}</Badge>
                    {m.content.substring(0, 80)}...
                  </div>
                ))}
                {ingestResult.memories.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{ingestResult.memories.length - 3} more</p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIngestResult(null)} className="text-xs">
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {/* File List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          <SpinnerGap size={24} className="mx-auto animate-spin mb-2" />
          <p className="text-sm">Loading files...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FolderOpen size={32} className="mx-auto mb-2 opacity-50" weight="duotone" />
          <p className="text-sm">No files found</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {breadcrumbs.length > 1 && (
            <button
              onClick={() => navigateToBreadcrumb(breadcrumbs.length - 2)}
              className="flex items-center gap-2 p-2 w-full text-left hover:bg-muted rounded-md text-sm text-muted-foreground"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          )}
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-2 hover:bg-muted rounded-md group"
            >
              <div className="text-primary flex-shrink-0">
                {getFileIcon(file.mimeType)}
              </div>
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => handleFileClick(file)}
              >
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(file.modifiedTime).toLocaleDateString()}
                </p>
              </div>
              {canIngest(file.mimeType) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleIngest(file)}
                  disabled={ingesting === file.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs h-7"
                >
                  {ingesting === file.id ? (
                    <SpinnerGap size={14} className="animate-spin" />
                  ) : (
                    <>
                      <CloudArrowDown size={14} className="mr-1" />
                      Ingest
                    </>
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
