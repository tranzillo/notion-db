// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import fieldColorsIntegration from './src/integrations/fieldColors';

export default defineConfig({
  integrations: [react(), fieldColorsIntegration()],
  // Enable SSR for dynamic routes
  output: 'static',
  // Use SCSS for styling
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "./src/styles/_variables.scss";`
        }
      }
    }
  }
});