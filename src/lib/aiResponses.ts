interface AIResponse {
  message: string;
  suggestedResources?: string[];
  requiresFollowUp?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
}

interface Pattern {
  keywords: string[];
  phrases: string[];
  response: (context: { messageCount: number; previousTopics: string[] }) => AIResponse;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countMatches(text: string, terms: string[], wholeWord = false): number {
  return terms.reduce((count, term) => {
    if (!term) return count;
    if (!wholeWord || term.includes(' ')) {
      return text.includes(term.toLowerCase()) ? count + 1 : count;
    }
    const regex = new RegExp(`\\b${escapeRegex(term.toLowerCase())}\\b`, 'i');
    return regex.test(text) ? count + 1 : count;
  }, 0);
}

const patterns: Pattern[] = [
  {
    keywords: [
      'crisis', 'suicidal', 'suicide', 'self harm', 'self-harm', 'hurt myself', 'kill myself',
      'end it', 'overdose', 'od', 'can\'t stay safe', 'unsafe right now',
    ],
    phrases: [
      'want to die', 'no point', 'can\'t go on', 'better off dead', 'in immediate danger',
      'i am going to kill myself', 'thinking about ending my life',
    ],
    response: () => ({
      message: 'I hear that you\'re in crisis right now. Your safety is the top priority. Please call 988 (Suicide & Crisis Lifeline) immediately - they have trained counselors available 24/7 who can help. Would you like me to connect you with someone who can provide immediate support?',
      priority: 'urgent',
      tags: ['Crisis'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: [
      'homeless', 'unhoused', 'shelter', 'housing', 'place to stay', 'nowhere to go', 'evicted',
      'couch surfing', 'rent', 'rent help', 'utility shutoff', 'lights off', 'water shutoff',
      'sleeping outside', 'living in car', 'motel voucher',
    ],
    phrases: ['need a place', 'lost my apartment', 'living in car', 'sleeping outside', 'about to be homeless'],
    response: (context) => ({
      message: context.messageCount > 1
        ? 'Let me help you find shelter options in your area. Can you tell me what city you\'re in, or your ZIP code? This will help me locate the nearest available shelters and housing resources.'
        : 'I understand you need housing assistance. Many shelters offer emergency beds, meals, and case management services. What area are you located in so I can find resources near you?',
      suggestedResources: ['shelter'],
      priority: 'high',
      tags: ['Housing'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: [
      'treatment', 'rehab', 'detox', 'addiction', 'substance', 'drugs', 'alcohol', 'recovery', 'sober',
      'meth', 'fentanyl', 'opioid', 'opiate', 'heroin', 'withdrawal', 'mat', 'suboxone', 'vivitrol', 'aa', 'na',
    ],
    phrases: ['need help', 'want to quit', 'get clean', 'stop using', 'need detox', 'treatment center'],
    response: (_context) => ({
      message: 'Seeking treatment is a brave and important step. There are several types of programs available including detox, inpatient treatment, outpatient programs, and medication-assisted treatment. What type of support are you looking for? Also, are you currently in a safe place?',
      suggestedResources: ['treatment'],
      priority: 'high',
      tags: ['Treatment'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: [
      'hungry', 'food', 'foodbox', 'food box', 'food pantry', 'meal', 'eat', 'starving',
      'food bank', 'pantry', 'groceries', 'grocery', 'soup kitchen', 'snap', 'ebt',
    ],
    phrases: ['need food', 'emergency food', 'food sources', 'haven\'t eaten', 'no money for food', 'need a food box'],
    response: () => ({
      message: 'I can help you find food resources. Many food banks, soup kitchens, and meal programs are available. What city or area are you in? I\'ll locate the nearest options with their hours and any requirements.',
      suggestedResources: ['food'],
      priority: 'high',
      tags: ['Food'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: [
      'medical', 'doctor', 'hospital', 'sick', 'injured', 'health', 'medicine', 'prescription',
      'clinic', 'dental', 'tooth', 'mental health meds', 'insulin', 'infection',
    ],
    phrases: ['need medical', 'health problem', 'need a doctor', 'can\'t afford', 'need a clinic'],
    response: () => ({
      message: 'If this is a medical emergency, please call 911 or go to the nearest emergency room. For non-emergency medical needs, there are free and low-cost clinics, community health centers, and programs that can help. What type of medical care do you need?',
      suggestedResources: ['medical'],
      priority: 'high',
      tags: ['Medical'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: [
      'mental health', 'depression', 'anxiety', 'counseling', 'therapy', 'therapist', 'stressed',
      'panic', 'ptsd', 'trauma', 'bipolar', 'schizophrenia',
    ],
    phrases: ['feeling depressed', 'can\'t cope', 'overwhelmed', 'panic attacks', 'need counseling'],
    response: () => ({
      message: 'Mental health support is really important. There are counseling services, support groups, and crisis resources available. Many offer services on a sliding scale or free. Would you like help finding mental health resources in your area?',
      suggestedResources: ['medical', 'crisis'],
      priority: 'medium',
      tags: ['Medical'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: [
      'legal', 'lawyer', 'attorney', 'court', 'eviction', 'arrest', 'warrant', 'rights',
      'protection order', 'restraining order', 'child support', 'custody case',
    ],
    phrases: ['legal help', 'need attorney', 'court date', 'legal aid', 'need a lawyer'],
    response: () => ({
      message: 'I can help you find legal assistance. Legal aid organizations provide free legal help for civil matters. What kind of legal issue are you dealing with - housing, family law, benefits, criminal record, or something else?',
      suggestedResources: ['legal'],
      priority: 'medium',
      tags: ['Legal'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['job', 'work', 'employment', 'hire', 'resume', 'interview', 'unemployed', 'career', 'training'],
    phrases: ['need a job', 'looking for work', 'help finding work', 'job training'],
    response: () => ({
      message: 'I can help connect you with employment services. Many organizations offer job training, resume help, interview preparation, and job placement. Are you looking for immediate work opportunities, or would job training programs be helpful?',
      suggestedResources: ['other'],
      priority: 'medium',
      tags: ['Other'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['benefits', 'snap', 'food stamps', 'medicaid', 'disability', 'ssi', 'ssdi', 'welfare', 'tanf'],
    phrases: ['apply for', 'get benefits', 'public assistance', 'state assistance'],
    response: () => ({
      message: 'I can help you understand available benefit programs like SNAP (food assistance), Medicaid (health coverage), and other support. Many organizations can help with applications. Which benefits are you interested in learning about?',
      suggestedResources: ['other'],
      priority: 'medium',
      tags: ['Other'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['domestic', 'abuse', 'violence', 'hitting', 'partner', 'unsafe', 'trafficking', 'assault'],
    phrases: ['being abused', 'hit me', 'not safe at home', 'domestic violence', 'my partner hurt me'],
    response: () => ({
      message: 'Your safety matters. If you\'re in immediate danger, call 911. The National Domestic Violence Hotline is available 24/7 at 1-800-799-7233 (or text START to 88788). They can help with safety planning, shelter referrals, and support. Would you like help finding local resources?',
      priority: 'urgent',
      tags: ['Crisis'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['transportation', 'ride', 'bus', 'car', 'gas card', 'uber', 'lyft', 'bus pass'],
    phrases: ['need a ride', 'no transportation', 'can\'t get there', 'how to get to', 'need bus pass'],
    response: () => ({
      message: 'Transportation can be a real barrier. Many communities offer free or reduced transit passes, medical transportation, and ride programs. What area are you in? I can look into what\'s available near you.',
      suggestedResources: ['other'],
      priority: 'medium',
      tags: ['Other'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['veteran', 'military', 'va', 'service member'],
    phrases: ['served in', 'military service', 'va benefits'],
    response: () => ({
      message: 'Thank you for your service. Veterans have access to specialized resources including VA healthcare, housing programs (like SSVF and HUD-VASH), employment services, and peer support. Would you like help connecting with veteran-specific services in your area?',
      suggestedResources: ['other'],
      priority: 'medium',
      tags: ['Other'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['child', 'children', 'kids', 'family', 'parenting', 'custody', 'baby', 'diapers', 'formula'],
    phrases: ['have kids', 'my children', 'family shelter', 'with my kids', 'need diapers'],
    response: (context) => ({
      message: context.previousTopics.includes('housing')
        ? 'Family shelters prioritize keeping families together. Many also provide childcare, school enrollment help, and family case management. Let me find family-friendly options in your area — what city or ZIP code?'
        : 'I can help you find family-focused resources including family shelters, childcare assistance, parenting support, and programs for children. What kind of help does your family need right now?',
      suggestedResources: ['shelter'],
      priority: 'high',
      tags: ['Housing'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['clothing', 'clothes', 'coat', 'shoes', 'warm', 'blanket', 'hygiene', 'toiletries', 'id', 'documents'],
    phrases: ['need clothes', 'need a coat', 'stay warm', 'need hygiene items', 'need id help'],
    response: () => ({
      message: 'Several organizations provide free clothing, coats, and personal items. Thrift stores, churches, and community centers often run clothing drives. What area are you in so I can find options near you?',
      suggestedResources: ['other'],
      priority: 'medium',
      tags: ['Other'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
    phrases: ['what can you do', 'how does this work', 'who are you'],
    response: () => ({
      message: 'Hi there! I\'m the NRS Navigator — I help people find resources like shelter, food, treatment programs, medical care, legal help, employment, and more. You can tell me what you\'re going through and I\'ll do my best to point you in the right direction. What can I help you with?',
      priority: 'low',
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['thank', 'thanks', 'appreciate', 'helpful'],
    phrases: ['thank you', 'thanks for', 'that helps'],
    response: () => ({
      message: 'You\'re welcome. Remember, reaching out is a strong step. Is there anything else I can help you with today?',
      priority: 'low',
      requiresFollowUp: false,
    }),
  },
];

export function generateAIResponse(
  userMessage: string,
  context: { messageCount: number; previousTopics: string[] }
): AIResponse {
  const lowerMessage = userMessage.toLowerCase();

  // Use scored matching instead of first-match so mixed needs
  // like "food + homeless" can prioritize the most specific ask.
  let bestPattern: Pattern | null = null;
  let bestScore = 0;

  for (const pattern of patterns) {
    const keywordHits = countMatches(lowerMessage, pattern.keywords, true);
    const phraseHits = countMatches(lowerMessage, pattern.phrases);
    const score = keywordHits + phraseHits * 2;

    if (score > bestScore) {
      bestScore = score;
      bestPattern = pattern;
    }
  }

  if (bestPattern && bestScore > 0) {
    return bestPattern.response(context);
  }

  if (context.messageCount === 0) {
    return {
      message: 'Hello! I\'m here to help connect you with resources and support. You can ask me about shelter, food, treatment programs, medical care, or other services. What do you need help with today?',
      priority: 'medium',
      requiresFollowUp: true,
    };
  }

  if (lowerMessage.length < 10) {
    return {
      message: 'I want to make sure I understand how I can help you. Could you tell me a bit more about what you need?',
      priority: 'medium',
      requiresFollowUp: true,
    };
  }

  // Check if user mentioned a location — respond contextually
  const locationMatch = lowerMessage.match(/\b(in|near|around|from)\s+([a-z][a-z\s,]{1,40})/i);
  if (locationMatch && context.previousTopics.length > 0) {
    const topic = context.previousTopics[context.previousTopics.length - 1];
    return {
      message: `Thanks for sharing your location. Let me look into ${topic} resources in that area. In the meantime, you can also call 211 — it's a free helpline that connects people with local services 24/7. Is there anything specific about the ${topic} services you're looking for?`,
      priority: 'medium',
      requiresFollowUp: true,
    };
  }

  // Contextual fallback based on previous topics
  if (context.previousTopics.length > 0) {
    const lastTopic = context.previousTopics[context.previousTopics.length - 1];
    return {
      message: `I want to make sure I help you find the right ${lastTopic} resources. Could you tell me more about your situation — like what city you're in, or what specific kind of help you're looking for? The more details you share, the better I can assist.`,
      priority: 'medium',
      requiresFollowUp: true,
    };
  }

  // Generic fallback — still helpful and warm
  const fallbacks = [
    'I\'m here to help you find the right resources. I can assist with housing, food, treatment, medical care, legal aid, employment, and more. What\'s going on in your life right now that I can help with?',
    'I want to make sure I point you in the right direction. Could you share a bit more about what you\'re going through? I can help with things like finding shelter, food, healthcare, legal help, or other support services.',
    'Tell me more about what you need and I\'ll do my best to connect you with the right resources. You can also call 211 anytime for help finding local services.',
  ];

  return {
    message: fallbacks[context.messageCount % fallbacks.length],
    priority: 'medium',
    requiresFollowUp: true,
  };
}

/**
 * Generates a short predictive label from the user's first message(s).
 * Used on the admin dashboard so Brandon can see at a glance what
 * the conversation is about before opening it.
 */
export function generateTopicSummary(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  // Crisis / safety first
  if (['suicidal', 'kill myself', 'hurt myself', 'want to die', 'end it', 'suicide', 'self harm', 'self-harm', 'overdose'].some(w => lower.includes(w))) {
    return 'Crisis — Suicidal ideation';
  }
  if (['domestic violence', 'abuse', 'hitting', 'not safe at home', 'being abused'].some(w => lower.includes(w))) {
    return 'Crisis — Domestic violence';
  }
  if (['crisis', 'in immediate danger'].some(w => lower.includes(w))) {
    return 'Crisis — General emergency';
  }

  // Specific resource categories
  const topicMap: Array<{ keywords: string[]; label: string }> = [
    { keywords: ['shelter', 'homeless', 'unhoused', 'housing', 'evicted', 'place to stay', 'nowhere to go', 'sleeping outside', 'couch surfing', 'living in car', 'rent help'], label: 'Housing / Shelter' },
    { keywords: ['treatment', 'rehab', 'detox', 'addiction', 'substance', 'recovery', 'sober', 'drugs', 'alcohol', 'using', 'withdrawal', 'suboxone', 'aa', 'na'], label: 'Substance Use Treatment' },
    { keywords: ['food', 'foodbox', 'food box', 'hungry', 'meal', 'food bank', 'pantry', 'starving', 'eat', 'food sources', 'emergency food', 'groceries'], label: 'Food Assistance' },
    { keywords: ['medical', 'doctor', 'hospital', 'health', 'prescription', 'medicine', 'sick', 'injured', 'clinic', 'dental'], label: 'Medical / Health' },
    { keywords: ['mental health', 'depression', 'anxiety', 'counseling', 'therapy', 'therapist', 'stressed', 'overwhelmed', 'panic', 'ptsd', 'trauma'], label: 'Mental Health' },
    { keywords: ['legal', 'lawyer', 'attorney', 'court', 'eviction notice', 'arrest', 'warrant', 'legal aid'], label: 'Legal Aid' },
    { keywords: ['job', 'work', 'employment', 'resume', 'hire', 'interview', 'unemployed', 'job training'], label: 'Employment' },
    { keywords: ['benefits', 'snap', 'food stamps', 'medicaid', 'disability', 'ssi', 'ssdi', 'welfare', 'tanf'], label: 'Benefits / Assistance' },
    { keywords: ['transportation', 'ride', 'bus pass', 'car', 'uber', 'lyft', 'gas card'], label: 'Transportation' },
    { keywords: ['veteran', 'military', 'va ', 'service member'], label: 'Veteran Services' },
    { keywords: ['child', 'children', 'kids', 'family', 'custody', 'parenting', 'diapers', 'formula'], label: 'Family / Children' },
    { keywords: ['clothing', 'clothes', 'coat', 'shoes', 'blanket', 'hygiene', 'toiletries', 'id', 'documents'], label: 'Clothing / Essentials' },
  ];

  const matched: string[] = [];
  for (const { keywords, label } of topicMap) {
    if (keywords.some(k => lower.includes(k))) {
      matched.push(label);
    }
  }

  if (matched.length > 0) {
    return matched.slice(0, 2).join(' + ');
  }

  // Greeting / general
  if (['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'what can you do', 'how does this work'].some(w => lower.includes(w))) {
    return 'General inquiry';
  }

  return 'Needs assessment';
}

export function analyzeConversation(messages: Array<{ content: string; sender: string }>): {
  detectedTopics: string[];
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  recommendedTags: string[];
} {
  const allContent = messages.map(m => m.content.toLowerCase()).join(' ');
  const detectedTopics: string[] = [];
  const recommendedTags: string[] = [];
  let urgency: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

  const crisisWords = ['crisis', 'suicidal', 'hurt myself', 'suicide', 'self harm', 'self-harm', 'overdose', 'kill myself'];
  if (crisisWords.some(word => allContent.includes(word))) {
    urgency = 'urgent';
    recommendedTags.push('Crisis');
    detectedTopics.push('crisis');
  }

  if (['homeless', 'unhoused', 'shelter', 'housing', 'evicted', 'living in car', 'sleeping outside'].some(term => allContent.includes(term))) {
    detectedTopics.push('housing');
    recommendedTags.push('Housing');
    if (urgency === 'medium') urgency = 'high';
  }

  if (['treatment', 'rehab', 'detox', 'addiction', 'withdrawal', 'suboxone', 'recovery'].some(term => allContent.includes(term))) {
    detectedTopics.push('treatment');
    recommendedTags.push('Treatment');
    if (urgency === 'medium') urgency = 'high';
  }

  if (['food', 'foodbox', 'food box', 'hungry', 'pantry', 'food bank', 'meal', 'groceries'].some(term => allContent.includes(term))) {
    detectedTopics.push('food');
    recommendedTags.push('Food');
  }

  if (['medical', 'doctor', 'health', 'hospital', 'clinic', 'dental', 'prescription'].some(term => allContent.includes(term))) {
    detectedTopics.push('medical');
    recommendedTags.push('Medical');
  }

  if (['legal', 'lawyer', 'attorney', 'court', 'warrant', 'eviction'].some(term => allContent.includes(term))) {
    detectedTopics.push('legal');
    recommendedTags.push('Legal');
  }

  return { detectedTopics, urgency, recommendedTags };
}
