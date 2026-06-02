
export const extractQuestionsRegex = (extractedResult, defaultPoints = 1) => {
  const questions = [];
  const rawText = extractedResult.plainText;

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

    const optionRegex = /(?:^|\s+)(\*?)([A-D])[:.\)]\s*(.*?)(?=(?:^|\s+)\*?[A-D][:.\)]|$)/gis;
    const options = {};
    let correctAnswer = 'A';
    let firstOptionIndexInBlock = block.length;
    let oMatch;
    
    const blockStartInRaw = rawText.indexOf(block, start);
    if (blockStartInRaw === -1) continue;

    optionRegex.lastIndex = 0;
    while ((oMatch = optionRegex.exec(rawText)) !== null) {
      if (oMatch.index < blockStartInRaw) continue;
      if (oMatch.index > end) break;

      const isCorrect = !!oMatch[1];
      const letter = oMatch[2].toUpperCase();
      const optionText = oMatch[3].trim();
      
      const indexInBlock = oMatch.index - blockStartInRaw;
      if (firstOptionIndexInBlock === block.length) {
        firstOptionIndexInBlock = indexInBlock;
      }

      options[letter] = optionText;
      if (isCorrect) {
        correctAnswer = letter;
      }
    }

    const questionText = block.substring(0, firstOptionIndexInBlock).trim();

    if (questionText && options.A && options.B && options.C && options.D) {
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

