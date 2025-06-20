const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event, context) => {
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

  try {
    console.log('🧪 Testing Claude connection...');
    
    if (!process.env.CLAUDE_API_KEY) {
      throw new Error('Claude API key not configured');
    }

    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });
    
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
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        claude_response: response.content[0].text,
        model: response.model,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('❌ Claude connection test failed:', error);
    
    let errorMessage = 'Claude AI service test failed';
    let statusCode = 500;
    
    if (error.status === 401) {
      errorMessage = 'Claude API authentication failed. Please check API key.';
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
    }
    
    return {
      statusCode: statusCode,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      })
    };
  }
}; 