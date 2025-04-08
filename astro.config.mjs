// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import fieldColorsIntegration from './src/integrations/fieldColors';
import resourceColorsIntegration from './src/integrations/resourceColors';

export default defineConfig({
  integrations: [
    react({
      include: ['**/components/**/*.jsx'],
      ssr: true,
      client: true,
      hydration: 'client:load'
    }), 
    fieldColorsIntegration(),
    resourceColorsIntegration() // Add the new integration
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
      include: [
        'react', 
        'react-dom',
        'pixi.js',
        '@pixi/events',
        'pixi-viewport',
        'd3-force-3d'
      ]
    },
    // Handle external dependencies properly
    ssr: {
      noExternal: [
        'pixi.js', 
        '@pixi/events', 
        'pixi-viewport'
      ]
    },
    // This ensures React is properly shared across all components
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'pixi-vendor': ['pixi.js', '@pixi/events', 'pixi-viewport'],
            'd3-vendor': ['d3', 'd3-force-3d']
          }
        }
      }
    }
  }
});