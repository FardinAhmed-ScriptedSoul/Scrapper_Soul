import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Tailwind v4 uses these patterns to find your classes
  // Make sure this is in your config if the default scan is missing your files
  css: {
    devSourcemap: true,
  }
});