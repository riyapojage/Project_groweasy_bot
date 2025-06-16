// GrowEasy Prompt Builder - Dynamic Claude Prompt Generation
// =========================================================

import { readFileSync } from 'fs';

// Load business profile configuration
const businessProfile = JSON.parse(readFileSync('./businessProfile.json', 'utf8'));

/**
 * Build a Claude-formatted prompt for lead qualification conversation
 * @param {Array} transcript - Array of conversation messages so far
 * @returns {string} - Formatted prompt for Claude
 */
export function buildPrompt(transcript = []) {
    let prompt = '';
    
    // System context and role definition
    prompt += `You are a professional ${businessProfile.industry.replace('_', ' ')} assistant for ${businessProfile.businessName}. `;
    prompt += `Your job is to qualify leads by asking specific questions in a natural, conversational way.\n\n`;
    
    // Instructions for conversation style
    prompt += `INSTRUCTIONS:\n`;
    prompt += `- Be friendly, professional, and helpful\n`;
    prompt += `- Ask questions one at a time, wait for answers\n`;
    prompt += `- Use the follow-up responses to acknowledge answers\n`;
    prompt += `- Keep responses concise and conversational\n`;
    prompt += `- If user gives incomplete answers, politely ask for clarification\n\n`;
    
    // Business context
    prompt += `BUSINESS CONTEXT:\n`;
    prompt += `Industry: ${businessProfile.industry.replace('_', ' ')}\n`;
    prompt += `Business: ${businessProfile.businessName}\n\n`;
    
    // Questions to ask (in order)
    prompt += `QUESTIONS TO ASK (in this order):\n`;
    businessProfile.questions.forEach((question, index) => {
        prompt += `${index + 1}. ${question.text}\n`;
        if (question.options) {
            prompt += `   Options: ${question.options.join(', ')}\n`;
        }
        prompt += `   Follow-up: "${question.followUp}"\n\n`;
    });
    
    // Conversation rules
    prompt += `CONVERSATION RULES:\n`;
    prompt += `- Start with the greeting if this is the first message\n`;
    prompt += `- Ask questions in order, one at a time\n`;
    prompt += `- Use the follow-up response after each answer\n`;
    prompt += `- Don't move to next question until current one is answered\n`;
    prompt += `- Be patient if user needs clarification\n\n`;
    
    // Add conversation history if it exists
    if (transcript && transcript.length > 0) {
        prompt += `CONVERSATION SO FAR:\n`;
        transcript.forEach(message => {
            if (message.role === 'user') {
                prompt += `User: ${message.content}\n`;
            } else if (message.role === 'assistant') {
                prompt += `Assistant: ${message.content}\n`;
            }
        });
        prompt += `\n`;
    }
    
    // Initial greeting or next response instruction
    if (!transcript || transcript.length === 0) {
        prompt += `This is the start of the conversation. Begin with the greeting:\n`;
        prompt += `"${businessProfile.greeting}"\n\n`;
    } else {
        prompt += `Continue the conversation. Respond naturally to the user's last message and guide them through the qualification process.\n\n`;
    }
    
    // Claude response format
    prompt += `Assistant:`;
    
    return prompt;
}

/**
 * Build a classification prompt to analyze completed conversation
 * @param {Array} transcript - Complete conversation transcript
 * @returns {string} - Formatted prompt for lead classification
 */
export function buildClassificationPrompt(transcript) {
    let prompt = '';
    
    prompt += `You are a lead classification expert for ${businessProfile.businessName}.\n`;
    prompt += `Analyze this conversation and classify the lead based on the rules provided.\n\n`;
    
    prompt += `CLASSIFICATION RULES:\n`;
    
    // Hot lead criteria
    prompt += `HOT LEAD:\n`;
    prompt += `- ${businessProfile.rules.hot.description}\n`;
    prompt += `- Budget: ${businessProfile.rules.hot.budgetMinLakhs}+ lakhs\n`;
    prompt += `- Timeline: ${businessProfile.rules.hot.timelineMaxMonths} months or less\n`;
    prompt += `- Keywords: ${businessProfile.rules.hot.keywords.join(', ')}\n\n`;
    
    // Cold lead criteria
    prompt += `COLD LEAD:\n`;
    prompt += `- ${businessProfile.rules.cold.description}\n`;
    if (businessProfile.rules.cold.budgetMaxLakhs) {
        prompt += `- Budget: Under ${businessProfile.rules.cold.budgetMaxLakhs} lakhs\n`;
    }
    if (businessProfile.rules.cold.timelineMinMonths) {
        prompt += `- Timeline: ${businessProfile.rules.cold.timelineMinMonths}+ months\n`;
    }
    prompt += `- Keywords: ${businessProfile.rules.cold.keywords.join(', ')}\n\n`;
    
    // Invalid lead criteria
    prompt += `INVALID LEAD:\n`;
    prompt += `- ${businessProfile.rules.invalid.description}\n`;
    prompt += `- Keywords: ${businessProfile.rules.invalid.keywords.join(', ')}\n\n`;
    
    // Conversation to analyze
    prompt += `CONVERSATION TO ANALYZE:\n`;
    transcript.forEach(message => {
        if (message.role === 'user') {
            prompt += `User: ${message.content}\n`;
        } else if (message.role === 'assistant') {
            prompt += `Assistant: ${message.content}\n`;
        }
    });
    
    prompt += `\nAnalyze this conversation and respond with ONLY a JSON object in this exact format:\n`;
    prompt += `{\n`;
    prompt += `  "status": "hot|cold|invalid",\n`;
    prompt += `  "confidence": 0.95,\n`;
    prompt += `  "reasoning": "Brief explanation of classification",\n`;
    prompt += `  "metadata": {\n`;
    prompt += `    "budget": "extracted budget or null",\n`;
    prompt += `    "timeline": "extracted timeline or null",\n`;
    prompt += `    "location": "extracted location or null",\n`;
    prompt += `    "propertyType": "extracted property type or null"\n`;
    prompt += `  }\n`;
    prompt += `}\n\n`;
    
    prompt += `Assistant:`;
    
    return prompt;
}

/**
 * Extract answers from conversation transcript
 * @param {Array} transcript - Conversation transcript
 * @returns {Object} - Extracted answers mapped to question IDs
 */
export function extractAnswers(transcript) {
    const answers = {};
    const questions = businessProfile.questions;
    
    // Simple extraction logic - can be enhanced with NLP
    transcript.forEach(message => {
        if (message.role === 'user') {
            const userMessage = message.content.toLowerCase();
            
            // Try to match answers to questions based on keywords
            questions.forEach(question => {
                if (!answers[question.id]) {
                    if (question.id === 'location' && (userMessage.includes('location') || userMessage.includes('area') || userMessage.includes('city'))) {
                        answers[question.id] = message.content;
                    } else if (question.id === 'budget' && (userMessage.includes('budget') || userMessage.includes('lakh') || userMessage.includes('crore'))) {
                        answers[question.id] = message.content;
                    } else if (question.id === 'propertyType' && question.options?.some(option => userMessage.includes(option.toLowerCase()))) {
                        answers[question.id] = message.content;
                    } else if (question.id === 'timeline' && (userMessage.includes('month') || userMessage.includes('immediate') || userMessage.includes('soon'))) {
                        answers[question.id] = message.content;
                    }
                }
            });
        }
    });
    
    return answers;
}

export default { buildPrompt, buildClassificationPrompt, extractAnswers }; 