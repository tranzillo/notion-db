// A function to render Notion blocks as HTML
export function renderNotionBlocks(blocks) {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    console.log("No blocks to render");
    return '<p>No content available.</p>';
  }
  
  console.log(`Rendering ${blocks.length} blocks`);
  
  // Check if we only have empty paragraph blocks
  const hasOnlyEmptyBlocks = blocks.every(block => {
    if (block.type !== 'paragraph') return false;
    
    // Check if paragraph has no text
    const textContent = block.paragraph?.rich_text || [];
    return textContent.length === 0 || textContent.every(text => !text.plain_text || text.plain_text.trim() === '');
  });
  
  if (hasOnlyEmptyBlocks) {
    console.log("Page contains only empty blocks");
    return '<p>No content available.</p>';
  }
  
  let html = '';
  let inList = false;
  
  for (const block of blocks) {
    console.log(`Processing block type: ${block.type}`);
    
    switch (block.type) {
      case 'paragraph':
        const textItems = block.paragraph?.rich_text || [];
        // Only render paragraph if it has content
        if (textItems.length > 0 && textItems.some(text => text.plain_text && text.plain_text.trim() !== '')) {
          html += `<p>${renderRichText(textItems)}</p>`;
        }
        break;
        
      case 'heading_1':
        html += `<h1>${renderRichText(block.heading_1.rich_text)}</h1>`;
        break;
        
      case 'heading_2':
        html += `<h2>${renderRichText(block.heading_2.rich_text)}</h2>`;
        break;
        
      case 'heading_3':
        html += `<h3>${renderRichText(block.heading_3.rich_text)}</h3>`;
        break;
        
      case 'bulleted_list_item':
        if (!inList || inList !== 'bulleted') {
          if (inList) html += inList === 'numbered' ? '</ol>' : '</ul>';
          html += '<ul>';
          inList = 'bulleted';
        }
        html += `<li>${renderRichText(block.bulleted_list_item.rich_text)}</li>`;
        break;
        
      case 'numbered_list_item':
        if (!inList || inList !== 'numbered') {
          if (inList) html += inList === 'bulleted' ? '</ul>' : '</ol>';
          html += '<ol>';
          inList = 'numbered';
        }
        html += `<li>${renderRichText(block.numbered_list_item.rich_text)}</li>`;
        break;
        
      case 'code':
        const codeLanguage = block.code?.language || 'plaintext';
        html += `<pre><code class="language-${codeLanguage}">${
          renderRichText(block.code?.rich_text || [])
        }</code></pre>`;
        break;
        
      case 'quote':
        html += `<blockquote>${renderRichText(block.quote?.rich_text || [])}</blockquote>`;
        break;
        
      case 'image':
        let imageUrl = '';
        if (block.image?.type === 'external') {
          imageUrl = block.image.external?.url || '';
        } else if (block.image?.type === 'file') {
          imageUrl = block.image.file?.url || '';
        }
        
        const caption = block.image?.caption || [];
        
        if (imageUrl) {
          html += `<figure>
            <img src="${imageUrl}" alt="${caption.length > 0 ? renderRichText(caption) : 'Image'}" />`;
          if (caption.length > 0) {
            html += `<figcaption>${renderRichText(caption)}</figcaption>`;
          }
          html += `</figure>`;
        }
        break;
        
      case 'divider':
        html += `<hr />`;
        break;
        
      default:
        console.log(`Unsupported block type: ${block.type}`);
        html += `<div class="unsupported-block">Content block (${block.type})</div>`;
    }
    
    // Close any open lists if the next block is not a list item
    if (inList && 
        block.type !== 'bulleted_list_item' && 
        block.type !== 'numbered_list_item' &&
        blocks.indexOf(block) < blocks.length - 1 && 
        blocks[blocks.indexOf(block) + 1].type !== 'bulleted_list_item' && 
        blocks[blocks.indexOf(block) + 1].type !== 'numbered_list_item') {
      html += inList === 'bulleted' ? '</ul>' : '</ol>';
      inList = false;
    }
  }
  
  // Close any open list at the end
  if (inList) {
    html += inList === 'bulleted' ? '</ul>' : '</ol>';
  }
  
  // If after processing all blocks we ended up with empty HTML,
  // return the "no content" message
  if (!html.trim()) {
    return '<div class="no-content-message"><p>This post has no content yet. Check back later!</p></div>';
  }
  
  return html;
}

// Helper function to render rich text
function renderRichText(richTextArray) {
  if (!richTextArray || !Array.isArray(richTextArray) || richTextArray.length === 0) {
    return '';
  }
  
  return richTextArray.map(richText => {
    let text = richText.plain_text || '';
    
    // Apply annotations
    if (richText.annotations) {
      if (richText.annotations.bold) {
        text = `<strong>${text}</strong>`;
      }
      if (richText.annotations.italic) {
        text = `<em>${text}</em>`;
      }
      if (richText.annotations.strikethrough) {
        text = `<del>${text}</del>`;
      }
      if (richText.annotations.underline) {
        text = `<u>${text}</u>`;
      }
      if (richText.annotations.code) {
        text = `<code>${text}</code>`;
      }
      if (richText.annotations.color && richText.annotations.color !== 'default') {
        text = `<span class="color-${richText.annotations.color}">${text}</span>`;
      }
    }
    
    // Add links
    if (richText.href) {
      text = `<a href="${richText.href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    }
    
    return text;
  }).join('');
}