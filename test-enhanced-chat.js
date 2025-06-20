// Test Enhanced Chat Capabilities
// ===============================

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';

async function testEnhancedConversation() {
    console.log('🚀 Testing Enhanced GrowEasy Conversation...\n');
    
    // Reset conversation
    try {
        await fetch(`${API_BASE}/reset`, { method: 'POST' });
        console.log('🔄 Conversation reset\n');
    } catch (error) {
        console.error('❌ Failed to reset:', error.message);
        return;
    }
    
    // Test messages that should trigger enhanced responses
    const testMessages = [
        "Hi, I'm looking to buy my first home",
        "I work in IT in Bangalore and need something near Electronic City",
        "We're a family of 4 with two young kids, need good schools nearby",
        "Our budget is around 80 lakhs, is that realistic for a 3BHK?",
        "We want to move in the next 6 months, maybe sooner if we find the right place",
        "We've never bought property before, a bit nervous about the process"
    ];
    
    for (let i = 0; i < testMessages.length; i++) {
        const message = testMessages[i];
        console.log(`👤 USER: ${message}`);
        
        try {
            const response = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log(`🤖 PRIYA: ${data.reply}\n`);
                
                if (data.isComplete) {
                    console.log('✅ CONVERSATION COMPLETE!');
                    console.log('📊 CLASSIFICATION:', JSON.stringify(data.classification, null, 2));
                    break;
                }
            } else {
                console.error('❌ Error:', data.error);
            }
            
            // Small delay between messages
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error('❌ Request failed:', error.message);
        }
    }
}

// Run the test
testEnhancedConversation().catch(console.error); 