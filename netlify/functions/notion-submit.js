// netlify/functions/notion-submit.js
const { Client } = require('@notionhq/client');

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    // Parse the request body
    const formData = JSON.parse(event.body);
    
    // Basic validation
    if (!formData.type || !formData.title || !formData.content) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }
    
    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY
    });
    
    // Use the submissions database ID
    const databaseId = process.env.NOTION_SUBMISSIONS_DB_ID;
    if (!databaseId) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Submissions database not configured' })
      };
    }
    
    // Create properties object based on submission type
    const properties = {
      Title: {
        title: [
          {
            text: {
              content: formData.title,
            },
          },
        ],
      },
      Type: {
        multi_select: [
          {
            name: formData.type.charAt(0).toUpperCase() + formData.type.slice(1), // Capitalize type
          }
        ],
      },
      Status: {
        select: {
          name: 'Pending Review',
        },
      },
      SubmittedBy: {
        rich_text: [
          {
            text: {
              content: formData.email || 'Anonymous',
            },
          },
        ],
      },
    };
    
    // Add type-specific properties
    if (formData.type === 'bottleneck' && formData.rank) {
      properties.Rank = {
        number: formData.rank,
      };
    }
    
    if (formData.type === 'bottleneck' && formData.discipline) {
      properties.Discipline = {
        rich_text: [
          {
            text: {
              content: formData.discipline,
            },
          },
        ],
      };
    }
    
    if (formData.type === 'reference' && formData.url) {
      properties.URL = {
        url: formData.url,
      };
    }
    
    // Create a page in the submissions database
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties,
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: formData.content,
                },
              },
            ],
          },
        },
      ],
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Submission successfully sent to Notion',
        id: response.id
      })
    };
  } catch (error) {
    console.error('Error submitting to Notion:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to submit to Notion',
        details: error.message
      })
    };
  }
};