// functions/submit-contribution.js
const { Client } = require('@notionhq/client');

async function handleBottleneckSubmission(notion, data) {
  // Validate required fields
  if (!data.bottleneck_name || !data.bottleneck_description || !data.contributor_name || !data.contributor_email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required fields for bottleneck submission' }),
    };
  }

  try {
    // Create page properties object
    const pageProperties = {
      Bottleneck_Name: {
        title: [
          {
            text: {
              content: data.bottleneck_name,
            },
          },
        ],
      },
      Status: {
        status: {
          name: 'Pending Review',
        },
      },
      Type: {
        select: {
          name: 'Bottleneck',
        },
      },
      Bottleneck_Rank: {
        number: data.bottleneck_rank || 0,
      },
      // Add contributor fields
      Contributor_Name: {
        rich_text: [
          {
            text: {
              content: data.contributor_name,
            },
          },
        ],
      },
      Contributor_Email: {
        email: data.contributor_email,
      },
    };
    
    // Add Field relation if provided
    if (data.fieldId) {
      pageProperties.Fields = {
        relation: [
          {
            id: data.fieldId,
          },
        ],
      };
    }
    
    // Create content blocks
    const contentBlocks = [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: data.bottleneck_description,
              },
            },
          ],
        },
      },
    ];
    
    // Add comment as a separate block if provided
    if (data.contributor_comment) {
      contentBlocks.push(
        {
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'Contributor Comment',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: data.contributor_comment,
                },
              },
            ],
          },
        }
      );
    }
    
    // Create the page in Notion
    await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_CONTRIBUTIONS_DB_ID,
      },
      properties: pageProperties,
      children: contentBlocks,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Bottleneck contribution submitted successfully' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error submitting to database',
        error: error.message
      }),
    };
  }
}

async function handleCapabilitySubmission(notion, data) {
  // Validate required fields
  if (!data.fc_name || !data.fc_description || !data.contributor_name || !data.contributor_email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required fields for capability submission' }),
    };
  }

  try {
    // Create the page properties
    const pageProperties = {
      FC_Name: {
        title: [
          {
            text: {
              content: data.fc_name,
            },
          },
        ],
      },
      Status: {
        status: {
          name: 'Pending Review',
        },
      },
      Type: {
        select: {
          name: 'Foundational Capability',
        },
      },
      // Add contributor fields
      Contributor_Name: {
        rich_text: [
          {
            text: {
              content: data.contributor_name,
            },
          },
        ],
      },
      Contributor_Email: {
        email: data.contributor_email,
      },
    };
    
    // Add Related Bottleneck if provided
    if (data.bottleneckTitle) {
      pageProperties['Related Bottleneck'] = {
        rich_text: [
          {
            text: {
              content: data.bottleneckTitle,
            },
          },
        ],
      };
    }
    
    // Create content blocks
    const contentBlocks = [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: data.fc_description,
              },
            },
          ],
        },
      },
    ];
    
    // Add comment as a separate block if provided
    if (data.contributor_comment) {
      contentBlocks.push(
        {
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'Contributor Comment',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: data.contributor_comment,
                },
              },
            ],
          },
        }
      );
    }
    
    // Create the page in Notion
    await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_CONTRIBUTIONS_DB_ID,
      },
      properties: pageProperties,
      children: contentBlocks,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Foundational Capability contribution submitted successfully' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error submitting to database',
        error: error.message 
      }),
    };
  }
}

async function handleResourceSubmission(notion, data) {
  // Validate required fields
  if (!data.resource_title || !data.resource_url || !data.contributor_name || !data.contributor_email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required fields for resource submission' }),
    };
  }

  try {
    // Create the page in Notion with updated field names
    const pageProperties = {
      Resource_Title: {
        title: [
          {
            text: {
              content: data.resource_title,
            },
          },
        ],
      },
      Status: {
        status: {
          name: 'Pending Review',
        },
      },
      ContentType: {  // This is needed in the contributions database
        select: {
          name: 'Resource',
        },
      },
      Resource_Type: {  // Changed to single select
        select: {
          name: data.resource_type || 'Publication',
        },
      },
      Resource_URL: {
        url: data.resource_url,
      },
      // Add contributor fields
      Contributor_Name: {
        rich_text: [
          {
            text: {
              content: data.contributor_name,
            },
          },
        ],
      },
      Contributor_Email: {
        email: data.contributor_email,
      },
    };
    
    // Create content blocks
    let contentBlocks = [];
    
    // Add the content summary if provided
    if (data.content) {
      contentBlocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: data.content,
              },
            },
          ],
        },
      });
    }
    
    // Add comment as a separate block if provided
    if (data.contributor_comment) {
      contentBlocks.push(
        {
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'Contributor Comment',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: data.contributor_comment,
                },
              },
            ],
          },
        }
      );
    }
    
    await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_CONTRIBUTIONS_DB_ID,
      },
      properties: pageProperties,
      children: contentBlocks,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Resource contribution submitted successfully' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error submitting to database',
        error: error.message
      }),
    };
  }
}

// Update the exports.handler function to handle the new type names
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
    const { type, data } = payload;
    
    // Validate the request
    if (!type || !data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid request: Missing type or data' }),
      };
    }
    
    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_CONTRIBUTIONS_API_KEY
    });
    
    // Process based on submission type
    let result;
    switch (type) {
      case 'bottleneck':
        result = await handleBottleneckSubmission(notion, data);
        break;
      case 'capability':
        result = await handleCapabilitySubmission(notion, data);
        break;
      case 'resource':
        result = await handleResourceSubmission(notion, data);
        break;
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ message: `Invalid contribution type: ${type}` }),
        };
    }
    
    return result;
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error processing request',
        error: error.message 
      }),
    };
  }
};