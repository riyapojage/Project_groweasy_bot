// GrowEasy - Claude-powered Lead Qualification Chatbot
// ====================================================

// Load environment variables from .env file
import 'dotenv/config';

// Import required packages
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { buildPrompt, buildClassificationPrompt, buildConversationPrompt, loadBusinessProfile } from './promptBuilder.js';
import { readFileSync, appendFileSync, existsSync } from 'fs';

// Load business profile configuration
const businessProfile = loadBusinessProfile();

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
        // Validate inputs
        if (!timestamp || !transcript || !classification) {
            console.error('❌ saveLeadToCSV: Missing required parameters');
            return false;
        }

        if (!Array.isArray(transcript)) {
            console.error('❌ saveLeadToCSV: Transcript must be an array');
            return false;
        }

        // Extract metadata with safe defaults and validation
        const metadata = classification.metadata || {};
        
        // Clean and escape data for CSV
        const cleanString = (str) => {
            if (typeof str !== 'string') return '';
            return str.replace(/"/g, '""').replace(/\r?\n/g, ' ');
        };

        const location = cleanString(metadata.location || '');
        const budget = cleanString(metadata.budget || '');
        const timeline = cleanString(metadata.timeline || '');
        const propertyType = cleanString(metadata.propertyType || '');
        
        // Validate classification data
        const status = classification.status || 'unknown';
        const confidence = (typeof classification.confidence === 'number') ? 
            classification.confidence : 0;
        const reasoning = cleanString(classification.reasoning || 'No reasoning provided');
        
        // Convert transcript to string and escape quotes safely
        let transcriptString;
        try {
            transcriptString = JSON.stringify(transcript).replace(/"/g, '""');
        } catch (jsonError) {
            console.error('❌ Error stringifying transcript:', jsonError);
            transcriptString = 'Error: Could not serialize transcript';
        }
        
        // Create CSV row with proper escaping
        const csvRow = `"${timestamp}","${status}","${confidence}","${reasoning}","${location}","${budget}","${timeline}","${propertyType}","${transcript.length}","${transcriptString}"\n`;
        
        // Append to CSV file with error handling
        try {
            appendFileSync(LEADS_CSV_PATH, csvRow);
            console.log(`💾 Lead saved to CSV: ${status} lead at ${timestamp}`);
            return true;
        } catch (fileError) {
            console.error('❌ File system error saving to CSV:', fileError);
            
            // Try to create directory if it doesn't exist
            try {
                const path = require('path');
                const fs = require('fs');
                const dir = path.dirname(LEADS_CSV_PATH);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                    appendFileSync(LEADS_CSV_PATH, csvRow);
                    console.log(`💾 Created directory and saved lead to CSV: ${status} lead`);
                    return true;
                }
            } catch (retryError) {
                console.error('❌ Retry failed - could not save to CSV:', retryError);
            }
            
            return false;
        }
    } catch (error) {
        console.error('❌ Unexpected error in saveLeadToCSV:', error);
        console.error('❌ Error stack:', error.stack);
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
    try {
        const healthInfo = {
            message: 'GrowEasy Chatbot Server is running!',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            uptime: process.uptime(),
            transcriptLength: transcript.length,
            environment: {
                node: process.version,
                platform: process.platform,
                memory: process.memoryUsage()
            }
        };
        
        res.json(healthInfo);
    } catch (error) {
        console.error('❌ Health check error:', error);
        res.status(500).json({
            message: 'Health check failed',
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Internal server error'
        });
    }
});

