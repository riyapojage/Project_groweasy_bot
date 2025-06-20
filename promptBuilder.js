// GrowEasy Prompt Builder - Dynamic Claude Prompt Generation
// =========================================================

import { readFileSync } from 'fs';

// Load business profile
export function loadBusinessProfile() {
  try {
    const data = readFileSync('businessProfile.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading business profile:', error);
    return null;
  }
}

// Enhanced but simplified conversation prompt
export function buildConversationPrompt(transcript, businessProfile) {
  const { agentPersona, claude_instructions, market_intelligence } = businessProfile;
  
  const systemPrompt = `You are ${agentPersona.name}, a ${agentPersona.role} with ${agentPersona.experience}. You specialize in ${agentPersona.specialization}.

Your personality: ${agentPersona.personality}

CONVERSATION STYLE:
- Be natural, consultative, and value-driven
- Provide market insights and tips in your responses
- Ask thoughtful follow-up questions that show expertise
- Reference location-specific insights when cities are mentioned

MARKET KNOWLEDGE:
${JSON.stringify(market_intelligence, null, 2)}

CURRENT CONVERSATION:
${transcript.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n')}

Respond naturally as Priya. Include at least one valuable insight or tip. Ask a thoughtful follow-up question.`;

  return systemPrompt;
}

// Simplified classification prompt
export function buildClassificationPrompt(transcript, businessProfile) {
  const { enhanced_classification } = businessProfile;
  
  const systemPrompt = `Analyze this real estate conversation and classify the lead quality.

CLASSIFICATION OPTIONS:
- hot_premium: High budget (100L+), immediate timeline (0-2 months), clear motivation
- hot_standard: Good budget (50L+), near-term timeline (0-6 months), serious intent  
- warm_nurture: Moderate budget (25L+), flexible timeline, genuine interest
- cold_long_term: Lower budget or distant timeline but genuine interest
- invalid_spam: Unclear responses, unrealistic expectations, time-wasters

CONVERSATION TO ANALYZE:
${transcript.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n')}

Respond with ONLY this JSON format:
{
  "classification": "hot_premium|hot_standard|warm_nurture|cold_long_term|invalid_spam",
  "confidence": 0.95,
  "reasoning": "Brief explanation of classification",
  "extracted_data": {
    "motivation": "Primary reason for property search",
    "location_preference": "Areas mentioned",
    "budget_range": "Budget mentioned",
    "timeline": "Purchase timeline",
    "family_situation": "Family details",
    "experience_level": "First-time or experienced buyer"
  },
  "business_value": {
    "conversion_probability": "High/Medium/Low",
    "effort_required": "High/Medium/Low"
  }
}`;

  return systemPrompt;
}

// Legacy function for backward compatibility
export function buildPrompt(transcript, businessProfile) {
  return buildConversationPrompt(transcript, businessProfile);
} 