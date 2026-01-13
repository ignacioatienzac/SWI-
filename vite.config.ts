import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    base: './', // Vital para que funcione en subdirectorios de GitHub Pages
    define: {
      // Shim para mantener compatibilidad con el código existente que usa process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY || '')
    }
  };
});
