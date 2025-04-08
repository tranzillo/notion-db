// functions/submit-contribution.js
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
    // Parse the request body
    const payload = JSON.parse(event.body);
    const { data } = payload;
    
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
    
    // Build the properties object for Notion
    const properties = {
      Name: {
        title: [
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
      Title: {
        rich_text: [
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
    
    // Create the page in Notion
    await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_CONTRIBUTIONS_DB_ID,
      },
      properties: properties,
      children: blocks,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Contribution submitted successfully' }),
    };
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