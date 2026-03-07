import { useState, useRef } from 'react'
import { Table, Copy, Lightning, DownloadSimple, FilePdf, X, Database, Check } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { openaiService } from "@/services/openai-service";
import { extractTextFromPDF } from "@/utils/pdf-utils";
import { useKnowledgeBase } from "@/hooks/use-knowledge-base";
import type { ExtractedDataMetadata } from "@/services/knowledge-base-service";

interface ExtractedData {
  people: Array<{ name: string; role: string }>
  caseIdentifiers: Array<{ field: string; value: string }>
  dates: Array<{ type: string; date: string }>
  serviceRequirements: Array<{ requirement: string; details: string }>
  contacts: Array<{ name: string; phone?: string; email?: string }>
}

export function DataExtractor() {
  const [documentText, setDocumentText] = useState('')
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [savedToKB, setSavedToKB] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { addExtractedData } = useKnowledgeBase();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file')
      return
    }

    setUploadedFile(file)
    setIsExtracting(true)
    setSavedToKB(false)

    try {
      const fullText = await extractTextFromPDF(file);
      setDocumentText(fullText.trim())
      toast.success(`Extracted text from ${file.name}`)
    } catch (error) {
      console.error('PDF extraction error:', error)
      toast.error('Failed to extract text from PDF. Please try a different PDF file.')
      setUploadedFile(null)
    } finally {
      setIsExtracting(false)
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    setDocumentText('')
    setSavedToKB(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleExtract = async () => {
    if (!documentText.trim()) {
      toast.error('Please provide document text to extract')
      return
    }

    setIsProcessing(true)
    setSavedToKB(false)
    try {
      const prompt = `Extract structured data from this document. Return ONLY valid JSON, no markdown, no explanation.

DOCUMENT:
"""
${documentText}
"""

Extract into these categories (use empty arrays [] if nothing found):
- people: names and roles (caseworker, parent, child, supervisor, etc.)
- caseIdentifiers: case numbers, referral types, service codes
- dates: start dates, end dates, deadlines, hearing dates
- serviceRequirements: frequency, conditions, visit types
- contacts: names with phone numbers and emails

IMPORTANT: Return ONLY the JSON object, no other text. Do not include \`\`\`json or any markdown.

{
  "people": [{"name": "string", "role": "string"}],
  "caseIdentifiers": [{"field": "string", "value": "string"}],
  "dates": [{"type": "string", "date": "string"}],
  "serviceRequirements": [{"requirement": "string", "details": "string"}],
  "contacts": [{"name": "string", "phone": "string", "email": "string"}]
}`

      const result = await openaiService.generateResponse(prompt, { skipPersonality: true });

      // Clean up response - remove any markdown code blocks if present
      let cleanResult = result.trim();
      if (cleanResult.startsWith('```json')) {
        cleanResult = cleanResult.slice(7);
      } else if (cleanResult.startsWith('```')) {
        cleanResult = cleanResult.slice(3);
      }
      if (cleanResult.endsWith('```')) {
        cleanResult = cleanResult.slice(0, -3);
      }
      cleanResult = cleanResult.trim();

      const parsed = JSON.parse(cleanResult)

      // Ensure all arrays exist
      const safeData: ExtractedData = {
        people: parsed.people || [],
        caseIdentifiers: parsed.caseIdentifiers || [],
        dates: parsed.dates || [],
        serviceRequirements: parsed.serviceRequirements || [],
        contacts: parsed.contacts || []
      };

      setExtractedData(safeData)
      toast.success('Data extracted successfully!')
    } catch (error) {
      toast.error('Failed to extract data. Please try again.')
      console.error('Extraction error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveToKnowledgeBase = () => {
    if (!extractedData) return;

    const title = uploadedFile
      ? `Extracted: ${uploadedFile.name.replace(/\.[^/.]+$/, "")}`
      : `Extracted Data - ${new Date().toLocaleDateString()}`;

    const metadata: ExtractedDataMetadata = {
      ...extractedData,
      originalText: documentText.substring(0, 500) + (documentText.length > 500 ? '...' : '')
    };

    // Generate tags from extracted data
    const tags: string[] = [];
    if (extractedData.caseIdentifiers.length > 0) {
      extractedData.caseIdentifiers.forEach(c => {
        if (c.value) tags.push(c.value);
      });
    }
    if (extractedData.people.length > 0) {
      extractedData.people.forEach(p => {
        if (p.role) tags.push(p.role);
      });
    }

    addExtractedData(title, metadata, tags.slice(0, 5));
    setSavedToKB(true);
    toast.success('Data saved to Knowledge Base!');
  };

  const handleCopyTable = () => {
    if (!extractedData) return

    let tableText = 'EXTRACTED DATA\n\n'

    tableText += '=== PEOPLE ===\n'
    extractedData.people.forEach(p => tableText += `${p.name} - ${p.role}\n`)

    tableText += '\n=== CASE IDENTIFIERS ===\n'
    extractedData.caseIdentifiers.forEach(c => tableText += `${c.field}: ${c.value}\n`)

    tableText += '\n=== DATES ===\n'
    extractedData.dates.forEach(d => tableText += `${d.type}: ${d.date}\n`)

    tableText += '\n=== SERVICE REQUIREMENTS ===\n'
    extractedData.serviceRequirements.forEach(s => tableText += `${s.requirement}: ${s.details}\n`)

    tableText += '\n=== CONTACTS ===\n'
    extractedData.contacts.forEach(c => {
      tableText += `${c.name}`
      if (c.phone) tableText += ` | ${c.phone}`
      if (c.email) tableText += ` | ${c.email}`
      tableText += '\n'
    })

    navigator.clipboard.writeText(tableText)
    toast.success('Table copied to clipboard!')
  }

  const handleCopyJSON = () => {
    if (!extractedData) return
    const jsonText = JSON.stringify(extractedData, null, 2)
    navigator.clipboard.writeText(jsonText)
    toast.success('JSON copied to clipboard!')
  }

  const handleDownloadJSON = () => {
    if (!extractedData) return
    const jsonText = JSON.stringify(extractedData, null, 2)
    const blob = new Blob([jsonText], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `extracted_data_${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
    toast.success('JSON file downloaded!')
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-3">
          <Label>Upload PDF Document</Label>
          <div className="flex flex-col gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="pdf-upload"
            />
            <label htmlFor="pdf-upload">
              <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 transition-colors cursor-pointer bg-muted/20">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="p-3 rounded-full bg-primary/10">
                    <FilePdf size={32} className="text-primary" weight="duotone" />
                  </div>
                  <div>
                    <p className="font-medium">Click to upload PDF</p>
                    <p className="text-xs text-muted-foreground">
                      Upload referrals, court orders, or case documents
                    </p>
                  </div>
                </div>
              </div>
            </label>

            {uploadedFile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg"
              >
                <FilePdf size={24} className="text-primary" weight="fill" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  disabled={isExtracting}
                >
                  <X size={18} />
                </Button>
              </motion.div>
            )}

            {isExtracting && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lightning className="animate-pulse" size={18} />
                <span>Extracting text from PDF...</span>
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or paste text</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="document-text">Document Text</Label>
          <Textarea
            id="document-text"
            placeholder="Paste referral, court order, email thread, or extracted PDF text here..."
            value={documentText}
            onChange={(e) => {
              setDocumentText(e.target.value);
              setSavedToKB(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && documentText.trim()) {
                e.preventDefault();
                handleExtract();
              }
            }}
            className="min-h-[200px] resize-none font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Text will auto-populate from uploaded PDF or paste directly
          </p>
        </div>

        <Button
          onClick={handleExtract}
          disabled={!documentText.trim() || isProcessing}
          className="w-full"
          style={{ backgroundColor: 'oklch(0.55 0.12 280)' }}
        >
          {isProcessing ? (
            <>
              <Lightning className="animate-pulse" />
              Extracting Data...
            </>
          ) : (
            <>
              <Table />
              Extract Structured Data
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {extractedData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-4 space-y-4" style={{ borderLeft: '4px solid oklch(0.55 0.12 280)' }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'json')} className="w-auto">
                  <TabsList>
                    <TabsTrigger value="table">Table View</TabsTrigger>
                    <TabsTrigger value="json">JSON View</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={savedToKB ? "secondary" : "default"}
                    size="sm"
                    onClick={handleSaveToKnowledgeBase}
                    disabled={savedToKB}
                    style={!savedToKB ? { backgroundColor: 'var(--teal-accent, #0d9488)' } : undefined}
                  >
                    {savedToKB ? (
                      <>
                        <Check />
                        Saved to KB
                      </>
                    ) : (
                      <>
                        <Database />
                        Save to Knowledge Base
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={viewMode === 'table' ? handleCopyTable : handleCopyJSON}>
                    <Copy />
                    Copy
                  </Button>
                  {viewMode === 'json' && (
                    <Button variant="ghost" size="sm" onClick={handleDownloadJSON}>
                      <DownloadSimple />
                      Download
                    </Button>
                  )}
                </div>
              </div>

              {viewMode === 'table' ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="outline">People</Badge>
                      <span className="text-sm text-muted-foreground">({extractedData.people.length})</span>
                    </h4>
                    <div className="space-y-1 text-sm">
                      {extractedData.people.map((p, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground">—</span>
                          <span>{p.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="outline">Case Identifiers</Badge>
                      <span className="text-sm text-muted-foreground">({extractedData.caseIdentifiers.length})</span>
                    </h4>
                    <div className="space-y-1 text-sm">
                      {extractedData.caseIdentifiers.map((c, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="font-medium">{c.field}:</span>
                          <span>{c.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="outline">Dates</Badge>
                      <span className="text-sm text-muted-foreground">({extractedData.dates.length})</span>
                    </h4>
                    <div className="space-y-1 text-sm">
                      {extractedData.dates.map((d, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="font-medium">{d.type}:</span>
                          <span>{d.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="outline">Service Requirements</Badge>
                      <span className="text-sm text-muted-foreground">({extractedData.serviceRequirements.length})</span>
                    </h4>
                    <div className="space-y-2 text-sm">
                      {extractedData.serviceRequirements.map((s, i) => (
                        <div key={i}>
                          <div className="font-medium">{s.requirement}</div>
                          <div className="text-muted-foreground pl-4">{s.details}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="outline">Contacts</Badge>
                      <span className="text-sm text-muted-foreground">({extractedData.contacts.length})</span>
                    </h4>
                    <div className="space-y-2 text-sm">
                      {extractedData.contacts.map((c, i) => (
                        <div key={i}>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-muted-foreground pl-4">
                            {c.phone && <div>Phone: {c.phone}</div>}
                            {c.email && <div>Email: {c.email}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <pre className="text-xs font-mono bg-muted p-4 rounded overflow-x-auto">
                  {JSON.stringify(extractedData, null, 2)}
                </pre>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
