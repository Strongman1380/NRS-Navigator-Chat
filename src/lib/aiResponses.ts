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
      message: 'I hear you, and what you\'re feeling matters. Please call or text 988 right now — trained counselors are available 24/7. If you\'re in immediate danger, call 911. I\'m also connecting you with a member of our support team, who will follow up with you directly. You don\'t have to figure this out alone.',
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
        ? 'Let me find housing options near you. What city or ZIP code are you in? That\'ll help me pull up what\'s actually available — shelters, transitional housing, and programs that work with people who have a record.'
        : 'I can help with that. There are emergency shelters, transitional housing programs, and sober living options across Nebraska — including ones that accept people with felony records. What area are you in?',
      suggestedResources: ['shelter'],
      priority: 'high',
      tags: ['Housing'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: [
      'treatment', 'rehab', 'detox', 'addiction', 'substance', 'drugs', 'alcohol', 'recovery', 'sober',
      'meth', 'fentanyl', 'opioid', 'opiate', 'heroin', 'withdrawal', 'aa', 'na',
    ],
    phrases: ['need help', 'want to quit', 'get clean', 'stop using', 'need detox', 'treatment center'],
    response: (_context) => ({
      message: 'That\'s a real step, and it matters. There are detox programs, inpatient and outpatient treatment, and medication-assisted treatment (MAT) options like Suboxone and Vivitrol available in Nebraska. What kind of support are you looking for? And are you in a safe place right now?',
      suggestedResources: ['treatment'],
      priority: 'high',
      tags: ['Treatment'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: [
      'suboxone', 'buprenorphine', 'methadone', 'vivitrol', 'naltrexone', 'mat',
      'medication assisted', 'otp', 'narcan', 'naloxone',
    ],
    phrases: ['need suboxone', 'find a prescriber', 'mat provider', 'methadone clinic', 'get on mat', 'need vivitrol'],
    response: () => ({
      message: 'I can help you find MAT providers near you. Nebraska has methadone clinics, buprenorphine/Suboxone prescribers, and Vivitrol programs — and since the 2024 SAMHSA rule changes, telehealth MAT is an option too, which can help if you\'re in a rural area. What city or county are you in?',
      suggestedResources: ['treatment'],
      priority: 'high',
      tags: ['Treatment', 'MAT'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: [
      'reentry', 'prison', 'incarcerated', 'parole', 'released', 'felony', 'record',
      'background check', 'got out', 'just released', 'locked up', 'inside',
    ],
    phrases: ['just got out', 'coming home', 'out of prison', 'released from', 'have a record', 'felony on my record'],
    response: () => ({
      message: 'Welcome back. Reentry is hard, and the system doesn\'t always make it easy — but there are resources that can help. I can connect you with housing that accepts records, background-friendly employers, ID restoration, benefits enrollment, and more. What\'s your most pressing need right now?',
      suggestedResources: ['shelter', 'other'],
      priority: 'high',
      tags: ['Reentry'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: [
      'probation', 'parole officer', 'po', 'drug court', 'problem solving court',
      'ua', 'urinalysis', 'compliance', 'court ordered', 'supervision',
    ],
    phrases: ['on probation', 'my PO', 'drug court', 'court requirement', 'need to comply', 'probation check-in'],
    response: () => ({
      message: 'I can help you find what you need for your supervision requirements — treatment programs, court-approved services, and resources in your area. Just so you know, this platform is not connected to your probation or court case in any way. What are you looking for help with?',
      suggestedResources: ['treatment', 'legal'],
      priority: 'medium',
      tags: ['Probation'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: [
      'birth certificate', 'social security card', 'state id', 'drivers license',
      'lost id', 'no id', 'identification', 'id card', 'documents',
    ],
    phrases: ['need my id', 'get my id', 'replace my id', 'lost my documents', 'need id help', 'no identification'],
    response: () => ({
      message: 'Getting your ID sorted out is one of the most important first steps. I can help you find out how to get your Nebraska state ID, driver\'s license, Social Security card, or birth certificate. Which documents do you need, and what county are you in?',
      suggestedResources: ['other'],
      priority: 'medium',
      tags: ['ID Restoration'],
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
      message: 'I can help you find food right now. There are food pantries, soup kitchens, and meal programs across Nebraska. If you\'re eligible for SNAP, I can point you to enrollment help too — and yes, most people with drug convictions are now eligible. What area are you in?',
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
      message: 'If this is a medical emergency, call 911 or go to the nearest ER. For non-emergency care, there are free and sliding-scale clinics and community health centers in Nebraska. If you just got out and need to get on Medicaid, I can help with that too. What kind of medical care do you need?',
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
      message: 'Mental health support is out there, and you deserve access to it. There are community mental health centers, peer support specialists, and counseling services — many on a sliding scale or free. LB50 also means court-involved individuals can access virtual behavioral health. What area are you in?',
      suggestedResources: ['medical', 'crisis'],
      priority: 'medium',
      tags: ['Mental Health'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: [
      'legal', 'lawyer', 'attorney', 'court', 'eviction', 'arrest', 'warrant', 'rights',
      'protection order', 'restraining order', 'child support', 'custody case',
      'expungement', 'set aside', 'clear my record',
    ],
    phrases: ['legal help', 'need attorney', 'court date', 'legal aid', 'need a lawyer', 'clean my record'],
    response: () => ({
      message: 'I can help you find legal resources. Nebraska Legal Aid provides free civil legal help statewide (1-877-250-2016). If you\'re looking at record expungement or set-aside, reentry legal clinics, or drug court info, I can point you in the right direction. What kind of legal issue are you dealing with?',
      suggestedResources: ['legal'],
      priority: 'medium',
      tags: ['Legal'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['job', 'work', 'employment', 'hire', 'resume', 'interview', 'unemployed', 'career', 'training'],
    phrases: ['need a job', 'looking for work', 'help finding work', 'job training', 'with a record'],
    response: () => ({
      message: 'There are employers in Nebraska who hire people with records — fair-chance and ban-the-box employers across different industries. I can also connect you with workforce development programs, resume help, and trade apprenticeships with reentry pathways. What area are you in, and what kind of work are you looking for?',
      suggestedResources: ['other'],
      priority: 'medium',
      tags: ['Employment'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['benefits', 'snap', 'food stamps', 'medicaid', 'disability', 'ssi', 'ssdi', 'welfare', 'tanf'],
    phrases: ['apply for', 'get benefits', 'public assistance', 'state assistance'],
    response: () => ({
      message: 'I can help you figure out what benefits you\'re eligible for — SNAP, Medicaid, SSI/SSDI, and more. If you\'re recently released, there are specific timelines for Medicaid enrollment and SSI restoration. ACCESSNebraska handles most applications: 1-800-383-4278 (SNAP) or 1-855-632-7633 (Medicaid). Which benefits are you interested in?',
      suggestedResources: ['other'],
      priority: 'medium',
      tags: ['Benefits'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['domestic', 'abuse', 'violence', 'hitting', 'partner', 'unsafe', 'trafficking', 'assault'],
    phrases: ['being abused', 'hit me', 'not safe at home', 'domestic violence', 'my partner hurt me'],
    response: () => ({
      message: 'Your safety matters. If you\'re in immediate danger, call 911. The National Domestic Violence Hotline is available 24/7 at 1-800-799-7233 (or text START to 88788). They can help with safety planning, shelter, and support. Would you like help finding local resources?',
      priority: 'urgent',
      tags: ['Crisis'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['transportation', 'ride', 'bus', 'car', 'gas card', 'uber', 'lyft', 'bus pass'],
    phrases: ['need a ride', 'no transportation', 'can\'t get there', 'how to get to', 'need bus pass'],
    response: () => ({
      message: 'Transportation is one of the biggest barriers, especially in rural Nebraska. Some communities offer free transit passes, medical transportation, and ride programs. What area are you in? I\'ll see what\'s available.',
      suggestedResources: ['other'],
      priority: 'medium',
      tags: ['Transportation'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['veteran', 'military', 'va', 'service member'],
    phrases: ['served in', 'military service', 'va benefits'],
    response: () => ({
      message: 'Thank you for your service. Veterans have access to specialized resources — VA healthcare, housing programs like SSVF and HUD-VASH, employment services, veterans treatment court, and VA MAT programs. Would you like help connecting with veteran-specific services in your area?',
      suggestedResources: ['other'],
      priority: 'medium',
      tags: ['Veteran Services'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['child', 'children', 'kids', 'family', 'parenting', 'custody', 'baby', 'diapers', 'formula'],
    phrases: ['have kids', 'my children', 'family shelter', 'with my kids', 'need diapers'],
    response: (context) => ({
      message: context.previousTopics.includes('housing')
        ? 'Family shelters prioritize keeping families together. Many also provide childcare, school enrollment help, and family case management. Let me find family-friendly options near you — what city or ZIP code?'
        : 'I can help you find family-focused resources — family shelters, childcare assistance, parenting support, and children\'s programs. What kind of help does your family need right now?',
      suggestedResources: ['shelter'],
      priority: 'high',
      tags: ['Family'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['clothing', 'clothes', 'coat', 'shoes', 'warm', 'blanket', 'hygiene', 'toiletries'],
    phrases: ['need clothes', 'need a coat', 'stay warm', 'need hygiene items'],
    response: () => ({
      message: 'Several organizations provide free clothing, coats, and personal items. What area are you in? I\'ll find what\'s available near you.',
      suggestedResources: ['other'],
      priority: 'medium',
      tags: ['Essentials'],
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
    phrases: ['what can you do', 'how does this work', 'who are you'],
    response: () => ({
      message: 'Hey there. I\'m the Next Right Step Recovery Navigator — I help people find resources like housing, treatment, food, legal help, employment, and more across Nebraska. I\'m built specifically for people navigating recovery, reentry, and the justice system. What can I help you with?',
      priority: 'low',
      requiresFollowUp: true,
    }),
  },
  {
    keywords: ['thank', 'thanks', 'appreciate', 'helpful'],
    phrases: ['thank you', 'thanks for', 'that helps'],
    response: () => ({
      message: 'You\'re welcome. Reaching out takes effort, and you did it. Is there anything else I can help with?',
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
      message: 'Hey — I\'m here to help you find resources and support in Nebraska. I can help with housing, food, treatment, medical care, legal help, employment, benefits, and more. What do you need help with today?',
      priority: 'medium',
      requiresFollowUp: true,
    };
  }

  if (lowerMessage.length < 10) {
    return {
      message: 'I want to make sure I understand what you need. Could you tell me a bit more?',
      priority: 'medium',
      requiresFollowUp: true,
    };
  }

  // Check if user mentioned a location — respond contextually
  const locationMatch = lowerMessage.match(/\b(in|near|around|from)\s+([a-z][a-z\s,]{1,40})/i);
  if (locationMatch && context.previousTopics.length > 0) {
    const topic = context.previousTopics[context.previousTopics.length - 1];
    return {
      message: `Got it. Let me look into ${topic} resources in that area. You can also call 211 anytime — it's free and available 24/7. Is there anything specific about the ${topic} services you're looking for?`,
      priority: 'medium',
      requiresFollowUp: true,
    };
  }

  // Contextual fallback based on previous topics
  if (context.previousTopics.length > 0) {
    const lastTopic = context.previousTopics[context.previousTopics.length - 1];
    return {
      message: `I want to make sure I find the right ${lastTopic} resources for you. What city are you in, or what specific kind of help are you looking for?`,
      priority: 'medium',
      requiresFollowUp: true,
    };
  }

  // Generic fallback
  const fallbacks = [
    'I\'m here to help. I can assist with housing, food, treatment, medical care, legal aid, employment, benefits, and more. What\'s going on that I can help with?',
    'Tell me more about what you need and I\'ll do my best to connect you with the right resources. You can also call 211 anytime for help finding local services.',
    'I want to point you in the right direction. Could you share a bit more about what\'s going on? I work with people navigating recovery, reentry, housing, employment, and more.',
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
    { keywords: ['methadone', 'buprenorphine', 'vivitrol', 'naltrexone', 'mat', 'medication assisted', 'narcan', 'naloxone'], label: 'MAT' },
    { keywords: ['reentry', 'prison', 'incarcerated', 'parole', 'released', 'felony', 'record', 'locked up', 'just got out'], label: 'Reentry' },
    { keywords: ['probation', 'drug court', 'problem solving court', 'supervision', 'court ordered', 'compliance'], label: 'Probation / Drug Court' },
    { keywords: ['birth certificate', 'social security card', 'state id', 'drivers license', 'identification', 'lost id', 'no id'], label: 'ID Restoration' },
    { keywords: ['food', 'foodbox', 'food box', 'hungry', 'meal', 'food bank', 'pantry', 'starving', 'eat', 'food sources', 'emergency food', 'groceries'], label: 'Food Assistance' },
    { keywords: ['medical', 'doctor', 'hospital', 'health', 'prescription', 'medicine', 'sick', 'injured', 'clinic', 'dental'], label: 'Medical / Health' },
    { keywords: ['mental health', 'depression', 'anxiety', 'counseling', 'therapy', 'therapist', 'stressed', 'overwhelmed', 'panic', 'ptsd', 'trauma'], label: 'Mental Health' },
    { keywords: ['legal', 'lawyer', 'attorney', 'court', 'eviction notice', 'arrest', 'warrant', 'legal aid', 'expungement', 'set aside'], label: 'Legal Aid' },
    { keywords: ['job', 'work', 'employment', 'resume', 'hire', 'interview', 'unemployed', 'job training'], label: 'Employment' },
    { keywords: ['benefits', 'snap', 'food stamps', 'medicaid', 'disability', 'ssi', 'ssdi', 'welfare', 'tanf'], label: 'Benefits / Assistance' },
    { keywords: ['transportation', 'ride', 'bus pass', 'car', 'uber', 'lyft', 'gas card'], label: 'Transportation' },
    { keywords: ['veteran', 'military', 'service member', 'va benefits', 'va healthcare', 'v.a.'], label: 'Veteran Services' },
    { keywords: ['child', 'children', 'kids', 'family', 'custody', 'parenting', 'diapers', 'formula'], label: 'Family / Children' },
    { keywords: ['clothing', 'clothes', 'coat', 'shoes', 'blanket', 'hygiene', 'toiletries'], label: 'Clothing / Essentials' },
  ];

  const matched: string[] = [];
  for (const { keywords, label } of topicMap) {
    if (keywords.some(k => lower.includes(k))) {
      matched.push(label);
    }
  }

  // Word-boundary check for standalone "va" (Veteran Services)
  if (!matched.includes('Veteran Services') && /\bva\b/i.test(lower)) {
    matched.push('Veteran Services');
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

  if (['reentry', 'prison', 'incarcerated', 'parole', 'released', 'felony', 'just got out'].some(term => allContent.includes(term))) {
    detectedTopics.push('reentry');
    recommendedTags.push('Reentry');
    if (urgency === 'medium') urgency = 'high';
  }

  if (['probation', 'drug court', 'supervision', 'court ordered'].some(term => allContent.includes(term))) {
    detectedTopics.push('probation');
    recommendedTags.push('Probation');
  }

  if (['methadone', 'buprenorphine', 'suboxone', 'vivitrol', 'naltrexone', 'mat provider'].some(term => allContent.includes(term))) {
    detectedTopics.push('mat');
    recommendedTags.push('MAT');
    if (urgency === 'medium') urgency = 'high';
  }

  if (['birth certificate', 'social security card', 'state id', 'drivers license', 'lost id', 'no id'].some(term => allContent.includes(term))) {
    detectedTopics.push('id_restoration');
    recommendedTags.push('ID Restoration');
  }

  if (['food', 'foodbox', 'food box', 'hungry', 'pantry', 'food bank', 'meal', 'groceries'].some(term => allContent.includes(term))) {
    detectedTopics.push('food');
    recommendedTags.push('Food');
  }

  if (['medical', 'doctor', 'health', 'hospital', 'clinic', 'dental', 'prescription'].some(term => allContent.includes(term))) {
    detectedTopics.push('medical');
    recommendedTags.push('Medical');
  }

  if (['legal', 'lawyer', 'attorney', 'court', 'warrant', 'eviction', 'expungement'].some(term => allContent.includes(term))) {
    detectedTopics.push('legal');
    recommendedTags.push('Legal');
  }

  if (['job', 'work', 'employment', 'hire', 'resume', 'unemployed'].some(term => allContent.includes(term))) {
    detectedTopics.push('employment');
    recommendedTags.push('Employment');
  }

  return { detectedTopics, urgency, recommendedTags };
}
