# Tạo câu hỏi tự động từ tệp (AI)

## Kiến trúc

1. **Frontend** (`TopicDetail`): giáo viên tải file tại trang chủ đề → gọi API backend.
2. **Backend** (`server/`): trích xuất text (PDF/DOCX/TXT) → chia đoạn nếu dài → gọi **gpt-oss-120b** → trả JSON câu hỏi MCQ.
3. **Frontend**: lưu từng câu vào Firestore qua `createQuestion` (cùng schema hiện có).

## Cấu hình

```bash
cd server
copy .env.example .env   # Windows
# hoặc: cp .env.example .env
```

Chỉnh `server/.env`:

```env
AI_API_KEY=<key của bạn>
AI_API_BASE_URL=https://<tên-resource>.openai.azure.com/openai/v1
AI_MODEL=gpt-oss-120b
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

`AI_API_BASE_URL` lấy từ Azure Portal / Microsoft Foundry (endpoint OpenAI-compatible `/openai/v1`).

**Không commit API key.** Nếu key đã lộ trong chat, hãy tạo key mới trên Azure.

## Chạy local

Terminal 1 — backend:

```bash
cd server
npm run dev
```

Terminal 2 — frontend:

```bash
npm run dev
```

Hoặc một lệnh (sau `npm install` ở root):

```bash
npm run dev:all
```

Vite proxy `/api` → `http://localhost:3001` (không cần `VITE_API_URL` khi dev).

## Sử dụng

1. Vào **Môn học** → chọn môn → **Chủ đề** → mở chủ đề.
2. Bấm **Tạo từ tệp (AI)**.
3. Chọn PDF/DOCX/TXT, số câu mỗi đoạn, điểm mặc định.
4. Đợi AI xử lý → câu hỏi được thêm vào chủ đề hiện tại.

## Git: `git add .`

`.gitignore` đã cấu hình để bạn chỉ cần:

```bash
git add .
git commit -m "your message"
git push
```

| Được commit | Không commit (tự bỏ qua) |
|-------------|---------------------------|
| `server/` (code, `package.json`, `.env.example`, `Dockerfile`) | `server/.env`, mọi `.env` ở root |
| `server/node_modules/` — không có trong repo | `node_modules/` |
| Frontend, `AI_QUESTION_SETUP.md` | `dist/`, log, file tạm `server/tmp/` |

**Lần đầu** sau khi clone, mỗi máy vẫn phải:

```bash
npm install
cd server && npm install && copy .env.example .env
```

(rồi điền secret trong `server/.env` — file này không lên Git).

---

## Deploy backend (production)

GitHub Pages **chỉ** chạy React tĩnh. Backend Node phải host **ở dịch vụ khác**, rồi frontend gọi URL đó.

### Bước chung

1. Deploy folder `server/` lên một host (bảng dưới).
2. Trên host, set **Environment variables** (giống `server/.env`):
   - `AI_API_KEY`, `AI_API_BASE_URL`, `AI_MODEL`
   - `PORT` — nhiều host tự gán (Render/Railway); app đọc `process.env.PORT`
   - `CORS_ORIGIN` — URL frontend production, ví dụ:
     `https://<user>.github.io/student-attendence-system`
     (nhiều origin: cách nhau bằng dấu phẩy)
3. Trên **GitHub repo → Settings → Secrets → Actions**, thêm:
   - `VITE_API_URL` = URL backend, ví dụ `https://student-attendance-ai.onrender.com`
4. Push lên `master` — workflow build frontend sẽ nhúng `VITE_API_URL` vào bản production.

Kiểm tra backend sau deploy:

```text
GET https://<backend-url>/api/health
GET https://<backend-url>/api/ai/health
```

---

### Cách 1: Render (miễn phí, dễ)

1. Đăng ký [render.com](https://render.com), connect GitHub repo.
2. **New → Web Service**:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
3. Thêm env vars (mục trên).
4. Deploy → copy URL dạng `https://xxx.onrender.com` → dùng làm `VITE_API_URL`.

Hoặc dùng file `server/render.yaml` (Blueprint) nếu Render hỗ trợ blueprint trong repo.

**Lưu ý:** Gói free có thể sleep sau idle ~15 phút; lần gọi đầu có thể chậm.

---

### Cách 2: Railway

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub.
2. Chọn repo, set **Root Directory** = `server`.
3. Variables: `AI_API_KEY`, `AI_API_BASE_URL`, `CORS_ORIGIN`, …
4. Railway gán `PORT` tự động — code hiện tại đã dùng `config.port` từ `PORT`.

---

### Cách 3: Docker (VPS, Azure Container Apps, Fly.io, …)

Trong thư mục `server/`:

```bash
docker build -t student-ai-server .
docker run -p 3001:3001 --env-file .env student-ai-server
```

Đẩy image lên registry (Docker Hub, ACR) rồi chạy trên host bạn chọn.

---

### Cách 4: Azure App Service

1. Tạo **Web App** (runtime Node 20).
2. Deployment: GitHub Actions hoặc zip deploy từ `server/`.
3. **Configuration → Application settings**: thêm các biến env như `.env`.
4. `CORS_ORIGIN` trùng domain GitHub Pages của bạn.

---

## Luồng production

```text
User → GitHub Pages (React)
         → HTTPS → Backend Render/Railway/...
              → Azure OpenAI (gpt-oss-120b)
         → Firebase Firestore (lưu câu hỏi, như cũ)
```

Local dev: không cần `VITE_API_URL` (Vite proxy `/api` → `localhost:3001`).
