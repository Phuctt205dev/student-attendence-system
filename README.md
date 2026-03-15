# Hệ Thống Quản Lý Lớp Học

Website quản lý lớp học và điểm danh được xây dựng bằng React, Firebase với hỗ trợ điểm danh QR code.

## 🚀 Tính Năng

### Chung
- ✅ Đăng nhập / Đăng ký tài khoản
- ✅ Phân quyền 3 vai trò: **Admin**, **Giảng viên**, **Sinh viên**
- ✅ Xác thực và bảo mật với Firebase Authentication
- ✅ Lưu trữ dữ liệu realtime với Cloud Firestore

### Admin
- 📚 Quản lý lớp học (Tạo, Sửa, Xóa)
- 👥 Quản lý người dùng (Giảng viên, Sinh viên)
- 📊 Thống kê tổng quan hệ thống
- 🔗 Gán giảng viên vào lớp học
- 📝 Thêm sinh viên vào lớp học

### Giảng Viên
- 📖 Xem danh sách lớp phụ trách
- ✍️ Điểm danh thủ công
- 📱 Tạo mã QR code cho điểm danh (tự động hết hạn sau 10 phút)
- 📋 Xem lịch sử điểm danh
- 💾 Xuất dữ liệu điểm danh ra Excel/CSV

### Sinh Viên
- 📚 Xem danh sách lớp học đã đăng ký
- 📊 Thống kê lớp học và bài thi
- 📱 Quét mã QR để điểm danh
- 📅 Xem lịch sử điểm danh cá nhân
- 🔔 Thông báo lớp học gần đây

## 🛠️ Công Nghệ Sử Dụng

