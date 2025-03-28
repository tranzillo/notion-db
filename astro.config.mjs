import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import disciplineColorsIntegration from './src/integrations/disciplineColors';

export default defineConfig({
  integrations: [react(), disciplineColorsIntegration(),],
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