// Test endpoint to verify Claude connection
app.get('/test-claude', async (req, res) => {
    try {
        console.log('🧪 Testing Claude connection...');
        
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 100,
            messages: [{
                role: 'user',
                content: 'Say hello and confirm you are Claude AI assistant.'
            }]
        });
        
        if (!response || !response.content || !response.content[0]) {
            throw new Error('Invalid response structure from Claude');
        }
        
        console.log('✅ Claude connection test successful');
        res.json({
            success: true,
            claude_response: response.content[0].text,
            model: response.model,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Claude connection test failed:', error);
        
        // Provide specific error messages based on error type
        let errorMessage = 'Claude AI service test failed';
        let statusCode = 500;
        
        if (error.status === 401) {
            errorMessage = 'Claude API authentication failed. Please check API key.';
            statusCode = 500; // Don't expose auth details to client
        } else if (error.status === 429) {
            errorMessage = 'Claude API rate limit exceeded. Please try again later.';
            statusCode = 429;
        } else if (error.status >= 500) {
            errorMessage = 'Claude API service is temporarily unavailable.';
            statusCode = 500;
        } else if (error.message.includes('network') || error.code === 'ENOTFOUND') {
            errorMessage = 'Network connection to Claude API failed.';
        }
        
        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

// Main chat endpoint for lead qualification
app.post('/chat', async (req, res) => {
    try {
        // Extract message from request body with enhanced validation
        const { message } = req.body;
        
        // Validate message input
        if (!message || typeof message !== 'string') {
            console.warn('⚠️ Invalid message input received:', typeof message);
            return res.status(400).json({
                success: false,
                error: 'Message is required and must be a string',
                code: 'INVALID_INPUT'
            });
        }

        // Validate message length
        if (message.trim().length === 0) {
            console.warn('⚠️ Empty message received');
            return res.status(400).json({
                success: false,
                error: 'Message cannot be empty',
                code: 'EMPTY_MESSAGE'
            });
        }

        if (message.length > 1000) {
            console.warn('⚠️ Message too long:', message.length, 'characters');
            return res.status(400).json({
                success: false,
                error: 'Message is too long. Please keep it under 1000 characters.',
                code: 'MESSAGE_TOO_LONG'
            });
        }
        
        // Add user message to transcript
        try {
            transcript.push({
                role: 'user',
                content: message.trim(),
                timestamp: new Date().toISOString()
            });
            console.log(`📝 User message added to transcript. Total messages: ${transcript.length}`);
        } catch (transcriptError) {
            console.error('❌ Error adding message to transcript:', transcriptError);
            return res.status(500).json({
                success: false,
                error: 'Something went wrong while processing your message. Please try again.',
                code: 'TRANSCRIPT_ERROR'
            });
        }
        
        // Count how many user messages we have (equals number of questions answered)
        const userMessages = transcript.filter(msg => msg.role === 'user');
        const questionsAnswered = userMessages.length;
        const totalQuestions = businessProfile.questions.length;
        
        console.log(`❓ Questions answered: ${questionsAnswered}/${totalQuestions}`);
        
        // Check if we've completed all questions
        if (questionsAnswered > totalQuestions) {
            // All questions answered - time to classify
            console.log('🎯 All questions answered, starting classification...');
            
            try {
                // Build enhanced classification prompt with error handling
                let classificationPrompt;
                try {
                    classificationPrompt = buildClassificationPrompt(transcript, businessProfile);
                } catch (promptError) {
                    console.error('❌ Error building classification prompt:', promptError);
                    return res.status(500).json({
                        success: false,
                        error: 'Something went wrong while preparing your conversation analysis. Please try again.',
                        code: 'PROMPT_BUILD_ERROR'
                    });
                }
                
                // Send to Claude for classification with enhanced error handling
                let classificationResponse;
                try {
                    console.log('🤖 Sending classification request to Claude...');
                    classificationResponse = await anthropic.messages.create({
                        model: 'claude-3-5-sonnet-20241022',
                        max_tokens: 500,
                        messages: [{
                            role: 'user',
                            content: classificationPrompt
                        }]
                    });
                    console.log('✅ Claude classification response received');
                } catch (claudeError) {
                    console.error('❌ Claude API error during classification:', claudeError);
                    
                    // Handle different types of Claude API errors
                    if (claudeError.status === 401) {
                        return res.status(500).json({
                            success: false,
                            error: 'AI service authentication failed. Please contact support.',
                            code: 'AUTH_ERROR'
                        });
                    } else if (claudeError.status === 429) {
                        return res.status(429).json({
                            success: false,
                            error: 'AI service is busy. Please try again in a moment.',
                            code: 'RATE_LIMIT'
                        });
                    } else if (claudeError.status >= 500) {
                        return res.status(500).json({
                            success: false,
                            error: 'AI service is temporarily unavailable. Please try again later.',
                            code: 'SERVICE_UNAVAILABLE'
                        });
                    } else {
                        return res.status(500).json({
                            success: false,
                            error: 'Something went wrong while analyzing your responses. Please try again.',
                            code: 'CLAUDE_ERROR'
                        });
                    }
                }
                
                // Parse Claude's classification response with enhanced error handling
                let classification;
                try {
                    const classificationText = classificationResponse.content[0].text.trim();
                    console.log('🤖 Raw classification response:', classificationText);
                    
                    // Attempt to parse JSON
                    classification = JSON.parse(classificationText);
                    
                    // Validate classification structure (handle both old and new formats)
                    const status = classification.status || classification.classification;
                    const validStatuses = ['hot', 'cold', 'invalid', 'hot_premium', 'hot_standard', 'warm_nurture', 'cold_long_term', 'invalid_spam'];
                    
                    if (!status || !validStatuses.some(s => status.toLowerCase().includes(s.toLowerCase()))) {
                        throw new Error('Invalid classification status');
                    }
                    
                    // Normalize status to old format for compatibility
                    if (status.includes('hot')) {
                        classification.status = 'hot';
                    } else if (status.includes('cold') || status.includes('warm')) {
                        classification.status = 'cold';
                    } else if (status.includes('invalid')) {
                        classification.status = 'invalid';
                    }
                    
                    console.log('✅ Classification parsed successfully:', classification.status);
                } catch (parseError) {
                    console.error('❌ Failed to parse classification JSON:', parseError);
                    console.error('❌ Raw response was:', classificationResponse.content[0]?.text);
                    
                    // Fallback classification with detailed reasoning
                    classification = {
                        status: "invalid",
                        confidence: 0.1,
                        reasoning: "System error during classification analysis",
                        metadata: {
                            error: "JSON_PARSE_ERROR",
                            fallback: true
                        }
                    };
                    console.log('🔄 Using fallback classification');
                }
                
                // Get the appropriate final message with error handling
                let finalMessage;
                try {
                    finalMessage = businessProfile.classification[classification.status]?.message || 
                        "Thank you for your time. We'll be in touch soon!";
                } catch (messageError) {
                    console.error('❌ Error getting final message:', messageError);
                    finalMessage = "Thank you for your time. We'll be in touch soon!";
                }
                
                // Add final assistant message to transcript
                try {
                    transcript.push({
                        role: 'assistant',
                        content: finalMessage,
                        timestamp: new Date().toISOString()
                    });
                } catch (transcriptError) {
                    console.error('❌ Error adding final message to transcript:', transcriptError);
                    // Continue anyway - this isn't critical
                }
                
                console.log(`✅ Lead classified as: ${classification.status}`);
                
                // Save lead to CSV with error handling
                let csvSaved = false;
                try {
                    csvSaved = saveLeadToCSV(new Date().toISOString(), transcript, classification);
                    if (!csvSaved) {
                        console.warn('⚠️ Failed to save lead to CSV - continuing anyway');
                    }
                } catch (csvError) {
                    console.error('❌ Error saving to CSV:', csvError);
                    // Don't fail the request due to CSV error
                }
                
                // Return final response with classification
                return res.json({
                    success: true,
                    reply: finalMessage,
                    isComplete: true,
                    classification: classification,
                    transcript: transcript,
                    metadata: {
                        input_tokens: classificationResponse.usage?.input_tokens || 0,
                        output_tokens: classificationResponse.usage?.output_tokens || 0,
                        model: classificationResponse.model || 'unknown',
                        totalQuestions: totalQuestions,
                        questionsAnswered: questionsAnswered,
                        csvSaved: csvSaved
                    }
                });
                
            } catch (classificationError) {
                console.error('❌ Unexpected error during classification:', classificationError);
                return res.status(500).json({
                    success: false,
                    error: 'Something went wrong while analyzing your responses. Please try again later.',
                    code: 'CLASSIFICATION_ERROR'
                });
            }
        } else {
            // Still have questions to ask - continue conversation
            console.log('💬 Continuing conversation...');
            
            try {
                // Build enhanced conversation prompt with error handling
                let conversationPrompt;
                try {
                    conversationPrompt = buildConversationPrompt(transcript, businessProfile);
                } catch (promptError) {
                    console.error('❌ Error building conversation prompt:', promptError);
                    return res.status(500).json({
                        success: false,
                        error: 'Something went wrong while preparing the conversation. Please try again.',
                        code: 'PROMPT_BUILD_ERROR'
                    });
                }
                
                // Send to Claude for next question/response with enhanced error handling
                let response;
                try {
                    console.log('🤖 Sending conversation request to Claude...');
                    response = await anthropic.messages.create({
                        model: 'claude-3-5-sonnet-20241022',
                        max_tokens: 500,
                        messages: [{
                            role: 'user',
                            content: conversationPrompt
                        }]
                    });
                    console.log('✅ Claude conversation response received');
                } catch (claudeError) {
                    console.error('❌ Claude API error during conversation:', claudeError);
                    
                    // Handle different types of Claude API errors
                    if (claudeError.status === 401) {
                        return res.status(500).json({
                            success: false,
                            error: 'AI service authentication failed. Please contact support.',
                            code: 'AUTH_ERROR'
                        });
                    } else if (claudeError.status === 429) {
                        return res.status(429).json({
                            success: false,
                            error: 'AI service is busy. Please try again in a moment.',
                            code: 'RATE_LIMIT'
                        });
                    } else if (claudeError.status >= 500) {
                        return res.status(500).json({
                            success: false,
                            error: 'AI service is temporarily unavailable. Please try again later.',
                            code: 'SERVICE_UNAVAILABLE'
                        });
                    } else {
                        return res.status(500).json({
                            success: false,
                            error: 'Something went wrong while getting the next question. Please try again.',
                            code: 'CLAUDE_ERROR'
                        });
                    }
                }
                
                // Extract Claude's response with error handling
                let reply;
                try {
                    reply = response.content[0].text.trim();
                    if (!reply) {
                        throw new Error('Empty response from Claude');
                    }
                } catch (responseError) {
                    console.error('❌ Error extracting Claude response:', responseError);
                    return res.status(500).json({
                        success: false,
                        error: 'Something went wrong while processing the AI response. Please try again.',
                        code: 'RESPONSE_PARSE_ERROR'
                    });
                }
                
                // Add Claude's response to transcript
                try {
                    transcript.push({
                        role: 'assistant',
                        content: reply,
                        timestamp: new Date().toISOString()
                    });
                    console.log(`🤖 Claude response added to transcript. Total messages: ${transcript.length}`);
                } catch (transcriptError) {
                    console.error('❌ Error adding Claude response to transcript:', transcriptError);
                    // Continue anyway - we can still return the response
                }
                
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
                        input_tokens: response.usage?.input_tokens || 0,
                        output_tokens: response.usage?.output_tokens || 0,
                        model: response.model || 'unknown'
                    }
                });
                
            } catch (conversationError) {
                console.error('❌ Unexpected error during conversation:', conversationError);
                return res.status(500).json({
                    success: false,
                    error: 'Something went wrong while continuing the conversation. Please try again later.',
                    code: 'CONVERSATION_ERROR'
                });
            }
        }
        
    } catch (error) {
        console.error('❌ Unexpected chat endpoint error:', error);
        console.error('❌ Error stack:', error.stack);
        
        // Generic fallback error
        res.status(500).json({
            success: false,
            error: 'Something went wrong. Please try again later.',
            code: 'UNEXPECTED_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

// Reset conversation endpoint (for testing)
app.post('/reset', (req, res) => {
    try {
        const oldLength = transcript.length;
        transcript = [];
        console.log(`🔄 Transcript reset - cleared ${oldLength} messages`);
        
        res.json({
            success: true,
            message: 'Conversation reset successfully',
            timestamp: new Date().toISOString(),
            previousLength: oldLength
        });
    } catch (error) {
        console.error('❌ Error resetting conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Something went wrong while resetting the conversation. Please try again.',
            code: 'RESET_ERROR',
            timestamp: new Date().toISOString()
        });
    }
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

// Global error handler for unhandled errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('❌ Stack trace:', error.stack);
    // Don't exit in production, log and continue
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('❌ Reason:', reason);
    // Don't exit in production, log and continue
}); 