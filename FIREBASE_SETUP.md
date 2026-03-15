# 🔥 Hướng Dẫn Thiết Lập Firebase Cho Người Mới Bắt Đầu

Hướng dẫn này sẽ giúp bạn thiết lập Firebase từ con số 0 một cách chi tiết nhất.

## 📋 Mục lục

1. [Tạo tài khoản Google](#bước-1-tạo-tài-khoản-google)
2. [Tạo Firebase Project](#bước-2-tạo-firebase-project)
3. [Kích hoạt Authentication](#bước-3-kích-hoạt-authentication)
4. [Tạo Firestore Database](#bước-4-tạo-firestore-database)
5. [Lấy Firebase Config](#bước-5-lấy-firebase-config)
6. [Cấu hình file .env](#bước-6-cấu-hình-file-env)
7. [Thiết lập Security Rules](#bước-7-thiết-lập-security-rules)
8. [Test kết nối](#bước-8-test-kết-nối)

---

## Bước 1: Tạo tài khoản Google

**Nếu bạn đã có Gmail, bỏ qua bước này.**

1. Truy cập: https://accounts.google.com/signup
2. Điền thông tin cá nhân
3. Xác nhận email/số điện thoại
4. Hoàn tất đăng ký

---

## Bước 2: Tạo Firebase Project

### 2.1. Truy cập Firebase Console

1. Mở trình duyệt và truy cập: **https://console.firebase.google.com/**
2. Đăng nhập bằng tài khoản Google của bạn
3. Bạn sẽ thấy trang chủ Firebase Console

### 2.2. Tạo Project Mới

1. Click vào nút **"Add project"** (hoặc "Tạo dự án" nếu tiếng Việt)
   ```
   Hoặc nếu đây là lần đầu: Click "Get started" -> "Add project"
   ```

2. **Bước 1: Đặt tên project**
   ```
   Project name: quan-ly-lop-hoc
   (hoặc tên bạn thích, chỉ chấp nhận chữ, số, gạch ngang)
   ```
   - Click **"Continue"**

3. **Bước 2: Google Analytics**
   ```
   Enable Google Analytics: Bỏ tick (không cần thiết cho project này)
   ```
   - Click **"Create project"**

4. **Chờ Firebase tạo project** (khoảng 30 giây - 1 phút)
   ```
   Bạn sẽ thấy: "Your new project is ready"
   ```

5. Click **"Continue"** để vào Dashboard

🎉 **Xong!** Bạn đã tạo thành công Firebase Project!

---

## Bước 3: Kích hoạt Authentication

Authentication giúp người dùng đăng nhập vào hệ thống.

### 3.1. Vào Authentication

1. Ở sidebar bên trái, click vào **"Build"** (hoặc **"Xây dựng"**)
2. Click vào **"Authentication"**
3. Click nút **"Get started"**

### 3.2. Kích hoạt Email/Password

1. Click tab **"Sign-in method"** (ở trên cùng)
2. Bạn sẽ thấy danh sách các phương thức đăng nhập
3. Tìm và click vào **"Email/Password"**
4. Một popup hiện ra:
   ```
   [ ] Enable (bật lên)
   [x] Email/Password        <- Check vào đây
   [ ] Email link (passwordless sign-in)  <- Không cần
   ```
5. Click nút **"Save"**

✅ **Hoàn tất!** Authentication đã sẵn sàng.

---

## Bước 4: Tạo Firestore Database

Firestore là nơi lưu trữ dữ liệu: người dùng, lớp học, điểm danh.

### 4.1. Vào Firestore Database

1. Ở sidebar bên trái, click **"Build"** -> **"Firestore Database"**
2. Click nút **"Create database"**

### 4.2. Chọn chế độ bảo mật

Một popup hiện ra với 2 lựa chọn:

```
(•) Start in production mode   <- BẢO MẬT (khuyến nghị sau này)
( ) Start in test mode         <- Click vào đây (cho development)
```

**Chọn "Start in test mode"** - Dễ dàng cho lúc phát triển

⚠️ **Lưu ý quan trọng:**
```
Test mode cho phép mọi người đọc/ghi dữ liệu trong 30 ngày.
Chúng ta sẽ thiết lập Security Rules ở Bước 7 để bảo mật.
```

### 4.3. Chọn vị trí Server

1. Chọn location gần bạn nhất:
   ```
   asia-southeast1 (Singapore)   <- Gần Việt Nam nhất
   asia-east1 (Taiwan)
   ```

2. Click **"Enable"**

3. **Chờ 1-2 phút** để Firebase tạo database

✅ **Xong!** Bạn sẽ thấy giao diện Firestore Database với thông báo "No documents yet"

---

## Bước 5: Lấy Firebase Config

Đây là bước **QUAN TRỌNG NHẤT** - lấy thông tin kết nối Firebase.

### 5.1. Tạo Web App

1. Click vào icon **bánh răng ⚙️** (góc trên bên trái, cạnh "Project Overview")
2. Click **"Project settings"**
3. Scroll xuống phần **"Your apps"**
4. Click vào icon **"</>"** (Web icon)

### 5.2. Đăng ký App

1. Một popup hiện ra, điền:
   ```
   App nickname: Class Management Web
   (tên gì cũng được, để nhận biết)
   ```

2. **KHÔNG** check vào "Also set up Firebase Hosting"

3. Click **"Register app"**

### 5.3. Copy Firebase Configuration

Bạn sẽ thấy một đoạn code như này:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "quan-ly-lop-hoc.firebaseapp.com",
  projectId: "quan-ly-lop-hoc",
  storageBucket: "quan-ly-lop-hoc.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

📝 **LƯU Ý:**
- **apiKey**: Chuỗi dài bắt đầu bằng "AIza..."
- **authDomain**: Tên project + ".firebaseapp.com"
- **projectId**: Tên project của bạn
- **storageBucket**: Tên project + ".appspot.com"
- **messagingSenderId**: Dãy số
- **appId**: Chuỗi dài bắt đầu bằng "1:..."

### 5.4. Copy các giá trị

**QUAN TRỌNG:** Copy từng giá trị này, bạn sẽ cần ở bước tiếp theo!

```
✅ Copy apiKey
✅ Copy authDomain
✅ Copy projectId
✅ Copy storageBucket
✅ Copy messagingSenderId
✅ Copy appId
```

4. Click **"Continue to console"**

---

## Bước 6: Cấu hình file .env

Bây giờ chúng ta sẽ đưa thông tin Firebase vào project.

### 6.1. Mở Project trong VS Code

1. Mở VS Code
2. Mở thư mục project: `main_project_2`

### 6.2. Tạo file .env

1. Trong VS Code, click vào file **`.env.example`**
2. Nhấn tổ hợp phím:
   - Windows/Linux: `Ctrl + A` (chọn tất cả) -> `Ctrl + C` (copy)
   - Mac: `Cmd + A` -> `Cmd + C`

3. Tạo file mới:
   - Click chuột phải vào thư mục gốc
   - Chọn **"New File"**
   - Đặt tên: **`.env`** (chính xác, có dấu chấm ở đầu)

4. Paste nội dung đã copy:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id_here
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
   VITE_FIREBASE_APP_ID=your_app_id_here
   ```

### 6.3. Điền thông tin Firebase

**Thay thế các giá trị** bằng thông tin từ Bước 5:

```env
# VÍ DỤ - Thay bằng giá trị thật của bạn:
VITE_FIREBASE_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN=quan-ly-lop-hoc.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=quan-ly-lop-hoc
VITE_FIREBASE_STORAGE_BUCKET=quan-ly-lop-hoc.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

⚠️ **QUAN TRỌNG:**
- **KHÔNG có khoảng trắng** trước/sau dấu `=`
- **KHÔNG có dấu ngoặc kép** `"` quanh giá trị
- **PHẢI bắt đầu** bằng `VITE_`

### 6.4. Lưu file

- Nhấn `Ctrl + S` (Windows/Linux) hoặc `Cmd + S` (Mac)
- File `.env` sẽ có màu xám/mờ trong VS Code (vì đã bị .gitignore)

✅ **Hoàn tất!** Firebase config đã được cấu hình.

---

## Bước 7: Thiết lập Security Rules

Security Rules bảo vệ database khỏi truy cập trái phép.

### 7.1. Vào Firestore Rules

1. Quay lại **Firebase Console**
2. Click **"Firestore Database"**
3. Click tab **"Rules"** (ở trên cùng)

### 7.2. Thay thế Rules

Bạn sẽ thấy đoạn code mặc định:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2026, 4, 15);
    }
  }
}
```

**Xóa HẾT** và thay bằng code này:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection
    match /users/{userId} {
      // Ai cũng đọc được nếu đã đăng nhập
      allow read: if request.auth != null;

      // Chỉ có thể tạo user với chính UID của mình
      allow create: if request.auth != null && request.auth.uid == userId;

      // Chỉ update chính bản thân hoặc admin
      allow update: if request.auth != null &&
        (request.auth.uid == userId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }

    // Classes collection
    match /classes/{classId} {
      // Đăng nhập mới xem được
      allow read: if request.auth != null;

      // Chỉ admin và teacher tạo/sửa/xóa lớp
      allow create, update, delete: if request.auth != null &&
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'teacher']);
    }

    // Attendances collection
    match /attendances/{attendanceId} {
      // Đăng nhập mới xem được
      allow read: if request.auth != null;

      // Teacher và student tạo/sửa điểm danh
      allow create, update: if request.auth != null &&
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['teacher', 'student']);

      // Chỉ teacher xóa điểm danh
      allow delete: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
  }
}
```

### 7.3. Publish Rules

1. Click nút **"Publish"** (góc trên bên phải)
2. Đợi vài giây
3. Bạn sẽ thấy thông báo "Rules published successfully"

✅ **Xong!** Database đã được bảo mật.

---

## Bước 8: Test Kết Nối

Kiểm tra xem Firebase có kết nối thành công không.

### 8.1. Khởi động lại Dev Server

1. Nếu server đang chạy, dừng lại:
   - Nhấn `Ctrl + C` trong terminal

2. Chạy lại server:
   ```bash
   npm run dev
   ```

3. Mở trình duyệt tại: **http://localhost:5173**

### 8.2. Test Đăng Ký

1. Click **"Đăng ký ngay"**
2. Điền thông tin:
   ```
   Vai trò: Sinh viên
   Họ tên: Nguyễn Văn A
   Email: test@example.com
   Mật khẩu: 123456
   Xác nhận mật khẩu: 123456
   Mã sinh viên: 2024001
   Khoa: Công nghệ thông tin
   ```
3. Click **"Đăng ký"**

### 8.3. Kiểm tra Firebase

#### Kiểm tra Authentication:

1. Vào **Firebase Console**
2. Click **"Authentication"** -> Tab **"Users"**
3. Bạn sẽ thấy user vừa tạo:
   ```
   ✅ test@example.com
   ```

#### Kiểm tra Firestore:

1. Click **"Firestore Database"**
2. Click collection **"users"**
3. Bạn sẽ thấy document với thông tin:
   ```
   ✅ fullName: "Nguyễn Văn A"
   ✅ email: "test@example.com"
   ✅ role: "student"
   ✅ studentId: "2024001"
   ```

### 8.4. Test Đăng Nhập

1. Quay lại trang web, click **"Đăng nhập ngay"**
2. Nhập:
   ```
   Email: test@example.com
   Mật khẩu: 123456
   ```
3. Click **"Đăng nhập"**

**Nếu thành công:**
- Chuyển đến Student Dashboard
- Thấy "Chào mừng, Nguyễn Văn A"
- Thấy "6 lớp học", "0 bài thi sắp đến"

🎉 **THÀNH CÔNG!** Firebase đã được thiết lập hoàn chỉnh!

---

## 🚨 Xử Lý Lỗi Thường Gặp

### Lỗi 1: "Firebase: Error (auth/invalid-api-key)"

**Nguyên nhân:** API Key sai hoặc chưa copy đúng

**Giải pháp:**
1. Kiểm tra lại file `.env`
2. Đảm bảo `VITE_FIREBASE_API_KEY` đúng với Firebase Config
3. Restart dev server: `Ctrl + C` -> `npm run dev`

---

### Lỗi 2: "Firebase: Error (auth/operation-not-allowed)"

**Nguyên nhân:** Chưa bật Email/Password Authentication

**Giải pháp:**
1. Vào Firebase Console -> Authentication
2. Tab "Sign-in method"
3. Enable "Email/Password"

---

### Lỗi 3: "Missing or insufficient permissions"

**Nguyên nhân:** Security Rules chưa được thiết lập đúng

**Giải pháp:**
1. Vào Firestore Database -> Rules
2. Copy lại Rules từ Bước 7.2
3. Click "Publish"

---

### Lỗi 4: Không thấy file .env

**Nguyên nhân:** File có thể bị ẩn

**Giải pháp:**
1. Trong VS Code, nhấn `Ctrl + Shift + P`
2. Gõ: "Open Settings (JSON)"
3. Thêm dòng:
   ```json
   "files.exclude": {
     "**/.env": false
   }
   ```

---

## 📚 Tài Liệu Tham Khảo

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Get Started](https://firebase.google.com/docs/firestore/quickstart)
- [Firebase Authentication](https://firebase.google.com/docs/auth/web/start)
- [Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)

---

## ✅ Checklist Hoàn Thành

Đánh dấu các bước bạn đã hoàn thành:

- [ ] Tạo Firebase Project
- [ ] Kích hoạt Authentication (Email/Password)
- [ ] Tạo Firestore Database
- [ ] Lấy Firebase Config
- [ ] Tạo file `.env` và điền thông tin
- [ ] Thiết lập Security Rules
- [ ] Test đăng ký thành công
- [ ] Test đăng nhập thành công
- [ ] Thấy data trong Firestore

---

## 🎯 Tiếp Theo

Sau khi thiết lập Firebase thành công, bạn có thể:

1. **Tạo thêm tài khoản** với các vai trò khác (Admin, Teacher)
2. **Khám phá các trang** trong hệ thống
3. **Tùy chỉnh giao diện** trong Tailwind config
4. **Mở rộng tính năng** theo nhu cầu

---

## 🆘 Cần Trợ Giúp?

Nếu gặp vấn đề:

1. **Kiểm tra Console:**
   - Mở DevTools: F12
   - Tab "Console" xem lỗi chi tiết

2. **Kiểm tra Network:**
   - Tab "Network" trong DevTools
   - Xem request nào bị failed

3. **Firebase Console:**
   - Kiểm tra Usage & Billing
   - Xem có quota limit không

---

**Chúc bạn thành công! 🚀**

Nếu có bất kỳ câu hỏi nào, đừng ngại hỏi!
