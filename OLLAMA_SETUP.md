# Tạo câu hỏi bằng Ollama (local, không cloud)

> **Mở web trên GitHub Pages?** Ollama **không** dùng được từ trình duyệt public. Xem **[GITHUB_PAGES_AI.md](./GITHUB_PAGES_AI.md)** (Railway + Gemini).

Hướng dẫn chạy tính năng **Tạo câu hỏi bằng AI** trên máy của bạn qua [Ollama](https://ollama.com), không cần Azure/OpenAI.

## Yêu cầu

- Windows / macOS / Linux
- RAM ≥ 8 GB (khuyên 16 GB cho model `llama3.2`)
- Node.js (đã có khi dev project)

## Bước 1: Cài Ollama

1. Tải và cài từ https://ollama.com/download
2. Mở app **Ollama** (Windows) hoặc đảm bảo service đang chạy
3. Kiểm tra trong terminal:

```bash
ollama --version
curl http://127.0.0.1:11434/api/tags
```

## Bước 2: Tải model

```bash
ollama pull llama3.2
```

Model khác (nhẹ hơn, nhanh hơn):

```bash
ollama pull qwen2.5:3b
```

Nếu đổi model, sửa `AI_MODEL` trong `server/.env` cho khớp tên trên `ollama list`.

## Bước 3: Cấu hình backend

```bash
cd server
copy .env.ollama.example .env
```

File `.env` tối thiểu:

```env
AI_PROVIDER=ollama
AI_API_BASE_URL=http://127.0.0.1:11434/v1
AI_MODEL=llama3.2
CORS_ORIGIN=http://localhost:5173
```

Không cần `AI_API_KEY`. Không cần `api-version`.

## Bước 4: Chạy app

Terminal 1 — backend:

```bash
cd server
npm install
npm run dev
```

Khi khởi động, log mong đợi: `Ollama OK — model "llama3.2" sẵn sàng`.

Terminal 2 — frontend:

```bash
npm run dev
```

Hoặc một lệnh từ thư mục gốc project:

```bash
npm run dev:all
```

## Bước 5: Kiểm tra

Mở trình duyệt hoặc curl:

```text
GET http://localhost:3001/api/ai/health
```

Ví dụ phản hồi:

```json
{
  "success": true,
  "provider": "ollama",
  "configured": true,
  "model": "llama3.2",
  "ollama": {
    "reachable": true,
    "modelInstalled": true,
    "models": ["llama3.2:latest"]
  }
}
```

## Sử dụng trong app

1. **Môn học** → **Chủ đề** → mở chủ đề
2. **Tạo câu hỏi bằng AI**
3. Chọn PDF/DOCX/TXT → tạo câu hỏi

Lần gọi đầu có thể **chậm 1–3 phút** (Ollama nạp model vào RAM). Các lần sau nhanh hơn.

## Xử lý lỗi thường gặp

| Lỗi | Cách xử lý |
|-----|------------|
| Không kết nối được Ollama | Mở app Ollama hoặc `ollama serve` |
| Model chưa có (404) | `ollama pull llama3.2` (đúng tên `AI_MODEL`) |
| Hết thời gian chờ | Giảm `AI_MAX_CHUNKS` (vd. `2`), dùng file ngắn hơn, hoặc model nhỏ (`qwen2.5:3b`) |
| JSON không hợp lệ | Thử lại; model nhỏ đôi khi sai format — dùng `llama3.2` |
| BadRequest từ Azure | Đảm bảo `.env` dùng `AI_PROVIDER=ollama`, không còn URL Azure |

## Lưu ý deploy

- **GitHub Pages + Railway/Render** trên cloud **không** gọi được Ollama trên máy bạn.
- Ollama chỉ phù hợp **phát triển / demo local**.
- Production: dùng Azure, OpenRouter, Groq, hoặc Gemini (xem `AI_QUESTION_SETUP.md`).

## Biến môi trường (tham khảo)

| Biến | Mặc định (Ollama) | Mô tả |
|------|-------------------|--------|
| `AI_PROVIDER` | — | Đặt `ollama` |
| `AI_API_BASE_URL` | `http://127.0.0.1:11434/v1` | API OpenAI-compatible |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Health check `/api/tags` |
| `AI_MODEL` | `llama3.2` | Tên model đã `ollama pull` |
| `AI_MAX_CHUNKS` | `4` | Giới hạn đoạn văn (tránh chậm) |
| `AI_REQUEST_TIMEOUT_MS` | `300000` | Timeout 5 phút mỗi lần gọi model |
