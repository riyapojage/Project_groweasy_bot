// GrowEasy - Claude-powered Lead Qualification Chatbot
// ====================================================

// Load environment variables from .env file
import 'dotenv/config';

// Import required packages
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON requests
app.use(express.json());

// Initialize Claude client
const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
});

// Basic health check endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'GrowEasy Chatbot Server is running!',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint to verify Claude connection
app.get('/test-claude', async (req, res) => {
    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 100,
            messages: [{
                role: 'user',
                content: 'Say hello and confirm you are Claude AI assistant.'
            }]
        });
        
        res.json({
            success: true,
            claude_response: response.content[0].text
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 GrowEasy server running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/`);
    console.log(`🤖 Test Claude: http://localhost:${PORT}/test-claude`);
}); 