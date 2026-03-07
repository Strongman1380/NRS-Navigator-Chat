import { Card } from '@/components/ui/card'
import { ChatCircleDots, House, Database, Table, Plugs, HardDrive } from '@phosphor-icons/react'
import { Toaster } from '@/components/ui/sonner'
import { UnifiedChat } from '@/components/UnifiedChat'
import { KnowledgeBase } from '@/components/KnowledgeBase'
import { DataExtractor } from '@/components/DataExtractor'
import { WelcomeScreen } from '@/components/WelcomeScreen'
import { PicaIntegrations } from '@/components/PicaIntegrations'
import { DriveBrowser } from '@/components/DriveBrowser'
import { useState } from 'react'

function App() {
  const [activeTab, setActiveTab] = useState('chat')

  const tools = [
    { id: 'welcome', label: 'Welcome', icon: House, component: WelcomeScreen, description: 'Overview and quick start' },
    { id: 'chat', label: 'Chat', icon: ChatCircleDots, component: UnifiedChat, description: 'Your AI assistant for emails, rewrites, scheduling & more' },
    { id: 'drive', label: 'Drive', icon: HardDrive, component: DriveBrowser, description: 'Browse and ingest Google Drive documents' },
    { id: 'knowledge', label: 'Knowledge Base', icon: Database, component: KnowledgeBase, description: 'Browse and manage your stored information' },
    { id: 'extractor', label: 'Data Extractor', icon: Table, component: DataExtractor, description: 'Extract structured data from documents' },
    { id: 'integrations', label: 'Integrations', icon: Plugs, component: PicaIntegrations, description: 'Connect and manage third-party integrations' },
  ]

  const activeTool = tools.find(t => t.id === activeTab)

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <header className="mb-6">
          <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight mb-1">
            Brandon's Assistant
          </h1>
          <p className="text-muted-foreground text-sm">
            Your AI-powered productivity companion
          </p>
        </header>

        {/* Tab Navigation */}
        <nav className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {tools.map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTab(tool.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tool.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <Icon weight="duotone" size={18} />
                <span className="text-sm font-medium">{tool.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Main Content */}
        <main>
          <Card className="p-6">
            {activeTool && (
              <>
                {activeTab !== 'welcome' && activeTab !== 'chat' && (
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold tracking-tight mb-1 flex items-center gap-2">
                      <activeTool.icon weight="duotone" size={24} />
                      {activeTool.label}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {activeTool.description}
                    </p>
                  </div>
                )}
                <activeTool.component />
              </>
            )}
          </Card>
        </main>
      </div>
      <Toaster />
    </div>
  )
}

export default App
