import { useState } from 'react'
import { ShieldCheck, Copy, Lightning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface ComplianceReport {
  issuesFound: string[]
  suggestedFixes: string[]
  revisedVersion?: string
}

export function ComplianceChecker() {
  const [draftText, setDraftText] = useState('')
  const [report, setReport] = useState<ComplianceReport | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [includeRevision, setIncludeRevision] = useState(false)

  const handleCheck = async () => {
    if (!draftText.trim()) {
      toast.error('Please provide text to review')
      return
    }

    setIsProcessing(true)
    try {
      const prompt = spark.llmPrompt`You are a compliance expert for human services documentation. Review the following draft for audit readiness.

Draft to review:
"${draftText}"

Check for:
1. Missing required elements: time, location, participants, intervention, outcome, safety notes, next steps
2. Risky language: subjective words, accusatory tone, diagnoses, speculation, emotional language
3. Internal inconsistencies: conflicting dates, unit counts, frequencies, authorization details

Return as JSON:
{
  "issuesFound": ["list of specific issues with examples from text"],
  "suggestedFixes": ["actionable fixes for each issue"],
  ${includeRevision ? '"revisedVersion": "complete rewritten version that is audit-ready, objective, and factual"' : ''}
}`

      const result = await spark.llm(prompt, 'gpt-4o-mini', true)
      const parsed = JSON.parse(result)
      setReport(parsed)
      
      if (parsed.issuesFound.length === 0) {
        toast.success('No compliance issues found!')
      } else {
        toast.warning(`Found ${parsed.issuesFound.length} issue(s) to address`)
      }
    } catch (error) {
      toast.error('Failed to check compliance. Please try again.')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="draft-text">Draft Note / Email / Report</Label>
          <Textarea
            id="draft-text"
            placeholder="Paste your draft case note, email, or report here for compliance review..."
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            className="min-h-[240px] resize-none font-mono text-sm"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="include-revision"
              checked={includeRevision}
              onChange={(e) => setIncludeRevision(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="include-revision" className="text-sm text-muted-foreground cursor-pointer">
              Include revised audit-ready version
            </label>
          </div>
        </div>

        <Button
          onClick={handleCheck}
          disabled={!draftText.trim() || isProcessing}
          className="w-full"
          style={{ backgroundColor: 'oklch(0.60 0.14 50)' }}
        >
          {isProcessing ? (
            <>
              <Lightning className="animate-pulse" />
              Checking Compliance...
            </>
          ) : (
            <>
              <ShieldCheck />
              Check Compliance
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {report && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <Card className="p-4 space-y-4" style={{ borderLeft: '4px solid oklch(0.60 0.14 50)' }}>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Compliance Report</h4>
                {report.issuesFound.length === 0 ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    ✓ Audit-Ready
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {report.issuesFound.length} Issue{report.issuesFound.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {report.issuesFound.length > 0 && (
                <>
                  <div>
                    <h5 className="text-sm font-semibold mb-2 text-red-600">Issues Found:</h5>
                    <ul className="space-y-2 text-sm">
                      {report.issuesFound.map((issue, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-red-500 font-bold">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="h-px bg-border" />

                  <div>
                    <h5 className="text-sm font-semibold mb-2 text-blue-600">Suggested Fixes:</h5>
                    <ul className="space-y-2 text-sm">
                      {report.suggestedFixes.map((fix, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-blue-500 font-bold">→</span>
                          <span>{fix}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {report.issuesFound.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  This document meets audit-ready standards. No compliance issues detected.
                </p>
              )}
            </Card>

            {report.revisedVersion && (
              <Card className="p-4 space-y-3" style={{ borderLeft: '4px solid oklch(0.70 0.15 140)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Revised Version</Badge>
                    <span className="text-sm text-muted-foreground">Audit-Ready</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(report.revisedVersion!)}>
                    <Copy />
                    Copy
                  </Button>
                </div>
                <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap bg-muted p-4 rounded">
                  {report.revisedVersion}
                </div>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
