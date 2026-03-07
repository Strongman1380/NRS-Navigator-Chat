import { sendHostingerEmail, fetchUnreadHostingerEmails } from './hostinger.js';

/**
 * Call OpenAI GPT-4o-mini with a system prompt and user message
 */
export async function callOpenAI(systemPrompt, userMessage) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Call OpenAI and expect a JSON response
 */
export async function callOpenAIForJSON(systemPrompt, userMessage) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

/**
 * Call OpenAI with Pica tools enabled for connected integrations
 */
export async function callOpenAIWithPica(systemPrompt, userMessage, identity = 'brandon') {
  try {
    const { Pica } = await import('@picahq/ai');
    const pica = new Pica(process.env.PICA_SECRET_KEY);

    const tools = await pica.getTools({ identity });
    
    // Inject Custom Hostinger and Setup Tools to OpenAI since it's not supported natively in AuthKit
    const customTools = [
      {
        type: "function",
        function: {
          name: "hostinger_send_email",
          description: "Send an email using Hostinger SMTP. Use this whenever the user asks you to send an email, prioritizing this over Gmail.",
          parameters: {
            type: "object",
            properties: {
              to: { type: "string", description: "Recipient email address" },
              subject: { type: "string", description: "Email subject line" },
              text: { type: "string", description: "Plain text body of the email" }
            },
            required: ["to", "subject", "text"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "hostinger_scan_emails",
          description: "Scans the user's Hostinger email INBOX for recently unread incoming emails via IMAP. Use this when the user asks to check their mail.",
          parameters: {
            type: "object",
            properties: {
              limit: { type: "number", description: "The maximum number of recent unread emails to fetch. Default is 5." }
            }
          }
        }
      }
    ];

    const allTools = [...tools, ...customTools];

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    let response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools: allTools.length > 0 ? allTools : undefined,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
    }

    let data = await response.json();
    let assistantMessage = data.choices[0].message;

    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      messages.push(assistantMessage);

      const picaToolCalls = [];
      const customToolResults = [];

      for (const call of assistantMessage.tool_calls) {
        if (call.function.name === 'hostinger_send_email') {
          try {
            const args = JSON.parse(call.function.arguments);
            const result = await sendHostingerEmail(args);
            customToolResults.push({
              tool_call_id: call.id,
              result: { success: true, message: `Email sent to ${args.to} successfully.` }
            });
          } catch (e) {
            customToolResults.push({
              tool_call_id: call.id,
              result: { error: e.message }
            });
          }
        } else if (call.function.name === 'hostinger_scan_emails') {
          try {
            const args = JSON.parse(call.function.arguments);
            const emails = await fetchUnreadHostingerEmails(args.limit || 5);
            customToolResults.push({
              tool_call_id: call.id,
              result: { success: true, emails }
            });
          } catch (e) {
            customToolResults.push({
              tool_call_id: call.id,
              result: { error: e.message }
            });
          }
        } else {
          picaToolCalls.push(call);
        }
      }

      let toolResults = [];
      if (picaToolCalls.length > 0) {
        toolResults = await pica.executeToolCalls(picaToolCalls);
      }

      const allResults = [...toolResults, ...customToolResults];

      for (const result of allResults) {
        messages.push({
          role: 'tool',
          tool_call_id: result.tool_call_id,
          content: JSON.stringify(result.result)
        });
      }

      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          tools: allTools.length > 0 ? allTools : undefined,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
      }

      data = await response.json();
      assistantMessage = data.choices[0].message;
    }

    return assistantMessage.content;
  } catch (error) {
    console.error('OpenAI with Pica Error:', error);
    // Fallback to regular OpenAI if Pica fails
    if (error.message.includes('Pica') || error.message.includes('PICA')) {
      return callOpenAI(systemPrompt, userMessage);
    }
    throw error;
  }
}
