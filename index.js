// GrowEasy - Claude-powered Lead Qualification Chatbot
// ====================================================

// Load environment variables from .env file
import 'dotenv/config';

// Import required packages
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { buildPrompt, buildClassificationPrompt } from './promptBuilder.js';
import { readFileSync, appendFileSync, existsSync } from 'fs';

// Load business profile configuration
const businessProfile = JSON.parse(readFileSync('./businessProfile.json', 'utf8'));

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// CSV file path for leads
const LEADS_CSV_PATH = './leads.csv';

// Function to initialize CSV file with headers if it doesn't exist
function initializeCSV() {
    if (!existsSync(LEADS_CSV_PATH)) {
        const headers = 'timestamp,status,confidence,reasoning,location,budget,timeline,propertyType,transcriptLength,fullTranscript\n';
        appendFileSync(LEADS_CSV_PATH, headers);
        console.log('📊 Created leads.csv with headers');
    }
}

// Function to save lead to CSV
function saveLeadToCSV(timestamp, transcript, classification) {
    try {
        // Extract metadata with safe defaults
        const metadata = classification.metadata || {};
        const location = (metadata.location || '').replace(/"/g, '""'); // Escape quotes
        const budget = (metadata.budget || '').replace(/"/g, '""');
        const timeline = (metadata.timeline || '').replace(/"/g, '""');
        const propertyType = (metadata.propertyType || '').replace(/"/g, '""');
        
        // Convert transcript to string and escape quotes
        const transcriptString = JSON.stringify(transcript).replace(/"/g, '""');
        
        // Create CSV row
        const csvRow = `"${timestamp}","${classification.status}","${classification.confidence || 0}","${(classification.reasoning || '').replace(/"/g, '""')}","${location}","${budget}","${timeline}","${propertyType}","${transcript.length}","${transcriptString}"\n`;
        
        // Append to CSV file
        appendFileSync(LEADS_CSV_PATH, csvRow);
        
        console.log(`💾 Lead saved to CSV: ${classification.status} lead at ${timestamp}`);
        return true;
    } catch (error) {
        console.error('❌ Error saving lead to CSV:', error);
        return false;
    }
}

// Initialize CSV file on startup
initializeCSV();

// CORS middleware to allow React frontend communication
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Middleware for parsing JSON requests
app.use(express.json());

// In-memory transcript storage for conversation state
let transcript = [];

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
        
        // Add user message to transcript
        transcript.push({
            role: 'user',
            content: message.trim(),
            timestamp: new Date().toISOString()
        });
        
        console.log(`📝 User message added to transcript. Total messages: ${transcript.length}`);
        
        // Count how many user messages we have (equals number of questions answered)
        const userMessages = transcript.filter(msg => msg.role === 'user');
        const questionsAnswered = userMessages.length;
        const totalQuestions = businessProfile.questions.length;
        
        console.log(`❓ Questions answered: ${questionsAnswered}/${totalQuestions}`);
        
        // Check if we've completed all questions
        if (questionsAnswered > totalQuestions) {
            // All questions answered - time to classify
            console.log('🎯 All questions answered, starting classification...');
            
            // Build classification prompt
            const classificationPrompt = buildClassificationPrompt(transcript);
            
            // Send to Claude for classification
            const classificationResponse = await anthropic.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 500,
                messages: [{
                    role: 'user',
                    content: classificationPrompt
                }]
            });
            
            // Parse Claude's classification response
            let classification;
            try {
                const classificationText = classificationResponse.content[0].text.trim();
                console.log('🤖 Raw classification response:', classificationText);
                classification = JSON.parse(classificationText);
            } catch (parseError) {
                console.error('❌ Failed to parse classification JSON:', parseError);
                classification = {
                    status: "invalid",
                    confidence: 0.5,
                    reasoning: "Failed to parse classification",
                    metadata: {}
                };
            }
            
            // Get the appropriate final message based on classification
            const finalMessage = businessProfile.classification[classification.status]?.message || 
                "Thank you for your time. We'll be in touch soon!";
            
            // Add final assistant message to transcript
            transcript.push({
                role: 'assistant',
                content: finalMessage,
                timestamp: new Date().toISOString()
            });
            
            console.log(`✅ Lead classified as: ${classification.status}`);
            
            // Save lead to CSV
            const csvSaved = saveLeadToCSV(new Date().toISOString(), transcript, classification);
            
            // Return final response with classification
            return res.json({
                success: true,
                reply: finalMessage,
                isComplete: true,
                classification: classification,
                transcript: transcript,
                metadata: {
                    input_tokens: classificationResponse.usage.input_tokens,
                    output_tokens: classificationResponse.usage.output_tokens,
                    model: classificationResponse.model,
                    totalQuestions: totalQuestions,
                    questionsAnswered: questionsAnswered
                }
            });
        } else {
            // Still have questions to ask - continue conversation
            console.log('💬 Continuing conversation...');
            
            // Build conversation prompt with current transcript
            const conversationPrompt = buildPrompt(transcript);
            
            // Send to Claude for next question/response
            const response = await anthropic.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 500,
                messages: [{
                    role: 'user',
                    content: conversationPrompt
                }]
            });
            
            // Extract Claude's response
            const reply = response.content[0].text.trim();
            
            // Add Claude's response to transcript
            transcript.push({
                role: 'assistant',
                content: reply,
                timestamp: new Date().toISOString()
            });
            
            console.log(`🤖 Claude response added to transcript. Total messages: ${transcript.length}`);
            
            // Return response for continued conversation
            return res.json({
                success: true,
                reply: reply,
                isComplete: false,
                progress: {
                    questionsAnswered: questionsAnswered,
                    totalQuestions: totalQuestions,
                    nextQuestion: questionsAnswered < totalQuestions ? 
                        businessProfile.questions[questionsAnswered].text : null
                },
                metadata: {
                    input_tokens: response.usage.input_tokens,
                    output_tokens: response.usage.output_tokens,
                    model: response.model
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Chat endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

// Reset conversation endpoint (for testing)
app.post('/reset', (req, res) => {
    transcript = [];
    console.log('🔄 Transcript reset - starting fresh conversation');
    res.json({
        success: true,
        message: 'Conversation reset successfully',
        timestamp: new Date().toISOString()
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 GrowEasy server running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/`);
    console.log(`🤖 Test Claude: http://localhost:${PORT}/test-claude`);
    console.log(`💬 Chat endpoint: POST http://localhost:${PORT}/chat`);
    console.log(`🔄 Reset conversation: POST http://localhost:${PORT}/reset`);
    console.log(`📝 Send JSON: {"message": "your message here"}`);
    console.log(`📊 Total questions configured: ${businessProfile.questions.length}`);
    console.log(`🏢 Business: ${businessProfile.businessName}`);
}); 