// functions/submit-contribution.js
const { Client } = require('@notionhq/client');

exports.handler = async function (event, context) {
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
    const { data, isMultiple } = payload;

    // Log what we received
    console.log('Received data:', data);

    // Validate the basic request
    if (!data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid request: Missing data' }),
      };
    }

    // Handle different data formats from the form
    let formSubmissions = [];
    if (isMultiple) {
      formSubmissions = Array.isArray(data) ? data : [data];
    } else {
      formSubmissions = [data];
    }

    // Extract user data from first submission
    const userData = {
      name: formSubmissions[0]?.name,
      email: formSubmissions[0]?.email,
      comment: formSubmissions[0]?.comment
    };

    // Validate required user fields
    if (!userData.name || !userData.email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required fields: Name and Email are required' }),
      };
    }

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY
    });

    // Array to track all database submissions
    const submissions = [];
    const errors = [];

    // Process each form submission
    for (const submission of formSubmissions) {
      const contentType = submission.contentType;
      const state = submission.state || 'new';

      try {
        if (contentType === 'Bottleneck' && process.env.NOTION_USER_SUBMITTED_BOTTLENECKS_DB_ID) {
          // Prepare bottleneck data
          const bottleneckData = {
            title: submission.title,
            content: submission.content,
            fields: submission.field ? [submission.field] : [],
            relatedCapabilities: submission.relatedCapability ? [submission.relatedCapability] : [],
            state: state
          };

          const properties = createBottleneckProperties(userData, bottleneckData, state);

          console.log('Creating bottleneck with properties:', JSON.stringify(properties, null, 2));

          const response = await notion.pages.create({
            parent: { database_id: process.env.NOTION_USER_SUBMITTED_BOTTLENECKS_DB_ID },
            properties: properties
          });

          submissions.push({
            type: 'bottleneck',
            id: response.id,
            state: state,
            title: submission.title
          });
        } else if (contentType === 'Foundational Capability' && process.env.NOTION_USER_SUBMITTED_CAPABILITIES_DB_ID) {
          // Prepare capability data
          const capabilityData = {
            title: submission.title,
            content: submission.content,
            relatedBottlenecks: submission.relatedGap ? [submission.relatedGap] : [],
            relatedResources: submission.relatedResources || [],
            state: state
          };

          const properties = createCapabilityProperties(userData, capabilityData, state);

          console.log('Creating capability with properties:', JSON.stringify(properties, null, 2));

          const response = await notion.pages.create({
            parent: { database_id: process.env.NOTION_USER_SUBMITTED_CAPABILITIES_DB_ID },
            properties: properties
          });

          submissions.push({
            type: 'capability',
            id: response.id,
            state: state,
            title: submission.title
          });
        } else if (contentType === 'Resource' && process.env.NOTION_USER_SUBMITTED_RESOURCES_DB_ID) {
          // Prepare resource data
          const resourceData = {
            title: submission.title,
            url: submission.resource || submission.url,
            content: submission.content,
            resourceType: submission.resourceType,
            relatedCapabilities: submission.relatedCapability ? [submission.relatedCapability] : [],
            state: state
          };

          const properties = createResourceProperties(userData, resourceData, state);

          console.log('Creating resource with properties:', JSON.stringify(properties, null, 2));

          const response = await notion.pages.create({
            parent: { database_id: process.env.NOTION_USER_SUBMITTED_RESOURCES_DB_ID },
            properties: properties
          });

          submissions.push({
            type: 'resource',
            id: response.id,
            state: state,
            title: submission.title
          });
        }
      } catch (error) {
        console.error(`Error creating ${contentType}:`, error);
        errors.push({
          type: contentType,
          title: submission.title,
          error: error.message
        });
      }
    }

    // Check if any submissions were successful
    if (submissions.length === 0 && errors.length > 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          message: 'All submissions failed',
          errors: errors
        })
      };
    }

    // Return response
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Contribution submitted successfully',
        submissions: submissions,
        errors: errors.length > 0 ? errors : undefined
      })
    };

  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Error processing request',
        error: error.message
      })
    };
  }
};

