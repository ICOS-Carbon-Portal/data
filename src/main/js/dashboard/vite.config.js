import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import buildConf from '../common/main/buildConf.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // generate manifest.json in outDir
    manifest: true,
    rollupOptions: {
      // overwrite default .html entry
      input: 'main/main.jsx',
      output: [{
        dir: buildConf.buildTarget + 'dashboard/dashboard.js',
      }]
    },
  },
  server: {
    hmr: {
      host: 'localhost'
    }
  }
})
