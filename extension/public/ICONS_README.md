# Extension Icons

Placeholder SVG icons have been created. To use them in the Chrome extension, they need to be converted to PNG format.

## Quick Setup

1. Install ImageMagick:
   - Linux: `sudo apt-get install imagemagick`
   - macOS: `brew install imagemagick`
   - Windows: Download from https://imagemagick.org/

2. Convert SVG to PNG:
   ```bash
   convert public/icon16.svg public/icon16.png
   convert public/icon48.svg public/icon48.png
   convert public/icon128.svg public/icon128.png
   ```

3. Or use an online converter:
   - Upload each SVG file to an online SVG to PNG converter
   - Download the PNG files and place them in the `public/` directory

## Alternative: Use Online Tools

You can also use online tools like:
- https://cloudconvert.com/svg-to-png
- https://convertio.co/svg-png/

The extension will work with SVG files temporarily, but Chrome prefers PNG format for extension icons.

