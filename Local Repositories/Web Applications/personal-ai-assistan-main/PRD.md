# Planning Guide

Brandon's Ops & Compliance Copilot - A specialized AI assistant suite for human services environments handling case management, supervised visitation, DHHS coordination, documentation, and professional communication. The system helps Brandon and his team work faster, cleaner, and more defensibly while maintaining audit-ready documentation standards.

**Experience Qualities**: 
1. **Defensible** - All outputs are objective, factual, audit-ready, and aligned with Medicaid-style documentation norms
2. **Efficient** - Each tool delivers instant, structured results with minimal input while maintaining confidentiality and compliance
3. **Professional** - Calm, direct communication with clear structure, objective language, and no unnecessary complexity

**Complexity Level**: Complex Application (advanced functionality with multiple specialized views)
This app provides nine distinct compliance-focused tools with sophisticated workflows for case management, documentation quality control, timeline building, risk monitoring, and structured data extraction. Each module requires context-aware processing, multi-step validation, and compliance checking.

## Essential Features

### 1. Text Rewriter (Professional + Objective)
- **Functionality**: Converts rough case notes into clean, professional, audit-ready narrative while removing emotional/subjective language
- **Purpose**: Transform informal notes into defensible documentation that meets Medicaid-style standards
- **Trigger**: User pastes rough notes and optionally selects audience (internal/DHHS/court/parent)
- **Progression**: User inputs text → Selects audience → Clicks "Rewrite" → AI removes emotion, adds objectivity, maintains facts → Displays professional version with compliance flags
- **Success criteria**: Output is factual, neutral, time-stamped where provided, structured (who/what/when/where/intervention/outcome/next steps), with no fabricated details

### 2. Email Writer (Casual-Professional)
- **Functionality**: Drafts clear, respectful emails with direct asks, context, and next steps; integrates with Gmail and default email
- **Purpose**: Create professional but approachable correspondence for DHHS, courts, families, and team coordination
- **Trigger**: User describes email purpose and required elements
- **Progression**: User provides context → Clicks "Generate" → AI creates structured email → User reviews → Opens in Gmail or default client
- **Success criteria**: Email is direct, calm, professional (not overly formal), includes clear action items, preserves confidentiality

### 3. Calendar Parser
- **Functionality**: Extracts dates/times/locations/attendees from text and outputs scheduler-ready format
- **Purpose**: Quickly capture hearing dates, visit schedules, deadlines from referrals or emails
- **Trigger**: User pastes text containing event information
- **Progression**: User inputs text → Clicks "Parse" → AI extracts structured data → Displays editable fields → Exports to Google Calendar or .ics
- **Success criteria**: Accurately extracts event data, allows editing, integrates with calendar apps

### 4. Document → Structured Data Extractor
- **Functionality**: Parses referrals, court orders, email threads into structured fields (people, case IDs, dates, service requirements, contacts)
- **Purpose**: Transform dense documents into actionable, organized information for intake and case setup
- **Trigger**: User pastes document text (referral, court order, PDF text)
- **Progression**: User inputs document → Clicks "Extract" → AI identifies key fields → Outputs clean table or JSON → User copies or downloads
- **Success criteria**: Correctly identifies roles, dates, requirements, contacts; outputs in requested format (table/JSON)

### 5. Compliance Checker
- **Functionality**: Reviews notes/emails/reports for missing elements, risky language, and inconsistencies
- **Purpose**: Catch documentation gaps and problematic wording before submission to reduce audit risk
- **Trigger**: User pastes draft note or report and requests review
- **Progression**: User inputs draft → Clicks "Check Compliance" → AI flags issues (missing time, subjective language, date conflicts) → Lists suggested fixes → Optionally provides revised version
- **Success criteria**: Identifies missing required elements, flags subjective/accusatory/clinical language, catches internal inconsistencies

### 6. Decision Summary Generator
- **Functionality**: Analyzes meetings, email threads, or multi-note updates to extract decisions, open questions, action items, and risks
- **Purpose**: Create clear accountability and follow-through from complex communications
- **Trigger**: User pastes meeting notes or email thread
- **Progression**: User inputs content → Clicks "Summarize" → AI extracts structured summary → Displays decisions/questions/actions/risks
- **Success criteria**: Clear categorization, identifies owners and due dates where known, highlights key risks

