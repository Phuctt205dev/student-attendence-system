
import fs from 'fs';
import path from 'path';
import PDFParser from 'pdf2json';

// Please copy your Test_bold.pdf to the server directory first!
const pdfPath = path.join(process.cwd(), 'Test_bold.pdf');

if (!fs.existsSync(pdfPath)) {
  console.error('ERROR: Test_bold.pdf not found in server directory!');
  console.error('Please copy your PDF file to:', pdfPath);
  process.exit(1);
}

console.log('Reading PDF file from:', pdfPath);
const pdfBuffer = fs.readFileSync(pdfPath);

const pdfParser = new PDFParser();

pdfParser.on('pdfParser_dataReady', (pdfData) => {
  console.log('=== PDF data extracted successfully! ===');
  
  let fullText = '';
  const boldTexts = [];
  let currentBoldText = '';
  let isInBold = false;

  console.log('\n=== Page by page analysis ===');
  pdfData.Pages.forEach((page, pageIndex) => {
    console.log(`\n--- Page ${pageIndex + 1} ---`);
    page.Texts.forEach((text, textIndex) => {
      const decodedText = decodeURIComponent(text.R[0].T);
      const fontName = text.R[0].fontName || '';
      const isBold = fontName.toLowerCase().includes('bold') || fontName.toLowerCase().includes('black');
      
      console.log(`  Text ${textIndex}: "${decodedText}" (font: "${fontName}", bold: ${isBold})`);
      
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
  
  console.log('\n=== Full extracted text ===');
  console.log(fullText);
  
  console.log('\n=== Detected bold texts ===');
  console.log(boldTexts);
  
  // Now let's find the positions of these bold texts in the full text
  const boldRanges = [];
  for (const boldText of boldTexts) {
    let index = 0;
    while ((index = fullText.indexOf(boldText, index)) !== -1) {
      boldRanges.push({ start: index, end: index + boldText.length, text: boldText });
      console.log(`Found bold text "${boldText}" at position: ${index} to ${index + boldText.length}`);
      index += boldText.length;
    }
  }
  
  console.log('\n=== Bold ranges ===');
  console.log(boldRanges);
});

pdfParser.on('pdfParser_dataError', (errData) => {
  console.error('Error parsing PDF:', errData.parserError);
});

pdfParser.parseBuffer(pdfBuffer);

