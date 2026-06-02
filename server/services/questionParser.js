
export const extractQuestionsRegex = (extractedResult, defaultPoints = 1) => {
  const questions = [];
  const rawText = extractedResult.plainText;

  // First, split the text into lines to process line by line
  const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(line => line);
  
  let currentQuestion = null;
  const optionRegex = /^(\*?)([A-D])[:.\)]\s*(.*)$/i; // Match options at start of line
  const questionStartRegex = /^(Câu|Question)\s*\d+/i; // Match question starts

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (questionStartRegex.test(line)) {
      // If we were building a question, save it first
      if (currentQuestion && currentQuestion.questionText && currentQuestion.options.A && currentQuestion.options.B && currentQuestion.options.C && currentQuestion.options.D) {
        questions.push({
          questionText: currentQuestion.questionText,
          options: currentQuestion.options,
          correctAnswer: currentQuestion.correctAnswer || 'A',
          points: defaultPoints
        });
      }
      
      // Start a new question
      // Remove "Câu X:" or "Question X:" prefix
      const questionText = line.replace(questionStartRegex, '').replace(/^[:.\-)]\s*/, '').replace(/[:.\-)]\s*$/, '').trim();
      currentQuestion = {
        questionText: questionText,
        options: {},
        correctAnswer: 'A'
      };
    } else if (currentQuestion) {
      // Check if this line is an option
      const match = line.match(optionRegex);
      if (match) {
        const isCorrect = !!match[1];
        const letter = match[2].toUpperCase();
        const optionText = match[3].trim();
        
        currentQuestion.options[letter] = optionText;
        if (isCorrect) {
          currentQuestion.correctAnswer = letter;
        }
      } else {
        // If it's not an option and not a new question, add it to the current question text if needed
        if (Object.keys(currentQuestion.options).length === 0) {
          currentQuestion.questionText += ' ' + line;
        }
      }
    }
  }
  
  // Add the last question if it's complete
  if (currentQuestion && currentQuestion.questionText && currentQuestion.options.A && currentQuestion.options.B && currentQuestion.options.C && currentQuestion.options.D) {
    questions.push({
      questionText: currentQuestion.questionText,
      options: currentQuestion.options,
      correctAnswer: currentQuestion.correctAnswer || 'A',
      points: defaultPoints
    });
  }

  return questions;
};

