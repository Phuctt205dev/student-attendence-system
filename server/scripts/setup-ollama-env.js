import { copyFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const serverDir = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(serverDir, '.env.ollama.example');
const target = join(serverDir, '.env');

if (existsSync(target)) {
  console.log('server/.env đã tồn tại — không ghi đè.');
  console.log('Để dùng Ollama, đảm bảo có: AI_PROVIDER=ollama');
  process.exit(0);
}

copyFileSync(source, target);
console.log('Đã tạo server/.env từ .env.ollama.example');
console.log('Tiếp theo: ollama pull llama3.2');
console.log('         cd server && npm run dev');
