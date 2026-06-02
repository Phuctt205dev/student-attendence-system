import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import path from 'path';

export const getFileType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'pdf';
    case '.docx':
    case '.doc':
      return 'docx';
    case '.txt':
    case '.md':
      return 'text';
    default:
      return null;
  }
};

export const extractTextFromFile = async (file) => {
  const type = getFileType(file.originalname);
  if (!type) throw new Error('Định dạng file không hỗ trợ');

  let text = '';
  switch (type) {
    case 'pdf':
      const pdfData = await pdfParse(file.buffer);
      text = pdfData.text;
      break;
    case 'docx':
      const docxData = await mammoth.extractRawText({ buffer: file.buffer });
      text = docxData.value;
      break;
    case 'text':
      text = file.buffer.toString('utf8');
      break;
  }

  return text.trim();
};
