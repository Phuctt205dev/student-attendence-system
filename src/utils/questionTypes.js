export const QUESTION_TYPE_MCQ = 'mcq';
export const QUESTION_TYPE_ESSAY = 'essay';

export const hasMcqOptions = (question) => {
  const opts = question?.options;
  if (!opts || typeof opts !== 'object') return false;
  return Object.values(opts).some((v) => typeof v === 'string' && v.trim().length > 0);
};

/** Essay nếu type === essay, hoặc câu cũ/lưu thiếu không có đáp án trắc nghiệm hợp lệ. */
export const isEssayQuestion = (question) => {
  if (question?.type === QUESTION_TYPE_ESSAY) return true;
  if (question?.type === QUESTION_TYPE_MCQ) return false;
  return !hasMcqOptions(question);
};

export const isMcqQuestion = (question) => !isEssayQuestion(question);

export const getQuestionTypeLabel = (question) =>
  isEssayQuestion(question) ? 'Tự luận' : 'Trắc nghiệm';

/** Điểm tối đa: ưu tiên cấu hình câu hỏi gốc, không dùng snapshot exam nếu lệch. */
export const getQuestionMaxPoints = (question, questionRef) => {
  const refPoints =
    questionRef && typeof questionRef === 'object' ? questionRef.points : undefined;
  return question?.points ?? refPoints ?? 1;
};

/** Trắc nghiệm trước, tự luận sau. */
export const sortQuestionsByType = (questions) => {
  const mcq = [];
  const essay = [];
  for (const q of questions) {
    if (isEssayQuestion(q)) {
      essay.push(q);
    } else {
      mcq.push(q);
    }
  }
  return [...mcq, ...essay];
};

export const partitionQuestionsByType = (questions) => {
  const sorted = sortQuestionsByType(questions);
  const mcqQuestions = sorted.filter(isMcqQuestion);
  const essayQuestions = sorted.filter(isEssayQuestion);
  return { sorted, mcqQuestions, essayQuestions };
};
