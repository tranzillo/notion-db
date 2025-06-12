// netlify/functions/record-download.js
const { Client } = require('@notionhq/client');

exports.handler = async function (event, context) {
  console.log('Download record function invoked with body:', event.body);

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  try {
    // Parse the request body
    const payload = JSON.parse(event.body);
    const { data } = payload;

    // Log what we received
    console.log('Received data:', data);

    // Check if any fields have data - if not, don't submit to Notion
    const hasData = data && (
      (data.name && data.name.trim() !== '') || 
      (data.email && data.email.trim() !== '') || 
      (data.organization && data.organization.trim() !== '') || 
      (data.useCase && data.useCase.trim() !== '')
    );

    // If no data was provided, just allow the download without sending to Notion
    if (!hasData) {
      console.log('No form data provided - skipping Notion submission');
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Download allowed, no data to record' 
        }),
      };
    }

    // Check if environment variables are properly set
    if (!process.env.NOTION_API_KEY) {
      console.error('NOTION_API_KEY environment variable is not set');
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Download allowed, but Notion API key is not configured' 
        }),
      };
    }

    if (!process.env.NOTION_DOWNLOADS_DB_ID) {
      console.error('NOTION_DOWNLOADS_DB_ID environment variable is not set');
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Download allowed, but Notion database ID is not configured' 
        }),
      };
    }

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY
    });

    // Build the properties object for Notion
    const properties = {
      // Name as title
      Name: {
        title: [
          {
            text: {
              content: data.name || '',
            },
          },
        ],
      },
      // Email as email type
      Email: {
        email: data.email || '',
      },
      // Organization as rich_text
      Organization: {
        rich_text: [
          {
            text: {
              content: data.organization || '',
            },
          },
        ],
      },
      // UseCase as rich_text
      UseCase: {
        rich_text: [
          {
            text: {
              content: data.useCase || '',
            },
          },
        ],
      },
    };

    console.log('Using database ID:', process.env.NOTION_DOWNLOADS_DB_ID);
    console.log('Creating page with properties:', JSON.stringify(properties, null, 2));

    // Create the page in Notion
    try {
      const response = await notion.pages.create({
        parent: {
          database_id: process.env.NOTION_DOWNLOADS_DB_ID,
        },
        properties: properties,
      });

      console.log('Notion response:', response.id);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'Information recorded successfully' }),
      };
    } catch (notionError) {
      console.error('Notion API error:', notionError);
      // Log more details about the error
      console.error('Error details:', {
        code: notionError.code,
        status: notionError.status,
        message: notionError.message,
        body: notionError.body
      });
      
      // Still return success because we want the download to proceed
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Download allowed, but error recording information'
        }),
      };
    }
  } catch (error) {
    console.error('Error processing request:', error);
    // Still return success to allow the download to proceed
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Download allowed, but error processing information'
      }),
    };
  }
};