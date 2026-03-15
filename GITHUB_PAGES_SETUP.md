# Hướng dẫn Setup GitHub Pages

## Bước 1: Thêm Firebase Config vào GitHub Secrets

1. Vào repository trên GitHub: `https://github.com/Phuctt205dev/student-attendence-system`
2. Click **Settings** (menu trên cùng)
3. Click **Secrets and variables** → **Actions** (menu bên trái)
4. Click nút **New repository secret**
5. Thêm **7 secrets** sau (lấy giá trị từ file `.env` của bạn):

### Các secrets cần thêm:

| Secret Name | Giá trị lấy từ |
|-------------|----------------|
| `VITE_FIREBASE_API_KEY` | File `.env` local của bạn |
| `VITE_FIREBASE_AUTH_DOMAIN` | File `.env` local của bạn |
| `VITE_FIREBASE_PROJECT_ID` | File `.env` local của bạn |
| `VITE_FIREBASE_STORAGE_BUCKET` | File `.env` local của bạn |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | File `.env` local của bạn |
| `VITE_FIREBASE_APP_ID` | File `.env` local của bạn |
| `VITE_FIREBASE_MEASUREMENT_ID` | File `.env` local của bạn |

**Lưu ý**: Mỗi secret thêm một cái, click "Add secret" sau mỗi lần.

## Bước 2: Cấu hình GitHub Pages Source

1. Vẫn ở **Settings** → Click **Pages** (menu bên trái)
2. Tại mục **Source**:
   - Chọn **GitHub Actions** (thay vì "Deploy from a branch")
3. Save

## Bước 3: Push code và deploy

Sau khi commit và push code lên:

```bash
git add .
git commit -m "Fix GitHub Pages deployment"
git push origin master
```

## Bước 4: Kiểm tra deployment

1. Vào tab **Actions** trên GitHub
2. Xem workflow "Deploy to GitHub Pages" đang chạy
3. Đợi khoảng 1-2 phút
4. Truy cập: `https://phuctt205dev.github.io/student-attendence-system/`

---

## Nếu vẫn bị lỗi:

- Check tab Actions → Click vào workflow bị lỗi → Xem logs
- Đảm bảo đã thêm đủ 7 secrets
- Đảm bảo giá trị secrets không có khoảng trắng dư thừa
