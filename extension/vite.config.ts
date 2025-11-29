import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync, copyFileSync, unlinkSync, rmdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Plugin to copy manifest and icons to dist, and move popup.html
function copyManifestPlugin() {
    return {
        name: 'copy-manifest',
        writeBundle() {
            const distDir = resolve(__dirname, 'dist');
            const publicDir = resolve(__dirname, 'public');
            
            // Move popup.html from dist/src/ to dist/
            const popupHtmlSrc = resolve(distDir, 'src', 'popup.html');
            const popupHtmlDest = resolve(distDir, 'popup.html');
            if (existsSync(popupHtmlSrc)) {
                copyFileSync(popupHtmlSrc, popupHtmlDest);
                // Remove the src directory if empty (optional cleanup)
                try {
                    unlinkSync(popupHtmlSrc);
                    try {
                        rmdirSync(resolve(distDir, 'src'));
                    } catch {
                        // Directory not empty, ignore
                    }
                } catch {
                    // Ignore cleanup errors
                }
            }
            
            // Copy manifest.json
            const manifestSrc = resolve(__dirname, 'manifest.json');
            const manifestDest = resolve(distDir, 'manifest.json');
            if (existsSync(manifestSrc)) {
                copyFileSync(manifestSrc, manifestDest);
                console.log('Copied manifest.json to dist');
            }

            // Copy icons (PNG or SVG) and update manifest to match
            const iconExtensions: Record<number, string> = {};
            if (existsSync(publicDir)) {
                const iconSizes = [16, 48, 128];
                iconSizes.forEach(size => {
                    // Try PNG first, then SVG
                    const pngSrc = resolve(publicDir, `icon${size}.png`);
                    const svgSrc = resolve(publicDir, `icon${size}.svg`);
                    
                    if (existsSync(pngSrc)) {
                        const dest = resolve(distDir, `icon${size}.png`);
                        copyFileSync(pngSrc, dest);
                        iconExtensions[size] = 'png';
                        console.log(`Copied icon${size}.png to dist`);
                    } else if (existsSync(svgSrc)) {
                        const dest = resolve(distDir, `icon${size}.svg`);
                        copyFileSync(svgSrc, dest);
                        iconExtensions[size] = 'svg';
                        console.log(`Copied icon${size}.svg to dist`);
                    }
                });
            }

            // Update manifest.json to reference the correct icon extensions
            if (Object.keys(iconExtensions).length > 0 && existsSync(manifestDest)) {
                const manifestContent = JSON.parse(readFileSync(manifestDest, 'utf-8'));
                const iconSizes = [16, 48, 128];
                
                // Update default_icon
                if (manifestContent.action?.default_icon) {
                    iconSizes.forEach(size => {
                        if (iconExtensions[size]) {
                            manifestContent.action.default_icon[String(size)] = `icon${size}.${iconExtensions[size]}`;
                        }
                    });
                }
                
                // Update icons
                if (manifestContent.icons) {
                    iconSizes.forEach(size => {
                        if (iconExtensions[size]) {
                            manifestContent.icons[String(size)] = `icon${size}.${iconExtensions[size]}`;
                        }
                    });
                }
                
                writeFileSync(manifestDest, JSON.stringify(manifestContent, null, 4) + '\n');
                console.log('Updated manifest.json with correct icon extensions');
            }
        }
    };
}

export default defineConfig({
    plugins: [react(), copyManifestPlugin()],
    build: {
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'src/popup.html'),
                background: resolve(__dirname, 'src/background.ts'),
                content_script: resolve(__dirname, 'src/content_script.ts'),
            },
            output: {
                entryFileNames: '[name].js',
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name === 'popup.html') {
                        return 'popup.html';
                    }
                    return assetInfo.name || 'assets/[name].[ext]';
                }
            }
        },
        outDir: 'dist'
    }
});
