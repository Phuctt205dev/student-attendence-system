import mammoth from 'mammoth';
import PDFParser from 'pdf2json';
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

const extractFromDocx = async (buffer) => {
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;
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
};

const extractFromPdf = async (buffer) => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      let fullText = '';
      const boldTexts = [];
      let currentBoldText = '';
      let isInBold = false;

      pdfData.Pages.forEach(page => {
        page.Texts.forEach(text => {
          const decodedText = decodeURIComponent(text.R[0].T);
          const fontName = text.R[0].fontName || '';
          const isBold = fontName.toLowerCase().includes('bold') || fontName.toLowerCase().includes('black');

          fullText += decodedText;

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
        fullText += '\n';
      });

      if (currentBoldText.trim()) {
        boldTexts.push(currentBoldText.trim());
      }

      const boldRanges = [];
      for (const boldText of boldTexts) {
        let index = 0;
        while ((index = fullText.indexOf(boldText, index)) !== -1) {
          boldRanges.push({ start: index, end: index + boldText.length, text: boldText });
          index += boldText.length;
        }
      }

      resolve({ plainText: fullText.trim(), boldRanges });
    });

    pdfParser.on('pdfParser_dataError', (errData) => {
      reject(errData.parserError);
    });

    pdfParser.parseBuffer(buffer);
  });
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
