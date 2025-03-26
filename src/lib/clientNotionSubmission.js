// src/lib/clientNotionSubmission.js
import { sanitizeFormData } from './sanitizeInput.js';

/**
 * Submit form data to Notion using a Netlify Function
 * 
 * @param {Object} formData - Form data to submit
 * @returns {Promise<Object>} - Submission result
 */
export async function submitToNotion(formData) {
  try {
    // Sanitize form data
    const sanitizedData = sanitizeFormData(formData);
    
    // In development, log but don't submit
    if (import.meta.env.DEV) {
      console.log('Form submission (DEV MODE):', sanitizedData);
      return {
        success: true, 
        message: 'Submission logged (development mode)',
        data: sanitizedData
      };
    }
    
    // In production, use the Netlify function
    const response = await fetch('/.netlify/functions/notion-submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sanitizedData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit form');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error submitting to Notion:', error);
    return {
      success: false,
      error: 'Failed to submit to Notion',
      details: error.message
    };
  }
}