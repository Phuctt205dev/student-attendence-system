export const QUESTION_TYPE_MCQ = 'mcq';
export const QUESTION_TYPE_ESSAY = 'essay';

export const isEssayQuestion = (question) => question?.type === QUESTION_TYPE_ESSAY;

export const isMcqQuestion = (question) => !isEssayQuestion(question);

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
