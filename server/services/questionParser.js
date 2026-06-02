
const isTextInBoldRanges = (textStart, textEnd, boldRanges) => {
  for (const range of boldRanges) {
    const overlapStart = Math.max(textStart, range.start);
    const overlapEnd = Math.min(textEnd, range.end);
    const overlapLength = overlapEnd - overlapStart;
    const textLength = textEnd - textStart;
    
    if (overlapLength >= textLength * 0.5 || (textStart >= range.start && textEnd <= range.end)) {
      return true;
    }
  }
  return false;
};

export const extractQuestionsRegex = (extractedResult, defaultPoints = 1) => {
  const questions = [];
  const rawText = extractedResult.plainText;
  const boldRanges = extractedResult.boldRanges || [];

  const questionRegex = /(?:^|\s+)(Câu|Question)\s*(\d+)\s*[:.\-)]?\s*/gi;
  const questionMatches = [];
  let qMatch;
  while ((qMatch = questionRegex.exec(rawText)) !== null) {
    questionMatches.push(qMatch);
  }

  for (let i = 0; i < questionMatches.length; i++) {
    const currentMatch = questionMatches[i];
    const start = currentMatch.index + currentMatch[0].length;
    const end = (i < questionMatches.length - 1) ? questionMatches[i + 1].index : rawText.length;
    const block = rawText.substring(start, end).trim();
    if (!block) continue;

    const optionRegex = /(?:^|\s+)([A-D])[:.\)]\s*(.*?)(?=(?:^|\s+)[A-D][:.\)]|$)/gis;
    const options = {};
    const optionPositions = [];
    let firstOptionIndexInBlock = block.length;
    let oMatch;
    
    const blockStartInRaw = rawText.indexOf(block, start);
    if (blockStartInRaw === -1) continue;

    optionRegex.lastIndex = 0;
    while ((oMatch = optionRegex.exec(rawText)) !== null) {
      if (oMatch.index < blockStartInRaw) continue;
      if (oMatch.index > end) break;

      const letter = oMatch[1].toUpperCase();
      const optionText = oMatch[2].trim();
      
      const indexInBlock = oMatch.index - blockStartInRaw;
      if (firstOptionIndexInBlock === block.length) {
        firstOptionIndexInBlock = indexInBlock;
      }

      options[letter] = optionText;
      optionPositions.push({ 
        letter, 
        start: oMatch.index, 
        end: oMatch.index + oMatch[0].length,
        letterStart: oMatch.index + oMatch[0].indexOf(letter) // Find the actual letter's start index
      });
    }

    const questionText = block.substring(0, firstOptionIndexInBlock).trim();

    if (questionText && options.A && options.B && options.C && options.D) {
      let correctAnswer = 'A';
      for (const pos of optionPositions) {
        if (isTextInBoldRanges(pos.start, pos.end, boldRanges)) {
          correctAnswer = pos.letter;
          break;
        }
        const letterStart = pos.letterStart;
        const letterEnd = pos.letterStart + 1;
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

