// functions/submit-contribution.js
const { Client } = require('@notionhq/client');

exports.handler = async function(event, context) {
  console.log('Function invoked with body:', event.body);
  
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
    
    // Validate the basic request
    if (!data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid request: Missing data' }),
      };
    }
    
    // Validate required fields
    if (!data.name || !data.email || !data.title) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required fields: Name, Email, and Title are required' }),
      };
    }

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY
    });
    
    // Build the properties object for Notion - CORRECTED FIELD TYPES
    const properties = {
      // CORRECTED: Name should be rich_text (not title)
      Name: {
        rich_text: [
          {
            text: {
              content: data.name,
            },
          },
        ],
      },
      Email: {
        email: data.email,
      },
      // CORRECTED: Title should be title (not rich_text)
      Title: {
        title: [
          {
            text: {
              content: data.title,
            },
          },
        ],
      },
      Status: {
        status: {
          name: "Pending Review",
        },
      },
    };
    
    // Add ContentType if present
    if (data.contentType) {
      properties.ContentType = {
        select: {
          name: data.contentType,
        },
      };
    }
    
    // Add ResourceType if present
    if (data.resourceType) {
      properties.ResourceType = {
        select: {
          name: data.resourceType,
        },
      };
    }
    
    // Add Field relation if present
    if (data.field) {
      properties.Field = {
        relation: [
          {
            id: data.field,
          },
        ],
      };
    }
    
    // Add Resource (URL) if present
    if (data.resource) {
      properties.Resource = {
        rich_text: [
          {
            text: {
              content: data.resource,
            },
          },
        ],
      };
    }
    
    // Add Rank if present
    if (data.rank) {
      properties.Rank = {
        number: parseInt(data.rank, 10) || 0,
      };
    }
    
    // Add Related Gap if present
    if (data.relatedGap) {
      properties["Related Gap"] = {
        rich_text: [
          {
            text: {
              content: data.relatedGap,
            },
          },
        ],
      };
    }
    
    // Add Comment if present
    if (data.comment) {
      properties.Comment = {
        rich_text: [
          {
            text: {
              content: data.comment,
            },
          },
        ],
      };
    }
    
    // Create blocks for content
    const blocks = [];
    
    // Add content as blocks if present
    if (data.content) {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: {
                content: data.content,
              },
            },
          ],
        },
      });
    }
    
    console.log('Creating page with properties:', JSON.stringify(properties, null, 2));
    
    // Create the page in Notion
    try {
      const response = await notion.pages.create({
        parent: {
          database_id: process.env.NOTION_CONTRIBUTIONS_DB_ID,
        },
        properties: properties,
        children: blocks.length > 0 ? blocks : undefined,
      });
      
      console.log('Notion response:', response.id);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'Contribution submitted successfully' }),
      };
    } catch (notionError) {
      console.error('Notion API error:', notionError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          message: 'Error creating page in Notion',
          error: notionError.message
        }),
      };
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        message: 'Error processing request',
        error: error.message 
      }),
    };
  }
};