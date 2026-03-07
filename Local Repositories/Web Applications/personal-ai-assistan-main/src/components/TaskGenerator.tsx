import { useState } from 'react'
import { CheckSquare, Copy, Lightning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface Task {
  task: string
  owner: string
  dueDate: string
  priority: 'High' | 'Med' | 'Low'
  rationale: string
}

export function TaskGenerator() {
  const [inputText, setInputText] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      toast.error('Please provide note, email, or timeline content')
      return
    }

    setIsProcessing(true)
    try {
      const prompt = spark.llmPrompt`You are an expert at identifying follow-up tasks from case documentation. Generate actionable follow-up tasks from this content:

"${inputText}"

For each task, provide:
- Task (clear, actionable description)
- Owner (person responsible, or "TBD" if not clear)
- Due Date (specific date if mentioned, or reasonable estimate like "Within 24 hours", "End of week", "TBD")
- Priority (High/Med/Low based on urgency and impact)
- Rationale (one line explaining why this task matters)

Return as JSON:
{
  "tasks": [
    {
      "task": "Contact DHHS caseworker to confirm visit schedule",
      "owner": "Brandon",
      "dueDate": "Within 24 hours",
      "priority": "High",
      "rationale": "Required for compliance with referral timeline"
    },
    ...
  ]
}`

      const result = await spark.llm(prompt, 'gpt-4o-mini', true)
      const parsed = JSON.parse(result)
      setTasks(parsed.tasks || [])
      toast.success(`Generated ${parsed.tasks?.length || 0} follow-up task(s)!`)
    } catch (error) {
      toast.error('Failed to generate tasks. Please try again.')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = () => {
    if (tasks.length === 0) return

    let text = '=== FOLLOW-UP TASKS ===\n\n'
    
    tasks.forEach((t, i) => {
      text += `${i + 1}. ${t.task}\n`
      text += `   Owner: ${t.owner}\n`
      text += `   Due: ${t.dueDate}\n`
      text += `   Priority: ${t.priority}\n`
      text += `   Rationale: ${t.rationale}\n\n`
    })

    navigator.clipboard.writeText(text)
    toast.success('Tasks copied to clipboard!')
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'Med':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'Low':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="task-input">Note / Email / Timeline Content</Label>
          <Textarea
            id="task-input"
            placeholder="Paste case note, email, or timeline here to generate follow-up tasks..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="min-h-[200px] resize-none font-mono text-sm"
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!inputText.trim() || isProcessing}
          className="w-full"
          style={{ backgroundColor: 'oklch(0.58 0.16 180)' }}
        >
          {isProcessing ? (
            <>
              <Lightning className="animate-pulse" />
              Generating Tasks...
            </>
          ) : (
            <>
              <CheckSquare />
              Generate Follow-Up Tasks
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {tasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-4 space-y-4" style={{ borderLeft: '4px solid oklch(0.58 0.16 180)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">Follow-Up Tasks</h4>
                  <Badge variant="secondary">{tasks.length} task{tasks.length > 1 ? 's' : ''}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy />
                  Copy All
                </Button>
              </div>

              <div className="space-y-4">
                {tasks.map((task, i) => (
                  <Card key={i} className="p-4 bg-muted/50">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-medium mb-2">{task.task}</div>
                          <div className="flex flex-wrap gap-2 text-sm">
                            <Badge variant="outline" className={getPriorityColor(task.priority)}>
                              {task.priority} Priority
                            </Badge>
                            <Badge variant="outline">
                              Owner: {task.owner}
                            </Badge>
                            <Badge variant="outline">
                              Due: {task.dueDate}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground border-l-2 border-primary pl-3">
                        <span className="font-medium">Why: </span>
                        {task.rationale}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
