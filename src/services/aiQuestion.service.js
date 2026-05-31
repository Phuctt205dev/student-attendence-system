const API_BASE = import.meta.env.VITE_API_URL || '';

const buildUrl = (path) => {
  const base = API_BASE.replace(/\/$/, '');
  return base ? `${base}${path}` : path;
};

export const checkAiServerHealth = async () => {
  try {
    const response = await fetch(buildUrl('/api/ai/health'));
    return response.json();
  } catch {
    return { success: false, configured: false };
  }
};

/**
 * Upload document and generate MCQ questions via backend AI service.
 */
export const generateQuestionsFromFile = async ({
  file,
  subjectName,
  topicName,
  questionsPerChunk = 3,
  defaultPoints = 1
}) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('questionsPerChunk', String(questionsPerChunk));
    formData.append('subjectName', subjectName || '');
    formData.append('topicName', topicName || '');
    formData.append('defaultPoints', String(defaultPoints));

    const response = await fetch(buildUrl('/api/ai/generate-questions'), {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || `Lỗi server (${response.status})`
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('generateQuestionsFromFile:', error);
    return {
      success: false,
      error: error.message || 'Không kết nối được máy chủ AI. Hãy chạy server/backend.'
    };
  }
};
