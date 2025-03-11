import { marked } from 'marked';

export function renderMarkdown(content) {
  if (!content) return '';
  return marked(content);
}