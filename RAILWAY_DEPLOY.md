# Deploy backend lên Railway

Hướng dẫn deploy thư mục `server/` (Node.js + Express) cho tính năng **Tạo câu hỏi từ tệp (AI)**.

Frontend vẫn trên **GitHub Pages**: `https://phuctt205dev.github.io/student-attendence-system/`

---

## 1. Chuẩn bị

- [ ] Code đã push lên GitHub (`master`), **không** có API key trong commit (`server/.env` không lên Git).
- [ ] Có API key **Gemini** (khuyên dùng) hoặc Groq — xem [GITHUB_PAGES_AI.md](./GITHUB_PAGES_AI.md).
- [ ] Tài khoản [railway.app](https://railway.app) (đăng nhập bằng GitHub).

---

## 2. Tạo project trên Railway

1. Vào **Railway Dashboard** → **New Project**.
2. Chọn **Deploy from GitHub repo**.
3. Chọn repo: `Phuctt205dev/student-attendence-system`.
4. Railway tạo một **Service** — bấm vào service đó.

---

## 3. Cấu hình service (quan trọng)

Vào tab **Settings** của service:

| Mục | Giá trị |
|-----|---------|
| **Root Directory** | `server` |
| **Watch Paths** | (để trống hoặc `server/**`) |

Vào tab **Settings → Deploy** (hoặc **Build**):

| Mục | Giá trị |
|-----|---------|
| **Start Command** | `npm start` (hoặc để Railway đọc `railway.toml`) |

File `server/railway.toml` trong repo đã khai báo `npm start` và health check `/api/health`.

---

## 4. Biến môi trường (Variables)

Tab **Variables** → **Add variables** (hoặc Raw Editor):

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=<key từ https://aistudio.google.com/apikey>
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.0-flash
CORS_ORIGIN=http://localhost:5173,https://phuctt205dev.github.io
```

(Hoặc Groq: `AI_PROVIDER=groq`, `AI_API_KEY`, `AI_API_BASE_URL=https://api.groq.com/openai/v1`, `SKIP_API_VERSION=true` — xem `server/.env.production.example`.)

Tuỳ chọn:

```env
AI_CHUNK_SIZE=4000
AI_CHUNK_OVERLAP=200
AI_MAX_CHUNKS=8
MAX_FILE_SIZE_MB=10
```

**Lưu ý:**

- **Không** set `PORT` — Railway tự gán; app đọc `process.env.PORT`.
- `CORS_ORIGIN`: origin GitHub Pages là `https://phuctt205dev.github.io` (không kèm path `/student-attendence-system/`).

---

## 4.1. Railway đang có biến Azure cũ — chuyển sang Gemini

Nếu tab **Variables** giống ảnh cũ (`AI_API_BASE_URL`, `AI_API_KEY`, `AI_API_VERSION`, `AI_MODEL`…) thì backend **chưa** dùng Gemini. Làm lần lượt:

### Trên Railway (chỉ backend `server/`)

| Hành động | Tên biến |
|-----------|----------|
| **Thêm mới** | `AI_PROVIDER` = `gemini` |
| **Thêm mới** | `GEMINI_API_KEY` = key từ [AI Studio](https://aistudio.google.com/apikey) |
| **Thêm mới** | `GEMINI_MODEL` = `gemini-2.0-flash` |
| **Giữ** | `CORS_ORIGIN`, `AI_CHUNK_SIZE`, `AI_CHUNK_OVERLAP`, `AI_MAX_CHUNKS`, `MAX_FILE_SIZE_MB` |
| **Xóa** (Azure, không dùng nữa) | `AI_API_BASE_URL`, `AI_API_KEY`, `AI_API_VERSION`, `AI_MODEL`, `SKIP_API_VERSION` |
| **Xóa trên Railway** | Mọi biến `VITE_*` — backend **không đọc** các biến này |

Raw Editor sau khi dọn (ví dụ):

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=<key của bạn>
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.0-flash
CORS_ORIGIN=http://localhost:5173,https://phuctt205dev.github.io
AI_CHUNK_SIZE=4000
AI_CHUNK_OVERLAP=200
AI_MAX_CHUNKS=6
MAX_FILE_SIZE_MB=10
```

→ **Redeploy** service → mở `https://<railway>/api/ai/health` → `"provider": "gemini", "configured": true`.

### Trên GitHub (frontend GitHub Pages) — **khác** Railway

Repo → **Settings** → **Secrets and variables** → **Actions**:

| Secret | Mục đích |
|--------|----------|
| `VITE_API_URL` | URL Railway, vd. `https://xxx.up.railway.app` |
| `VITE_FIREBASE_*` | Firebase cho React (build Pages) |

`VITE_FIREBASE_*` đặt trên **GitHub Actions**, không cần (và không có tác dụng) trên Railway cho API AI.

Sau khi thêm/sửa `VITE_API_URL` → chạy lại workflow **Deploy to GitHub Pages**.

---

## 5. Public URL

1. Tab **Settings** → **Networking** → **Generate Domain**.
2. Copy URL, ví dụ: `https://student-attendance-ai-production.up.railway.app`

---

## 6. Kiểm tra backend

Mở trình duyệt:

```text
https://<domain-railway>/api/health
https://<domain-railway>/api/ai/health
```

`/api/ai/health` cần `"configured": true`.

Xem log: tab **Deployments** → deployment mới nhất → **View Logs**.

---

## 7. Nối frontend (GitHub Pages)

Frontend trên GitHub Pages **không** chạy Vite proxy. Khi build, Vite nhúng biến `VITE_API_URL` vào file JS — trình duyệt sẽ gọi thẳng URL Railway (xem `src/services/aiQuestion.service.js`).

### 7.1. Lấy URL Railway trước

1. Railway → service backend → **Settings** → **Networking**.
2. Copy **Public Domain**, ví dụ:
   ```text
   https://student-attendance-ai-production.up.railway.app
   ```
3. Mở thử trên trình duyệt:
   ```text
   https://student-attendance-ai-production.up.railway.app/api/health
   ```
   Phải thấy JSON `success: true` thì mới dùng URL này cho bước sau.

---

### 7.2. Secret `VITE_API_URL` — chi tiết từng ô

#### Bước vào đúng chỗ trên GitHub

1. Mở repo: `https://github.com/Phuctt205dev/student-attendence-system`
2. Tab **Settings** (của repo, không phải Settings tài khoản cá nhân).
3. Menu trái: **Secrets and variables** → **Actions**.
4. Tab **Secrets** → nút **New repository secret**  
   (nếu đã có `VITE_API_URL` → bấm tên secret → **Update secret**).

#### **Name** (tên secret) — phải khớp chính xác

| Ô trên GitHub | Điền |
|---------------|------|
| **Name** | `VITE_API_URL` |

- Viết **đúng** chữ hoa/thường: `VITE_API_URL`, không phải `vite_api_url` hay `VITE_API_URI`.
- Không thêm khoảng trắng đầu/cuối.
- Tên này khớp với workflow `.github/workflows/deploy.yml`:
  ```yaml
  VITE_API_URL: ${{ secrets.VITE_API_URL }}
  ```
  và với code: `import.meta.env.VITE_API_URL`.

#### **Value** (giá trị secret) — URL gốc của Railway

| Ô trên GitHub | Điền |
|---------------|------|
| **Secret** | URL public Railway **không** có path `/api`, **không** slash `/` ở cuối |

**Ví dụ đúng:**

```text
https://student-attendance-ai-production.up.railway.app
```

**Ví dụ sai (tránh):**

| Sai | Vì sao |
|-----|--------|
| `https://....railway.app/` | Slash cuối — code vẫn xử lý được nhưng dễ nhầm |
| `https://....railway.app/api` | Thừa `/api` — code đã tự nối `/api/ai/...` |
| `https://....railway.app/api/ai/health` | Đây là endpoint health, không phải base URL |
| `http://localhost:3001` | Chỉ dùng khi dev local, Pages không gọi được máy bạn |
| Domain GitHub Pages | Sai host — phải là domain **Railway** |

Sau khi build, request thực tế sẽ giống:

```text
https://<domain-railway>/api/ai/generate-questions
```

(tức `VITE_API_URL` + `/api/ai/generate-questions`).

5. Bấm **Add secret** (hoặc **Save** nếu đang sửa).

---

### 7.3. Build lại GitHub Pages (bắt buộc sau khi đổi secret)

Secret chỉ có hiệu lực khi **workflow build chạy lại**:

1. Tab **Actions** → workflow **Deploy to GitHub Pages**.
2. **Run workflow** → chọn branch **master** → **Run workflow**.
3. Đợi job **build** và **deploy** màu xanh (vài phút).

Hoặc: push bất kỳ commit nào lên `master` cũng kích hoạt deploy.

**Lưu ý:** Sửa secret xong mà **không** chạy lại workflow, site cũ vẫn dùng bản build cũ (không có hoặc sai URL API).

---

### 7.4. Kiểm tra đã nối đúng chưa

1. Mở site: `https://phuctt205dev.github.io/student-attendence-system/`
2. Đăng nhập giáo viên → **Môn học** → **Chủ đề** → **Tạo từ tệp (AI)**.
3. **F12** → tab **Network** → upload file thử.
4. Tìm request tới:
   ```text
   https://<domain-railway>/api/ai/generate-questions
   ```
   - Nếu request vẫn tới `localhost:3001` hoặc chỉ `/api/...` trên domain GitHub → chưa build lại hoặc thiếu `VITE_API_URL`.
   - Nếu **CORS error** → sửa `CORS_ORIGIN` trên Railway (mục 4).

---

### 7.5. Tóm tắt nhanh

| | |
|--|--|
| **Name** | `VITE_API_URL` |
| **Value** | `https://xxxxx.up.railway.app` (copy từ Railway Networking) |
| **Sau đó** | Run workflow Deploy GitHub Pages |
| **Test** | Network tab → URL Railway + `/api/ai/...` |

---

## 8. Local vs production

| | Local | Production |
|---|--------|------------|
| Frontend | `npm run dev` | GitHub Pages |
| API AI | Vite proxy `/api` → `localhost:3001` | `VITE_API_URL` → Railway |
| Backend env | `server/.env` | Railway Variables |

---

## 9. Lỗi thường gặp

| Lỗi | Xử lý |
|-----|--------|
| Build fail / không thấy `package.json` | Chưa set **Root Directory** = `server` |
| `configured: false` | Thiếu/sai `AI_API_KEY` hoặc `AI_API_BASE_URL` |
| **Failed to fetch** / CORS blocked `phuctt205dev.github.io` | Xem mục **9.1** bên dưới |
| Frontend không gọi Railway | Thiếu `VITE_API_URL` hoặc chưa build lại Pages |
| AI 400 `Missing ... api-version` | Thêm `AI_API_VERSION=2024-10-21` trên Railway (hoặc version Azure Portal ghi) → Redeploy |
| AI 401/404 | Kiểm tra endpoint Azure trong Portal |
| **Gemini 429** Too Many Requests | Free tier giới hạn/phút. Đợi 1–2 phút. Variables: `GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.0-flash-lite`, `AI_MAX_CHUNKS=2`, `GEMINI_CHUNK_DELAY_MS=3000` → Redeploy. Code mới tự retry 3 lần. |
| Deploy hết credit (free) | Nạp credit hoặc nâng plan Railway |

### 9.1. Lỗi CORS: `Failed to fetch` / blocked by CORS policy

Trình duyệt gửi:

- **Origin:** `https://phuctt205dev.github.io` (không có `/student-attendence-system/`)
- **Tới:** `https://....railway.app/api/ai/generate-questions`

**Sửa trên Railway → Variables → `CORS_ORIGIN`:**

```env
CORS_ORIGIN=http://localhost:5173,https://phuctt205dev.github.io
```

| Sai | Đúng |
|-----|------|
| `https://phuctt205dev.github.io/student-attendence-system` | `https://phuctt205dev.github.io` |
| Chỉ `http://localhost:5173` | Thêm cả domain GitHub Pages |
| Có khoảng trắng thừa sau dấu phẩy | Không space hoặc trim sạch |

Sau khi sửa → **Redeploy** service → thử lại (Ctrl+F5).

Kiểm tra log Railway khi khởi động: dòng `CORS_ORIGIN: ...` phải có `https://phuctt205dev.github.io`.

---

## 10. Deploy lại sau khi sửa code

Push lên `master` → Railway auto-deploy (nếu bật GitHub deploy).

Hoặc **Deployments** → **Redeploy**.

---

## CLI (tuỳ chọn)

```bash
npm i -g @railway/cli
cd server
railway login
railway link
railway up
```

Biến môi trường vẫn nên cấu hình trên Dashboard hoặc `railway variables set`.
