import { useState } from 'react'
import { ShieldWarning, Copy, Lightning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface Risk {
  type: 'safety' | 'deadline' | 'noncompliance' | 'documentation'
  description: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  recommendation: string
}

export function RiskMonitor() {
  const [caseData, setCaseData] = useState('')
  const [risks, setRisks] = useState<Risk[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCheck = async () => {
    if (!caseData.trim()) {
      toast.error('Please provide case data to analyze')
      return
    }

    setIsProcessing(true)
    try {
      const prompt = spark.llmPrompt`You are an expert risk analyst for human services case management. Analyze the following case data for potential risks:

"${caseData}"

Flag:
1. Safety Concerns - potential harm to client, family, or staff
2. Deadline Risk - approaching or missed deadlines, authorization expirations
3. Noncompliance Indicators - missing requirements, skipped services, protocol violations
4. Documentation Gaps - missing info that could affect reimbursement or court credibility

For each risk:
- Type (safety, deadline, noncompliance, documentation)
- Description (specific issue with context)
- Severity (Critical, High, Medium, Low)
- Recommendation (specific action to mitigate)

Return as JSON:
{
  "risks": [
    {
      "type": "safety",
      "description": "Parent reported feeling overwhelmed during last visit",
      "severity": "High",
      "recommendation": "Schedule immediate check-in with caseworker; document in detail"
    },
    ...
  ]
}`

      const result = await spark.llm(prompt, 'gpt-4o-mini', true)
      const parsed = JSON.parse(result)
      setRisks(parsed.risks || [])
      
      const criticalCount = parsed.risks?.filter((r: Risk) => r.severity === 'Critical').length || 0
      if (criticalCount > 0) {
        toast.error(`${criticalCount} CRITICAL risk(s) identified!`)
      } else if (parsed.risks?.length > 0) {
        toast.warning(`${parsed.risks.length} risk(s) identified`)
      } else {
        toast.success('No significant risks detected')
      }
    } catch (error) {
      toast.error('Failed to check risks. Please try again.')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = () => {
    if (risks.length === 0) return

    let text = '=== RISK / ALERT MONITOR ===\n\n'
    
    const grouped = {
      Critical: risks.filter(r => r.severity === 'Critical'),
      High: risks.filter(r => r.severity === 'High'),
      Medium: risks.filter(r => r.severity === 'Medium'),
      Low: risks.filter(r => r.severity === 'Low'),
    }

    Object.entries(grouped).forEach(([severity, items]) => {
      if (items.length > 0) {
        text += `${severity.toUpperCase()} (${items.length}):\n`
        items.forEach((r, i) => {
          text += `${i + 1}. [${r.type.toUpperCase()}] ${r.description}\n`
          text += `   → ${r.recommendation}\n\n`
        })
      }
    })

    navigator.clipboard.writeText(text)
    toast.success('Risk report copied to clipboard!')
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'Low':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'safety':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'deadline':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'noncompliance':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'documentation':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="case-data">Case Data to Analyze</Label>
          <Textarea
            id="case-data"
            placeholder="Paste case notes, referral info, recent updates, or any case documentation here..."
            value={caseData}
            onChange={(e) => setCaseData(e.target.value)}
            className="min-h-[240px] resize-none font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            What should I watch for? Provide any case content for risk analysis.
          </p>
        </div>

        <Button
          onClick={handleCheck}
          disabled={!caseData.trim() || isProcessing}
          className="w-full"
          style={{ backgroundColor: 'oklch(0.52 0.18 20)' }}
        >
          {isProcessing ? (
            <>
              <Lightning className="animate-pulse" />
              Analyzing Risks...
            </>
          ) : (
            <>
              <ShieldWarning />
              Check Risks & Alerts
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {risks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-4 space-y-4" style={{ borderLeft: '4px solid oklch(0.52 0.18 20)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">Risk & Alert Monitor</h4>
                  <Badge variant="secondary">{risks.length} item{risks.length > 1 ? 's' : ''}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy />
                  Copy Report
                </Button>
              </div>

              <div className="space-y-3">
                {risks
                  .sort((a, b) => {
                    const severityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }
                    return severityOrder[a.severity] - severityOrder[b.severity]
                  })
                  .map((risk, i) => (
                    <Card key={i} className="p-4 bg-muted/50">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className={getSeverityColor(risk.severity)}>
                                {risk.severity}
                              </Badge>
                              <Badge variant="outline" className={getTypeColor(risk.type)}>
                                {risk.type}
                              </Badge>
                            </div>
                            <p className="font-medium">{risk.description}</p>
                          </div>
                        </div>
                        <div className="bg-background p-3 rounded border-l-2 border-primary">
                          <div className="text-sm">
                            <span className="font-semibold text-primary">Recommendation: </span>
                            {risk.recommendation}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Risks are prioritized by severity. Address Critical and High severity items immediately.
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
