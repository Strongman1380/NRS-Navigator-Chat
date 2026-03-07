import { callOpenAI } from '../services/openai.js';
import { supabase } from '../config/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Missing query' });
    }

    const { data: memories, error } = await supabase
      .from('memories')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    if (!memories || memories.length === 0) {
      return res.status(200).json({ success: true, results: [], explanation: 'No memories stored yet.' });
    }

    const memoryList = memories.map((m, i) => `[${i}] ${m.content} (category: ${m.category}, tags: ${(m.tags || []).join(', ')})`).join('\n');

    const systemPrompt = `You are a memory search assistant. Given a search query and a list of memories, return the indices of the most relevant memories.

Return ONLY valid JSON:
{
  "indices": [0, 3, 7],
  "explanation": "brief explanation of why these match"
}`;

    const aiResponse = await callOpenAI(systemPrompt, `Query: "${query}"\n\nMemories:\n${memoryList}`);
    const cleaned = aiResponse.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const parsed = JSON.parse(cleaned);

    const results = (parsed.indices || [])
      .filter(i => i >= 0 && i < memories.length)
      .map(i => memories[i]);

    res.status(200).json({
      success: true,
      results,
      explanation: parsed.explanation || ''
    });
  } catch (error) {
    console.error('Error searching memories:', error);
    res.status(500).json({ error: error.message });
  }
}
