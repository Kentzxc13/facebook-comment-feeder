import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const frontendDir = path.resolve(rootDir, 'frontend');
const srcNext = path.resolve(frontendDir, '.next');
const destNext = path.resolve(rootDir, '.next');

console.log('🚀 Running Next.js build in frontend directory...');
execSync('npx next build', { cwd: frontendDir, stdio: 'inherit' });

console.log('📦 Syncing frontend/.next to project root for Vercel deployment...');
fs.cpSync(srcNext, destNext, { recursive: true });

console.log('✅ Next.js output successfully placed at root .next directory!');
