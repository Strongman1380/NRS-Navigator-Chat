import { useState, useRef, useEffect } from "react";
import {
  ChatCircleDots,
  Copy,
  Lightning,
  PaperPlaneTilt,
  Database,
  Globe,
  Link,
  EnvelopeSimple,
  ArrowsClockwise,
  CalendarPlus,
  Trash,
  User,
  Robot,
  GoogleLogo,
  DownloadSimple,
  ShareNetwork,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { openaiService, WebSearchResult } from "@/services/openai-service";
import { useKnowledgeBase } from "@/hooks/use-knowledge-base";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "general" | "email" | "rewrite" | "calendar" | "social";
  metadata?: {
    emailSubject?: string;
    emailBody?: string;
    rewrittenText?: string;
    originalText?: string;
    audience?: string;
    calendarEvent?: {
      title: string;
      date: string;
      time: string;
      duration: string;
      description?: string;
    };
    webSources?: WebSearchResult[];
    savedToKB?: boolean;
    socialPost?: {
      platform: string;
      message: string;
      success?: boolean;
      error?: string;
    };
  };
}

const STORAGE_KEY = "unified_chat_messages";

export function UnifiedChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { getContextForAI, addEmail, addRewrittenText, addCalendarEvent, addAIConversation, stats } = useKnowledgeBase();

  // Load messages from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMessages(parsed.map((m: Message) => ({ ...m, timestamp: new Date(m.timestamp) })));
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  }, [messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const detectIntent = (text: string): "email" | "rewrite" | "calendar" | "social" | "general" | "agent" => {
    const lower = text.toLowerCase();

    // Social media detection
    if (
      lower.includes("post to facebook") ||
      lower.includes("post to instagram") ||
      lower.includes("post to linkedin") ||
      lower.includes("post on facebook") ||
      lower.includes("post on instagram") ||
      lower.includes("post on linkedin") ||
      lower.includes("share on facebook") ||
      lower.includes("share on instagram") ||
      lower.includes("share on linkedin") ||
      lower.includes("publish to facebook") ||
      lower.includes("publish to instagram") ||
      lower.includes("publish to linkedin")
    ) {
      return "social";
    }

    // Email detection
    if (
      lower.includes("write an email") ||
      lower.includes("draft an email") ||
      lower.includes("email to") ||
      lower.includes("send an email") ||
      lower.includes("compose an email") ||
      lower.match(/email\s+(my|the|a)\s+/)
    ) {
      return "email";
    }

    // Rewrite detection
    if (
      lower.includes("rewrite") ||
      lower.includes("re-write") ||
      lower.includes("make this professional") ||
      lower.includes("clean up this") ||
      lower.includes("make this sound") ||
      lower.includes("rephrase") ||
      lower.includes("convert to professional")
    ) {
      return "rewrite";
    }

    // Calendar detection
    if (
      lower.includes("schedule") ||
      lower.includes("calendar") ||
      lower.includes("meeting") ||
      lower.includes("appointment") ||
      lower.includes("event on") ||
      lower.includes("event for") ||
      lower.includes("remind me") ||
      lower.match(/at\s+\d{1,2}(:\d{2})?\s*(am|pm)?/i)
    ) {
      return "calendar";
    }

    // Checking if backend should handle it via AI Agent (Hostinger, web crawl tools, Pica, etc.)
    if (
      lower.includes("hostinger") ||
      lower.includes("scan my") ||
      lower.includes("check my email") ||
      lower.includes("inbox") ||
      lower.includes("search the web") ||
      lower.includes("scrape")
    ) {
      return "agent";
    }

    return "general";
  };

  const handleSend = async () => {
    if (!inputText.trim() || isProcessing) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: inputText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsProcessing(true);

    try {
      const intent = detectIntent(inputText);
      let assistantMessage: Message;

      const kbContext = getContextForAI(inputText, 8);

      if (intent === "email" && !inputText.toLowerCase().includes("hostinger") && !inputText.toLowerCase().includes("check")) {
        assistantMessage = await handleEmailRequest(inputText, kbContext);
      } else if (intent === "rewrite") {
        assistantMessage = await handleRewriteRequest(inputText, kbContext);
      } else if (intent === "calendar") {
        assistantMessage = await handleCalendarRequest(inputText, kbContext);
      } else if (intent === "social") {
        assistantMessage = await handleSocialRequest(inputText);
      } else if (intent === "agent" || (intent === "email" && (inputText.toLowerCase().includes("hostinger") || inputText.toLowerCase().includes("check")))) {
        assistantMessage = await handleAgentRequest(inputText, kbContext);
      } else {
        assistantMessage = await handleGeneralRequest(inputText, kbContext);
      }

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error processing message:", error);
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: "Oops, something went wrong! Mind trying that again?",
        timestamp: new Date(),
        type: "general",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailRequest = async (input: string, kbContext: string): Promise<Message> => {
    const prompt = `Write an email based on this request. Return ONLY valid JSON, no markdown.

REQUEST: "${input}"

${kbContext ? `Context from knowledge base:\n${kbContext}\n` : ""}

Write a professional yet friendly email. Return ONLY this JSON:
{
  "subject": "clear subject line",
  "body": "complete email with greeting and closing",
  "explanation": "brief friendly explanation of what you wrote"
}`;

    const result = await openaiService.generateResponse(prompt, { skipPersonality: true });
    const cleanResult = cleanJsonResponse(result);
    const parsed = JSON.parse(cleanResult);

    return {
      id: `msg_${Date.now()}`,
      role: "assistant",
      content: parsed.explanation || "Here's your email!",
      timestamp: new Date(),
      type: "email",
      metadata: {
        emailSubject: parsed.subject,
        emailBody: parsed.body,
      },
    };
  };

  const handleRewriteRequest = async (input: string, kbContext: string): Promise<Message> => {
    // Extract the text to rewrite (everything after common trigger phrases)
    const textMatch = input.match(/(?:rewrite|rephrase|clean up|make.*professional|convert)[\s:]+["']?(.+)["']?$/i);
    const textToRewrite = textMatch ? textMatch[1] : input;

    const prompt = `Rewrite this text to be professional and clear. Return ONLY valid JSON.

TEXT TO REWRITE: "${textToRewrite}"

${kbContext ? `Context:\n${kbContext}\n` : ""}

Return ONLY this JSON:
{
  "rewritten": "the professional version",
  "explanation": "brief friendly note about the changes"
}`;

    const result = await openaiService.generateResponse(prompt, { skipPersonality: true });
    const cleanResult = cleanJsonResponse(result);
    const parsed = JSON.parse(cleanResult);

    return {
      id: `msg_${Date.now()}`,
      role: "assistant",
      content: parsed.explanation || "Here's the rewritten version!",
      timestamp: new Date(),
      type: "rewrite",
      metadata: {
        rewrittenText: parsed.rewritten,
        originalText: textToRewrite,
      },
    };
  };

  const handleCalendarRequest = async (input: string, kbContext: string): Promise<Message> => {
    const today = new Date().toISOString().split("T")[0];
    const prompt = `Parse this into calendar event details. Today is ${today}. Return ONLY valid JSON.

REQUEST: "${input}"

${kbContext ? `Context:\n${kbContext}\n` : ""}

Return ONLY this JSON:
{
  "title": "event title",
  "date": "YYYY-MM-DD",
  "time": "HH:MM or like '2pm'",
  "duration": "like '1 hour'",
  "description": "additional details",
  "explanation": "brief friendly confirmation"
}`;

    const result = await openaiService.generateResponse(prompt, { skipPersonality: true });
    const cleanResult = cleanJsonResponse(result);
    const parsed = JSON.parse(cleanResult);

    return {
      id: `msg_${Date.now()}`,
      role: "assistant",
      content: parsed.explanation || "Got it! Here's the event:",
      timestamp: new Date(),
      type: "calendar",
      metadata: {
        calendarEvent: {
          title: parsed.title || "Event",
          date: parsed.date || today,
          time: parsed.time || "12:00",
          duration: parsed.duration || "1 hour",
          description: parsed.description,
        },
      },
    };
  };

  const handleAgentRequest = async (input: string, kbContext: string): Promise<Message> => {
    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, identity: 'brandon' })
      });

      if (!response.ok) {
        throw new Error('Failed to run agent request');
      }

      const data = await response.json();
      
      return {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: data.message || "I handled that with the agent!",
        timestamp: new Date(),
        type: "general"
      };
    } catch (err) {
      console.error(err);
      return {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: "I had trouble connecting to the backend agent tools.",
        timestamp: new Date(),
        type: "general"
      };
    }
  };

  const handleGeneralRequest = async (input: string, kbContext: string): Promise<Message> => {
    let response: string;
    let webSources: WebSearchResult[] = [];

    if (webSearchEnabled) {
      const result = await openaiService.generateWithWebResearch(input, kbContext || undefined);
      response = result.response;
      webSources = result.sources;
    } else {
      const prompt = kbContext
        ? `Context from your files:\n${kbContext}\n\nQuestion: ${input}`
        : input;
      response = await openaiService.generateResponse(prompt);
    }

    // Save to KB if substantial
    if (input.length > 20 && response.length > 50) {
      addAIConversation(input, response, webSources.length > 0 ? ["Web Research"] : []);
    }

    return {
      id: `msg_${Date.now()}`,
      role: "assistant",
      content: response,
      timestamp: new Date(),
      type: "general",
      metadata: { webSources },
    };
  };

  const handleSocialRequest = async (input: string): Promise<Message> => {
    const lower = input.toLowerCase();

    // Detect platform
    let platform = "facebook";
    if (lower.includes("instagram")) platform = "instagram";
    else if (lower.includes("linkedin")) platform = "linkedin";

    // Extract the message content (everything after the platform mention)
    const messageMatch = input.match(/(?:post|share|publish)\s+(?:to|on)\s+\w+[:\s]+(.+)/i);
    const postMessage = messageMatch ? messageMatch[1].trim() : input;

    // First check if we have a connection for this platform
    try {
      const integrationsRes = await fetch("/api/pica-integrations");
      const integrationsData = await integrationsRes.json();
      const integrations = integrationsData.integrations || [];
      const connection = integrations.find(
        (i: { platform: string }) => i.platform.toLowerCase() === platform.toLowerCase()
      );

      if (!connection) {
        return {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: `You don't have ${platform} connected yet! Head over to the Integrations tab to connect it first, then come back and try again.`,
          timestamp: new Date(),
          type: "social",
          metadata: {
            socialPost: {
              platform,
              message: postMessage,
              success: false,
              error: "Not connected",
            },
          },
        };
      }

      const res = await fetch("/api/pica-post-social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          message: postMessage,
          connectionId: connection._id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        return {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: `Posted to ${platform} successfully!`,
          timestamp: new Date(),
          type: "social",
          metadata: {
            socialPost: { platform, message: postMessage, success: true },
          },
        };
      } else {
        return {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: `Had trouble posting to ${platform}: ${data.error || "Unknown error"}. You might need to reconnect in the Integrations tab.`,
          timestamp: new Date(),
          type: "social",
          metadata: {
            socialPost: {
              platform,
              message: postMessage,
              success: false,
              error: data.error,
            },
          },
        };
      }
    } catch (error) {
      console.error("Social post error:", error);
      return {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: "Something went wrong trying to post. Check the Integrations tab and try again.",
        timestamp: new Date(),
        type: "social",
        metadata: {
          socialPost: {
            platform,
            message: postMessage,
            success: false,
            error: "Request failed",
          },
        },
      };
    }
  };

  const cleanJsonResponse = (result: string): string => {
    let clean = result.trim();
    if (clean.startsWith("```json")) clean = clean.slice(7);
    else if (clean.startsWith("```")) clean = clean.slice(3);
    if (clean.endsWith("```")) clean = clean.slice(0, -3);
    return clean.trim();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Chat cleared!");
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const handleSaveEmail = (message: Message) => {
    if (message.metadata?.emailSubject && message.metadata?.emailBody) {
      addEmail(message.metadata.emailSubject, {
        subject: message.metadata.emailSubject,
        body: message.metadata.emailBody,
        formality: "casual professional",
        prompt: "",
      });
      updateMessageMetadata(message.id, { savedToKB: true });
      toast.success("Email saved to Knowledge Base!");
    }
  };

  const handleSaveRewrite = (message: Message) => {
    if (message.metadata?.rewrittenText) {
      addRewrittenText(`Rewritten - ${new Date().toLocaleDateString()}`, {
        originalText: message.metadata.originalText || "",
        rewrittenText: message.metadata.rewrittenText,
        audience: "Professional",
      });
      updateMessageMetadata(message.id, { savedToKB: true });
      toast.success("Saved to Knowledge Base!");
    }
  };

  const handleSaveCalendar = (message: Message) => {
    if (message.metadata?.calendarEvent) {
      addCalendarEvent({
        ...message.metadata.calendarEvent,
        originalInput: "",
      });
      updateMessageMetadata(message.id, { savedToKB: true });
      toast.success("Event saved to Knowledge Base!");
    }
  };

  const updateMessageMetadata = (messageId: string, updates: Partial<Message["metadata"]>) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, metadata: { ...m.metadata, ...updates } } : m
      )
    );
  };

  const handleOpenInGmail = (subject: string, body: string) => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, "_blank");
  };

  const handleAddToGoogleCalendar = (event: Message["metadata"]["calendarEvent"]) => {
    if (!event) return;
    try {
      const startDate = new Date(`${event.date}T${event.time.includes(":") ? event.time : "12:00"}`);
      const durationMatch = event.duration.match(/(\d+)\s*h/i);
      const durationHours = durationMatch ? parseInt(durationMatch[1]) : 1;
      const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

      const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      const params = new URLSearchParams({
        action: "TEMPLATE",
        text: event.title,
        dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
        details: event.description || "",
      });

      window.open(`https://calendar.google.com/calendar/render?${params}`, "_blank");
    } catch {
      toast.error("Couldn't open Google Calendar");
    }
  };

  const handleDownloadICS = (event: Message["metadata"]["calendarEvent"]) => {
    if (!event) return;
    try {
      const startDate = new Date(`${event.date}T${event.time.includes(":") ? event.time : "12:00"}`);
      const durationMatch = event.duration.match(/(\d+)\s*h/i);
      const durationHours = durationMatch ? parseInt(durationMatch[1]) : 1;
      const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

      const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:${Date.now()}@assistant
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ""}
END:VEVENT
END:VCALENDAR`;

      const blob = new Blob([ics], { type: "text/calendar" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${event.title.replace(/[^a-z0-9]/gi, "_")}.ics`;
      link.click();
      toast.success("Calendar file downloaded!");
    } catch {
      toast.error("Couldn't create calendar file");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-primary" />
            <Badge variant="secondary" className="text-xs">{stats.total} KB entries</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Globe size={16} className={webSearchEnabled ? "text-green-500" : "text-muted-foreground"} />
            <span className="text-xs">Web</span>
            <Switch checked={webSearchEnabled} onCheckedChange={setWebSearchEnabled} className="scale-75" />
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearChat} className="text-xs">
            <Trash size={14} className="mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ChatCircleDots size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Hey! What can I help you with?</p>
            <p className="text-sm">
              I can write emails, rewrite text professionally, schedule events, or just chat.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setInputText("Write an email to my boss about...")}>
                <EnvelopeSimple size={12} className="mr-1" /> Write email
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setInputText("Rewrite this professionally: ")}>
                <ArrowsClockwise size={12} className="mr-1" /> Rewrite text
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setInputText("Schedule a meeting for...")}>
                <CalendarPlus size={12} className="mr-1" /> Schedule event
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setInputText("Post to LinkedIn: ")}>
                <ShareNetwork size={12} className="mr-1" /> Post to social
              </Badge>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Robot size={16} className="text-primary" />
                </div>
              )}

              <div className={`max-w-[80%] ${message.role === "user" ? "order-first" : ""}`}>
                <Card
                  className={`p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {/* Email Output */}
                  {message.type === "email" && message.metadata?.emailBody && (
                    <div className="mt-3 p-3 bg-background rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          <EnvelopeSimple size={12} className="mr-1" /> Email
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleCopy(`Subject: ${message.metadata?.emailSubject}\n\n${message.metadata?.emailBody}`)}
                          >
                            <Copy size={12} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleOpenInGmail(message.metadata?.emailSubject || "", message.metadata?.emailBody || "")}
                          >
                            <GoogleLogo size={12} />
                          </Button>
                          {!message.metadata?.savedToKB && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => handleSaveEmail(message)}
                            >
                              <Database size={12} />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs font-medium mb-1">Subject: {message.metadata.emailSubject}</p>
                      <p className="text-xs whitespace-pre-wrap">{message.metadata.emailBody}</p>
                    </div>
                  )}

                  {/* Rewrite Output */}
                  {message.type === "rewrite" && message.metadata?.rewrittenText && (
                    <div className="mt-3 p-3 bg-background rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          <ArrowsClockwise size={12} className="mr-1" /> Rewritten
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleCopy(message.metadata?.rewrittenText || "")}
                          >
                            <Copy size={12} />
                          </Button>
                          {!message.metadata?.savedToKB && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => handleSaveRewrite(message)}
                            >
                              <Database size={12} />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs whitespace-pre-wrap">{message.metadata.rewrittenText}</p>
                    </div>
                  )}

                  {/* Calendar Output */}
                  {message.type === "calendar" && message.metadata?.calendarEvent && (
                    <div className="mt-3 p-3 bg-background rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          <CalendarPlus size={12} className="mr-1" /> Event
                        </Badge>
                        <div className="flex gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                <CalendarPlus size={12} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleAddToGoogleCalendar(message.metadata?.calendarEvent)}>
                                <GoogleLogo className="mr-2" size={14} /> Google Calendar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadICS(message.metadata?.calendarEvent)}>
                                <DownloadSimple className="mr-2" size={14} /> Download .ics
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {!message.metadata?.savedToKB && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => handleSaveCalendar(message)}
                            >
                              <Database size={12} />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs space-y-1">
                        <p><strong>{message.metadata.calendarEvent.title}</strong></p>
                        <p>{message.metadata.calendarEvent.date} at {message.metadata.calendarEvent.time}</p>
                        <p className="text-muted-foreground">{message.metadata.calendarEvent.duration}</p>
                        {message.metadata.calendarEvent.description && (
                          <p className="text-muted-foreground">{message.metadata.calendarEvent.description}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Social Post Output */}
                  {message.type === "social" && message.metadata?.socialPost && (
                    <div className="mt-3 p-3 bg-background rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            message.metadata.socialPost.success
                              ? "text-green-600 border-green-200"
                              : "text-yellow-600 border-yellow-200"
                          }`}
                        >
                          <ShareNetwork size={12} className="mr-1" />
                          {message.metadata.socialPost.platform}
                        </Badge>
                      </div>
                      <p className="text-xs whitespace-pre-wrap">{message.metadata.socialPost.message}</p>
                    </div>
                  )}

                  {/* Web Sources */}
                  {message.metadata?.webSources && message.metadata.webSources.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <Link size={10} /> Sources
                      </p>
                      <div className="space-y-1">
                        {message.metadata.webSources.slice(0, 3).map((source, i) => (
                          <a
                            key={i}
                            href={source.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline block truncate"
                          >
                            {source.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
                <p className="text-xs text-muted-foreground mt-1 px-1">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-primary-foreground" />
                </div>
              )}
            </motion.div>
          ))
        )}

        {isProcessing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Robot size={16} className="text-primary" />
            </div>
            <Card className="p-3 bg-muted/50">
              <div className="flex items-center gap-2">
                <Lightning size={14} className="animate-pulse" />
                <span className="text-sm">Thinking...</span>
              </div>
            </Card>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t pt-4">
        <div className="flex gap-2">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything, write an email, rewrite text, or schedule an event..."
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isProcessing}
          />
          <Button
            onClick={handleSend}
            disabled={!inputText.trim() || isProcessing}
            className="h-auto px-4"
            style={{ backgroundColor: "var(--teal-accent, #0d9488)" }}
          >
            <PaperPlaneTilt size={20} weight="fill" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
