import {
  partitionQuestionsByType,
  getQuestionMaxPoints,
  isEssayQuestion
} from './questionTypes';

const formatPointsLabel = (question) => {
  const points = getQuestionMaxPoints(question);
  const n = Number(points);
  if (!Number.isFinite(n) || n <= 0) return '1';
  return n % 1 === 0 ? String(n) : n.toFixed(1).replace(/\.0$/, '');
};

const formatMcqQuestion = (question, index) => {
  const points = formatPointsLabel(question);
  const options = ['A', 'B', 'C', 'D']
    .filter((key) => {
      const text = question.options?.[key];
      return typeof text === 'string' && text.trim().length > 0;
    })
    .map((key) => `${key}. ${question.options[key].trim()}`)
    .join('\n');

  return `Câu ${index} (${points} điểm): ${question.questionText.trim()}\n${options}`.trim();
};

const formatEssayQuestion = (question, index) => {
  const points = formatPointsLabel(question);
  return `Câu ${index} (${points} điểm): ${question.questionText.trim()}`;
};

/**
 * Nội dung thay vào {{QUESTIONS}} trong mẫu Word.
 * Tách phần trắc nghiệm / tự luận; ghi điểm từng câu bên cạnh số câu.
 */
export const buildExamQuestionsTextForDocx = (questions) => {
  const { mcqQuestions, essayQuestions } = partitionQuestionsByType(questions);
  const blocks = [];

  if (mcqQuestions.length > 0) {
    if (essayQuestions.length > 0) {
      blocks.push('PHẦN I. TRẮC NGHIỆM');
    }
    blocks.push(
      mcqQuestions.map((q, i) => formatMcqQuestion(q, i + 1)).join('\n\n')
    );
  }

  if (essayQuestions.length > 0) {
    if (mcqQuestions.length > 0) {
      blocks.push('PHẦN II. TỰ LUẬN');
    }
    blocks.push(
      essayQuestions.map((q, i) => formatEssayQuestion(q, i + 1)).join('\n\n')
    );
  }

  return blocks.join('\n\n');
};

export const buildExamPrintVersionRecord = ({
  examId,
  versionName,
  codeLabel,
  questions
}) => {
  const questionList = Array.isArray(questions) ? questions : [];
  const answerKey = {};
  const { mcqQuestions, essayQuestions } = partitionQuestionsByType(questionList);

  const mcqMap = mcqQuestions.map((question, index) => {
    const questionNumber = index + 1;
    const correctAnswer = question.correctAnswer || null;

    if (correctAnswer) {
      answerKey[String(questionNumber)] = correctAnswer;
    }

    return {
      questionNumber,
      section: 'mcq',
      questionId: question.id,
      type: 'mcq',
      correctAnswer,
      points: getQuestionMaxPoints(question)
    };
  });

  const essayMap = essayQuestions.map((question, index) => ({
    questionNumber: index + 1,
    section: 'essay',
    questionId: question.id,
    type: 'essay',
    correctAnswer: null,
    points: getQuestionMaxPoints(question)
  }));

  return {
    examId,
    versionName,
    codeLabel,
    questionCount: questionList.length,
    mcqCount: mcqQuestions.length,
    essayCount: essayQuestions.length,
    answerKey,
    questionMap: [...mcqMap, ...essayMap]
  };
};

/** Bài thi chỉ có câu tự luận → dùng mẫu dethimauTL.docx */
export const isAllEssayExam = (questions) =>
  Array.isArray(questions) &&
  questions.length > 0 &&
  questions.every(isEssayQuestion);

export const getExamDocxTemplateFileName = (questions) =>
  isAllEssayExam(questions) ? 'dethimauTL.docx' : 'dethimau.docx';

/** Xáo câu theo mã đề, giữ trắc nghiệm trước tự luận */
export const shuffleExamQuestionsForVersion = (questions, seedValue, seedSuffix = '') => {
  const { mcqQuestions, essayQuestions } = partitionQuestionsByType(questions);
  const mcqSeed = seedValue;
  const essaySeed = seedValue + (seedSuffix ? hashString(seedSuffix) : 7919);

  return [
    ...shuffleWithSeed(mcqQuestions, mcqSeed),
    ...shuffleWithSeed(essayQuestions, essaySeed)
  ];
};

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
};

const createSeededRandom = (seed) => {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
};

const shuffleWithSeed = (items, seedValue) => {
  if (!items.length) return [];
  const result = [...items];
  const rand = createSeededRandom(seedValue);
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
