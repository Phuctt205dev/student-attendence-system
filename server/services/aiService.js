import { config, getChatCompletionsUrl } from '../config.js';

const SYSTEM_PROMPT = `Bạn là trợ lý tạo ngân hàng câu hỏi trắc nghiệm (MCQ) cho giáo viên đại học Việt Nam.
Dựa trên đoạn nội dung được cung cấp, tạo câu hỏi trắc nghiệm 4 đáp án A, B, C, D.
Mỗi câu phải có đúng một đáp án đúng (correctAnswer: "A"|"B"|"C"|"D").
Câu hỏi và đáp án phải bằng tiếng Việt, sát nội dung đoạn văn, không bịa thông tin ngoài văn bản.
Trả về JSON thuần theo schema:
{"questions":[{"questionText":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correctAnswer":"A","points":1}]}`;

const parseQuestionsFromContent = (content) => {
  if (!content || typeof content !== 'string') {
    throw new Error('AI không trả về nội dung hợp lệ');
  }

  let jsonText = content.trim();

  const fenced = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    jsonText = fenced[1].trim();
  }

  const parsed = JSON.parse(jsonText);
  const list = parsed.questions ?? parsed;
  if (!Array.isArray(list)) {
    throw new Error('Định dạng câu hỏi từ AI không hợp lệ');
  }

  return list
    .map(normalizeQuestion)
    .filter(Boolean);
};

const normalizeQuestion = (raw) => {
  const questionText = String(raw.questionText || raw.question || '').trim();
  const options = raw.options || {};
  const correctAnswer = String(raw.correctAnswer || '').toUpperCase();

  const normalizedOptions = {
    A: String(options.A || raw.optionA || '').trim(),
    B: String(options.B || raw.optionB || '').trim(),
    C: String(options.C || raw.optionC || '').trim(),
    D: String(options.D || raw.optionD || '').trim()
  };

  if (
    questionText.length < 10 ||
    !normalizedOptions.A ||
    !normalizedOptions.B ||
    !normalizedOptions.C ||
    !normalizedOptions.D ||
    !['A', 'B', 'C', 'D'].includes(correctAnswer)
  ) {
    return null;
  }

  const points = Math.min(100, Math.max(1, parseInt(raw.points, 10) || 1));

  return {
    questionText,
    options: normalizedOptions,
    correctAnswer,
    points
  };
};

export const generateQuestionsForChunk = async ({
  chunkText,
  chunkIndex,
  totalChunks,
  questionsPerChunk,
  subjectName,
  topicName
}) => {
  if (!config.aiApiKey) {
    throw new Error('Thiếu cấu hình AI_API_KEY trên server');
  }

  const url = getChatCompletionsUrl();
  if (!url) {
    throw new Error('Thiếu cấu hình AI_API_BASE_URL trên server');
  }

  const userPrompt = `Môn học: ${subjectName || 'N/A'}
Chủ đề: ${topicName || 'N/A'}
Đoạn ${chunkIndex + 1}/${totalChunks} — tạo đúng ${questionsPerChunk} câu hỏi MCQ từ nội dung sau:

---
${chunkText}
---`;

  const body = {
    model: config.aiModel,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.4
  };

  if (config.aiModel.includes('gpt-oss') || config.aiModel.includes('o1') || config.aiModel.includes('o3')) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.aiApiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI API lỗi (${response.status}): ${errText.slice(0, 500)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  return parseQuestionsFromContent(content);
};

export const dedupeQuestions = (questions) => {
  const seen = new Set();
  return questions.filter((q) => {
    const key = q.questionText.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
