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

    // Even if no data is provided, we'll consider it a success
    // (we don't want to block downloads if the form submission fails)
    if (!data || (!data.name && !data.email && !data.organization && !data.useCase)) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'No information provided but download allowed' 
        }),
      };
    }

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY
    });

    // Build the properties object for Notion
    const properties = {
      // Name as rich_text
      Name: {
        rich_text: [
          {
            text: {
              content: data.name || 'Anonymous',
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
    //   // Title field is required by Notion
    //   Title: {
    //     title: [
    //       {
    //         text: {
    //           content: 'Data Download',
    //         },
    //       },
    //     ],
    //   },
    //   Status: {
    //     status: {
    //       name: "Recorded",
    //     },
    //   },
    };

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