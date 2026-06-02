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

  // Chuẩn hóa line endings (Windows \r\n -> \n) và xóa ký tự BOM nếu có
  const text = rawText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Tìm vị trí offset giữa rawText và normalized text
  // For simplicity, we'll work with the normalized text and adjust bold ranges accordingly
  // First, build a map from original index to normalized index
  let originalIndex = 0;
  const originalToNormalized = [];
  for (let i = 0; i < text.length; i++) {
    while (originalIndex < rawText.length && rawText[originalIndex] !== text[i]) {
      originalIndex++;
    }
    originalToNormalized[i] = originalIndex;
    originalIndex++;
  }

  // Tách văn bản thành các block dựa trên từ khóa "Câu 1:", "Câu 2:", "Question 1:" v.v.
  const questionMatches = [...text.matchAll(/(?:^|\s+)((?:Câu|Question)\s*\d+\s*[\:\.\-\)]?\s*)/gi)];
  
  for (let i = 0; i < questionMatches.length; i++) {
    const match = questionMatches[i];
    const startIndex = match.index + match[0].length;
    const endIndex = i < questionMatches.length - 1 ? questionMatches[i + 1].index : text.length;
    const block = text.substring(startIndex, endIndex).trim();
    if (!block) continue;

    // Tìm các đáp án bắt đầu bằng A., B., C., D. (hoặc A:, B:, C:, D:, A), B))
    const optionRegex = /(?:^|\s+)([A-D])[\.\:\)]\s*(.*?)(?=(?:^|\s+)[A-D][\.\:\)]|$)/gsi;
    let optionMatch;
    const options = {};
    const optionPositions = [];
    let firstOptionIndex = block.length;

    while ((optionMatch = optionRegex.exec(block)) !== null) {
      const optionLetter = optionMatch[1].toUpperCase();
      const optionText = optionMatch[2].trim();
      
      if (firstOptionIndex === block.length) {
        firstOptionIndex = optionMatch.index;
      }
      
      options[optionLetter] = optionText;
      
      // Calculate position in original rawText
      const normalizedStart = startIndex + optionMatch.index;
      const normalizedEnd = startIndex + optionMatch.index + optionMatch[0].length;
      const originalStart = originalToNormalized[normalizedStart] || normalizedStart;
      const originalEnd = originalToNormalized[normalizedEnd] || normalizedEnd;
      
      optionPositions.push({
        letter: optionLetter,
        start: originalStart,
        end: originalEnd
      });
    }

    const questionText = block.substring(0, firstOptionIndex).trim();

    // Chỉ thêm nếu có đủ nội dung câu hỏi và ít nhất các đáp án A, B, C, D
    if (questionText && options.A && options.B && options.C && options.D) {
      // Find which answer is bold
      let correctAnswer = 'A'; // Default to A if no bold answer found
      for (const pos of optionPositions) {
        if (isTextInBoldRanges(pos.start, pos.end, boldRanges)) {
          correctAnswer = pos.letter;
          break;
        }
        // Also check if the option letter itself is bold (e.g., "**A.** Đáp án đúng")
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
