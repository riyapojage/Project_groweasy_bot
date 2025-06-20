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
    const healthInfo = {
      message: 'GrowEasy Chatbot Server is running!',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: {
        node: process.version,
        platform: process.platform
      }
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(healthInfo)
    };
  } catch (error) {
    console.error('❌ Health check error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Health check failed',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Internal server error'
      })
    };
  }
}; 