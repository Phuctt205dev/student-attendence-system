import { Router } from 'express';
import { config } from '../config.js';
import { uploadDocument } from '../middleware/upload.js';
import { extractTextFromFile } from '../services/textExtractor.js';
import { chunkText } from '../services/textChunker.js';
import { dedupeQuestions, generateQuestionsForChunk } from '../services/aiService.js';
import { extractQuestionsRegex } from '../services/questionParser.js';

const router = Router();

const handleUpload = (req, res, next) => {
  uploadDocument(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
};

router.post('/generate-questions', handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Vui lòng chọn file để tải lên' });
    }

    const questionsPerChunk = Math.min(
      10,
      Math.max(1, parseInt(req.body.questionsPerChunk, 10) || 3)
    );
    const subjectName = req.body.subjectName || '';
    const topicName = req.body.topicName || '';
    const defaultPoints = Math.min(
      100,
      Math.max(1, parseInt(req.body.defaultPoints, 10) || 1)
    );

    const extractedText = await extractTextFromFile(req.file);

    if (!extractedText || extractedText.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Không trích xuất được đủ nội dung từ file (tối thiểu ~50 ký tự)'
      });
    }

    const chunks = chunkText(
      extractedText,
      config.chunkSize,
      config.chunkOverlap,
      config.maxChunks
    );

    const allQuestions = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkQuestions = await generateQuestionsForChunk({
        chunkText: chunks[i],
        chunkIndex: i,
        totalChunks: chunks.length,
        questionsPerChunk,
        subjectName,
        topicName
      });

      const withPoints = chunkQuestions.map((q) => ({
        ...q,
        points: q.points || defaultPoints
      }));

      allQuestions.push(...withPoints);
    }

    const questions = dedupeQuestions(allQuestions);

    if (questions.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'AI không tạo được câu hỏi hợp lệ từ nội dung file'
      });
    }

    return res.json({
      success: true,
      data: {
        questions,
        chunksProcessed: chunks.length,
        textLength: extractedText.length,
        totalQuestions: questions.length
      }
    });
  } catch (error) {
    console.error('generate-questions error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi tạo câu hỏi từ file'
    });
  }
});

router.post('/extract-questions', handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Vui lòng chọn file để tải lên' });
    }

    const defaultPoints = Math.min(
      100,
      Math.max(1, parseInt(req.body.defaultPoints, 10) || 1)
    );

    const extractedText = await extractTextFromFile(req.file);

    if (!extractedText || extractedText.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Không trích xuất được đủ nội dung từ file'
      });
    }

    const questions = extractQuestionsRegex(extractedText, defaultPoints);

    if (questions.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'Không tìm thấy câu hỏi nào hợp lệ trong file. Vui lòng kiểm tra định dạng (Câu 1: ... A. ... B. ... C. ... D. ...).'
      });
    }

    return res.json({
      success: true,
      data: {
        questions,
        chunksProcessed: 1,
        textLength: extractedText.length,
        totalQuestions: questions.length
      }
    });
  } catch (error) {
    console.error('extract-questions error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi trích xuất câu hỏi từ file'
    });
  }
});

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    configured: Boolean(
      config.aiApiKey &&
      config.aiApiBaseUrl
    ),
    model: config.aiModel || 'gpt-oss-120b',
    apiVersion: config.aiApiVersion
  });
});

export default router;
