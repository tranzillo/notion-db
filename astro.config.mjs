// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import fieldColorsIntegration from './src/integrations/fieldColors';

export default defineConfig({
  integrations: [
    react({
      include: ['**/components/**/*.jsx'],
      ssr: true,
      client: true,
      hydration: 'client:load'
    }), 
    fieldColorsIntegration()
  ],
  output: 'static',
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "./src/styles/_variables.scss";`
        }
      }
    },
    // Critical: Add this to prevent duplicate React instances
    optimizeDeps: {
      include: ['react', 'react-dom']
    },
    // This ensures React is properly shared across all components
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom']
          }
        }
      }
    }
  }
});