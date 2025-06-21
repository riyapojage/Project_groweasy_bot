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
        { id: "location", text: "🏠 **Which city/area are you looking to buy in?**", type: "text", required: true, acknowledgment: "Great choice! Let's find the perfect property in {answer}. 🎯" },
        { id: "property_type", text: "🏡 **What type of property interests you?**", type: "buttons", required: true, options: ["1BHK Apartment", "2BHK Apartment", "3BHK Apartment", "4BHK+ Apartment", "Villa/Independent House", "Plot/Land", "Commercial Space"], acknowledgment: "Perfect! {answer} is a popular choice. 👍" },
        { id: "budget", text: "💰 **What's your budget range?**", type: "buttons", required: true, options: ["Under ₹25 Lakhs", "₹25-50 Lakhs", "₹50 Lakhs - ₹1 Crore", "₹1-2 Crores", "₹2+ Crores", "Flexible/Discuss"], acknowledgment: "Excellent! We have great options in the {answer} range. 💎" },
        { id: "timeline", text: "⏰ **When are you planning to make this purchase?**", type: "buttons", required: true, options: ["Immediately (within 1 month)", "1-3 months", "3-6 months", "6-12 months", "More than 1 year", "Just exploring options"], acknowledgment: "Thanks! Your timeline of {answer} helps us prioritize the best properties for you. ⚡" }
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
      
      // Enhanced final messages based on classification
      let finalMessage = "🎉 **Thank you!** Our team will review your requirements and contact you soon.";
      
      if (classification) {
        const status = classification.status;
        if (status === 'hot') {
          finalMessage = "🔥 **Excellent!** You're a serious buyer. Our **senior consultant** will contact you within **24 hours** with premium properties.";
        } else if (status === 'warm') {
          finalMessage = "✨ **Perfect!** We'll send you **curated property options** and keep you updated with new listings.";
        } else if (status === 'cold') {
          finalMessage = "📧 **Thanks!** We'll add you to our **newsletter** and update you with properties in your range.";
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
      // Check if we need to send acknowledgment first
      const lastQuestion = questions[userMessages - 1];
      
      // If we just received an answer and there's an acknowledgment, send it first
      if (lastQuestion && lastQuestion.acknowledgment && assistantMessages < userMessages * 2) {
        let acknowledgmentText = lastQuestion.acknowledgment.replace('{answer}', trimmedMessage);
        
        // Add acknowledgment to transcript
        transcript.push({
          role: 'assistant',
          content: acknowledgmentText,
          timestamp: new Date().toISOString()
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            reply: acknowledgmentText,
            isComplete: false,
            isAcknowledgment: true,
            progress: {
              questionsAnswered: userMessages,
              totalQuestions: totalQuestions,
              currentQuestion: lastQuestion.id,
              nextQuestionNumber: userMessages + 1
            }
          })
        };
      }
      
      // Ask the next question
      const nextQuestionIndex = Math.floor(assistantMessages / 2); // Account for acknowledgments
      const nextQuestion = questions[nextQuestionIndex];
      
      if (!nextQuestion) {
        console.log(`❌ No question found at index ${nextQuestionIndex}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            reply: "🎉 **Thank you for your time!**",
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
      
      // Build response with interactive options if available
      const response = {
        success: true,
        reply: questionText,
        isComplete: false,
        progress: {
          questionsAnswered: Math.floor(assistantMessages / 2),
          totalQuestions: totalQuestions,
          currentQuestion: nextQuestion.id,
          nextQuestionNumber: nextQuestionIndex + 1
        }
      };
      
      // Add interactive options for button-type questions
      if (nextQuestion.type === 'buttons' && nextQuestion.options) {
        response.options = nextQuestion.options;
        response.questionType = 'buttons';
      } else {
        response.questionType = 'text';
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response)
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