// Helper function to create bottleneck properties
function createBottleneckProperties(userData, bottleneckData, state) {
  const properties = {
    // Common submitter fields
    Submitter_Name: {
      rich_text: [{
        text: { content: userData.name }
      }]
    },
    Submitter_Email: {
      email: userData.email
    },
    Item_State: {
      select: { name: state }
    }
  };

  if (userData.comment) {
    properties.Submitter_Comment = {
      rich_text: [{
        text: { content: userData.comment }
      }]
    };
  }

  // For existing items, only add related fields
  if (state === 'existing') {
    if (bottleneckData.relatedCapabilities?.length > 0) {
      properties.Related_Foundational_Capabilities = {
        rich_text: [{
          text: { content: bottleneckData.relatedCapabilities.join(', ') }
        }]
      };
    }
    return properties;
  }

  // For new or edited items, add all fields
  properties.Bottleneck_Name = {
    rich_text: [{
      text: { content: bottleneckData.title || '' }
    }]
  };

  if (bottleneckData.content) {
    properties.Bottleneck_Description = {
      rich_text: [{
        text: { content: bottleneckData.content }
      }]
    };
  }

  if (bottleneckData.fields?.length > 0) {
    properties.Fields = {
      rich_text: [{
        text: { content: bottleneckData.fields.join(', ') }
      }]
    };
  }

  if (bottleneckData.relatedCapabilities?.length > 0) {
    properties.Related_Foundational_Capabilities = {
      rich_text: [{
        text: { content: bottleneckData.relatedCapabilities.join(', ') }
      }]
    };
  }

  return properties;
}

// Helper function to create capability properties
function createCapabilityProperties(userData, capabilityData, state) {
  const properties = {
    // Common submitter fields
    Submitter_Name: {
      rich_text: [{
        text: { content: userData.name }
      }]
    },
    Submitter_Email: {
      email: userData.email
    },
    Item_State: {
      select: { name: state }
    }
  };

  if (userData.comment) {
    properties.Submitter_Comment = {
      rich_text: [{
        text: { content: userData.comment }
      }]
    };
  }

  // For existing items, only add related fields
  if (state === 'existing') {
    if (capabilityData.relatedResources?.length > 0) {
      properties.Related_Resources = {
        rich_text: [{
          text: { content: capabilityData.relatedResources.join(', ') }
        }]
      };
    }
    if (capabilityData.relatedBottlenecks?.length > 0) {
      properties.Related_Bottlenecks = {
        rich_text: [{
          text: { content: capabilityData.relatedBottlenecks.join(', ') }
        }]
      };
    }
    return properties;
  }

  // For new or edited items, add all fields
  properties.FC_Name = {
    rich_text: [{
      text: { content: capabilityData.title || '' }
    }]
  };

  if (capabilityData.content) {
    properties.FC_Description = {
      rich_text: [{
        text: { content: capabilityData.content }
      }]
    };
  }

  if (capabilityData.relatedResources?.length > 0) {
    properties.Related_Resources = {
      rich_text: [{
        text: { content: capabilityData.relatedResources.join(', ') }
      }]
    };
  }

  if (capabilityData.relatedBottlenecks?.length > 0) {
    properties.Related_Bottlenecks = {
      rich_text: [{
        text: { content: capabilityData.relatedBottlenecks.join(', ') }
      }]
    };
  }

  return properties;
}

// Helper function to create resource properties
function createResourceProperties(userData, resourceData, state) {
  const properties = {
    // Common submitter fields
    Submitter_Name: {
      rich_text: [{
        text: { content: userData.name }
      }]
    },
    Submitter_Email: {
      email: userData.email
    },
    Item_State: {
      select: { name: state }
    }
  };

  if (userData.comment) {
    properties.Submitter_Comment = {
      rich_text: [{
        text: { content: userData.comment }
      }]
    };
  }

  // For existing items, only add related fields
  if (state === 'existing') {
    if (resourceData.relatedCapabilities?.length > 0) {
      properties.Related_Foundational_Capabilities = {
        rich_text: [{
          text: { content: resourceData.relatedCapabilities.join(', ') }
        }]
      };
    }
    return properties;
  }

  // For new or edited items, add all fields
  properties.Resource_Title = {
    rich_text: [{
      text: { content: resourceData.title || '' }
    }]
  };

  if (resourceData.url) {
    properties.Resource_URL = {
      rich_text: [{
        text: { content: resourceData.url }
      }]
    };
  }

  if (resourceData.resourceType) {
    properties.Resource_Type = {
      select: { name: resourceData.resourceType }
    };
  }

  if (resourceData.relatedCapabilities?.length > 0) {
    properties.Related_Foundational_Capabilities = {
      rich_text: [{
        text: { content: resourceData.relatedCapabilities.join(', ') }
      }]
    };
  }

  return properties;
}