import mammoth from 'mammoth';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const EXTENSIONS = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.doc': 'docx',
  '.txt': 'text',
  '.md': 'text'
};

export const getFileType = (filename) => {
  const lower = filename.toLowerCase();
  const ext = Object.keys(EXTENSIONS).find((e) => lower.endsWith(e));
  return ext ? EXTENSIONS[ext] : null;
};

export const extractTextFromFile = async (file) => {
  const type = getFileType(file.originalname || file.name || '');

  if (!type) {
    throw new Error('Định dạng không hỗ trợ. Vui lòng tải file PDF, DOCX hoặc TXT.');
  }

  const buffer = file.buffer;

  if (type === 'pdf') {
    const data = await pdfParse(buffer);
    return (data.text || '').trim();
  }

  if (type === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || '').trim();
  }

  return buffer.toString('utf8').trim();
};
