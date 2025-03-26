// netlify/functions/submit-contribution.js
const { Client } = require('@notionhq/client');

// For debugging - log environment variables (redacted) to verify they exist
console.log('Environment check:', {
  hasApiKey: !!process.env.NOTION_CONTRIBUTIONS_API_KEY,
  hasDbId: !!process.env.NOTION_CONTRIBUTIONS_DB_ID,
});

// Initialize Notion client with the API key from environment variables
const notion = new Client({
  auth: process.env.NOTION_CONTRIBUTIONS_API_KEY
});

// Single database ID for all user contributions
const CONTRIBUTIONS_DB_ID = process.env.NOTION_CONTRIBUTIONS_DB_ID;

exports.handler = async (event, context) => {
  // Log request details for debugging
  console.log(`Request received: ${event.httpMethod} ${event.path}`);
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    console.log(`Method not allowed: ${event.httpMethod}`);
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

    // Handle different types of contributions
    switch (type) {
      case 'bottleneck':
        return await handleBottleneckSubmission(data, type);
      case 'solution':
        return await handleSolutionSubmission(data, type);
      case 'reference':
        return await handleReferenceSubmission(data, type);
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ message: `Invalid contribution type: ${type}` }),
        };
    }
  } catch (error) {
    console.error('Error processing contribution:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Server error processing your contribution' }),
    };
  }
};

/**
 * Submit a bottleneck contribution to Notion
 */
async function handleBottleneckSubmission(data, type) {
  // Validate required fields
  if (!data.title || !data.content || !data.disciplineId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required fields for bottleneck' }),
    };
  }

  try {
    // Create a new page in the contributions database
    await notion.pages.create({
      parent: {
        database_id: CONTRIBUTIONS_DB_ID,
      },
      properties: {
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
          select: {
            name: 'Pending Review',
          },
        },
        Type: {
          select: {
            name: 'Bottleneck',
          },
        },
        Rank: {
          number: data.rank || 0,
        },
        Discipline: {
          relation: [
            {
              id: data.disciplineId,
            },
          ],
        },
      },
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
                  content: data.content,
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
    console.error('Error submitting bottleneck to Notion:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error submitting to database' }),
    };
  }
}

/**
 * Submit a solution contribution to Notion
 */
async function handleSolutionSubmission(data, type) {
  // Validate required fields
  if (!data.title || !data.content || !data.bottleneckTitle) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required fields for solution' }),
    };
  }

  try {
    // Create a new page in the contributions database
    await notion.pages.create({
      parent: {
        database_id: CONTRIBUTIONS_DB_ID,
      },
      properties: {
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
          select: {
            name: 'Pending Review',
          },
        },
        Type: {
          select: {
            name: 'Solution',
          },
        },
        Rank: {
          number: data.rank || 0,
        },
        'Related Bottleneck': {
          rich_text: [
            {
              text: {
                content: data.bottleneckTitle,
              },
            },
          ],
        },
      },
      // Add the content as rich text blocks
      children: [
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
        // Add references if provided
        ...(data.references ? [
          {
            object: 'block',
            type: 'heading_3',
            heading_3: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: 'References',
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
                    content: data.references,
                  },
                },
              ],
            },
          },
        ] : []),
      ],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Solution contribution submitted successfully' }),
    };
  } catch (error) {
    console.error('Error submitting solution to Notion:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error submitting to database' }),
    };
  }
}

/**
 * Submit a reference contribution to Notion
 */
async function handleReferenceSubmission(data, type) {
  // Validate required fields
  if (!data.title || !data.url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required fields for reference' }),
    };
  }

  try {
    // Create a new page in the contributions database
    await notion.pages.create({
      parent: {
        database_id: CONTRIBUTIONS_DB_ID,
      },
      properties: {
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
          select: {
            name: 'Pending Review',
          },
        },
        Type: {
          select: {
            name: 'Reference',
          },
        },
        URL: {
          url: data.url,
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
      body: JSON.stringify({ message: 'Reference contribution submitted successfully' }),
    };
  } catch (error) {
    console.error('Error submitting reference to Notion:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error submitting to database' }),
    };
  }
}