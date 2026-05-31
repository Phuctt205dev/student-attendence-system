import multer from 'multer';
import { config } from '../config.js';
import { getFileType } from '../services/textExtractor.js';

const storage = multer.memoryStorage();

export const uploadDocument = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (!getFileType(file.originalname)) {
      cb(new Error('Chỉ hỗ trợ file PDF, DOCX, TXT, MD'));
      return;
    }
    cb(null, true);
  }
}).single('file');
