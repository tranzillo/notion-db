// src/lib/contentUtils.js
import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { remark } from 'remark';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeRaw from 'rehype-raw';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Extract content from a Notion page
 * @param {string} pageId - Notion page ID
 * @returns {Promise<{title: string, content: string}>} Page title and processed HTML content
 */
export async function getPageContent(pageId) {
  if (!pageId) {
    return {
      title: 'Missing Content',
      content: 'Content is not configured properly.'
    };
  }

  // Initialize Notion client
  const notion = new Client({
    auth: process.env.NOTION_API_KEY
  });

  // Configure NotionToMarkdown with options
  const n2m = new NotionToMarkdown({ 
    notionClient: notion,
    config: {
      // Configure renderers for different block types
      renderers: {
        // Example custom renderer for callout blocks
        callout: async (block) => {
          const { icon, color, rich_text } = block.callout;
          const text = rich_text.map(t => t.plain_text).join('');
          const iconEmoji = icon && icon.type === 'emoji' ? icon.emoji : '';
          return `> **${iconEmoji}** ${text}`;
        },
        // Add more custom renderers as needed
      }
    }
  });

  try {
    // First get the page to extract the title
    const page = await notion.pages.retrieve({
      page_id: pageId
    });

    // Extract title from page
    const titleProperty = page.properties.title || page.properties.Title || page.properties.Name;
    const title = titleProperty?.title?.[0]?.plain_text || 'Untitled';

    // Convert the page content to markdown
    const mdBlocks = await n2m.pageToMarkdown(pageId);
    const markdown = n2m.toMarkdownString(mdBlocks);

    // Convert markdown to HTML for better rendering
    const html = await markdownToHtml(markdown.parent);

    return {
      title,
      content: html
    };
  } catch (error) {
    console.error(`Error fetching Notion page ${pageId}:`, error);
    return {
      title: 'Error',
      content: 'Could not load content. Please check your Notion configuration.'
    };
  }
}

/**
 * Convert markdown to HTML with proper formatting
 * @param {string} markdown - Markdown content
 * @returns {Promise<string>} HTML content
 */
async function markdownToHtml(markdown) {
  // Process the markdown to HTML
  const result = await remark()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw) // Parse HTML in markdown
    .use(rehypeStringify)
    .process(markdown);

  return result.toString();
}

/**
 * Get content for multiple predefined content areas
 * @returns {Promise<Object>} Object with all content areas
 */
export async function getAllContentAreas() {
  const contentAreas = {
    home: process.env.NOTION_HOME_CONTENT_ID,
    capabilities: process.env.NOTION_CAPABILITIES_CONTENT_ID,
    about: process.env.NOTION_ABOUT_CONTENT_ID,
    resources: process.env.NOTION_RESOURCES_CONTENT_ID
  };

  const result = {};

  // Get content for each defined area
  for (const [key, pageId] of Object.entries(contentAreas)) {
    if (pageId) {
      try {
        result[key] = await getPageContent(pageId);
      } catch (error) {
        console.error(`Error fetching content for ${key}:`, error);
        result[key] = {
          title: `${key.charAt(0).toUpperCase() + key.slice(1)}`,
          content: `Content for ${key} could not be loaded.`
        };
      }
    }
  }

  return result;
}