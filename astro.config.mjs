// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import disciplineColorsIntegration from './src/integrations/disciplineColors';
import netlify from '@astrojs/netlify';

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
    },
    // Make sure Netlify environment variables are available
    define: {
      'process.env.NETLIFY': JSON.stringify(process.env.NETLIFY),
    }
  },

  output: 'server',
  
  adapter: netlify(),
  
  // Specific route configuration
  routes: [
    // Mark all API routes as server-rendered
    { pattern: '/api/*', prerender: false },
    // Ensure all other routes are static
    { pattern: '/*', prerender: true }
  ],
  
  // Explicitly tell Astro to prerender as much as possible
  build: {
    format: 'directory'
  }
});