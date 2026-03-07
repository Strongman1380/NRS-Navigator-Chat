import { useState, useRef } from 'react';
import {
  BookOpen,
  Copy,
  Lightning,
  FilePdf,
  X,
  Plus,
  Trash,
  Search,
  Table,
  EnvelopeSimple,
  CalendarPlus,
  ArrowsClockwise,
  ChatCircleDots,
  FileText,
  Funnel
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { openaiService } from "@/services/openai-service";
import { extractTextFromPDF } from "@/utils/pdf-utils";
import { useKnowledgeBase } from "@/hooks/use-knowledge-base";
import type { KnowledgeEntry } from "@/services/knowledge-base-service";

const TYPE_ICONS: Record<string, typeof Table> = {
  extracted_data: Table,
  email: EnvelopeSimple,
  calendar_event: CalendarPlus,
  rewritten_text: ArrowsClockwise,
  document: FileText,
  ai_conversation: ChatCircleDots,
};

const TYPE_LABELS: Record<string, string> = {
  extracted_data: 'Extracted Data',
  email: 'Email',
  calendar_event: 'Calendar Event',
  rewritten_text: 'Rewritten Text',
  document: 'Document',
  ai_conversation: 'AI Conversation',
};

export function KnowledgeBase() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [aiSearchResult, setAiSearchResult] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    entries,
    stats,
    searchEntries,
    addDocument,
    removeEntry,
    getContextForAI
  } = useKnowledgeBase();

  // Add a new document
  const handleAddDocument = () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Please provide both title and content');
      return;
    }

    const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    addDocument(title.trim(), content.trim(), tagList);

    setTitle('');
    setContent('');
    setTags('');
    setUploadedFile(null);
    toast.success('Document added to knowledge base!');
  };

  // Remove an entry
  const handleRemoveEntry = (id: string) => {
    removeEntry(id);
    if (selectedEntry?.id === id) {
      setSelectedEntry(null);
      setViewMode('list');
    }
    toast.success('Entry removed from knowledge base');
  };

  // Filter entries
  const getFilteredEntries = () => {
    let filtered = entries;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(entry => entry.type === filterType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = searchEntries(searchQuery);
      if (filterType !== 'all') {
        filtered = filtered.filter(entry => entry.type === filterType);
      }
    }

    return filtered;
  };

  const filteredEntries = getFilteredEntries();

  // AI-powered search
  const handleAISearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsProcessing(true);
    setAiSearchResult('');
    try {
      const context = getContextForAI(searchQuery, 10);

      if (!context) {
        setAiSearchResult('No relevant entries found in your knowledge base.');
        return;
      }

      const prompt = `You are a knowledge base assistant. Based on the following stored knowledge, answer the user's query:

=== KNOWLEDGE BASE ===
${context}
=== END KNOWLEDGE BASE ===

User Query: ${searchQuery}

Provide a helpful, accurate response based on the stored knowledge. If the information isn't available, state that clearly.`;

      const result = await openaiService.generateResponse(prompt);
      setAiSearchResult(result);
      toast.success('Search completed!');
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search knowledge base. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);

    try {
      if (file.type === "application/pdf") {
        const text = await extractTextFromPDF(file);
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
        setContent(text);
        toast.success(`PDF loaded: ${file.name}`);
      } else {
        const text = await file.text();
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
        setContent(text);
        toast.success(`File loaded: ${file.name}`);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file. Please try a different file.');
      setUploadedFile(null);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getEntryIcon = (type: string) => {
    const Icon = TYPE_ICONS[type] || FileText;
    return <Icon size={16} weight="duotone" />;
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-primary" />
            <span className="font-medium">Knowledge Base</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{stats.total} total entries</Badge>
            {Object.entries(stats.byType).map(([type, count]) => (
              <Badge key={type} variant="outline" className="text-xs">
                {TYPE_LABELS[type] || type}: {count}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList>
          <TabsTrigger value="browse">Browse & Search</TabsTrigger>
          <TabsTrigger value="add">Add Document</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {/* Search and Filter */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your knowledge base..."
                    className="w-full p-2 border rounded-md"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAISearch();
                      }
                    }}
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <Funnel size={16} className="mr-2" />
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="extracted_data">Extracted Data</SelectItem>
                    <SelectItem value="email">Emails</SelectItem>
                    <SelectItem value="calendar_event">Calendar Events</SelectItem>
                    <SelectItem value="rewritten_text">Rewritten Text</SelectItem>
                    <SelectItem value="document">Documents</SelectItem>
                    <SelectItem value="ai_conversation">AI Conversations</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAISearch}
                  disabled={!searchQuery.trim() || isProcessing}
                  style={{ backgroundColor: 'var(--teal-accent, #0d9488)' }}
                >
                  {isProcessing ? (
                    <>
                      <Lightning className="animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search weight="fill" />
                      AI Search
                    </>
                  )}
                </Button>
              </div>

              {/* AI Search Result */}
              <AnimatePresence>
                {aiSearchResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-primary/5 border border-primary/20 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm">AI Search Result</h4>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(aiSearchResult)}
                        >
                          <Copy size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAiSearchResult('')}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm whitespace-pre-wrap">
                      {aiSearchResult}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          {/* Entry Detail View */}
          <AnimatePresence>
            {viewMode === 'detail' && selectedEntry && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      {getEntryIcon(selectedEntry.type)}
                      <h4 className="text-lg font-semibold">{selectedEntry.title}</h4>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(selectedEntry.content)}
                      >
                        <Copy />
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setViewMode('list');
                          setSelectedEntry(null);
                        }}
                      >
                        <X />
                        Close
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">{TYPE_LABELS[selectedEntry.type]}</Badge>
                      <span>Source: {selectedEntry.source}</span>
                      <span>Added: {new Date(selectedEntry.createdAt).toLocaleDateString()}</span>
                    </div>

                    {selectedEntry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedEntry.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="prose max-w-none bg-muted/30 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {selectedEntry.content}
                      </pre>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Entries List */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BookOpen size={20} />
              {filterType === 'all' ? 'All Entries' : TYPE_LABELS[filterType]} ({filteredEntries.length})
            </h3>

            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen size={48} className="mx-auto mb-3 opacity-50" weight="duotone" />
                <p>No entries found. Use the productivity tools to add content, or add documents manually.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEntries.map(entry => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedEntry(entry);
                      setViewMode('detail');
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {getEntryIcon(entry.type)}
                        <h4 className="font-semibold truncate text-sm">{entry.title}</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveEntry(entry.id);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Trash size={14} />
                      </Button>
                    </div>

                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[entry.type]}
                      </Badge>
                      <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {entry.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {entry.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{entry.tags.length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="text-xs line-clamp-2 text-muted-foreground">
                      {entry.content.substring(0, 100)}...
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="add" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Plus size={20} />
              Add New Document
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="doc-title">Document Title</Label>
                <input
                  id="doc-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter document title..."
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-tags">Tags (comma separated)</Label>
                <input
                  id="doc-tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="policy, procedure, guidelines..."
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div className="space-y-3">
                <Label>Upload Document</Label>
                <div className="flex flex-col gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="doc-upload"
                  />
                  <label htmlFor="doc-upload">
                    <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer bg-muted/20">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <FilePdf size={24} className="text-primary" weight="duotone" />
                        <div>
                          <p className="font-medium text-sm">Click to upload document</p>
                          <p className="text-xs text-muted-foreground">
                            Supports .txt, .pdf
                          </p>
                        </div>
                      </div>
                    </div>
                  </label>

                  {uploadedFile && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg"
                    >
                      <FilePdf size={24} className="text-primary" weight="fill" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                      >
                        <X size={18} />
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-content">Document Content</Label>
                <Textarea
                  id="doc-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste or type document content here..."
                  className="min-h-[200px] resize-none"
                />
              </div>

              <Button
                onClick={handleAddDocument}
                disabled={!title.trim() || !content.trim()}
                className="w-full"
                style={{ backgroundColor: 'var(--teal-accent, #0d9488)' }}
              >
                <Plus weight="fill" />
                Add to Knowledge Base
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
