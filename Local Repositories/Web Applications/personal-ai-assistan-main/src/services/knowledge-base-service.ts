// Centralized Knowledge Base Service with localStorage persistence
// This service manages all knowledge entries and provides a unified interface
// for all components to save and retrieve information

export interface KnowledgeEntry {
  id: string;
  type: 'extracted_data' | 'email' | 'rewritten_text' | 'calendar_event' | 'document' | 'ai_conversation';
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  source: string; // Component that created this entry
}

export interface ExtractedDataMetadata {
  people: Array<{ name: string; role: string }>;
  caseIdentifiers: Array<{ field: string; value: string }>;
  dates: Array<{ type: string; date: string }>;
  serviceRequirements: Array<{ requirement: string; details: string }>;
  contacts: Array<{ name: string; phone?: string; email?: string }>;
  originalText?: string;
}

export interface EmailMetadata {
  subject: string;
  body: string;
  formality: string;
  prompt: string;
}

export interface TextRewriteMetadata {
  originalText: string;
  rewrittenText: string;
  audience: string;
}

export interface CalendarEventMetadata {
  title: string;
  date: string;
  time: string;
  duration: string;
  description?: string;
  originalInput: string;
}

export interface AIConversationMetadata {
  query: string;
  response: string;
  contextUsed: string[];
}

const STORAGE_KEY = 'knowledge_base_entries';

