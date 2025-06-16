// GrowEasy - Claude API Smoke Test
// ================================
// This file tests the Claude API integration
// 
// USAGE: Uncomment all code below and run: node test-claude.js
// 
// Last Test Results:
// ✅ API key: 108 chars, Valid format
// ✅ Model: claude-3-5-sonnet-20241022 
// ✅ Response: 429 chars, mentions real estate
// ✅ Tokens: 26 input, 89 output
// ✅ Status: PASSED - Ready for lead qualification!

/* COMMENTED OUT - UNCOMMENT TO RUN TEST

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

console.log('🧪 Claude API Smoke Test');
console.log('========================');

// Check environment setup
console.log('📋 Checking environment...');
const apiKey = process.env.CLAUDE_API_KEY;

if (!apiKey) {
    console.error('❌ CLAUDE_API_KEY not found in environment');
    console.error('🔧 Make sure .env file exists with your API key');
    process.exit(1);
}

if (apiKey === 'YOUR_KEY_HERE') {
    console.error('❌ API key is still placeholder');
    console.error('🔧 Replace YOUR_KEY_HERE in .env with your actual Claude API key');
    process.exit(1);
}

console.log('✅ API key found (length:', apiKey.length, 'chars)');
console.log('✅ API key format:', apiKey.startsWith('sk-ant-') ? 'Valid' : 'Invalid');

// Initialize Anthropic client
console.log('\n🤖 Initializing Claude client...');
const anthropic = new Anthropic({
    apiKey: apiKey,
});
console.log('✅ Claude client initialized');

// Test Claude API call
console.log('\n🚀 Testing Claude API...');
console.log('📤 Sending message: "Say hello and introduce yourself"');

try {
    const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 150,
        messages: [{
            role: 'user',
            content: 'Say hello and introduce yourself briefly. Also confirm that you can help with real estate lead qualification.'
        }]
    });

    console.log('✅ API call successful!');
    console.log('\n📥 Claude Response:');
    console.log('='.repeat(50));
    console.log(response.content[0].text);
    console.log('='.repeat(50));
    
    // Response analysis
    console.log('\n📊 Response Analysis:');
    console.log('🔤 Response length:', response.content[0].text.length, 'characters');
    console.log('💰 Usage - Input tokens:', response.usage.input_tokens);
    console.log('💰 Usage - Output tokens:', response.usage.output_tokens);
    console.log('🎯 Model used:', response.model);
    
    // Test if response mentions real estate
    const mentions_real_estate = response.content[0].text.toLowerCase().includes('real estate') ||
                                 response.content[0].text.toLowerCase().includes('property') ||
                                 response.content[0].text.toLowerCase().includes('lead');
    console.log('🏠 Mentions real estate concepts:', mentions_real_estate ? 'Yes' : 'No');
    
    console.log('\n🎉 Claude API smoke test PASSED!');
    console.log('🚀 Ready for lead qualification conversations!');

} catch (error) {
    console.error('\n❌ Claude API test FAILED!');
    console.error('🔍 Error details:');
    console.error('   Type:', error.constructor.name);
    console.error('   Message:', error.message);
    
    if (error.status) {
        console.error('   HTTP Status:', error.status);
    }
    
    if (error.message.includes('401')) {
        console.error('\n🔧 Troubleshooting:');
        console.error('   - Check if your API key is correct');
        console.error('   - Verify API key has proper permissions');
        console.error('   - Make sure API key is not expired');
    } else if (error.message.includes('rate_limit')) {
        console.error('\n🔧 Troubleshooting:');
        console.error('   - API rate limit exceeded');
        console.error('   - Wait a moment and try again');
    } else if (error.message.includes('model')) {
        console.error('\n🔧 Troubleshooting:');
        console.error('   - Model might not be available');
        console.error('   - Check Anthropic documentation for available models');
    }
    
    process.exit(1);
} 

*/