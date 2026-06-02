const text = `Câu 1: Phương thức HTTP nào thường được sử dụng để lấy dữ liệu từ server?
A. POST
B. GET
C. DELETE
D. PUT
Câu 2: Mã trạng thái HTTP nào biểu thị yêu cầu thành công?
A. 404
B. 403
C. 500
D. 200`;

const textWithWindowsNewlines = text.replace(/\n/g, '\r\n');

export const extractQuestionsRegex = (rawText, defaultPoints = 1) => {
  const questions = [];
  
  // Normalize newlines
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Tách văn bản thành các block dựa trên từ khóa "Câu 1:", "Câu 2:", "Question 1:" v.v.
  const splitByQuestion = text.split(/(?:^|\n)\s*(?:Câu\s*\d+\s*:|Question\s*\d+\s*:)/i);
  
  for (let i = 1; i < splitByQuestion.length; i++) {
    const block = splitByQuestion[i].trim();
    if (!block) continue;
    
    // Tìm các đáp án bắt đầu bằng A., B., C., D. (hoặc A:, B:, C:, D:)
    const optionRegex = /(?:^|\n)\s*([A-D])[\.\:]\s*(.*?)(?=(?:^|\n)\s*[A-D][\.\:]|$)/gsi;
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

console.log(extractQuestionsRegex(textWithWindowsNewlines));
