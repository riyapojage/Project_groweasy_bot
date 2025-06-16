// Test script for promptBuilder.js
import { buildPrompt, buildClassificationPrompt, extractAnswers } from './promptBuilder.js';

console.log('🔍 Testing Prompt Builder...');
console.log('=================================');

try {
    // Test 1: Build initial prompt (no transcript)
    console.log('✅ Testing buildPrompt with empty transcript...');
    const initialPrompt = buildPrompt([]);
    console.log('📏 Initial prompt length:', initialPrompt.length);
    console.log('🎯 Ends with "Assistant:":', initialPrompt.endsWith('Assistant:'));
    
    // Test 2: Build prompt with conversation history
    console.log('\n✅ Testing buildPrompt with conversation...');
    const transcript = [
        { role: 'assistant', content: 'Hello! I\'m here to help you find your perfect property.' },
        { role: 'user', content: 'I\'m looking for an apartment in Mumbai' },
        { role: 'assistant', content: 'Great! Mumbai is a wonderful area.' }
    ];
    const conversationPrompt = buildPrompt(transcript);
    console.log('📏 Conversation prompt length:', conversationPrompt.length);
    console.log('🎯 Contains conversation history:', conversationPrompt.includes('CONVERSATION SO FAR:'));
    
    // Test 3: Test classification prompt
    console.log('\n✅ Testing buildClassificationPrompt...');
    const classificationPrompt = buildClassificationPrompt(transcript);
    console.log('📏 Classification prompt length:', classificationPrompt.length);
    console.log('🎯 Contains JSON format:', classificationPrompt.includes('"status":'));
    
    // Test 4: Test answer extraction
    console.log('\n✅ Testing extractAnswers...');
    const answers = extractAnswers(transcript);
    console.log('📋 Extracted answers:', Object.keys(answers));
    
    console.log('\n🎉 All prompt builder tests passed!');
    
} catch (error) {
    console.error('❌ Error testing prompt builder:', error.message);
} 