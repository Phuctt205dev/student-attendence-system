import { config, getOllamaTagsUrl } from '../config.js';

export const checkOllamaReachable = async () => {
  const url = getOllamaTagsUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return {
        reachable: false,
        error: `Ollama trả về HTTP ${response.status}`
      };
    }

    const data = await response.json();
    const models = (data.models || []).map((m) => m.name || m.model).filter(Boolean);

    return {
      reachable: true,
      models,
      modelInstalled: models.some(
        (name) =>
          name === config.aiModel ||
          name.startsWith(`${config.aiModel}:`) ||
          name.split(':')[0] === config.aiModel
      )
    };
  } catch (error) {
    const message =
      error.name === 'AbortError'
        ? 'Hết thời gian chờ kết nối Ollama (5s)'
        : error.cause?.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')
          ? 'Không kết nối được Ollama. Chạy ứng dụng Ollama hoặc lệnh: ollama serve'
          : error.message || 'Lỗi kết nối Ollama';

    return { reachable: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
};
