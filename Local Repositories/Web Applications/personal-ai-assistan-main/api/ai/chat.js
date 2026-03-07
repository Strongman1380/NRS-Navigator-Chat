import { callOpenAI } from '../services/openai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, systemPrompt, skipPersonality } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const defaultSystem = skipPersonality ? '' : `You are Brandon's personal AI assistant - friendly, helpful, and conversational.
Talk like a real person, not a corporate robot. Use contractions.
Be warm and personable but still professional when needed.
You're a knowledgeable friend helping out, not a formal assistant reading from a script.`;

    const response = await callOpenAI(systemPrompt || defaultSystem, prompt);

    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error('Error in /api/ai/chat:', error);
    res.status(500).json({ error: error.message });
  }
}
