const Anthropic = require('@anthropic-ai/sdk');
const { buildConversationPrompt, buildClassificationPrompt, loadBusinessProfile } = require('./utils/promptBuilder.js');

// In-memory transcript storage (in production, use a database)
let transcript = [];

exports.handler = async (event, context) => {
  // Initialize Claude client with API key check
  if (!process.env.CLAUDE_API_KEY) {
    console.error('❌ Claude API key not found in environment variables');
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: 'Service configuration error',
        code: 'AUTH_ERROR'
      })
    };
  }

  const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
  });

  // Load business profile
  let businessProfile;
  try {
    businessProfile = loadBusinessProfile();
  } catch (error) {
    console.error('❌ Failed to load business profile:', error);
    businessProfile = {
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
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { message } = JSON.parse(event.body);

    // Validate input
    if (!message || typeof message !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Message is required and must be a string',
          code: 'EMPTY_MESSAGE'
        })
      };
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Message cannot be empty',
          code: 'EMPTY_MESSAGE'
        })
      };
    }

    if (trimmedMessage.length > 1000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Message is too long (max 1000 characters)',
          code: 'MESSAGE_TOO_LONG'
        })
      };
    }

    // Add user message to transcript
    const userMessage = {
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date().toISOString()
    };
    transcript.push(userMessage);

    // Build conversation prompt
    const conversationPrompt = buildConversationPrompt(transcript, businessProfile);

    // Get Claude's response
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: conversationPrompt
        }
      ],
      temperature: 0.7
    });

    if (!response || !response.content || !response.content[0]) {
      throw new Error('Invalid response from Claude');
    }

    const claudeReply = response.content[0].text.trim();

    // Add Claude's response to transcript
    const assistantMessage = {
      role: 'assistant',
      content: claudeReply,
      timestamp: new Date().toISOString()
    };
    transcript.push(assistantMessage);

    // Check if conversation should end (simple heuristic)
    const shouldClassify = transcript.length >= 8 || 
                          claudeReply.toLowerCase().includes('thank') ||
                          claudeReply.toLowerCase().includes('contact') ||
                          claudeReply.toLowerCase().includes('wrap up');

    let classification = null;
    let isComplete = false;

    if (shouldClassify) {
      try {
        const classificationPrompt = buildClassificationPrompt(transcript, businessProfile);
        
        const classificationResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: classificationPrompt
            }
          ],
          temperature: 0.1
        });

        if (classificationResponse && classificationResponse.content && classificationResponse.content[0]) {
          const classificationText = classificationResponse.content[0].text.trim();
          
          // Extract JSON from response
          const jsonMatch = classificationText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            classification = JSON.parse(jsonMatch[0]);
            isComplete = true;
            
            console.log(`📊 Lead classified as: ${classification.status} (confidence: ${classification.confidence})`);
          }
        }
      } catch (classError) {
        console.error('❌ Classification error:', classError);
        // Continue without classification
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        reply: claudeReply,
        isComplete,
        classification,
        transcriptLength: transcript.length
      })
    };

  } catch (error) {
    console.error('❌ Chat error:', error);
    
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = 'Failed to process chat message';
    let statusCode = 500;

    if (error.status === 401) {
      errorCode = 'AUTH_ERROR';
      errorMessage = 'Authentication failed';
    } else if (error.status === 429) {
      errorCode = 'RATE_LIMIT';
      errorMessage = 'Rate limit exceeded';
      statusCode = 429;
    } else if (error.name === 'SyntaxError') {
      errorCode = 'INVALID_JSON';
      errorMessage = 'Invalid request format';
      statusCode = 400;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        code: errorCode
      })
    };
  }
}; 