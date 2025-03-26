// src/pages/api/submit-to-notion.js
import { Client } from '@notionhq/client';
import { sanitizeFormData } from '../../lib/sanitizeInput.js';

export const prerender = false; // Ensure this runs on server

export async function POST({ request }) {
  try {
    // Get form data
    const rawFormData = await request.json();
    
    // Sanitize the input
    const formData = sanitizeFormData(rawFormData);
    
    // Basic validation
    if (!formData.type || !formData.title || !formData.content) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if we're in development mode
    const isDevelopment = import.meta.env.DEV || !import.meta.env.NOTION_SUBMISSIONS_DB_ID;
    
    // In development, just log the submission
    if (isDevelopment) {
      console.log('Form submission (DEV MODE):', formData);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Submission logged (development mode)',
          data: formData
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Notion client
    const notion = new Client({
      auth: import.meta.env.NOTION_API_KEY,
    });

    // Use the single submissions database ID
    const databaseId = import.meta.env.NOTION_SUBMISSIONS_DB_ID;
    if (!databaseId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Submissions database not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Submission successfully sent to Notion',
        id: response.id
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error submitting to Notion:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to submit to Notion',
        details: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}