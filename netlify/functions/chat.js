const Anthropic = require('@anthropic-ai/sdk');
const { loadBusinessProfile, buildClassificationPrompt } = require('./utils/promptBuilder.js');

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

  // Load business profile
  let businessProfile;
  try {
    businessProfile = loadBusinessProfile();
  } catch (error) {
    console.error('❌ Failed to load business profile:', error);
    businessProfile = {
      companyName: "GrowEasy Real Estate",
      industry: "Real Estate",
      questions: [
        { id: "location", text: "Hi! I'm here to help you find your perfect property. Which city/area are you looking to buy in?", required: true },
        { id: "property_type", text: "What type of property are you interested in? (1BHK, 2BHK, 3BHK, villa, etc.)", required: true },
        { id: "budget", text: "What's your budget range for this property?", required: true },
        { id: "timeline", text: "When are you planning to make this purchase?", required: true }
      ]
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

    // Add user message to transcript
    const userMessage = {
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date().toISOString()
    };
    transcript.push(userMessage);

    // Get questions from business profile
    const questions = businessProfile.questions || [];
    const totalQuestions = questions.length;
    
    // Count user messages to track progress
    const userMessages = transcript.filter(msg => msg.role === 'user').length;
    const assistantMessages = transcript.filter(msg => msg.role === 'assistant').length;
    
    console.log(`❓ Questions answered: ${userMessages}/${totalQuestions}`);
    console.log(`📊 Transcript: ${userMessages} user messages, ${assistantMessages} assistant messages`);

    // Check if all questions have been answered
    if (userMessages >= totalQuestions) {
      // Time to classify the lead
      console.log('🎯 All questions answered, classifying lead...');
      
      let classification = null;
      try {
        const anthropic = new Anthropic({
          apiKey: process.env.CLAUDE_API_KEY,
        });

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
            console.log(`📊 Lead classified as: ${classification.status} (confidence: ${classification.confidence})`);
          }
        }
      } catch (classError) {
        console.error('❌ Classification error:', classError);
        classification = {
          status: 'error',
          confidence: 0,
          reasoning: 'Classification failed'
        };
      }
      
      // Final message based on classification
      let finalMessage = "Thank you for providing all the information! Our team will review your requirements and get back to you soon.";
      
      if (classification) {
        const status = classification.status;
        if (status === 'hot') {
          finalMessage = "Excellent! You seem like a serious buyer. Our senior consultant will contact you within 24 hours with the best properties matching your needs.";
        } else if (status === 'warm') {
          finalMessage = "Thank you for your interest! We'll send you some property options that match your criteria and keep you updated with new listings.";
        } else if (status === 'cold') {
          finalMessage = "Thanks for sharing your requirements. We'll add you to our newsletter and keep you updated with properties in your range.";
        }
      }
      
      // Add final message to transcript
      transcript.push({
        role: 'assistant',
        content: finalMessage,
        timestamp: new Date().toISOString()
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          reply: finalMessage,
          isComplete: true,
          classification: classification,
          metadata: {
            totalQuestions: totalQuestions,
            questionsAnswered: userMessages
          }
        })
      };
      
    } else {
      // Ask the next question
      const nextQuestionIndex = assistantMessages; // Assistant messages count = next question index
      const nextQuestion = questions[nextQuestionIndex];
      
      if (!nextQuestion) {
        console.log(`❌ No question found at index ${nextQuestionIndex}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            reply: "Thank you for your time!",
            isComplete: true
          })
        };
      }
      
      // Use the question text directly - no Claude involved for questions
      const questionText = nextQuestion.text;
      
      // Add question to transcript
      transcript.push({
        role: 'assistant',
        content: questionText,
        timestamp: new Date().toISOString()
      });
      
      console.log(`🤖 Asked question ${nextQuestionIndex + 1}/${totalQuestions}: ${nextQuestion.id}`);
      console.log(`📝 Question: "${questionText}"`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          reply: questionText,
          isComplete: false,
          progress: {
            questionsAnswered: userMessages,
            totalQuestions: totalQuestions,
            currentQuestion: nextQuestion.id,
            nextQuestionNumber: nextQuestionIndex + 1
          }
        })
      };
    }

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
    } else if (error.message && error.message.includes('timeout')) {
      errorCode = 'TIMEOUT_ERROR';
      errorMessage = 'Request timed out, please try again';
      statusCode = 504;
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