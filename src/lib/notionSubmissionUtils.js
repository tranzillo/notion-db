// src/lib/notionSubmissionUtils.js
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Submit user-generated content to Notion submissions database
 * 
 * @param {Object} formData - Form data to submit
 * @param {Object} options - Options for submission
 * @returns {Promise<Object>} - Result of submission
 */
export async function submitToNotion(formData, options = {}) {
  const { 
    isDevelopment = process.env.NODE_ENV !== 'production',
    notionConfig = {
      apiKey: process.env.NOTION_API_KEY,
      submissionsDbId: process.env.NOTION_SUBMISSIONS_DB_ID
    }
  } = options;

  // Validate required fields
  if (!formData.type || !formData.title || !formData.content) {
    return {
      success: false,
      error: 'Missing required fields'
    };
  }

  // In development, just log the submission
  if (isDevelopment) {
    console.log('[notionSubmissionUtils] Development mode - logging but not submitting');
    console.log('[notionSubmissionUtils] Form data:', formData);
    return { 
      success: true,
      message: 'Submission logged (development mode)',
      data: formData
    };
  }

  try {
    console.log('[notionSubmissionUtils] Production mode - submitting to Notion');
    
    // Make sure we have API key and database ID
    if (!notionConfig.apiKey) {
      console.error('[notionSubmissionUtils] Missing Notion API key');
      return {
        success: false,
        error: 'Notion API key not configured'
      };
    }
    
    if (!notionConfig.submissionsDbId) {
      console.error('[notionSubmissionUtils] Missing Notion submissions database ID');
      return {
        success: false,
        error: 'Notion submissions database not configured'
      };
    }
    
    // Initialize Notion client
    const notion = new Client({
      auth: notionConfig.apiKey,
    });

    // Use the single submissions database
    const databaseId = notionConfig.submissionsDbId;
    
    // Create submission properties based on the form data
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
    if (formData.rank) {
      properties.Rank = {
        number: parseInt(formData.rank) || 0,
      };
    }
    
    if (formData.discipline) {
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
    
    if (formData.url) {
      properties.URL = {
        url: formData.url,
      };
    }

    // Create the page in Notion
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties,
      // Add the content to the page body
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
      success: true,
      message: 'Submission successfully sent to Notion',
      id: response.id
    };
  } catch (error) {
    console.error('[notionSubmissionUtils] Error submitting to Notion:', error);
    return {
      success: false,
      error: 'Failed to submit to Notion',
      details: error.message
    };
  }
}