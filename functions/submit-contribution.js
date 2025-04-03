// functions/submit-contribution.js
const { Client } = require('@notionhq/client');
const { createBottleneckSlug, createCapabilitySlug } = require('../src/lib/slugUtils');

async function handleBottleneckSubmission(notion, data) {
  // Validate required fields
  if (!data.bottleneck_name || !data.bottleneck_description) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required fields for bottleneck (bottleneck_name, bottleneck_description)' }),
    };
  }

  try {
    // Generate a slug for the bottleneck
    const slug = createBottleneckSlug(data.bottleneck_name);

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
      Slug: {
        rich_text: [
          {
            text: {
              content: slug,
            },
          },
        ],
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
    
    // Create the page in Notion
    await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_CONTRIBUTIONS_DB_ID,
      },
      properties: pageProperties,
      // Add the content as a rich text block
      children: [
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
      ],
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
  if (!data.fc_name || !data.fc_description) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required fields for capability (fc_name, fc_description)' }),
    };
  }

  try {
    // Generate a slug for the capability
    const slug = createCapabilitySlug(data.fc_name);

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
      Slug: {
        rich_text: [
          {
            text: {
              content: slug,
            },
          },
        ],
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
    
    // Create the page in Notion
    await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_CONTRIBUTIONS_DB_ID,
      },
      properties: pageProperties,
      children: [
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
      ],
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
  if (!data.resource_title || !data.resource_url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required fields for resource (resource_title, resource_url)' }),
    };
  }

  try {
    // Create the page in Notion with updated field names
    await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_CONTRIBUTIONS_DB_ID,
      },
      properties: {
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
        Resource_Type: {  // This specifies what kind of resource it is
          select: {
            name: data.resource_type || 'Publication',
          },
        },
        Resource_URL: {
          url: data.resource_url,
        },
      },
      // Add the content summary if provided
      children: data.content
        ? [
            {
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
            },
          ]
        : [],
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
      case 'capability': // Updated from 'solution'
        result = await handleCapabilitySubmission(notion, data);
        break;
      case 'resource': // Updated from 'reference'
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