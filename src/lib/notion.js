import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Notion client
const notion = new Client({
    auth: process.env.NOTION_TOKEN,
});

// Function to fetch all blog posts
export async function getAllPosts() {
  const databaseId = process.env.NOTION_DATABASE_ID;
  
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Published',
        checkbox: {
          equals: true,
        },
      },
      sorts: [
        {
          property: 'Publication Date',
          direction: 'descending',
        },
      ],
    });
    
    return response.results.map(page => {
      // Safely extract featured image URL
      let featuredImageUrl = null;
      try {
        // Check if the Featured Image property exists
        const featuredImageProp = page.properties['Featured Image'];
        if (featuredImageProp && featuredImageProp.files && featuredImageProp.files.length > 0) {
          const firstFile = featuredImageProp.files[0];
          if (firstFile.file && firstFile.file.url) {
            featuredImageUrl = firstFile.file.url;  // Internal Notion file
          } else if (firstFile.external && firstFile.external.url) {
            featuredImageUrl = firstFile.external.url;  // External URL
          }
        }
      } catch (error) {
        console.error('Error extracting featured image:', error);
      }
      
      return {
        id: page.id,
        title: page.properties.Title.title[0]?.plain_text || 'Untitled',
        slug: page.properties.Slug.rich_text[0]?.plain_text || '',
        publishedDate: page.properties['Publication Date'].date?.start,
        tags: page.properties.Tags.multi_select.map(tag => tag.name),
        description: page.properties.Description?.rich_text
          .map(text => text.plain_text)
          .join('') || '',
        featuredImage: featuredImageUrl,
      };
    });
  } catch (error) {
    console.error('Error fetching posts from Notion:', error);
    return [];
  }
}

// Function to fetch a single blog post by slug
export async function getPostBySlug(slug) {
    const databaseId = process.env.NOTION_DATABASE_ID;
    
    try {
      console.log(`Looking for post with slug: ${slug}`);
      
      const response = await notion.databases.query({
        database_id: databaseId,
        filter: {
          and: [
            {
              property: 'Slug',
              rich_text: {
                equals: slug,
              },
            },
            {
              property: 'Published',
              checkbox: {
                equals: true,
              },
            },
          ],
        },
      });
      
      console.log(`Query returned ${response.results.length} results`);
      
      if (!response.results.length) {
        console.log(`No post found with slug: ${slug}`);
        return null;
      }
      
      const page = response.results[0];
      
      // Debug the structure of the page
      console.log('Page ID:', page.id);
      console.log('Available properties:', Object.keys(page.properties));
      
      // Safely extract text from properties
      const safeGetText = (propertyName, fieldType = 'rich_text') => {
        try {
          const property = page.properties[propertyName];
          if (!property) {
            console.log(`Property ${propertyName} not found`);
            return '';
          }
          
          const field = property[fieldType];
          if (!field || !Array.isArray(field) || field.length === 0) {
            console.log(`${propertyName}.${fieldType} is empty or not an array`);
            return '';
          }
          
          return field[0].plain_text || '';
        } catch (error) {
          console.error(`Error extracting ${propertyName}:`, error);
          return '';
        }
      };
      
      // Safely get tags
      const safeTags = () => {
        try {
          const tagsProperty = page.properties['Tags'];
          if (!tagsProperty || !tagsProperty.multi_select) {
            return [];
          }
          return tagsProperty.multi_select.map(tag => tag.name);
        } catch (error) {
          console.error('Error extracting tags:', error);
          return [];
        }
      };
      
      // Safely get date
      const safeDate = (propertyName) => {
        try {
          const dateProperty = page.properties[propertyName];
          if (!dateProperty || !dateProperty.date) {
            return null;
          }
          return dateProperty.date.start;
        } catch (error) {
          console.error(`Error extracting ${propertyName} date:`, error);
          return null;
        }
      };
      
      // Fetch blocks
      console.log(`Fetching blocks for page ${page.id}`);
      const blocksResponse = await notion.blocks.children.list({
        block_id: page.id,
      });
      
      console.log(`Retrieved ${blocksResponse.results.length} blocks`);
      
      return {
        id: page.id,
        title: safeGetText('Title', 'title'),
        slug: safeGetText('Slug'),
        publishedDate: safeDate('Publication Date'),
        tags: safeTags(),
        content: blocksResponse.results
      };
    } catch (error) {
      console.error('Error fetching post by slug:', error);
      return null;
    }
  }