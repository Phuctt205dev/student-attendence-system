export const extractQuestionsRegex = (rawText, defaultPoints = 1) => {
  const questions = [];
  
  // Chuẩn hóa line endings (Windows \r\n -> \n) và xóa ký tự BOM nếu có
  const text = rawText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Tách văn bản thành các block dựa trên từ khóa "Câu 1:", "Câu 2:", "Question 1:" v.v.
  const splitByQuestion = text.split(/(?:^|\s+)(?:Câu|Question)\s*\d+\s*[\:\.\-\)]?\s*/i);
  
  for (let i = 1; i < splitByQuestion.length; i++) {
    const block = splitByQuestion[i].trim();
    if (!block) continue;
    
    // Tìm các đáp án bắt đầu bằng A., B., C., D. (hoặc A:, B:, C:, D:, A), B))
    const optionRegex = /(?:^|\s+)([A-D])[\.\:\)]\s*(.*?)(?=(?:^|\s+)[A-D][\.\:\)]|$)/gsi;
    let match;
    const options = {};
    let firstOptionIndex = block.length;
    
    while ((match = optionRegex.exec(block)) !== null) {
      if (firstOptionIndex === block.length) {
        firstOptionIndex = match.index;
      }
      const key = match[1].toUpperCase();
      const val = match[2].trim();
      options[key] = val;
    }
    
    const questionText = block.substring(0, firstOptionIndex).trim();
    
    // Chỉ thêm nếu có đủ nội dung câu hỏi và ít nhất các đáp án A, B, C, D
    if (questionText && options.A && options.B && options.C && options.D) {
      questions.push({
        questionText,
        options,
        correctAnswer: 'A', // Mặc định gán A là đáp án đúng
        points: defaultPoints
      });
    }
  }
  
  return questions;
};
