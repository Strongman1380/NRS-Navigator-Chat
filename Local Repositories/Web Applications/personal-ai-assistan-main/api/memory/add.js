import { callOpenAI } from '../services/openai.js';
import { supabase } from '../config/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { input } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Missing input' });
    }

    const systemPrompt = `You are a memory formatting assistant for Brandon Hinrichs. Take user input and format it as a structured memory.

Convert the input into a clear, third-person factual statement. Then categorize it.

Return ONLY valid JSON:
{
  "content": "formatted memory in third person",
  "category": "ONE of: biographical, preference, schedule, contact, work, personal, health, finance, hobby, goal, relationship, skill, general",
  "memory_type": "ONE of: fact, routine, habit, preference, relationship, event, goal, skill, contact_info, schedule, note",
  "importance_level": "ONE of: low, medium, high, critical",
  "tags": ["2-5 relevant keywords"],
  "related_entities": ["people, places, companies mentioned"]
}`;

    const aiResponse = await callOpenAI(systemPrompt, input);
    const cleaned = aiResponse.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const parsed = JSON.parse(cleaned);

    const { data, error } = await supabase
      .from('memories')
      .insert({
        content: parsed.content,
        raw_input: input,
        category: parsed.category || 'general',
        memory_type: parsed.memory_type || 'fact',
        tags: parsed.tags || [],
        importance_level: parsed.importance_level || 'medium',
        related_entities: parsed.related_entities || [],
        context: parsed.context || ''
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to save memory: ${error.message}`);

    res.status(200).json({ success: true, memory: data });
  } catch (error) {
    console.error('Error adding memory:', error);
    res.status(500).json({ error: error.message });
  }
}
