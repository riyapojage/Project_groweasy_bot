// GrowEasy - Claude-powered Lead Qualification Chatbot
// ====================================================

// Load environment variables from .env file
import 'dotenv/config';

// Import required packages
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { buildPrompt } from './promptBuilder.js';

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

// Main chat endpoint for lead qualification
app.post('/chat', async (req, res) => {
    try {
        // Extract message from request body
        const { message } = req.body;
        
        // Validate message input
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Message is required and must be a string'
            });
        }
        
        // Build prompt using promptBuilder
        const conversationHistory = [message]; // For now, treating single message as conversation
        const prompt = buildPrompt(conversationHistory);
        
        // Send prompt to Claude
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 500,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });
        
        // Extract Claude's response
        const reply = response.content[0].text;
        
        // Return response in expected format
        res.json({
            success: true,
            reply: reply,
            metadata: {
                input_tokens: response.usage.input_tokens,
                output_tokens: response.usage.output_tokens,
                model: response.model
            }
        });
        
    } catch (error) {
        console.error('Chat endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 GrowEasy server running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/`);
    console.log(`🤖 Test Claude: http://localhost:${PORT}/test-claude`);
    console.log(`💬 Chat endpoint: POST http://localhost:${PORT}/chat`);
    console.log(`📝 Send JSON: {"message": "your message here"}`);
}); 