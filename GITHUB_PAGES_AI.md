# AI trên GitHub Pages (không chạy local)

GitHub Pages **chỉ** host file tĩnh (React). Tính năng **Tạo câu hỏi bằng AI** cần **2 phần**:

```text
Trình duyệt → GitHub Pages (frontend)
              → Backend Node trên Railway/Render (API)
              → Google Gemini / Groq (AI trên cloud)
```

**Ollama chỉ chạy trên máy bạn** — không dùng được khi mở web trên `github.io`.

---

## Bước 1: API key Gemini (khuyên dùng)

1. Vào https://aistudio.google.com/apikey
2. **Create API key** → **Copy key**
3. **Không** gửi key trong chat / screenshot / commit Git
4. Local: mở `server/.env` → `GEMINI_API_KEY=<dán key>`
5. Hoặc: `npm run setup:gemini` rồi dán key vào `server/.env`

> Nếu key đã lộ (ảnh màn hình, chat): vào AI Studio → **Delete key** → tạo key mới.

---

## Bước 2: Deploy backend lên Railway

Chi tiết: **[RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)** — mục **4.1** nếu Variables vẫn là bộ Azure cũ.

Tóm tắt:

1. [railway.app](https://railway.app) → Deploy repo → **Root Directory** = `server`
2. Tab **Variables** — **xóa** `AI_API_BASE_URL`, `AI_API_KEY`, `AI_API_VERSION`, `AI_MODEL` và mọi `VITE_*` trên Railway
3. **Thêm**:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=<key bước 1>
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.0-flash
CORS_ORIGIN=https://phuctt205dev.github.io,http://localhost:5173
```

3. **Networking** → **Generate Domain** → copy URL, ví dụ:
   `https://student-attendance-ai-production.up.railway.app`

4. Kiểm tra:

```text
GET https://<url-railway>/api/ai/health
```

Kết quả mong đợi:

```json
{
  "success": true,
  "provider": "gemini",
  "configured": true,
  "model": "gemini-2.0-flash"
}
```

---

## Bước 3: Gắn backend vào GitHub Pages

1. Repo GitHub → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**:
   - Name: `VITE_API_URL`
   - Value: URL Railway **không** có `/` ở cuối  
     Ví dụ: `https://student-attendance-ai-production.up.railway.app`
3. Push lên nhánh `master` (hoặc chạy lại workflow **Deploy to GitHub Pages**)

Workflow `.github/workflows/deploy.yml` sẽ build frontend với `VITE_API_URL` nhúng sẵn.

---

## Bước 4: Dùng trên web

1. Mở https://phuctt205dev.github.io/student-attendence-system/
2. **Môn học** → **Chủ đề** → **Tạo câu hỏi bằng AI**
3. Upload file → đợi xử lý

---

## Lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|-------------|-------------|----------|
| "Không kết nối được máy chủ AI" | Thiếu `VITE_API_URL` hoặc chưa build lại | Thêm secret, push lại `master` |
| CORS error trong Console | `CORS_ORIGIN` sai | Trên Railway: `https://phuctt205dev.github.io` (không có path `/student-attendence-system`) |
| BadRequest Azure 400 | Vẫn dùng Azure cũ | Đổi sang `AI_PROVIDER=gemini` |
| Backend sleep (Render free) | Cold start | Đợi 30–60s, thử lại |
| **429 Too Many Requests** | Gemini free tier — quá nhiều request/phút | Đợi 5–10 phút; `AI_MAX_CHUNKS=1`; redeploy |
| **404 Not Found** | Tên model cũ (vd. `gemini-1.5-flash` đã ngừng) | Railway: `GEMINI_MODEL=gemini-2.5-flash`, `GEMINI_FALLBACK_MODEL=gemini-2.0-flash` |
| Ollama / localhost | Cấu hình local trên cloud | Trên Railway **không** dùng Ollama |

---

## Thay Gemini bằng Groq

Trên Railway Variables:

```env
AI_PROVIDER=groq
AI_API_KEY=<groq key từ console.groq.com>
AI_API_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
SKIP_API_VERSION=true
CORS_ORIGIN=https://phuctt205dev.github.io
```

---

## So sánh nhanh

| | GitHub Pages + Railway + Gemini | Ollama local |
|--|--------------------------------|--------------|
| Mở từ github.io | Có | Không |
| Cần API key cloud | Có (Gemini free tier) | Không |
| Cấu hình | Railway + GitHub Secret | Chỉ máy dev |
