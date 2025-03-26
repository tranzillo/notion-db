// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import disciplineColorsIntegration from './src/integrations/disciplineColors';
import netlify from '@astrojs/netlify';
import node from '@astrojs/node';

// Detect environment
const isNetlify = process.env.NETLIFY === 'true';

export default defineConfig({
  integrations: [
    react(), 
    disciplineColorsIntegration(),
  ],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "./src/styles/_variables.scss";`
        }
      }
    }
  },

  // Use server output for API endpoints
  output: 'server',
  
  // Conditional adapter based on environment
  adapter: isNetlify 
    ? netlify({
        // Netlify Functions/Edge config if needed
        edgeMiddleware: true  // Enable Edge Middleware
      })
    : node({
        mode: 'standalone'
      })
});