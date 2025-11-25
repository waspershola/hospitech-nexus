/**
 * Build script for Electron + Vite
 * Compiles TypeScript for both main/preload and bundles with Vite
 */

import { build } from 'vite';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

async function buildAll() {
  console.log('🔨 Building LuxuryHotelPro Offline Desktop...\n');

  // Step 1: Build Vite frontend
  console.log('📦 Building Vite frontend...');
  await build({
    mode: 'production',
    build: {
      outDir: 'dist',
    },
  });
  console.log('✅ Vite build complete\n');

  // Step 2: Compile Electron TypeScript
  console.log('⚡ Compiling Electron TypeScript...');
  execSync('tsc -p electron/tsconfig.json', { stdio: 'inherit' });
  console.log('✅ Electron TypeScript compiled\n');

  // Step 3: Update package.json for Electron
  console.log('📝 Preparing package.json...');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  pkg.main = 'dist-electron/main.js';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
  console.log('✅ package.json updated\n');

  console.log('✨ Build complete! Ready for electron-builder\n');
  console.log('Run: npm run dist');
}

buildAll().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
