// GrowEasy Prompt Builder
// =====================

const { readFileSync } = require('fs');
const { join } = require('path');

// Load business profile from JSON file
function loadBusinessProfile() {
    try {
        // Try multiple possible paths for business profile
        const possiblePaths = [
            join(__dirname, '../businessProfile.json'),
            join(process.cwd(), 'businessProfile.json'),
            join(process.cwd(), 'netlify/functions/businessProfile.json')
        ];
        
        for (const filePath of possiblePaths) {
            try {
                const data = readFileSync(filePath, 'utf8');
                return JSON.parse(data);
            } catch (err) {
                continue; // Try next path
            }
        }
        
        throw new Error('Business profile not found in any expected location');
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
function buildPrompt(businessProfile) {
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
function buildClassificationPrompt(transcript, businessProfile) {
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
function buildConversationPrompt(transcript, businessProfile) {
    const basePrompt = buildPrompt(businessProfile);
    const conversationHistory = transcript.map(msg => 
        `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
    ).join('\n');
    
    // Analyze what information we still need
    const conversationText = transcript.map(msg => msg.content).join(' ').toLowerCase();
    const stillNeed = [];
    
    if (!/budget|price|cost|money|lakh|crore|rupee|₹|\$/.test(conversationText)) {
        stillNeed.push('budget');
    }
    if (!/timeline|time|month|year|soon|urgent|when|by/.test(conversationText)) {
        stillNeed.push('timeline');
    }
    if (!/location|area|city|place|where/.test(conversationText)) {
        stillNeed.push('location');
    }
    if (!/apartment|villa|house|flat|bhk|commercial|office|shop/.test(conversationText)) {
        stillNeed.push('property type');
    }
    
    const guidanceText = stillNeed.length > 0 
        ? `IMPORTANT: You still need to ask about: ${stillNeed.join(', ')}. Focus on gathering this information before concluding.`
        : `You have gathered sufficient information. You may wrap up the conversation politely.`;
    
    return `${basePrompt}

CONVERSATION HISTORY:
${conversationHistory}

${guidanceText}

Continue the conversation naturally, asking one question at a time.`;
}

// Natural conversation prompt that creates engaging discussions
function buildNaturalConversationPrompt(transcript, businessProfile) {
    const persona = businessProfile.agentPersona || businessProfile;
    const agentName = persona.name || "Priya";
    const experience = persona.experience || "8+ years in real estate";
    
    // Analyze conversation depth and what's been covered
    const conversationDepth = analyzeConversationDepth(transcript);
    const phase = determineConversationPhase(transcript, conversationDepth);
    
    const systemPrompt = `You are ${agentName}, a senior real estate consultant with ${experience}. You're having a natural conversation with a potential property buyer.

RESPONSE GUIDELINES:
• Keep responses short (2-3 sentences maximum)
• Be conversational and friendly, not formal or verbose
• Ask ONE clear question at a time
• Respond naturally to what they said
• Show genuine interest without being overwhelming
• NEVER include instructional notes or meta-commentary in your response

CONVERSATION STYLE:
• Warm and helpful, like a knowledgeable friend
• Focus on understanding their needs
• Share brief insights when relevant
• Build trust through genuine conversation

CURRENT PHASE: ${phase}
${getPhaseSpecificGuidance(phase, conversationDepth)}

CONVERSATION:
${transcript.map(msg => `${msg.role === 'user' ? 'Client' : agentName}: ${msg.content}`).join('\n')}

Respond naturally and keep it brief (2-3 sentences max). Ask one meaningful question.`;

    return systemPrompt;
}

// Analyze how deep and natural the conversation has been
function analyzeConversationDepth(transcript) {
    const conversationText = transcript.map(msg => msg.content).join(' ').toLowerCase();
    
    // Check what essential information has been naturally discussed
    const coverage = {
        budget: /budget|price|cost|afford|lakh|crore|rupee|₹|\$|spend/.test(conversationText),
        location: /location|area|city|place|where|neighborhood|locality/.test(conversationText),
        property_type: /apartment|villa|house|flat|bhk|commercial|office|shop|type|bedroom/.test(conversationText),
        timeline: /timeline|time|month|year|soon|urgent|when|move|buy/.test(conversationText),
        motivation: /why|reason|need|family|work|investment|upgrade|first|home/.test(conversationText),
        lifestyle: /lifestyle|work|commute|family|children|parents|routine/.test(conversationText),
        preferences: /prefer|want|need|must|important|priority/.test(conversationText)
    };
    
    const coverageCount = Object.values(coverage).filter(Boolean).length;
    const avgResponseLength = transcript.filter(msg => msg.role === 'user').reduce((sum, msg) => sum + msg.content.split(' ').length, 0) / Math.max(1, transcript.filter(msg => msg.role === 'user').length);
    
    return {
        coverage,
        coverageCount,
        totalExchanges: Math.floor(transcript.length / 2),
        avgUserResponseLength: avgResponseLength,
        conversationQuality: avgResponseLength > 8 ? 'detailed' : avgResponseLength > 4 ? 'moderate' : 'brief'
    };
}

// Determine what phase of conversation we're in
function determineConversationPhase(transcript, depth) {
    const exchanges = Math.floor(transcript.length / 2);
    
    if (exchanges <= 2) return 'opening';
    if (exchanges <= 4) return 'rapport_building';
    if (depth.coverageCount < 3) return 'discovery';
    if (depth.coverageCount < 5) return 'deep_qualification';
    return 'closing';
}

// Phase-specific conversation guidance
function getPhaseSpecificGuidance(phase, depth) {
    switch (phase) {
        case 'opening':
            return `Ask what brings them to property search today. Keep it warm and brief.`;
        
        case 'rapport_building':
            return `Build trust. Ask about their current situation. Stay conversational.`;
        
        case 'discovery':
            return `Explore their needs naturally. Missing: ${getMissingAreas(depth.coverage).join(', ')}.`;
        
        case 'deep_qualification':
            return `Get specific details. Share brief insights. Missing: ${getMissingAreas(depth.coverage).join(', ')}.`;
        
        case 'closing':
            return `Wrap up naturally. Offer next steps. Keep it enthusiastic but brief.`;
        
        default:
            return `Have a natural, brief conversation.`;
    }
}

// Identify missing areas of information
function getMissingAreas(coverage) {
    const missing = [];
    if (!coverage.budget) missing.push('budget discussion');
    if (!coverage.location) missing.push('location preferences');
    if (!coverage.property_type) missing.push('property type');
    if (!coverage.timeline) missing.push('timeline');
    if (!coverage.motivation) missing.push('motivation/purpose');
    return missing;
}

module.exports = {
    loadBusinessProfile,
    buildPrompt,
    buildClassificationPrompt,
    buildConversationPrompt,
    buildNaturalConversationPrompt,
    analyzeConversationDepth,
    determineConversationPhase
}; 