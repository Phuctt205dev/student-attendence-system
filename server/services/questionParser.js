
const isTextInBoldRanges = (textStart, textEnd, boldRanges) => {
  for (const range of boldRanges) {
    if (textStart >= range.start && textEnd <= range.end) {
      return true;
    }
    if (textStart <= range.start && textEnd >= range.end) {
      return true;
    }
    if (textStart < range.end && textEnd > range.start) {
      return true;
    }
  }
  return false;
};

export const extractQuestionsRegex = (extractedResult, defaultPoints = 1) => {
  const questions = [];
  const rawText = extractedResult.plainText;
  const boldRanges = extractedResult.boldRanges || [];

  const text = rawText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Build original index map
  let originalIndex = 0;
  const originalToNormalized = [];
  for (let i = 0; i < text.length; i++) {
    while (originalIndex < rawText.length && rawText[originalIndex] !== text[i]) {
      originalIndex++;
    }
    originalToNormalized[i] = originalIndex;
    originalIndex++;
  }

  // Split by question markers
  const questionRegex = /(?:^|\s+)(Câu|Question)\s*(\d+)\s*[:.\-)]?\s*/gi;
  const questionsData = [];
  let lastIndex = 0;
  let qMatch;
  while ((qMatch = questionRegex.exec(text)) !== null) {
    if (lastIndex > 0) {
      questionsData.push(text.substring(lastIndex, qMatch.index).trim());
    }
    lastIndex = qMatch.index + qMatch[0].length;
  }
  if (lastIndex > 0 && lastIndex < text.length) {
    questionsData.push(text.substring(lastIndex).trim());
  }

  for (const block of questionsData) {
    // Find options
    const optionRegex = /(?:^|\s+)([A-D])[:.\)]\s*(.*?)(?=(?:^|\s+)[A-D][:.\)]|$)/gis;
    let optMatch;
    const options = {};
    const optionPositions = [];
    let firstOptionIndex = block.length;
    const blockStartInText = text.indexOf(block);

    while ((optMatch = optionRegex.exec(block)) !== null) {
      const letter = optMatch[1].toUpperCase();
      const optionText = optMatch[2].trim();

      if (firstOptionIndex === block.length) {
        firstOptionIndex = optMatch.index;
      }
      options[letter] = optionText;

      const optionStartInText = blockStartInText + optMatch.index;
      const optionEndInText = blockStartInText + optMatch.index + optMatch[0].length;
      const originalStart = originalToNormalized[optionStartInText] || optionStartInText;
      const originalEnd = originalToNormalized[optionEndInText] || optionEndInText;

      optionPositions.push({ letter, start: originalStart, end: originalEnd });
    }

    const questionText = block.substring(0, firstOptionIndex).trim();

    if (questionText && options.A && options.B && options.C && options.D) {
      let correctAnswer = 'A';
      for (const pos of optionPositions) {
        if (isTextInBoldRanges(pos.start, pos.end, boldRanges)) {
          correctAnswer = pos.letter;
          break;
        }
        const letterStart = pos.start;
        const letterEnd = pos.start + 1;
        if (isTextInBoldRanges(letterStart, letterEnd, boldRanges)) {
          correctAnswer = pos.letter;
          break;
        }
      }
      questions.push({
        questionText,
        options,
        correctAnswer,
        points: defaultPoints
      });
    }
  }

  return questions;
};

