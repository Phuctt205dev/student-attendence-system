
import fs from 'fs';
import path from 'path';
import { extractTextFromFile } from './services/textExtractor.js';
import { extractQuestionsRegex } from './services/questionParser.js';

const testPdfPath = path.join(process.cwd(), 'Test.pdf');

console.log('Test file path:', testPdfPath);
if (!fs.existsSync(testPdfPath)) {
  console.error('Error: Test.pdf not found! Please copy your Test.pdf to the server directory!');
  process.exit(1);
}

const buffer = fs.readFileSync(testPdfPath);
console.log('Read file, size:', buffer.length, 'bytes');

const fakeFile = {
  originalname: 'Test.pdf',
  buffer: buffer
};

(async () => {
  try {
    const extractedResult = await extractTextFromFile(fakeFile);
    console.log('=== Extracted Result ===');
    console.log('Plain Text Length:', extractedResult.plainText.length);
    console.log('Bold Ranges:', extractedResult.boldRanges);
    console.log('\n=== Plain Text Preview ===');
    console.log(extractedResult.plainText);
    
    const questions = extractQuestionsRegex(extractedResult, 1);
    console.log('\n=== Extracted Questions ===');
    console.log('Total questions:', questions.length);
    console.log(questions);
  } catch (err) {
    console.error('Error during extraction:', err);
  }
})();

