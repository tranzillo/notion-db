// functions/submit-contribution.js
const { Client } = require('@notionhq/client');

exports.handler = async function(event, context) {
  console.log("Function called:", event.httpMethod, event.path);
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    console.log("Method not allowed:", event.httpMethod);
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }
  
  try {
    // Parse the request body
    const payload = JSON.parse(event.body);
    const { type, data } = payload;
    
    console.log("Received submission type:", type);
    
    // Validate the request
    if (!type || !data) {
      console.log("Missing data:", payload);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid request: Missing type or data' }),
      };
    }
    
    // Check if required environment variables exist
    if (!process.env.NOTION_CONTRIBUTIONS_API_KEY || !process.env.NOTION_CONTRIBUTIONS_DB_ID) {
      console.log("Missing environment variables:", {
        hasApiKey: !!process.env.NOTION_CONTRIBUTIONS_API_KEY,
        hasDbId: !!process.env.NOTION_CONTRIBUTIONS_DB_ID
      });
      
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          message: 'Server configuration error: Missing environment variables',
          debug: {
            hasApiKey: !!process.env.NOTION_CONTRIBUTIONS_API_KEY,
            hasDbId: !!process.env.NOTION_CONTRIBUTIONS_DB_ID
          }
        }),
      };
    }
    
    // Initialize Notion client
    let notion;
    try {
      notion = new Client({
        auth: process.env.NOTION_CONTRIBUTIONS_API_KEY
      });
      console.log("Notion client initialized");
    } catch (err) {
      console.error("Notion client initialization error:", err);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          message: 'Error initializing Notion client',
          error: err.message
        }),
      };
    }
    
    // Process based on submission type
    let result;
    switch (type) {
      case 'bottleneck':
        result = await handleBottleneckSubmission(notion, data);
        break;
      case 'solution':
        result = await handleSolutionSubmission(notion, data);
        break;
      case 'reference':
        result = await handleReferenceSubmission(notion, data);
        break;
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ message: `Invalid contribution type: ${type}` }),
        };
    }
    
    return result;
  } catch (error) {
    console.error('Error in submit-contribution function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error processing request',
        error: error.message 
      }),
    };
  }
};

/**
 * Submit a bottleneck contribution to Notion
 */
async function handleBottleneckSubmission(notion, data) {
  console.log("Processing bottleneck submission:", data.title);
  
  // Validate required fields
  if (!data.title || !data.content) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required fields for bottleneck (title, content)' }),
    };
  }

  try {
    // Create page properties object
    const pageProperties = {
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
    };
    
    // Add Discipline relation if provided
    if (data.disciplineId) {
      pageProperties.Discipline = {
        relation: [
          {
            id: data.disciplineId,
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
                  content: data.content,
                },
              },
            ],
          },
        },
      ],
    });

    console.log("Bottleneck submission successful:", data.title);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Bottleneck contribution submitted successfully' }),
    };
  } catch (error) {
    console.error('Error submitting bottleneck to Notion:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error submitting to database',
        error: error.message
      }),
    };
  }
}

/**
 * Submit a solution contribution to Notion
 */
async function handleSolutionSubmission(notion, data) {
  console.log("Processing solution submission:", data.title);
  
  // Validate required fields
  if (!data.title || !data.content) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required fields for solution (title, content)' }),
    };
  }

  try {
    // Create the page properties
    const pageProperties = {
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
    
    // Prepare children blocks
    const childBlocks = [
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
    ];
    
    // Add references if provided
    if (data.references) {
      childBlocks.push(
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
        }
      );
    }
    
    // Create the page in Notion
    await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_CONTRIBUTIONS_DB_ID,
      },
      properties: pageProperties,
      children: childBlocks,
    });

    console.log("Solution submission successful:", data.title);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Solution contribution submitted successfully' }),
    };
  } catch (error) {
    console.error('Error submitting solution to Notion:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error submitting to database',
        error: error.message 
      }),
    };
  }
}

/**
 * Submit a reference contribution to Notion
 */
async function handleReferenceSubmission(notion, data) {
  console.log("Processing reference submission:", data.title);
  
  // Validate required fields
  if (!data.title || !data.url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required fields for reference (title, url)' }),
    };
  }

  try {
    // Create the page in Notion
    await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_CONTRIBUTIONS_DB_ID,
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

    console.log("Reference submission successful:", data.title);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Reference contribution submitted successfully' }),
    };
  } catch (error) {
    console.error('Error submitting reference to Notion:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error submitting to database',
        error: error.message
      }),
    };
  }
}