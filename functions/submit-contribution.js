// functions/submit-contribution.js
const { Client } = require('@notionhq/client');

// Note: Relation fields (Related_Resources, Related_Bottlenecks, Related_Foundational_Capabilities)
// are left empty for new submissions as they require existing Notion page IDs.
// These relationships should be established during the manual review process
// when accepted submissions are moved to the main databases.

exports.handler = async function (event) {
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
            relatedCapabilityState: submission.relatedCapabilityState || 'new',
            state: state
          };

          const properties = await createBottleneckProperties(userData, bottleneckData, state);

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
            relatedBottleneckState: submission.relatedGapState || 'new',
            relatedResources: submission.relatedResources || [],
            relatedResourceStates: submission.relatedResourceStates || {},
            state: state
          };

          const properties = await createCapabilityProperties(userData, capabilityData, state);

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
            relatedCapabilityState: submission.relatedCapabilityState || 'new',
            state: state
          };

          const properties = await createResourceProperties(userData, resourceData, state);

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
async function createBottleneckProperties(userData, bottleneckData, state) {
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

  // Always add the title field regardless of state
  properties.Bottleneck_Title = {
    title: [{
      text: { content: bottleneckData.title || '' }
    }]
  };

  // For existing items, also add related fields
  if (state === 'existing') {
    if (bottleneckData.relatedCapabilities?.length > 0) {
      // Only populate the New_FC_Title field if the related capability is new
      if (bottleneckData.relatedCapabilityState === 'new') {
        properties.New_FC_Title = {
          rich_text: [{
            text: { content: bottleneckData.relatedCapabilities.join(', ') }
          }]
        };
      } else {
        // For existing/edited capabilities, use relation field (empty for now)
        properties.Related_Foundational_Capabilities = {
          relation: [] // This would need actual Notion page IDs
        };
      }
    }
    return properties;
  }

  // For new or edited items, add all other fields

  if (bottleneckData.content) {
    properties.Bottleneck_Description = {
      rich_text: [{
        text: { content: bottleneckData.content }
      }]
    };
  }

  if (bottleneckData.fields?.length > 0) {
    // Fields is multi_select
    properties.Fields = {
      multi_select: bottleneckData.fields.map(field => ({ name: field }))
    };
  }

  if (bottleneckData.relatedCapabilities?.length > 0) {
    // Only populate the field that's relevant based on the related item's state
    if (bottleneckData.relatedCapabilityState === 'new') {
      // New capability - use New_FC_Title field
      properties.New_FC_Title = {
        rich_text: [{
          text: { content: bottleneckData.relatedCapabilities.join(', ') }
        }]
      };
    } else {
      // Existing/edited capability - use relation field (empty for now)
      properties.Related_Foundational_Capabilities = {
        relation: [] // Empty for new submissions
      };
    }
  }

  return properties;
}

// Helper function to create capability properties
async function createCapabilityProperties(userData, capabilityData, state) {
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

  // Always add the title field regardless of state
  properties.FC_Title = {
    title: [{
      text: { content: capabilityData.title || '' }
    }]
  };

  // For existing items, also add related fields
  if (state === 'existing') {
    if (capabilityData.relatedResources?.length > 0) {
      // Check if any resources are new
      const newResources = capabilityData.relatedResources.filter((resource, index) => {
        const resourceState = capabilityData.relatedResourceStates[resource] || 'new';
        return resourceState === 'new';
      });
      
      if (newResources.length > 0) {
        properties.New_Resource_Title = {
          rich_text: [{
            text: { content: newResources.join(', ') }
          }]
        };
      }
      
      // For existing resources, use relation field (empty)
      const existingResources = capabilityData.relatedResources.filter((resource, index) => {
        const resourceState = capabilityData.relatedResourceStates[resource] || 'new';
        return resourceState !== 'new';
      });
      
      if (existingResources.length > 0) {
        properties.Related_Resources = {
          relation: [] // This would need actual Notion page IDs
        };
      }
    }
    
    if (capabilityData.relatedBottlenecks?.length > 0) {
      if (capabilityData.relatedBottleneckState === 'new') {
        properties.New_Bottlenecks_Title = {
          rich_text: [{
            text: { content: capabilityData.relatedBottlenecks.join(', ') }
          }]
        };
      } else {
        properties.Related_Bottlenecks = {
          relation: [] // This would need actual Notion page IDs
        };
      }
    }
    return properties;
  }

  // For new or edited items, add all other fields

  if (capabilityData.content) {
    properties.FC_Description = {
      rich_text: [{
        text: { content: capabilityData.content }
      }]
    };
  }

  if (capabilityData.relatedResources?.length > 0) {
    // Separate new and existing resources
    const newResources = capabilityData.relatedResources.filter((resource, index) => {
      const resourceState = capabilityData.relatedResourceStates[resource] || 'new';
      return resourceState === 'new';
    });
    
    if (newResources.length > 0) {
      properties.New_Resource_Title = {
        rich_text: [{
          text: { content: newResources.join(', ') }
        }]
      };
    }
    
    // For existing resources, use relation field (empty)
    const existingResources = capabilityData.relatedResources.filter((resource, index) => {
      const resourceState = capabilityData.relatedResourceStates[resource] || 'new';
      return resourceState !== 'new';
    });
    
    if (existingResources.length > 0) {
      properties.Related_Resources = {
        relation: [] // Empty for new submissions
      };
    }
  }

  if (capabilityData.relatedBottlenecks?.length > 0) {
    // Only populate the field that's relevant based on the related item's state
    if (capabilityData.relatedBottleneckState === 'new') {
      properties.New_Bottlenecks_Title = {
        rich_text: [{
          text: { content: capabilityData.relatedBottlenecks.join(', ') }
        }]
      };
    } else {
      properties.Related_Bottlenecks = {
        relation: [] // Empty for new submissions
      };
    }
  }

  return properties;
}

// Helper function to create resource properties
async function createResourceProperties(userData, resourceData, state) {
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

  // Always add the title field regardless of state
  properties.Resource_Title = {
    title: [{
      text: { content: resourceData.title || '' }
    }]
  };

  // For existing items, also add related fields
  if (state === 'existing') {
    if (resourceData.relatedCapabilities?.length > 0) {
      if (resourceData.relatedCapabilityState === 'new') {
        properties.New_FC_Title = {
          rich_text: [{
            text: { content: resourceData.relatedCapabilities.join(', ') }
          }]
        };
      } else {
        properties.Related_Foundational_Capabilities = {
          relation: [] // This would need actual Notion page IDs
        };
      }
    }
    return properties;
  }

  // For new or edited items, add all other fields

  if (resourceData.url) {
    properties.Resource_URL = {
      url: resourceData.url
    };
  }

  if (resourceData.content) {
    properties.Resource_Description = {
      rich_text: [{
        text: { content: resourceData.content }
      }]
    };
  }

  if (resourceData.resourceType) {
    properties.Resource_Type = {
      multi_select: [{ name: resourceData.resourceType }]
    };
  }

  if (resourceData.relatedCapabilities?.length > 0) {
    // Only populate the field that's relevant based on the related item's state
    if (resourceData.relatedCapabilityState === 'new') {
      properties.New_FC_Title = {
        rich_text: [{
          text: { content: resourceData.relatedCapabilities.join(', ') }
        }]
      };
    } else {
      properties.Related_Foundational_Capabilities = {
        relation: [] // Empty for new submissions
      };
    }
  }

  return properties;
}