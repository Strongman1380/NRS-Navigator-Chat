import { useState } from 'react'
import { ListChecks, Copy, Lightning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface Summary {
  decisionsMade: string[]
  openQuestions: string[]
  actionItems: Array<{ task: string; owner?: string; dueDate?: string }>
  keyRisks: string[]
}

export function DecisionSummary() {
  const [inputText, setInputText] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSummarize = async () => {
    if (!inputText.trim()) {
      toast.error('Please provide meeting notes or email thread')
      return
    }

    setIsProcessing(true)
    try {
      const prompt = spark.llmPrompt`You are an expert at extracting structured decision summaries from meeting notes and email threads.

Analyze the following content:
"${inputText}"

Extract:
1. Decisions Made - concrete decisions that were finalized
2. Open Questions - unresolved issues or questions pending answers
3. Action Items - specific tasks with owner and due date if mentioned
4. Key Risks / Watch Items - potential problems or concerns to monitor

Return as JSON:
{
  "decisionsMade": ["decision 1", "decision 2", ...],
  "openQuestions": ["question 1", "question 2", ...],
  "actionItems": [{"task": "task description", "owner": "person name or TBD", "dueDate": "date or TBD"}, ...],
  "keyRisks": ["risk 1", "risk 2", ...]
}`

      const result = await spark.llm(prompt, 'gpt-4o-mini', true)
      const parsed = JSON.parse(result)
      setSummary(parsed)
      toast.success('Summary generated successfully!')
    } catch (error) {
      toast.error('Failed to generate summary. Please try again.')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = () => {
    if (!summary) return

    let text = '=== DECISION SUMMARY ===\n\n'
    
    text += '📋 DECISIONS MADE:\n'
    summary.decisionsMade.forEach((d, i) => text += `${i + 1}. ${d}\n`)
    
    text += '\n❓ OPEN QUESTIONS:\n'
    summary.openQuestions.forEach((q, i) => text += `${i + 1}. ${q}\n`)
    
    text += '\n✅ ACTION ITEMS:\n'
    summary.actionItems.forEach((a, i) => {
      text += `${i + 1}. ${a.task}\n`
      if (a.owner) text += `   Owner: ${a.owner}\n`
      if (a.dueDate) text += `   Due: ${a.dueDate}\n`
    })
    
    text += '\n⚠️ KEY RISKS / WATCH ITEMS:\n'
    summary.keyRisks.forEach((r, i) => text += `${i + 1}. ${r}\n`)

    navigator.clipboard.writeText(text)
    toast.success('Summary copied to clipboard!')
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="input-text">Meeting Notes / Email Thread</Label>
          <Textarea
            id="input-text"
            placeholder="Paste meeting notes, email thread, or multi-note updates here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="min-h-[240px] resize-none font-mono text-sm"
          />
        </div>

        <Button
          onClick={handleSummarize}
          disabled={!inputText.trim() || isProcessing}
          className="w-full"
          style={{ backgroundColor: 'oklch(0.50 0.15 320)' }}
        >
          {isProcessing ? (
            <>
              <Lightning className="animate-pulse" />
              Generating Summary...
            </>
          ) : (
            <>
              <ListChecks />
              Generate Decision Summary
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-4 space-y-4" style={{ borderLeft: '4px solid oklch(0.50 0.15 320)' }}>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Decision Summary</h4>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy />
                  Copy
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Decisions Made
                    </Badge>
                    <span className="text-sm text-muted-foreground">({summary.decisionsMade.length})</span>
                  </div>
                  {summary.decisionsMade.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {summary.decisionsMade.map((d, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No decisions identified</p>
                  )}
                </div>

                <div className="h-px bg-border" />

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      Open Questions
                    </Badge>
                    <span className="text-sm text-muted-foreground">({summary.openQuestions.length})</span>
                  </div>
                  {summary.openQuestions.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {summary.openQuestions.map((q, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-amber-600 font-bold">?</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No open questions</p>
                  )}
                </div>

                <div className="h-px bg-border" />

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Action Items
                    </Badge>
                    <span className="text-sm text-muted-foreground">({summary.actionItems.length})</span>
                  </div>
                  {summary.actionItems.length > 0 ? (
                    <div className="space-y-3 text-sm">
                      {summary.actionItems.map((a, i) => (
                        <div key={i} className="border-l-2 border-blue-300 pl-3">
                          <div className="font-medium">{a.task}</div>
                          <div className="text-muted-foreground text-xs mt-1 space-x-3">
                            {a.owner && <span>Owner: {a.owner}</span>}
                            {a.dueDate && <span>Due: {a.dueDate}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No action items</p>
                  )}
                </div>

                <div className="h-px bg-border" />

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      Key Risks / Watch Items
                    </Badge>
                    <span className="text-sm text-muted-foreground">({summary.keyRisks.length})</span>
                  </div>
                  {summary.keyRisks.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {summary.keyRisks.map((r, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-red-600 font-bold">⚠</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No risks identified</p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
