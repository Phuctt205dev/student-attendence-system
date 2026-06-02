const API_BASE = import.meta.env.VITE_API_URL || '';

const buildUrl = (path) => {
  const base = API_BASE.replace(/\/$/, '');
  return base ? `${base}${path}` : path;
};

export const getAiConnectionHint = () => {
  if (import.meta.env.PROD && !API_BASE) {
    return 'Trang GitHub Pages chưa có VITE_API_URL. Thêm secret trên GitHub và build lại (xem GITHUB_PAGES_AI.md).';
  }
  if (import.meta.env.PROD) {
    return 'Không kết nối được backend AI trên cloud. Kiểm tra Railway đang chạy và CORS_ORIGIN đúng domain github.io.';
  }
  return 'Không kết nối được backend. Chạy: cd server && npm run dev (hoặc npm run dev:all).';
};

export const checkAiServerHealth = async () => {
  try {
    const response = await fetch(buildUrl('/api/ai/health'));
    return response.json();
  } catch {
    return { success: false, configured: false };
  }
};

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
      error: error.message || getAiConnectionHint()
    };
  }
};

export const extractQuestionsFromFile = async ({
  file,
  defaultPoints = 1
}) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('defaultPoints', String(defaultPoints));

    const response = await fetch(buildUrl('/api/ai/extract-questions'), {
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
    console.error('extractQuestionsFromFile:', error);
    return {
      success: false,
      error: error.message || 'Không kết nối được máy chủ. Hãy chạy server/backend.'
    };
  }
};
