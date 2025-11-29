// Simple script to generate placeholder icons for the extension
// Run with: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

// Simple SVG icon template
const iconSvg = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#007bff" rx="4"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">FS</text>
</svg>`;

const publicDir = path.join(__dirname, '..', 'public');
const sizes = [16, 48, 128];

// Create public directory if it doesn't exist
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// Generate SVG icons
sizes.forEach(size => {
    const svgPath = path.join(publicDir, `icon${size}.svg`);
    fs.writeFileSync(svgPath, iconSvg(size));
    console.log(`Created ${svgPath}`);
});

console.log('\nNote: Chrome extensions require PNG icons. Please convert the SVG files to PNG:');
console.log('  - icon16.svg -> icon16.png');
console.log('  - icon48.svg -> icon48.png');
console.log('  - icon128.svg -> icon128.png');
console.log('\nYou can use an online converter or ImageMagick:');
console.log('  convert icon16.svg icon16.png');