class KnowledgeBaseService {
  private entries: KnowledgeEntry[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.entries = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load knowledge base from storage:', error);
      this.entries = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch (error) {
      console.error('Failed to save knowledge base to storage:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Subscribe to changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Get all entries
  getAllEntries(): KnowledgeEntry[] {
    return [...this.entries];
  }

  // Get entries by type
  getEntriesByType(type: KnowledgeEntry['type']): KnowledgeEntry[] {
    return this.entries.filter(entry => entry.type === type);
  }

  // Get entry by ID
  getEntryById(id: string): KnowledgeEntry | undefined {
    return this.entries.find(entry => entry.id === id);
  }

  // Search entries
  searchEntries(query: string): KnowledgeEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.entries.filter(entry =>
      entry.title.toLowerCase().includes(lowerQuery) ||
      entry.content.toLowerCase().includes(lowerQuery) ||
      entry.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // Add a new entry
  addEntry(entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt'>): KnowledgeEntry {
    const now = new Date().toISOString();
    const newEntry: KnowledgeEntry = {
      ...entry,
      id: `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.entries.unshift(newEntry);
    this.saveToStorage();
    this.notifyListeners();
    return newEntry;
  }

  // Update an entry
  updateEntry(id: string, updates: Partial<Omit<KnowledgeEntry, 'id' | 'createdAt'>>): KnowledgeEntry | null {
    const index = this.entries.findIndex(entry => entry.id === id);
    if (index === -1) return null;

    this.entries[index] = {
      ...this.entries[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveToStorage();
    this.notifyListeners();
    return this.entries[index];
  }

  // Remove an entry
  removeEntry(id: string): boolean {
    const index = this.entries.findIndex(entry => entry.id === id);
    if (index === -1) return false;

    this.entries.splice(index, 1);
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  // Clear all entries
  clearAll(): void {
    this.entries = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  // Get context for AI queries - returns relevant entries as formatted text
  getContextForAI(query: string, maxEntries: number = 10): string {
    const relevantEntries = this.searchEntries(query).slice(0, maxEntries);

    if (relevantEntries.length === 0) {
      // If no direct matches, return recent entries
      const recentEntries = this.entries.slice(0, maxEntries);
      if (recentEntries.length === 0) return '';

      return this.formatEntriesAsContext(recentEntries);
    }

    return this.formatEntriesAsContext(relevantEntries);
  }

  private formatEntriesAsContext(entries: KnowledgeEntry[]): string {
    return entries.map(entry => {
      let contextBlock = `--- ${entry.type.toUpperCase().replace('_', ' ')} ---\n`;
      contextBlock += `Title: ${entry.title}\n`;
      contextBlock += `Date: ${new Date(entry.createdAt).toLocaleDateString()}\n`;

      switch (entry.type) {
        case 'extracted_data': {
          const meta = entry.metadata as ExtractedDataMetadata;
          if (meta.people?.length) {
            contextBlock += `People: ${meta.people.map(p => `${p.name} (${p.role})`).join(', ')}\n`;
          }
          if (meta.caseIdentifiers?.length) {
            contextBlock += `Case Info: ${meta.caseIdentifiers.map(c => `${c.field}: ${c.value}`).join(', ')}\n`;
          }
          if (meta.dates?.length) {
            contextBlock += `Dates: ${meta.dates.map(d => `${d.type}: ${d.date}`).join(', ')}\n`;
          }
          break;
        }
        case 'email': {
          const meta = entry.metadata as EmailMetadata;
          contextBlock += `Subject: ${meta.subject}\n`;
          contextBlock += `Purpose: ${meta.prompt}\n`;
          break;
        }
        case 'calendar_event': {
          const meta = entry.metadata as CalendarEventMetadata;
          contextBlock += `Event: ${meta.title} on ${meta.date} at ${meta.time}\n`;
          contextBlock += `Duration: ${meta.duration}\n`;
          if (meta.description) contextBlock += `Description: ${meta.description}\n`;
          break;
        }
        case 'rewritten_text': {
          const meta = entry.metadata as TextRewriteMetadata;
          contextBlock += `Audience: ${meta.audience}\n`;
          contextBlock += `Content Preview: ${meta.rewrittenText.substring(0, 200)}...\n`;
          break;
        }
        default:
          contextBlock += `Content: ${entry.content.substring(0, 300)}...\n`;
      }

      if (entry.tags.length) {
        contextBlock += `Tags: ${entry.tags.join(', ')}\n`;
      }

      return contextBlock;
    }).join('\n');
  }

  // Get summary stats
  getStats(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    this.entries.forEach(entry => {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
    });
    return { total: this.entries.length, byType };
  }

  // Helper methods for specific entry types
  addExtractedData(
    title: string,
    data: ExtractedDataMetadata,
    tags: string[] = []
  ): KnowledgeEntry {
    const content = this.formatExtractedDataContent(data);
    return this.addEntry({
      type: 'extracted_data',
      title,
      content,
      metadata: data,
      tags: [...tags, 'extracted'],
      source: 'DataExtractor',
    });
  }

  addEmail(
    subject: string,
    emailData: EmailMetadata,
    tags: string[] = []
  ): KnowledgeEntry {
    return this.addEntry({
      type: 'email',
      title: subject,
      content: emailData.body,
      metadata: emailData,
      tags: [...tags, 'email'],
      source: 'EmailWriter',
    });
  }

  addRewrittenText(
    title: string,
    textData: TextRewriteMetadata,
    tags: string[] = []
  ): KnowledgeEntry {
    return this.addEntry({
      type: 'rewritten_text',
      title,
      content: textData.rewrittenText,
      metadata: textData,
      tags: [...tags, 'rewritten', textData.audience],
      source: 'TextRewriter',
    });
  }

  addCalendarEvent(
    eventData: CalendarEventMetadata,
    tags: string[] = []
  ): KnowledgeEntry {
    const content = `${eventData.title} on ${eventData.date} at ${eventData.time} (${eventData.duration})${eventData.description ? ` - ${eventData.description}` : ''}`;
    return this.addEntry({
      type: 'calendar_event',
      title: eventData.title,
      content,
      metadata: eventData,
      tags: [...tags, 'calendar', 'event'],
      source: 'CalendarEvent',
    });
  }

  addDocument(
    title: string,
    content: string,
    tags: string[] = []
  ): KnowledgeEntry {
    return this.addEntry({
      type: 'document',
      title,
      content,
      metadata: {},
      tags,
      source: 'KnowledgeBase',
    });
  }

  addAIConversation(
    query: string,
    response: string,
    contextUsed: string[] = [],
    tags: string[] = []
  ): KnowledgeEntry {
    return this.addEntry({
      type: 'ai_conversation',
      title: `Q: ${query.substring(0, 50)}...`,
      content: response,
      metadata: { query, response, contextUsed } as AIConversationMetadata,
      tags: [...tags, 'ai-response'],
      source: 'AIAssistant',
    });
  }

  private formatExtractedDataContent(data: ExtractedDataMetadata): string {
    let content = '';

    if (data.people?.length) {
      content += 'People:\n' + data.people.map(p => `- ${p.name} (${p.role})`).join('\n') + '\n\n';
    }
    if (data.caseIdentifiers?.length) {
      content += 'Case Identifiers:\n' + data.caseIdentifiers.map(c => `- ${c.field}: ${c.value}`).join('\n') + '\n\n';
    }
    if (data.dates?.length) {
      content += 'Dates:\n' + data.dates.map(d => `- ${d.type}: ${d.date}`).join('\n') + '\n\n';
    }
    if (data.serviceRequirements?.length) {
      content += 'Service Requirements:\n' + data.serviceRequirements.map(s => `- ${s.requirement}: ${s.details}`).join('\n') + '\n\n';
    }
    if (data.contacts?.length) {
      content += 'Contacts:\n' + data.contacts.map(c => `- ${c.name}${c.phone ? ` | ${c.phone}` : ''}${c.email ? ` | ${c.email}` : ''}`).join('\n');
    }

    return content.trim();
  }
}

// Export singleton instance
export const knowledgeBaseService = new KnowledgeBaseService();
