import { useState, useEffect, useCallback } from 'react';
import { knowledgeBaseService, KnowledgeEntry } from '@/services/knowledge-base-service';

export function useKnowledgeBase() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, byType: {} as Record<string, number> });

  useEffect(() => {
    // Load initial entries
    setEntries(knowledgeBaseService.getAllEntries());
    setStats(knowledgeBaseService.getStats());

    // Subscribe to changes
    const unsubscribe = knowledgeBaseService.subscribe(() => {
      setEntries(knowledgeBaseService.getAllEntries());
      setStats(knowledgeBaseService.getStats());
    });

    return unsubscribe;
  }, []);

  const searchEntries = useCallback((query: string) => {
    return knowledgeBaseService.searchEntries(query);
  }, []);

  const getEntriesByType = useCallback((type: KnowledgeEntry['type']) => {
    return knowledgeBaseService.getEntriesByType(type);
  }, []);

  const getContextForAI = useCallback((query: string, maxEntries?: number) => {
    return knowledgeBaseService.getContextForAI(query, maxEntries);
  }, []);

  const addEntry = useCallback((entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    return knowledgeBaseService.addEntry(entry);
  }, []);

  const removeEntry = useCallback((id: string) => {
    return knowledgeBaseService.removeEntry(id);
  }, []);

  const updateEntry = useCallback((id: string, updates: Partial<Omit<KnowledgeEntry, 'id' | 'createdAt'>>) => {
    return knowledgeBaseService.updateEntry(id, updates);
  }, []);

  const clearAll = useCallback(() => {
    knowledgeBaseService.clearAll();
  }, []);

  // Helper methods for specific entry types
  const addExtractedData = useCallback((title: string, data: Parameters<typeof knowledgeBaseService.addExtractedData>[1], tags?: string[]) => {
    return knowledgeBaseService.addExtractedData(title, data, tags);
  }, []);

  const addEmail = useCallback((subject: string, emailData: Parameters<typeof knowledgeBaseService.addEmail>[1], tags?: string[]) => {
    return knowledgeBaseService.addEmail(subject, emailData, tags);
  }, []);

  const addRewrittenText = useCallback((title: string, textData: Parameters<typeof knowledgeBaseService.addRewrittenText>[1], tags?: string[]) => {
    return knowledgeBaseService.addRewrittenText(title, textData, tags);
  }, []);

  const addCalendarEvent = useCallback((eventData: Parameters<typeof knowledgeBaseService.addCalendarEvent>[0], tags?: string[]) => {
    return knowledgeBaseService.addCalendarEvent(eventData, tags);
  }, []);

  const addDocument = useCallback((title: string, content: string, tags?: string[]) => {
    return knowledgeBaseService.addDocument(title, content, tags);
  }, []);

  const addAIConversation = useCallback((query: string, response: string, contextUsed?: string[], tags?: string[]) => {
    return knowledgeBaseService.addAIConversation(query, response, contextUsed, tags);
  }, []);

  return {
    entries,
    stats,
    searchEntries,
    getEntriesByType,
    getContextForAI,
    addEntry,
    removeEntry,
    updateEntry,
    clearAll,
    addExtractedData,
    addEmail,
    addRewrittenText,
    addCalendarEvent,
    addDocument,
    addAIConversation,
  };
}
