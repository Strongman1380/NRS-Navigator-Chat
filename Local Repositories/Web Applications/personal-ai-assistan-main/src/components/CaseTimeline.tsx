import { useState } from 'react'
import { ClockCounterClockwise, Copy, Lightning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface TimelineEvent {
  date: string
  event: string
  category: 'incident' | 'milestone' | 'compliance' | 'routine'
}

interface Timeline {
  events: TimelineEvent[]
  narrative: string
}

export function CaseTimeline() {
  const [inputText, setInputText] = useState('')
  const [timeline, setTimeline] = useState<Timeline | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleBuild = async () => {
    if (!inputText.trim()) {
      toast.error('Please provide dated case entries')
      return
    }

    setIsProcessing(true)
    try {
      const prompt = spark.llmPrompt`You are an expert at building chronological timelines from case notes. Create a court-ready timeline from the following dated entries:

"${inputText}"

Build a chronological timeline that:
1. Sorts all events by date (earliest to latest)
2. Categorizes each as: incident, milestone, compliance, or routine
3. Highlights key turning points without inferring causation
4. Links events factually without speculation

Return as JSON:
{
  "events": [
    {"date": "2024-01-15", "event": "Initial referral received from DHHS", "category": "milestone"},
    {"date": "2024-01-20", "event": "First supervised visit completed", "category": "compliance"},
    ...
  ],
  "narrative": "A brief chronological narrative summary suitable for court (3-5 sentences, objective and factual)"
}`

      const result = await spark.llm(prompt, 'gpt-4o-mini', true)
      const parsed = JSON.parse(result)
      setTimeline(parsed)
      toast.success('Timeline built successfully!')
    } catch (error) {
      toast.error('Failed to build timeline. Please try again.')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = () => {
    if (!timeline) return

    let text = '=== CASE TIMELINE ===\n\n'
    
    timeline.events.forEach((e) => {
      const icon = e.category === 'incident' ? '⚠️' : 
                   e.category === 'milestone' ? '📍' : 
                   e.category === 'compliance' ? '✅' : '•'
      text += `${e.date} ${icon} ${e.event}\n`
    })
    
    text += '\n=== NARRATIVE SUMMARY ===\n'
    text += timeline.narrative

    navigator.clipboard.writeText(text)
    toast.success('Timeline copied to clipboard!')
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'incident':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'milestone':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'compliance':
        return 'bg-green-50 text-green-700 border-green-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="timeline-input">Dated Case Entries</Label>
          <Textarea
            id="timeline-input"
            placeholder="Paste multiple dated case notes or events here (e.g., '1/15/24 - Initial referral received...')..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="min-h-[240px] resize-none font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Include dates with each entry for accurate timeline building
          </p>
        </div>

        <Button
          onClick={handleBuild}
          disabled={!inputText.trim() || isProcessing}
          className="w-full"
          style={{ backgroundColor: 'oklch(0.45 0.12 260)' }}
        >
          {isProcessing ? (
            <>
              <Lightning className="animate-pulse" />
              Building Timeline...
            </>
          ) : (
            <>
              <ClockCounterClockwise />
              Build Case Timeline
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {timeline && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-4 space-y-4" style={{ borderLeft: '4px solid oklch(0.45 0.12 260)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">Case Timeline</h4>
                  <Badge variant="secondary">{timeline.events.length} events</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy />
                  Copy
                </Button>
              </div>

              <div className="space-y-3">
                {timeline.events.map((event, i) => (
                  <div key={i} className="flex gap-3 group">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full border-2 border-primary bg-background mt-1.5" />
                      {i < timeline.events.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-start gap-2 mb-1">
                        <Badge variant="outline" className={`text-xs ${getCategoryColor(event.category)}`}>
                          {event.category}
                        </Badge>
                        <span className="text-sm font-mono text-muted-foreground">{event.date}</span>
                      </div>
                      <p className="text-sm">{event.event}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="h-px bg-border" />

              <div>
                <h5 className="text-sm font-semibold mb-2">Narrative Summary</h5>
                <div className="text-sm leading-relaxed bg-muted p-4 rounded">
                  {timeline.narrative}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Court-ready chronological summary
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
