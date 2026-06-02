
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import PDFParser from 'pdf2json';
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

const htmlToPlainWithLineBreaks = (html) => {
  return html
    .replace(/<\/p>\s*/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>\s*/gi, '\n')
    .replace(/<li[^>]*>/gi, '')
    .replace(/<\/tr>\s*/gi, '\n')
    .replace(/<\/h[1-6]>\s*/gi, '\n')
    .replace(/<h[1-6][^>]*>/gi, '')
    .replace(/<\/div>\s*/gi, '\n')
    .replace(/<div[^>]*>/gi, '');
};

const extractFromDocx = async (buffer) => {
  try {
    const result = await mammoth.convertToHtml({ buffer });
    const html = htmlToPlainWithLineBreaks(result.value);
    let plainText = '';
    const boldRanges = [];
    let currentIndex = 0;

    const tokenizer = /<(strong|b)>(.*?)<\/(strong|b)>|([^<]+)/gis;
    let match;
    while ((match = tokenizer.exec(html)) !== null) {
      if (match[2]) {
        const boldText = match[2].replace(/<[^>]*>/g, '');
        boldRanges.push({ start: currentIndex, end: currentIndex + boldText.length, text: boldText });
        plainText += boldText;
        currentIndex += boldText.length;
      } else if (match[4]) {
        const normalText = match[4].replace(/<[^>]*>/g, '');
        plainText += normalText;
        currentIndex += normalText.length;
      }
    }

    return { plainText: plainText.trim(), boldRanges };
  } catch (err) {
    console.warn('Error extracting with mammoth convertToHtml, falling back to raw text:', err);
    const result = await mammoth.extractRawText({ buffer });
    return { plainText: result.value.trim(), boldRanges: [] };
  }
};

const extractBoldFromPdf = (buffer) => {
  return new Promise((resolve) => {
    try {
      const pdfParser = new PDFParser();
      pdfParser.on('pdfParser_dataReady', (pdfData) => {
        const boldTexts = [];
        let currentBoldText = '';
        let isInBold = false;

        pdfData.Pages.forEach(page => {
          page.Texts.forEach(text => {
            const decodedText = decodeURIComponent(text.R[0].T);
            const fontName = text.R[0].fontName || '';
            const isBold = fontName.toLowerCase().includes('bold') || fontName.toLowerCase().includes('black');

            if (isBold) {
              currentBoldText += decodedText;
              isInBold = true;
            } else {
              if (isInBold && currentBoldText.trim()) {
                boldTexts.push(currentBoldText.trim());
              }
              currentBoldText = '';
              isInBold = false;
            }
          });
        });

        if (currentBoldText.trim()) {
          boldTexts.push(currentBoldText.trim());
        }
        resolve(boldTexts);
      });
      pdfParser.on('pdfParser_dataError', () => {
        resolve([]);
      });
      pdfParser.parseBuffer(buffer);
    } catch {
      resolve([]);
    }
  });
};

const extractFromPdf = async (buffer) => {
  try {
    const pdfData = await pdfParse(buffer);
    const plainText = pdfData.text.trim();
    const boldTexts = await extractBoldFromPdf(buffer);
    
    const boldRanges = [];
    for (const boldText of boldTexts) {
      let index = 0;
      while ((index = plainText.indexOf(boldText, index)) !== -1) {
        boldRanges.push({ start: index, end: index + boldText.length, text: boldText });
        index += boldText.length;
      }
    }

    return { plainText, boldRanges };
  } catch (err) {
    console.error('Error extracting from PDF:', err);
    throw err;
  }
};

const extractFromText = (buffer) => {
  const text = buffer.toString('utf8');
  return { plainText: text.trim(), boldRanges: [] };
};

export const extractTextFromFile = async (file) => {
  const type = getFileType(file.originalname);
  if (!type) throw new Error('Định dạng file không hỗ trợ');

  let result;
  switch (type) {
    case 'pdf':
      result = await extractFromPdf(file.buffer);
      break;
    case 'docx':
      result = await extractFromDocx(file.buffer);
      break;
    case 'text':
      result = extractFromText(file.buffer);
      break;
    default:
      throw new Error('Định dạng file không hỗ trợ');
  }

  return result;
};

