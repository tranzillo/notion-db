// Simple submission function for Notion
const { Client } = require('@notionhq/client');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  try {
    // Log environment info
    console.log("Function called with environment:", {
      hasApiKey: !!process.env.NOTION_CONTRIBUTIONS_API_KEY,
      hasDbId: !!process.env.NOTION_CONTRIBUTIONS_DB_ID
    });

    // Parse the request body
    const payload = JSON.parse(event.body);
    console.log("Received payload type:", payload.type);

    // Only proceed if environment variables exist
    if (!process.env.NOTION_CONTRIBUTIONS_API_KEY || !process.env.NOTION_CONTRIBUTIONS_DB_ID) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          message: 'Missing environment variables',
          details: {
            hasApiKey: !!process.env.NOTION_CONTRIBUTIONS_API_KEY,
            hasDbId: !!process.env.NOTION_CONTRIBUTIONS_DB_ID
          }
        }),
      };
    }

    // Create a mock submission response (without actually calling Notion)
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Submission received (test mode)',
        received: {
          type: payload.type,
          title: payload.data?.title || 'No title provided'
        }
      }),
    };

  } catch (error) {
    console.error('Error in submit-simple function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error processing request',
        error: error.message 
      }),
    };
  }
};