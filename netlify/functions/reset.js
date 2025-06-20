// Note: In production, you'd want to use a database to store conversations
// For now, we'll use a simple in-memory approach
let transcript = [];

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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Clear the transcript
    transcript = [];
    
    console.log('🔄 Conversation reset successfully');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Conversation reset successfully',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Reset error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to reset conversation',
        timestamp: new Date().toISOString()
      })
    };
  }
}; 