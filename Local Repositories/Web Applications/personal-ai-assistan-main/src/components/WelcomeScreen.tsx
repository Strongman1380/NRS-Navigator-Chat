import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChatCircleDots, Database, Table, EnvelopeSimple, ArrowsClockwise, CalendarPlus, Globe, Brain } from '@phosphor-icons/react'
import { useKnowledgeBase } from '@/hooks/use-knowledge-base'

export function WelcomeScreen() {
  const { stats } = useKnowledgeBase();

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge className="bg-green-100 text-green-800 border-green-300 px-3 py-1">
          Ready
        </Badge>
        {stats.total > 0 && (
          <Badge variant="secondary">
            {stats.total} items in Knowledge Base
          </Badge>
        )}
      </div>

      {/* Main Chat Feature */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ChatCircleDots size={28} className="text-primary" weight="duotone" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">One Chat for Everything</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Just chat naturally. I'll figure out what you need and help with:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <EnvelopeSimple size={16} className="text-primary" />
                <span>Writing emails</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ArrowsClockwise size={16} className="text-primary" />
                <span>Rewriting text</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CalendarPlus size={16} className="text-primary" />
                <span>Scheduling events</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Globe size={20} className="text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Web Research</h4>
              <p className="text-xs text-muted-foreground">
                I can search the web to find answers and include sources in my responses.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Brain size={20} className="text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Memory</h4>
              <p className="text-xs text-muted-foreground">
                Your chat history persists. Come back anytime and pick up where you left off.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Database size={20} className="text-teal-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Knowledge Base</h4>
              <p className="text-xs text-muted-foreground">
                Save emails, events, and rewrites. I'll reference them in future conversations.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Table size={20} className="text-orange-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Data Extractor</h4>
              <p className="text-xs text-muted-foreground">
                Upload PDFs or paste documents to extract structured data into your knowledge base.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Examples */}
      <Card className="p-4 bg-muted/50">
        <h4 className="font-semibold text-sm mb-3">Try saying...</h4>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>"Write an email to my boss about taking Friday off"</p>
          <p>"Rewrite this professionally: hey can u send me that doc asap thx"</p>
          <p>"Schedule a team meeting for next Tuesday at 2pm"</p>
          <p>"What's the weather like in New York today?"</p>
        </div>
      </Card>
    </div>
  )
}
