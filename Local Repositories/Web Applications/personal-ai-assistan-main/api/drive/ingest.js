import { readFileContent } from '../services/googleDrive.js';
import { callOpenAI } from '../services/openai.js';
import { supabase } from '../config/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'Missing fileId' });
    }

    const file = await readFileContent(fileId);

    if (file.content.startsWith('[Binary file:') || file.content.startsWith('[PDF file:')) {
      return res.status(400).json({
        error: 'Cannot ingest this file type. Supported: Google Docs, Sheets, text files, JSON.'
      });
    }

    const maxChars = 15000;
    const truncated = file.content.length > maxChars;
    const contentToProcess = truncated ? file.content.substring(0, maxChars) : file.content;

    const systemPrompt = `You are a memory extraction assistant for Brandon Hinrichs. Extract important facts, preferences, procedures, contacts, and knowledge into structured memories.

Extract multiple distinct memories from the document. Each memory should be a standalone fact or piece of information.

Guidelines:
- Convert to third person (e.g., "Brandon prefers..." or "Heartland Boys Home requires...")
- Be concise but include important details
- Focus on actionable information, key facts, procedures, contacts, and preferences
- Each memory should be 1-2 sentences maximum

For each memory, provide:
- category: ONE of: biographical, preference, schedule, contact, work, personal, health, finance, hobby, goal, relationship, skill, general
- memory_type: ONE of: fact, routine, habit, preference, relationship, event, goal, skill, contact_info, schedule, note
- importance_level: ONE of: low, medium, high, critical
- tags: 2-5 relevant keywords
- related_entities: people, places, companies mentioned

Return ONLY valid JSON array:
[
  {
    "content": "memory text",
    "category": "category",
    "memory_type": "type",
    "importance_level": "level",
    "tags": ["tag1", "tag2"],
    "related_entities": ["entity1"],
    "context": "source document context"
  }
]

If the document has no useful information, return an empty array: []`;

    const userMessage = `Document: "${file.name}" (${file.mimeType})\n\nContent:\n${contentToProcess}`;
    const aiResponse = await callOpenAI(systemPrompt, userMessage);

    let memories;
    try {
      const cleaned = aiResponse.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      memories = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: 'AI returned invalid format during extraction' });
    }

    if (!Array.isArray(memories) || memories.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No extractable memories found in this document.',
        file: { name: file.name, mimeType: file.mimeType },
        memoriesAdded: 0
      });
    }

    const memoryRows = memories.map(m => ({
      content: m.content,
      raw_input: `[Ingested from Google Drive: ${file.name}]`,
      category: m.category || 'general',
      memory_type: m.memory_type || 'fact',
      tags: [...(m.tags || []), 'google-drive', file.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')],
      importance_level: m.importance_level || 'medium',
      related_entities: m.related_entities || [],
      context: m.context || `Extracted from Drive document: ${file.name}`
    }));

    const { data, error } = await supabase
      .from('memories')
      .insert(memoryRows)
      .select();

    if (error) {
      throw new Error(`Failed to save memories: ${error.message}`);
    }

    res.status(200).json({
      success: true,
      file: { name: file.name, mimeType: file.mimeType },
      memoriesAdded: data.length,
      memories: data.map(d => ({ id: d.id, content: d.content, category: d.category })),
      truncated
    });
  } catch (error) {
    console.error('Error ingesting Drive file:', error);

    if (error.message.includes('No Google token') || error.message.includes('invalid_grant')) {
      return res.status(401).json({ error: 'Drive authorization required', needsAuth: true });
    }

    res.status(500).json({ error: error.message });
  }
}
