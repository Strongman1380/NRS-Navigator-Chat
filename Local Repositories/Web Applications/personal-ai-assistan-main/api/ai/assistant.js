import { callOpenAIWithPica } from '../services/openai.js';
import { supabase } from '../config/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, identity = 'brandon' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }

    // Fetch relevant memories from Supabase
    let memoryContext = '';
    try {
      const { data: memories } = await supabase
        .from('memories')
        .select('content, category, importance_level')
        .eq('is_active', true)
        .order('importance_level', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (memories && memories.length > 0) {
        memoryContext = '\n\nRELEVANT INFORMATION ABOUT BRANDON:\n' +
          memories.map(m => `- ${m.content}`).join('\n');
      }
    } catch (memError) {
      console.warn('Could not fetch memories:', memError);
    }

    const today = new Date().toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    const systemPrompt = `You are Brandon Hinrichs' personal assistant with access to his email and calendar integrations.

Current date/time (Central Time): ${today}
${memoryContext}

CAPABILITIES:
You have access to the following integrations through Pica tools:
- Hostinger Email (IMAP/SMTP): Send emails, read emails, scan for new emails via your Hostinger account
- External Web Research & Crawling: Search the web (Tavily) and scrape website content (Firecrawl) for up-to-date information
- Gmail: Send emails, read emails, search emails
- Google Calendar: Create events, list events, update events, delete events
- Outlook: Send emails, read emails, search emails
- Outlook Calendar: Create events, list events, update events, delete events
- Google Drive: Browse files, read document contents, ingest documents into memory

INSTRUCTIONS:
1. When the user asks you to send an email, USE the Hostinger, Gmail or Outlook tool to actually send it (prioritize Hostinger if requested)
2. When the user asks to scan or check their Hostinger email, USE the Hostinger IMAP/SMTP tools to retrieve new emails and offer to draft responses
3. When the user asks to look something up or do research, USE the web search or scraping tools to gather information
4. When the user asks to create a calendar event, USE the Google Calendar or Outlook Calendar tool to create it
5. Always confirm what action you took after completing it

EMAIL STYLE:
- Start with "Hi, [Name]." (not "Dear" or "I hope this finds you well")
- Keep tone friendly yet professional
- Sign off with "Thanks,\\nBrandon Hinrichs"

CALENDAR:
- Brandon is in Central Time (America/Chicago)
- Default event duration is 1 hour if not specified
- Include relevant details in event description

PERSONALITY:
- Talk like a real person, use contractions
- Be warm and personable but professional when needed
- Be concise and action-oriented

Be helpful, concise, and take action when asked. Don't just describe what you would do - actually do it using the available tools.`;

    const response = await callOpenAIWithPica(systemPrompt, message, identity);

    res.status(200).json({
      success: true,
      message: response
    });
  } catch (error) {
    console.error('Error in /api/ai/assistant:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
