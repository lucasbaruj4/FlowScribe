import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'src/popup.html'),
                background: resolve(__dirname, 'src/background.ts'),
                content_script: resolve(__dirname, 'src/content_script.ts'),
            },
            output: {
                entryFileNames: '[name].js',
            }
        },
        outDir: 'dist'
    }
});