**Frontend:**
- [React 18](https://react.dev/) - UI Framework
- [Vite](https://vitejs.dev/) - Build tool
- [React Router v6](https://reactrouter.com/) - Routing
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide React](https://lucide.dev/) - Icons

**Backend:**
- [Firebase Authentication](https://firebase.google.com/docs/auth) - Xác thực người dùng
- [Cloud Firestore](https://firebase.google.com/docs/firestore) - Database NoSQL
- [Firebase Storage](https://firebase.google.com/docs/storage) - Lưu trữ file

**Libraries:**
- `qrcode.react` - Tạo mã QR
- `html5-qrcode` - Quét mã QR
- `react-hook-form` - Quản lý form
- `date-fns` - Xử lý ngày tháng

## 📋 Yêu Cầu Hệ Thống

- Node.js >= 16.0.0
- npm >= 8.0.0 hoặc yarn >= 1.22.0
- Tài khoản Firebase (miễn phí)

## ⚙️ Cài Đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd main_project_2
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Thiết lập Firebase

#### 3.1. Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" và làm theo hướng dẫn
3. Tạo project với tên bạn muốn

#### 3.2. Kích hoạt Authentication

1. Trong Firebase Console, vào **Authentication**
2. Click tab **Sign-in method**
3. Enable **Email/Password**

#### 3.3. Tạo Firestore Database

1. Trong Firebase Console, vào **Firestore Database**
2. Click **Create database**
3. Chọn **Start in test mode** (cho development)
4. Chọn location gần nhất

#### 3.4. Lấy Firebase Config

1. Vào **Project Settings** (icon bánh răng)
2. Scroll xuống phần **Your apps**
3. Click icon **Web** (</>)
4. Đăng ký app với nickname
5. Copy Firebase configuration

### 4. Cấu hình Environment Variables

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Mở file `.env` và điền thông tin Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

### 5. Chạy ứng dụng

```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:5173`

## 🔒 Firebase Security Rules

Sau khi deploy, áp dụng các security rules sau:

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null &&
        (request.auth.uid == userId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }

    // Classes collection
    match /classes/{classId} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null &&
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'teacher']);
    }

    // Attendances collection
    match /attendances/{attendanceId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null &&
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['teacher', 'student']);
      allow delete: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
  }
}
```

## 📱 Sử Dụng

### Đăng Ký Tài Khoản

1. Truy cập `/register`
2. Chọn vai trò: **Sinh viên**, **Giảng viên**, hoặc **Admin**
3. Điền thông tin:
   - Họ tên
   - Email
   - Mật khẩu (tối thiểu 6 ký tự)
   - Mã sinh viên (nếu là sinh viên - 7 chữ số)
   - Khoa
4. Click **Đăng ký**

### Đăng Nhập

1. Truy cập `/login`
2. Nhập email và mật khẩu
3. Click **Đăng nhập**
4. Hệ thống tự động chuyển đến dashboard theo vai trò

### Điểm Danh QR Code (Giảng Viên)

1. Vào lớp học
2. Click **Tạo phiên điểm danh**
3. Chọn **Tạo mã QR**
4. QR code sẽ hiển thị (hết hạn sau 10 phút)
5. Sinh viên quét mã để điểm danh

### Điểm Danh QR Code (Sinh Viên)

1. Vào Dashboard
2. Click **Quét mã QR điểm danh**
3. Cho phép camera
4. Quét mã QR từ giảng viên
5. Hệ thống tự động điểm danh

## 📁 Cấu Trúc Thư Mục

```
src/
├── assets/              # Hình ảnh, static files
├── components/          # React components
│   ├── common/         # Button, Input, Card, Modal, Table
│   ├── layout/         # Navbar, Sidebar, Footer
│   └── features/       # ClassCard, AttendanceTable, QRScanner
├── pages/              # Các trang
│   ├── auth/           # Login, Register
│   ├── admin/          # AdminDashboard, ManageClasses
│   ├── teacher/        # TeacherDashboard, TakeAttendance
│   └── student/        # StudentDashboard, MyClasses
├── contexts/           # React Context (AuthContext)
├── hooks/              # Custom hooks
├── services/           # Firebase services
│   ├── firebase.js     # Config
│   ├── auth.service.js
│   ├── class.service.js
│   └── attendance.service.js
├── utils/              # Helper functions
│   ├── dateFormatter.js
│   ├── validators.js
│   └── qrCodeGenerator.js
├── routes/             # Route configuration
│   ├── ProtectedRoute.jsx
│   └── RoleBasedRoute.jsx
├── App.jsx             # Main app
├── main.jsx            # Entry point
└── index.css           # Global styles
```

## 🎨 Tùy Chỉnh

### Thay đổi màu sắc chủ đạo

Chỉnh sửa `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // Thay đổi màu primary tại đây
        500: '#0ea5e9',
        600: '#0284c7',
        // ...
      }
    }
  }
}
```

## 🚀 Deploy

### Deploy lên Firebase Hosting

```bash
# Build production
npm run build

# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase
firebase init hosting

# Deploy
firebase deploy
```

## 🐛 Xử Lý Lỗi Thường Gặp

### 1. Lỗi Firebase không kết nối được

- Kiểm tra file `.env` đã điền đúng config chưa
- Đảm bảo các biến môi trường bắt đầu bằng `VITE_`
- Restart dev server sau khi thay đổi `.env`

### 2. Lỗi "Permission denied" khi truy cập Firestore

- Kiểm tra Firestore Security Rules
- Trong development, có thể set test mode
- Đảm bảo user đã đăng nhập

### 3. QR code không quét được

- Kiểm tra quyền camera của trình duyệt
- Chỉ hoạt động trên HTTPS hoặc localhost
- Đảm bảo QR code chưa hết hạn

## 📝 To-Do / Tính Năng Tương Lai

- [ ] Tích hợp email notifications
- [ ] Export attendance to Excel
- [ ] Quiz/Exam management
- [ ] Real-time notifications
- [ ] Mobile app (React Native)
- [ ] Analytics dashboard
- [ ] Multi-language support

## 📄 License

MIT License

## 👨‍💻 Tác Giả

Dự án được phát triển với React, Firebase và Tailwind CSS.

## 🤝 Đóng Góp

Mọi đóng góp đều được chào đón! Hãy tạo Pull Request hoặc Issue.

---

**Happy Coding! 🎉**