### 7. Case Timeline Builder
- **Functionality**: Takes multiple dated entries and builds chronological timeline with key turning points and compliance milestones
- **Purpose**: Prepare court-ready chronologies and identify patterns without inferring causation
- **Trigger**: User pastes multiple dated case notes or events
- **Progression**: User inputs dated entries → Clicks "Build Timeline" → AI sorts chronologically → Highlights incidents and milestones → Outputs table + narrative
- **Success criteria**: Chronological accuracy, highlights key events, links without inferring causes, court-ready format

### 8. Follow-Up Task Generator
- **Functionality**: Automatically generates suggested follow-up tasks from notes/emails/timelines with priority and rationale
- **Purpose**: Ensure nothing falls through the cracks after documentation or communication
- **Trigger**: User completes any note/email/timeline and requests follow-ups
- **Progression**: User inputs content → Clicks "Generate Tasks" → AI suggests tasks with owner/due date/priority/rationale
- **Success criteria**: Actionable tasks, appropriate priority levels, clear rationale

### 9. Risk / Alert Monitor
- **Functionality**: On-demand analysis to flag safety concerns, deadline risks, noncompliance indicators, and documentation gaps
- **Purpose**: Proactive identification of issues that could affect reimbursement or court credibility
- **Trigger**: User asks "what should I watch for?" on any case content
- **Progression**: User inputs case data → Clicks "Check Risks" → AI identifies safety/deadline/compliance/documentation risks → Lists prioritized alerts
- **Success criteria**: Identifies actionable risks, prioritizes appropriately, provides specific context

## Edge Case Handling

- **Missing Information** - Ask targeted questions OR output assumptions explicitly labeled as "ASSUMPTION:"
- **Confidential Data** - Handle names/addresses minimally; never re-share beyond required output
- **API Failures** - Preserve user input; show clear error with retry option
- **Clinical/Legal Boundaries** - Flag when user requests diagnosis, treatment recommendations, or legal advice; redirect to appropriate resource
- **Fabrication Risk** - When info is insufficient, clearly mark assumptions rather than inventing facts
- **Date/Time Ambiguity** - Highlight uncertain fields and request clarification before proceeding
- **Incomplete Documents** - List missing required fields and allow user to supplement before extraction
- **Contradictory Information** - Flag inconsistencies and ask user to clarify rather than choosing

## Design Direction

The design should evoke professionalism, trust, and operational clarity appropriate for a compliance-focused environment. This is a serious tool for defensible documentation and risk management, so it must feel structured, reliable, and authoritative without being cold or intimidating. Clean lines, clear hierarchy, and purposeful use of color to distinguish tool categories while maintaining a cohesive, audit-ready aesthetic.

## Color Selection

A sophisticated palette inspired by premium productivity tools, with distinct accent colors for each agent while maintaining a cohesive system.

- **Primary Color**: Deep Slate Blue `oklch(0.35 0.08 250)` - Conveys professionalism, intelligence, and trustworthiness; anchors the interface
- **Secondary Colors**: 
  - Soft Warm Gray `oklch(0.95 0.01 80)` for backgrounds and cards
  - Cool Medium Gray `oklch(0.65 0.02 240)` for supporting elements
- **Accent Colors** (Agent-specific):
  - Text Rewriter: Vibrant Teal `oklch(0.65 0.15 200)` - Creative, transformative
  - Email Writer: Warm Coral `oklch(0.68 0.14 30)` - Communication, warmth
  - Calendar: Fresh Green `oklch(0.70 0.15 140)` - Organization, growth
- **Foreground/Background Pairings**: 
  - Primary Background `oklch(0.98 0.005 80)`: Deep Slate text `oklch(0.25 0.08 250)` - Ratio 11.2:1 ✓
  - Card Background `oklch(1 0 0)`: Body text `oklch(0.30 0.05 250)` - Ratio 10.8:1 ✓
  - Teal Accent `oklch(0.65 0.15 200)`: White text `oklch(1 0 0)` - Ratio 5.1:1 ✓
  - Coral Accent `oklch(0.68 0.14 30)`: White text `oklch(1 0 0)` - Ratio 4.9:1 ✓
  - Green Accent `oklch(0.70 0.15 140)`: White text `oklch(1 0 0)` - Ratio 5.3:1 ✓

