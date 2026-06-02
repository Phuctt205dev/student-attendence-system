import { copyFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const serverDir = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(serverDir, '.env.gemini.example');
const target = join(serverDir, '.env');

if (existsSync(target)) {
  console.log('server/.env đã tồn tại.');
  console.log('Mở file và đặt: AI_PROVIDER=gemini, GEMINI_API_KEY=<key của bạn>');
  process.exit(0);
}

copyFileSync(source, target);
console.log('Đã tạo server/.env từ .env.gemini.example');
console.log('1. Mở server/.env → dán GEMINI_API_KEY');
console.log('2. cd server && npm run dev');
console.log('3. GitHub Pages: thêm cùng key trên Railway + secret VITE_API_URL');
