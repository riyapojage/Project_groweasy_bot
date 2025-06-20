// GrowEasy Prompt Builder
// =====================

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load business profile from JSON file
export function loadBusinessProfile() {
    try {
        const filePath = join(process.cwd(), 'businessProfile.json');
        const data = readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Failed to load business profile:', error);
        return getDefaultBusinessProfile();
    }
}

// Default business profile fallback
function getDefaultBusinessProfile() {
    return {
        companyName: "GrowEasy Real Estate",
        industry: "Real Estate",
        targetAudience: "Property buyers and sellers",
        qualificationCriteria: {
            budget: "Must have budget information",
            timeline: "Must have timeline for purchase/sale",
            location: "Must specify preferred location",
            propertyType: "Must indicate property type interest"
        }
    };
}

// Build the main conversation prompt
export function buildPrompt(businessProfile) {
    return `You are a helpful lead qualification chatbot for ${businessProfile.companyName}, a company in the ${businessProfile.industry} industry.

Your primary goal is to qualify leads by gathering key information through natural conversation.

QUALIFICATION CRITERIA:
${Object.entries(businessProfile.qualificationCriteria).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

CONVERSATION GUIDELINES:
1. Be conversational, friendly, and professional
2. Ask one question at a time to avoid overwhelming the user
3. Gather the required qualification information naturally
4. Keep responses concise (2-3 sentences maximum)
5. Show genuine interest in helping them find the right solution
6. If they ask about services, briefly mention your expertise but guide back to qualification
7. End the conversation once you have sufficient information for all criteria

TARGET AUDIENCE: ${businessProfile.targetAudience}

Remember: Your goal is to qualify the lead, not to provide extensive consulting. Keep the conversation focused and efficient.`;
}

// Build classification prompt for lead scoring
export function buildClassificationPrompt(transcript, businessProfile) {
    const criteria = Object.keys(businessProfile.qualificationCriteria);
    
    return `Analyze this conversation transcript and classify the lead quality.

BUSINESS CONTEXT:
Company: ${businessProfile.companyName}
Industry: ${businessProfile.industry}

QUALIFICATION CRITERIA:
${Object.entries(businessProfile.qualificationCriteria).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

CONVERSATION TRANSCRIPT:
${transcript.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Provide a JSON response with:
{
  "status": "hot|warm|cold|invalid",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of classification",
  "metadata": {
    ${criteria.map(criterion => `"${criterion}": "extracted value or 'not provided'"`).join(',\n    ')}
  }
}

CLASSIFICATION RULES:
- HOT: All criteria met with strong buying signals
- WARM: Most criteria met, shows genuine interest
- COLD: Some criteria met but weak buying signals
- INVALID: Spam, test messages, or completely unrelated`;
}

// Build conversation prompt with context
export function buildConversationPrompt(transcript, businessProfile) {
    const basePrompt = buildPrompt(businessProfile);
    const conversationHistory = transcript.map(msg => 
        `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
    ).join('\n');
    
    return `${basePrompt}

CONVERSATION HISTORY:
${conversationHistory}

Continue the conversation naturally. If you have gathered sufficient information for qualification, politely wrap up the conversation and thank them for their interest.`;
} 