## Font Selection

Typography should balance modern clarity with distinctive personality, avoiding the ubiquitous default of Inter or system fonts.

- **Primary Font**: Space Grotesk - A geometric sans with subtle character that feels contemporary and tech-forward without being overly clinical
- **Monospace Font**: JetBrains Mono - For displaying generated content and code-like outputs with excellent legibility

- **Typographic Hierarchy**: 
  - H1 (Page Title): Space Grotesk Bold/32px/tight (-0.02em)
  - H2 (Agent Titles): Space Grotesk SemiBold/24px/tight (-0.01em)
  - H3 (Section Headers): Space Grotesk Medium/18px/normal
  - Body Text: Space Grotesk Regular/16px/relaxed (1.6 line-height)
  - Labels: Space Grotesk Medium/14px/normal
  - Output Text: JetBrains Mono Regular/15px/relaxed (1.5 line-height)

## Animations

Animations should feel responsive and purposeful, providing feedback without unnecessary flourish. Use subtle motion to guide attention and confirm actions.

- **State Transitions**: Smooth 200ms ease-out transitions for button states, input focus, and card reveals
- **AI Processing**: Pulsing animation on agent cards while generating content to show active processing
- **Content Reveal**: Gentle fade-in with slight upward motion (10px) when AI results appear
- **Tab Switching**: Smooth 300ms slide transition between agent views
- **Success Feedback**: Brief scale animation (1.0 → 1.02 → 1.0) when content is copied to clipboard

## Component Selection

- **Components**: 
  - `Tabs` for switching between the three agents with clean visual separation
  - `Card` for housing each agent's interface with subtle shadows for depth
  - `Textarea` for multi-line text inputs with auto-resize behavior
  - `Select` for tone/style/formality dropdowns with clear visual hierarchy
  - `Button` for primary actions (Rewrite, Generate, Parse) with distinct hover states
  - `Label` for form fields with proper accessibility
  - `Badge` for displaying selected options and agent status
  - `Separator` to divide input and output sections
  - `ScrollArea` for managing long content outputs
  - `DropdownMenu` for multi-platform integration choices (email and calendar services)
- **Customizations**: 
  - Custom agent cards with color-coded left borders matching each agent's accent color
  - Custom result display component with copy-to-clipboard functionality and character count
  - Loading state component with agent-specific colors
- **States**: 
  - Buttons: Solid primary color default, darker on hover, scale down slightly on active, disabled state at 50% opacity
  - Inputs: Subtle border in rest state, accent-color border on focus with soft glow, error state with red border
  - Agent Cards: Elevated shadow on hover, accent-colored border when active
- **Icon Selection**: 
  - `ArrowsClockwise` for text rewriter (transformation)
  - `EnvelopeSimple` for email writer (communication)
  - `CalendarPlus` for calendar agent (scheduling)
  - `Copy` for copy-to-clipboard action
  - `Lightning` to indicate AI-powered features
  - `GoogleLogo` for Gmail and Google Calendar integration buttons
  - `MicrosoftOutlookLogo` for Outlook email and calendar integration buttons
  - `EnvelopeOpen` for email dropdown menu
  - `DownloadSimple` for .ics file download
- **Spacing**: 
  - Page padding: `p-8` (2rem)
  - Card padding: `p-6` (1.5rem)
  - Form field gaps: `gap-4` (1rem)
  - Section spacing: `space-y-6` (1.5rem)
  - Component margins: `mb-4` or `mt-6` for rhythm
- **Mobile**: 
  - Tabs become vertical stack on mobile with full-width cards
  - Textarea min-height reduces from 200px to 150px on small screens
  - Side-by-side layouts (input/output) stack vertically below 768px
  - Font sizes reduce by 1-2px on mobile for better readability
  - Touch targets for buttons minimum 44px height
