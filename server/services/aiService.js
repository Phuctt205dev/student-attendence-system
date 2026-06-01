import { config } from '../config.js';
import { ClientSecretCredential } from '@azure/identity';
import { AIProjectClient } from '@azure/ai-projects/client';

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
  if (!config.azureClientId || !config.azureClientSecret || !config.azureTenantId) {
    throw new Error('Thiếu cấu hình Azure credentials (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID)');
  }

  if (!config.azureAiEndpoint) {
    throw new Error('Thiếu cấu hình AZURE_AI_ENDPOINT');
  }

  const credential = new ClientSecretCredential(
    config.azureTenantId,
    config.azureClientId,
    config.azureClientSecret
  );

  const projectClient = new AIProjectClient(
    config.azureAiEndpoint,
    credential
  );

  const userPrompt = `Môn học: ${subjectName || 'N/A'}
Chủ đề: ${topicName || 'N/A'}
Đoạn ${chunkIndex + 1}/${totalChunks} — tạo đúng ${questionsPerChunk} câu hỏi trắc nghiệm 4 đáp án A, B, C, D từ nội dung sau:

---
${chunkText}
---

Yêu cầu:
- Mỗi câu phải có đúng một đáp án đúng (correctAnswer: "A"|"B"|"C"|"D")
- Câu hỏi và đáp án phải bằng tiếng Việt
- Không bịa thông tin ngoài văn bản được cung cấp
- Trả về JSON thuần theo schema: {"questions":[{"questionText":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correctAnswer":"A","points":1}]}`;

  const openaiClient = projectClient.getOpenAIClient({
    azureConfig: {
      agentName: config.azureAgentName,
      allowPreview: true
    }
  });

  const conversation = await openaiClient.conversations.create({
    items: [
      { type: 'message', role: 'user', content: userPrompt }
    ]
  });

  const response = await openaiClient.responses.create(
    {
      conversation: conversation.id,
    },
    {
      body: {
        agent: {
          name: config.azureAgentName,
          type: 'agent_reference',
          version: config.azureAgentVersion
        }
      },
    }
  );

  const content = response.output_text;

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
