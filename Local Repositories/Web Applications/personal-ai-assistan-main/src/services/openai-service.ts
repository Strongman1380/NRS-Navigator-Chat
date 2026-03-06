import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Human-like personality prompt that gets prepended to all requests
const PERSONALITY_PROMPT = `You are Brandon's personal AI assistant - friendly, helpful, and conversational.

IMPORTANT - How you communicate:
- Talk like a real person, not a corporate robot. Use contractions (I'm, you're, let's, don't, can't, etc.)
- Be warm and personable but still professional when needed
- Use casual language when appropriate ("Hey!", "Sure thing!", "Got it!", "No problem!")
- Show genuine interest and enthusiasm about helping
- Use phrases like "honestly", "actually", "I think", "from what I can tell"
- Don't be overly formal or stiff - imagine you're a helpful colleague and friend
- Avoid excessive bullet points and lists - prefer natural flowing conversation
- If you're not sure about something, say so naturally ("I'm not 100% sure, but...", "Let me think...")
- Add brief personal touches ("Oh interesting!", "Nice!", "That makes sense!")
- Use sentence fragments sometimes, like real people do. "Sure thing." "Definitely." "Good question!"
- Don't start every response with "I" - vary your sentence structure
- Avoid corporate-speak like "I'd be happy to assist you with that" - just help naturally

You're a knowledgeable friend helping out, not a formal assistant reading from a script.`;

export interface WebSearchResult {
  title: string;
  link: string;
  snippet: string;
}

export const openaiService = {
  async generateResponse(prompt: string, options?: { usePersonality?: boolean; skipPersonality?: boolean }): Promise<string> {
    const usePersonality = options?.skipPersonality ? false : (options?.usePersonality ?? true);

    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      if (usePersonality) {
        messages.push({ role: "system", content: PERSONALITY_PROMPT });
      }

      messages.push({ role: "user", content: prompt });

      const completion = await openai.chat.completions.create({
        messages,
        model: "gpt-4o-mini",
        temperature: 0.85, // Higher for more natural variation
      });

      return completion.choices[0]?.message?.content?.trim() || "";
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      throw error;
    }
  },

  // Web search using DuckDuckGo (no API key required)
  async webSearch(query: string): Promise<WebSearchResult[]> {
    try {
      // Use DuckDuckGo's instant answer API
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      const results: WebSearchResult[] = [];

      // Add abstract if available
      if (data.Abstract) {
        results.push({
          title: data.Heading || 'Summary',
          link: data.AbstractURL || '',
          snippet: data.Abstract
        });
      }

      // Add related topics
      if (data.RelatedTopics) {
        for (const topic of data.RelatedTopics.slice(0, 5)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || 'Related',
              link: topic.FirstURL,
              snippet: topic.Text
            });
          }
        }
      }

      // Add infobox data if available
      if (data.Infobox?.content) {
        for (const item of data.Infobox.content.slice(0, 3)) {
          if (item.label && item.value) {
            results.push({
              title: item.label,
              link: '',
              snippet: `${item.label}: ${item.value}`
            });
          }
        }
      }

      return results;
    } catch (error) {
      console.error("Web search error:", error);
      return [];
    }
  },

  // Search Wikipedia for more detailed info
  async searchWikipedia(query: string): Promise<WebSearchResult[]> {
    try {
      const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl);

      if (!response.ok) {
        // Try search endpoint instead
        const searchResponse = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=3`
        );
        const searchData = await searchResponse.json();

        return searchData.query?.search?.map((item: { title: string; snippet: string }) => ({
          title: item.title,
          link: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
          snippet: item.snippet.replace(/<[^>]*>/g, '') // Remove HTML tags
        })) || [];
      }

      const data = await response.json();
      return [{
        title: data.title,
        link: data.content_urls?.desktop?.page || '',
        snippet: data.extract || ''
      }];
    } catch (error) {
      console.error("Wikipedia search error:", error);
      return [];
    }
  },

  // Combined web research
  async performWebResearch(query: string): Promise<WebSearchResult[]> {
    try {
      // Run both searches in parallel
      const [ddgResults, wikiResults] = await Promise.all([
        this.webSearch(query),
        this.searchWikipedia(query)
      ]);

      // Combine and deduplicate
      const allResults = [...wikiResults, ...ddgResults];
      const seen = new Set<string>();
      const uniqueResults: WebSearchResult[] = [];

      for (const result of allResults) {
        const key = result.title.toLowerCase();
        if (!seen.has(key) && result.snippet) {
          seen.add(key);
          uniqueResults.push(result);
        }
      }

      return uniqueResults.slice(0, 6);
    } catch (error) {
      console.error("Web research error:", error);
      return [];
    }
  },

  // Generate response with web research context
  async generateWithWebResearch(
    userQuery: string,
    kbContext?: string
  ): Promise<{ response: string; sources: WebSearchResult[] }> {
    try {
      // First, search the web
      const searchResults = await this.performWebResearch(userQuery);

      // Format search results as context
      let webContext = '';
      if (searchResults.length > 0) {
        webContext = '\n\n--- Info I found online ---\n';
        searchResults.forEach((result, i) => {
          webContext += `\n${i + 1}. ${result.title}\n`;
          if (result.snippet) webContext += `   ${result.snippet}\n`;
          if (result.link) webContext += `   Source: ${result.link}\n`;
        });
        webContext += '--- End of web info ---\n';
      }

      // Build the prompt
      let prompt = '';

      if (kbContext) {
        prompt += `Here's what I know from your personal files and notes:\n${kbContext}\n`;
      }

      if (webContext) {
        prompt += webContext;
      }

      prompt += `\nThe question: ${userQuery}\n\n`;
      prompt += `Help answer this naturally. If you used web research, mention it casually (like "From what I found..." or "Looks like..."). `;
      prompt += `Blend your knowledge base info with web research when both apply. Keep it conversational!`;

      const response = await this.generateResponse(prompt);

      return {
        response,
        sources: searchResults
      };
    } catch (error) {
      console.error("Error with web research:", error);
      throw error;
    }
  }
};
