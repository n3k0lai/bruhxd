import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    hmr: true, // This enables hot reloading
  },
  assetsInclude: ['**/*.gltf', '**/*.bin']
});
