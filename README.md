# 📚 Hệ Thống Quản Lý Lớp Học & Điểm Danh

Ứng dụng web quản lý lớp học, điểm danh và dữ liệu sinh viên được xây dựng bằng **React 19 + Firebase**. Hỗ trợ điểm danh QR code, quản lý lớp học, và thống kê chi tiết cho 3 vai trò khác nhau.

## 📋 Mục Đích Dự Án

Dự án này giúp:
- **Sinh viên**: Quét QR để điểm danh nhanh chóng, xem lịch sử điểm danh cá nhân
- **Giảng viên**: Quản lý lớp học, tạo phiên điểm danh, xuất dữ liệu Excel
- **Admin**: Quản lý toàn bộ hệ thống (lớp học, người dùng, thống kê)

## ✨ Tính Năng Hiện Tại

### 🔐 Chức Năng Chung
- ✅ Đăng nhập / Đăng ký tài khoản (Email + Mật khẩu)
- ✅ Phân quyền 3 vai trò: **Admin**, **Giảng viên**, **Sinh viên**
- ✅ Xác thực an toàn với Firebase Authentication
- ✅ Lưu trữ dữ liệu realtime với Cloud Firestore
- ✅ Đặt lại mật khẩu qua email
- ✅ Cập nhật hồ sơ cá nhân (tên, email, khoa)

### 👨‍💼 Chức Năng Admin
- 📚 Quản lý lớp học (Tạo, Sửa, Xóa)
- 👥 Quản lý người dùng (Giảng viên, Sinh viên)
- 📊 Thống kê tổng quan hệ thống
- 🔗 Gán giảng viên vào lớp học
- 📝 Thêm sinh viên vào lớp học
- 📈 Xem báo cáo hệ thống

### 👨‍🏫 Chức Năng Giảng Viên
- 📖 Xem danh sách lớp phụ trách
- 📱 **Tạo phiên điểm danh** với mã QR code (tự động hết hạn sau 10 phút)
- ✍️ **Điểm danh thủ công** - chỉnh sửa trực tiếp trong bảng
- 📋 Xem lịch sử điểm danh chi tiết (sinh viên nào vắng, có mặt, trễ)
- 💾 Xuất dữ liệu điểm danh ra **Excel** (xlsx)
- ⏱️ **Điều chỉnh thời gian quy định trễ** khi tạo phiên (mặc định 15 phút)
- 📊 Xem thống kê: tổng lớp, tổng sinh viên, buổi điểm danh

### 👨‍🎓 Chức Năng Sinh Viên
- 📚 Xem danh sách lớp học đã đăng ký
- 📱 **Quét mã QR để điểm danh** - nhanh chóng, tự động cập nhật
- 📅 Xem lịch sử điểm danh cá nhân chi tiết (có mặt, trễ, vắng)
- 📊 Xem thống kê: tỷ lệ tham dự %, buổi có mặt, buổi trễ, buổi vắng
- 🔔 Thông báo lớp học gần đây

## 🛠️ Công Nghệ Sử Dụng

| Loại | Công nghệ | Mục đích |
|------|-----------|---------|
| **Frontend** | React 19 | UI Framework |
| | Vite 8 | Build tool (cực nhanh) |
| | React Router v7 | Routing & Navigation |
| | Tailwind CSS v3 | Styling (utility-first CSS) |
| | Lucide React | Icons (Figma-based) |
| **Backend** | Firebase Auth | Xác thực người dùng (Email/Password) |
| | Cloud Firestore | NoSQL Database (realtime) |
| | Firebase Storage | Lưu trữ file (avatar, v.v) |
| **Form & Data** | React Hook Form v7 | Quản lý form state |
| | date-fns | Xử lý ngày tháng (timezone-safe) |
| **QR Code** | qrcode.react | Tạo mã QR |
| | html5-qrcode | Quét mã QR từ camera |
| **Export** | xlsx-js-style | Xuất file Excel với styling |

## 📋 Yêu Cầu Hệ Thống

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0 hoặc **yarn** >= 1.22.0
- **Tài khoản Firebase** (miễn phí - https://firebase.google.com)
- **Trình duyệt hiện đại** (Chrome, Firefox, Safari, Edge)

## ⚡ Quick Start (5 Phút)

### 1. Clone & Cài Đặt
```bash
git clone <repository-url>
cd student-attendence-system
npm install
```

### 2. Thiết Lập Firebase
- Tạo project mới tại [Firebase Console](https://console.firebase.google.com)
- Enable **Email/Password Authentication**
- Tạo **Firestore Database** (test mode for development)
- Copy Firebase config từ **Project Settings**

### 3. Tạo File `.env`
```bash
cp .env.example .env  # Nếu file đã tồn tại
```

Điền vào `.env`:
```
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

### 4. Chạy Dev Server
```bash
npm run dev
```
→ Truy cập http://localhost:5173

### 5. Tạo Tài Khoản & Kiểm Tra
- **Register** tài khoản với vai trò **Teacher** hoặc **Student**
- Thử **Quét QR** (Student) hoặc **Tạo phiên** (Teacher)

## ⚙️ Cài Đặt Chi Tiết

### 3.1. Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** và điền tên project
3. Chọn cài đặt theo ý muốn (enable Google Analytics tùy chọn)
4. Tạo project (mất 1-2 phút)

### 3.2. Kích Hoạt Authentication

1. Vào **Authentication** → **Sign-in method**
2. Enable **Email/Password**
3. Lưu ý: Không cần Google Sign-in (chỉ cần Email/Password)

### 3.3. Tạo Firestore Database

1. Vào **Firestore Database**
2. Click **Create database**
3. Chọn **Start in test mode** (cho development)
   - ⚠️ Test mode cho phép tất cả read/write (chỉ dùng trong development)
4. Chọn region gần nhất (vd: `asia-southeast1` cho Việt Nam)

### 3.4. Lấy Firebase Config

1. Trang chủ Project → **Project Settings** (icon bánh răng)
2. Scroll xuống **Your apps** → Click icon **Web** (</>)
3. Điền nickname (vd: "web-app")
4. Copy Firebase config từ tab tiếp theo
5. Paste vào file `.env`

### 3.5. Cấu Hình Firestore Security Rules (Production)

Khi deploy production, apply rules sau:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - Mỗi user chỉ xem được thông tin của mình
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow delete: if request.auth != null && request.auth.uid == userId;
    }

    // Classes collection - Ai cũng có thể xem, Admin/Teacher tạo/sửa
    match /classes/{classId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'teacher'];
      allow delete: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      
      // Students subcollection
      match /students/{studentId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null &&
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'teacher'];
      }
    }

    // Attendance sessions
    match /attendanceSessions/{sessionId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['teacher', 'admin'];
      
      // Attendance records
      match /records/{recordId} {
        allow read: if request.auth != null;
        allow create, update: if request.auth != null;
      }
    }
  }
}
```



## 📱 Hướng Dẫn Sử Dụng

### 👤 Đăng Ký Tài Khoản

1. Truy cập `/register`
2. **Chọn vai trò**: Sinh viên / Giảng viên / Admin
3. **Điền thông tin**:
   - 👤 Họ tên (vd: Nguyễn Văn A)
   - 📧 Email (vd: nguyenvana@example.com)
   - 🔐 Mật khẩu (tối thiểu 6 ký tự)
   - 🎓 Mã sinh viên (nếu là sinh viên - 7 chữ số)
   - 🏫 Khoa/Bộ môn
4. Click **Đăng ký**

### 🔑 Đăng Nhập

1. Truy cập `/login`
2. Nhập **email** và **mật khẩu**
3. Click **Đăng nhập**
4. ✅ Hệ thống tự động chuyển đến dashboard theo vai trò

### 🎓 Sinh Viên - Quét QR Điểm Danh

1. Vào **Dashboard** → **Thao tác nhanh**
2. Click **Quét QR Điểm danh**
3. **Cho phép camera** trình duyệt
4. **Quét mã QR** từ màn hình giảng viên
5. ✅ Hệ thống tự động điểm danh
6. Xem **lịch sử điểm danh** trong tab **Lớp học**

### 👨‍🏫 Giảng Viên - Tạo Phiên Điểm Danh

1. Vào **Quản lý Lớp học** → chọn một lớp
2. Scroll xuống section **"Phiên Điểm Danh"**
3. Click **"Tạo phiên điểm danh"**
4. Chọn **"Tạo mã QR"** → QR code hiển thị
   - 🔴 QR hết hạn sau **10 phút**
   - ⏱️ Có thể điều chỉnh "Quy định trễ" (default 15 phút)
5. **Sinh viên quét QR** để điểm danh
6. Xem danh sách sinh viên đã điểm danh (realtime)

### 👨‍🏫 Giảng Viên - Điểm Danh Thủ Công

1. Tại danh sách phiên điểm danh
2. Click **"Sửa"** phiên cụ thể
3. Chỉnh sửa trực tiếp trong bảng:
   - Chọn **"Có mặt"**, **"Trễ"**, hoặc **"Vắng"**
   - Thêm ghi chú nếu cần
4. Click **"Lưu"** để cập nhật

### 💾 Giảng Viên - Xuất Excel

1. Tại danh sách phiên điểm danh
2. Click **"Xuất Excel"** (icon download)
3. File Excel tự động download: `DiemDanh_[ClassName]_[Date].xlsx`
4. File chứa:
   - Thông tin lớp (tên, mã, ngày)
   - Danh sách sinh viên
   - Trạng thái điểm danh (Có mặt, Trễ, Vắng)
   - Thời gian điểm danh
   - Ghi chú (nếu có)



## 📁 Cấu Trúc Thư Mục & Kiến Trúc

```
src/
├── assets/                      # Hình ảnh, font, static files
│
├── components/                  # React Components (tái sử dụng)
│   ├── common/                 # UI Components chung
│   │   ├── Button.jsx         # Button (variant: primary, secondary, outline)
│   │   ├── Input.jsx          # Input field với validation
│   │   ├── Card.jsx           # Card container
│   │   ├── Modal.jsx          # Modal dialog
│   │   ├── Table.jsx          # Table component
│   │   ├── QRScanner.jsx      # QR Scanner (dùng html5-qrcode)
│   │   └── index.js           # Export tất cả components
│   │
│   └── teacher/               # Components riêng Teacher
│       └── ChangeEmailModal.jsx # Modal đổi email
│
├── pages/                       # Các trang (1 file = 1 trang)
│   ├── auth/                   # Trang xác thực
│   │   ├── Login.jsx          # Đăng nhập
│   │   ├── Register.jsx       # Đăng ký (chọn vai trò)
│   │   └── ForgotPassword.jsx # Quên mật khẩu
│   │
│   ├── admin/                  # Trang Admin
│   │   └── AdminDashboard.jsx # Dashboard (thống kê)
│   │
│   ├── teacher/                # Trang Giảng viên
│   │   ├── TeacherDashboard.jsx      # Dashboard (tổng quan)
│   │   ├── TeacherClasses.jsx        # Quản lý lớp & điểm danh
│   │   └── TeacherProfile.jsx        # Hồ sơ giảng viên
│   │
│   └── student/                # Trang Sinh viên
│       ├── StudentDashboard.jsx      # Dashboard (thống kê điểm danh)
│       └── StudentClasses.jsx        # Lớp học & lịch sử điểm danh
│
├── services/                    # Firebase & API Services
│   ├── firebase.js            # Firebase config & initialization
│   ├── auth.service.js        # Auth (login, register, password reset)
│   ├── class.service.js       # Class management (CRUD)
│   ├── attendance.service.js  # Attendance sessions & marking
│   └── tag.service.js         # Tags management (nếu cần)
│
├── contexts/                    # React Context (global state)
│   └── AuthContext.jsx        # Authentication state (currentUser, userProfile)
│
├── layouts/                     # Layout components (wrapper)
│   ├── StudentLayout.jsx      # Layout cho Student pages
│   └── TeacherLayout.jsx      # Layout cho Teacher pages
│
├── routes/                      # Route guards & protection
│   ├── ProtectedRoute.jsx     # Kiểm tra user đã login chưa
│   └── RoleBasedRoute.jsx     # Kiểm tra quyền theo vai trò
│
├── utils/                       # Utility functions (helpers)
│   ├── dateFormatter.js       # Format ngày tháng
│   ├── validators.js          # Validate form input
│   ├── qrCodeGenerator.js     # Generate QR code
│   └── (có thể thêm utilities khác)
│
├── App.jsx                      # Root component & routing config
├── main.jsx                     # Entry point
└── index.css                    # Global styles (Tailwind imports)
```

### 🏗️ Kiến Trúc Dữ Liệu (Firebase Firestore)

**Collections:**
```
users/                              # Lưu hồ sơ người dùng
├── userId
│   ├── fullName: String
│   ├── email: String
│   ├── role: "admin" | "teacher" | "student"
│   ├── studentId: String (nếu là sinh viên)
│   ├── department: String
│   └── createdAt: Timestamp

classes/                            # Lưu thông tin lớp học
├── classId
│   ├── name: String
│   ├── classCode: String
│   ├── teacherId: String
│   ├── schedule: String
│   ├── description: String
│   ├── createdAt: Timestamp
│   └── students/ (subcollection)   # Danh sách sinh viên trong lớp
│       ├── studentId
│       │   ├── name: String
│       │   ├── studentCode: String
│       │   ├── email: String
│       │   └── createdAt: Timestamp

attendanceSessions/                 # Lưu phiên điểm danh
├── sessionId
│   ├── classId: String
│   ├── className: String
│   ├── teacherId: String
│   ├── date: Timestamp
│   ├── sessionNumber: Number
│   ├── presentCount: Number        # Sinh viên có mặt
│   ├── lateCount: Number           # Sinh viên trễ
│   ├── totalStudents: Number       # Tổng sinh viên
│   ├── lateThreshold: Number       # Quy định trễ (phút)
│   ├── qrCode: String              # QR data (JSON)
│   ├── qrCodeExpiry: Timestamp     # Hết hạn QR
│   ├── sessionStartTime: Timestamp # Bắt đầu phiên
│   ├── createdAt: Timestamp
│   └── records/ (subcollection)    # Chi tiết điểm danh từng sinh viên
│       ├── studentId
│       │   ├── studentName: String
│       │   ├── studentCode: String
│       │   ├── status: "PRESENT" | "LATE" | "ABSENT"
│       │   ├── timestamp: Timestamp
│       │   ├── lateMinutes: Number
│       │   ├── method: "qr" | "manual" | "face"
│       │   └── note: String (cho manual marking)
```

## 🎯 Cách Thức Hoạt Động

### 1️⃣ **Luồng Đăng Nhập**
```
User nhập Email + Password
         ↓
Firebase Auth xác thực
         ↓
Nếu đúng → Lưu UID vào AuthContext
         ↓
Fetch hồ sơ từ Firestore (collection: users)
         ↓
Lưu vào userProfile: { uid, email, fullName, role, ... }
         ↓
Redirect theo vai trò (admin → /admin, teacher → /teacher, student → /student)
```

### 2️⃣ **Luồng Điểm Danh (Giảng Viên)**
```
Giảng viên tạo phiên điểm danh
         ↓
Tạo document trong attendanceSessions
         ↓
Giảng viên nhấn "Tạo mã QR"
         ↓
Generate QR code (chứa: attendanceId + timestamp)
         ↓
QR hết hạn sau 10 phút (qrCodeExpiry)
```

### 3️⃣ **Luồng Điểm Danh (Sinh Viên)**
```
Sinh viên vào Dashboard
         ↓
Nhấn "Quét QR Điểm danh"
         ↓
Camera mở → Quét QR từ giảng viên
         ↓
Gửi: attendanceId + studentId
         ↓
Firebase kiểm tra:
- QR hết hạn chưa?
- Sinh viên đã điểm danh trong phiên này chưa?
- Tính toán: Trễ hay có mặt? (so sánh thời gian với lateThreshold)
         ↓
Tạo record trong attendanceSessions/sessionId/records/studentId
         ↓
Cập nhật presentCount, lateCount, totalStudents
         ↓
Hiển thị "✅ Điểm danh thành công!"
```

### 4️⃣ **Luồng Xuất Excel (Giảng Viên)**
```
Giảng viên chọn phiên điểm danh
         ↓
Lấy tất cả records từ subcollection
         ↓
Format dữ liệu: [Tên, MSSV, Trạng thái, Thời gian]
         ↓
Dùng xlsx-js-style tạo file
         ↓
Download file: "DiemDanh_[ClassName]_[Date].xlsx"
```

## 📚 Hướng Dẫn Hiểu Code Cho Developer Mới

### Bước 1: Hiểu Cơ Bản về Firebase
1. **Firebase Auth**: Quản lý login/logout, reset password
   - File: `src/services/auth.service.js`
   - Hook: `useAuth()` từ `AuthContext.jsx`

2. **Firestore Database**: Lưu trữ dữ liệu (users, classes, attendance)
   - NoSQL → dữ liệu là JSON objects
   - Có subcollections (ví dụ: `classes/classId/students`)

3. **AuthContext**: Toàn cục state quản lý user hiện tại
   - Chứa: `currentUser`, `userProfile`, `isAuthenticated`, `isTeacher`, v.v
   - Dùng: `const { userProfile } = useAuth()`

### Bước 2: Theo Dõi Một Feature Hoàn Chỉnh
**Ví dụ: Tạo phiên điểm danh (Teacher)**

1. **Page**: `TeacherClasses.jsx` → Nút "Tạo phiên điểm danh"
2. **Service**: `attendance.service.js` → `createAttendanceSession()`
3. **Database**: Firestore → document mới trong `attendanceSessions` collection
4. **Components**: `QRScanner.jsx` → quét QR code

Cách theo dõi:
```bash
# 1. Tìm file
grep -r "createAttendanceSession" src/

# 2. Đọc function trong service
cat src/services/attendance.service.js | grep -A 30 "export const createAttendanceSession"

# 3. Tìm nơi gọi function
grep -r "createAttendanceSession" src/ --include="*.jsx"

# 4. Hiểu data structure trong Firestore
# → Xem phần "Kiến Trúc Dữ Liệu" phía trên
```

### Bước 3: Những Mẫu Code Thường Gặp

**🔹 Fetch dữ liệu từ Firestore**
```javascript
// src/services/class.service.js
const getClassesByTeacher = async (teacherId) => {
  const q = query(
    collection(db, 'classes'),
    where('teacherId', '==', teacherId)
  );
  const snapshot = await getDocs(q);
  return { success: true, classes: ... };
};
```

**🔹 Sử dụng hook useAuth()**
```javascript
// Trong component
const { userProfile, isTeacher } = useAuth();

if (!isTeacher) {
  return <div>Chỉ giáo viên mới có quyền</div>;
}
```

**🔹 Sử dụng React Hook Form**
```javascript
const { register, handleSubmit, watch } = useForm();

<form onSubmit={handleSubmit(onSubmit)}>
  <input {...register('email', { required: true })} />
  <button type="submit">Gửi</button>
</form>
```

**🔹 Realtime updates (Firestore)**
```javascript
// src/services/attendance.service.js - subscribeToAttendanceRecords()
useEffect(() => {
  const unsubscribe = subscribeToAttendanceRecords(sessionId, (records) => {
    // Tự động update khi có sinh viên điểm danh
  });
  return unsubscribe;
}, [sessionId]);
```

### Bước 4: Quy Ước & Best Practices

| Quy Ước | Ví Dụ | Lý Do |
|--------|-------|-------|
| **Services** trả về `{ success, data/error }` | `{ success: true, classes: [...] }` | Dễ kiểm tra lỗi |
| **Components** nhỏ, tái sử dụng | `Button.jsx`, `Input.jsx` | Giảm duplication |
| **Utils** cho logic không liên quan UI | `dateFormatter.js`, `validators.js` | Dễ test & reuse |
| **Context** cho state toàn app | `AuthContext` | Tránh prop drilling |
| Đặt tên file theo tính chất | `TeacherDashboard.jsx` (PascalCase) | Dễ tìm kiếm |

## 🎨 Tùy Chỉnh Giao Diện

### Thay Đổi Màu Sắc Chủ Đạo

Mở `tailwind.config.js` và sửa:

```javascript
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#0ea5e9',  // Thay đổi màu tại đây
          600: '#0284c7',
          // ...
        }
      }
    }
  }
}
```

### Thêm Fonts Tùy Chỉnh

1. Mở `src/index.css`
2. Thêm import Google Fonts
3. Cập nhật `tailwind.config.js` trong `fontFamily`

### Tùy Chỉnh CSS Global

Chỉnh sửa `src/index.css` để áp dụng styling toàn app.



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

## 🐛 Troubleshooting & Common Issues

### ❌ Lỗi: Firebase không kết nối được
**Triệu chứng**: "Firebase is not initialized" hoặc không đăng nhập được
```
✅ Giải pháp:
1. Kiểm tra file `.env` - tất cả biến đã có đúng không?
2. Kiểm tra biến bắt đầu bằng VITE_ (for Vite env vars)
3. Restart dev server: Ctrl+C rồi `npm run dev`
4. Xóa browser cache: F12 → Application → Clear Storage
```

### ❌ Lỗi: "Permission denied" khi điểm danh
**Triệu chứng**: Không thể điểm danh, lỗi permission
```
✅ Giải pháp:
1. Đảm bảo đã login (AuthContext.jsx có userProfile)
2. Check Firestore Security Rules (nên dùng test mode)
3. Kiểm tra QR code chưa hết hạn (10 phút)
4. Xem console (F12) để đọc error message chi tiết
```

### ❌ Lỗi: Camera không hoạt động khi quét QR
**Triệu chứng**: QRScanner mở nhưng camera không hiển thị
```
✅ Giải pháp:
1. Kiểm tra quyền camera: Settings → Privacy → Camera
2. HTTPS hoặc localhost (http://localhost:5173 được, nhưng deployment phải HTTPS)
3. Thử trình duyệt khác (Chrome tốt nhất)
4. Kiểm tra console: `navigator.mediaDevices` có sẵn không?
```

### ❌ Lỗi: Excel file không tạo được
**Triệu chứng**: Click "Xuất Excel" không có gì xảy ra
```
✅ Giải pháp:
1. Check browser console (F12 → Console tab)
2. Đảm bảo `xlsx-js-style` installed: `npm install xlsx-js-style`
3. Kiểm tra data được fetch từ Firestore chưa
4. Try trên trình duyệt khác
```

### ❌ Lỗi: Sinh viên không thể xem lớp của mình
**Triệu chứng**: Dashboard hiển thị "Chưa có lớp học nào"
```
✅ Giải pháp:
1. Admin/Teacher phải add sinh viên vào lớp trước
2. Kiểm tra Firestore: classes/{classId}/students/{studentId} có record?
3. Restart app hoặc F5 refresh
4. Kiểm tra Student ID match giữa auth & Firestore
```

## 📖 Hướng Dẫn Phát Triển Thêm Feature

### Thêm Feature Mới: Template

#### 1️⃣ **Tạo Service** (nếu liên quan database)
```javascript
// src/services/newFeature.service.js
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export const addNewFeature = async (data) => {
  try {
    const ref = await addDoc(collection(db, 'newFeatures'), {
      ...data,
      createdAt: new Date()
    });
    return { success: true, id: ref.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

#### 2️⃣ **Tạo Component** (UI reusable)
```javascript
// src/components/common/NewFeatureComponent.jsx
const NewFeatureComponent = ({ data, onSubmit }) => {
  return (
    <div>
      {/* UI code */}
    </div>
  );
};

export default NewFeatureComponent;
```

#### 3️⃣ **Tạo Page** (nếu cần route mới)
```javascript
// src/pages/teacher/NewFeaturePage.jsx
import { useAuth } from '../../contexts/AuthContext';
import { addNewFeature } from '../../services/newFeature.service';
import TeacherLayout from '../../layouts/TeacherLayout';

const NewFeaturePage = () => {
  const { userProfile } = useAuth();
  
  const handleSubmit = async (data) => {
    const result = await addNewFeature(data);
    // Handle result
  };

  return (
    <TeacherLayout>
      {/* Page content */}
    </TeacherLayout>
  );
};

export default NewFeaturePage;
```

#### 4️⃣ **Thêm Route** (vào App.jsx)
```javascript
// src/App.jsx
<Route
  path="/teacher/new-feature"
  element={
    <ProtectedRoute>
      <RoleBasedRoute allowedRoles={['teacher']}>
        <NewFeaturePage />
      </RoleBasedRoute>
    </ProtectedRoute>
  }
/>
```

#### 5️⃣ **Firestore Collection Schema**
Tạo structure trong Firestore Console:
```
newFeatures/
├── docId
│   ├── name: String
│   ├── description: String
│   ├── createdAt: Timestamp
│   └── teacherId: String
```

#### 6️⃣ **Test Feature**
- Chạy `npm run dev`
- Kiểm tra console (F12)
- Check Firestore (chưa có documents?)
- Login với test account

## 🤝 Quy Trình Contribute

### Muốn Thêm Feature?

1. **Tạo branch mới**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Code & Test**
   ```bash
   npm run dev  # Run development server
   npm run lint # Check code style
   ```

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

4. **Push & Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   → Tạo Pull Request trên GitHub

5. **Code Review & Merge**
   - Chờ code review
   - Fix nếu có feedback
   - Merge vào `main` branch

### Code Style Guidelines

- ✅ **Naming**: PascalCase cho components, camelCase cho functions
- ✅ **Formatting**: 2-space indentation, use Prettier (auto-format)
- ✅ **Comments**: Chỉ comment logic phức tạp, không comment obvious code
- ✅ **Functions**: Export named functions, max 3-4 params
- ✅ **Error Handling**: Luôn catch & return error objects `{ success, error }`

## 📚 Tài Liệu Tham Khảo

| Công Nghệ | Tài Liệu |
|-----------|----------|
| **React 19** | https://react.dev |
| **Vite** | https://vitejs.dev |
| **Firebase** | https://firebase.google.com/docs |
| **Firestore** | https://firebase.google.com/docs/firestore |
| **Tailwind CSS** | https://tailwindcss.com/docs |
| **React Router** | https://reactrouter.com |
| **React Hook Form** | https://react-hook-form.com |
| **date-fns** | https://date-fns.org |

## 💡 Tips & Tricks

### Hot Reload Dev Server
```bash
npm run dev
# Mỗi khi save file → auto reload (không cần F5)
```

### Debug Firestore Queries
```javascript
// src/services/debug.js - Thêm console logs
const q = query(collection(db, 'users'), where('role', '==', 'teacher'));
console.log('Query:', q);  // See query structure
const snapshot = await getDocs(q);
console.log('Results:', snapshot.docs.map(d => d.data()));  // See data
```

### Test với Multiple Accounts
1. Tạo 3 tài khoản (1 admin, 1 teacher, 1 student)
2. Dùng Incognito window để login khác (không share cookie)
3. Arrange windows side-by-side để test realtime



## 📝 Tính Năng Tương Lai & Roadmap

### ✅ Phase 1 (Đã Hoàn Thành)
- [x] Xác thực người dùng (Register/Login/Reset password)
- [x] Quản lý lớp học (CRUD)
- [x] Phân quyền 3 vai trò (Admin, Teacher, Student)
- [x] QR code điểm danh (tạo, quét, validation)
- [x] Điểm danh thủ công (manual entry)
- [x] Lịch sử điểm danh
- [x] Xuất Excel
- [x] Realtime attendance updates

### 🔄 Phase 2 (Đang Phát Triển)
- [ ] **📝 Quản lý đề thi & Chấm bài tự động**
  - Tạo ngân hàng câu hỏi (multiple choice + essay)
  - Tạo đề thi từ ngân hàng
  - Giao đề cho sinh viên & nhập bài
  - Auto-grade (multiple choice)
  - Manual grade (essay)
  - Mapping câu hỏi → Learning outcomes (CĐRMH)
  - Xuất kết quả dạo hàm Excel

- [ ] **📊 Analytics & Reports**
  - Thống kê chi tiết per student
  - Báo cáo điểm danh hàng tháng
  - Phân tích xu hướng vắng mặt
  - Export reports (PDF, Excel)

- [ ] **🔔 Notifications & Email**
  - Email xác nhận đăng ký
  - Thông báo điểm danh sắp hết hạn
  - Thông báo sinh viên vắng quá nhiều
  - Email với kết quả thi

- [ ] **📱 Mobile App**
  - React Native app cho sinh viên
  - Push notifications
  - Offline support

### 🚀 Phase 3 (Tương Lai)
- [ ] **👥 Quản lý nhóm học tập**
  - Tạo nhóm sinh viên
  - Quản lý nhiệm vụ nhóm
  - Chấm điểm team work

- [ ] **🎓 Thư mục tích luỹ (ePortfolio)**
  - Sinh viên upload bài tập
  - Teachers feedback on submissions
  - Grade tracking

- [ ] **🌐 Multi-language Support**
  - English, Vietnamese, Chinese support
  - i18n integration

- [ ] **🔐 Advanced Security**
  - 2FA (Two-factor authentication)
  - OAuth2 integration (Google, Microsoft)
  - Audit logs

- [ ] **📹 Video Lectures**
  - Upload & stream video
  - Progress tracking
  - Closed captions

- [ ] **🤖 AI Features**
  - Auto-generate exam questions từ lecture notes
  - Detect plagiarism in submissions
  - Smart attendance analysis



## 🚀 Build & Deploy

### Build cho Production
```bash
npm run build
# Output → dist/ folder (sẵn sàng deploy)
```

### Deploy lên Firebase Hosting

#### Bước 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

#### Bước 2: Login to Firebase
```bash
firebase login
# Browser mở → Login with Google account
```

#### Bước 3: Initialize Firebase (lần đầu)
```bash
firebase init hosting
# Select project
# Public directory: dist
# Configure as single-page app: Yes
```

#### Bước 4: Deploy
```bash
npm run build      # Build production
firebase deploy    # Deploy to Firebase Hosting
```

✅ App sẽ accessible tại: `https://your-project-id.firebaseapp.com`

### Custom Domain
1. Firebase Console → Hosting → Connect Domain
2. Follow hướng dẫn DNS
3. SSL certificate tự động

### Production Checklist
- [ ] Firestore Security Rules áp dụng (không phải test mode)
- [ ] Firebase Authentication cấu hình đầy đủ
- [ ] Environment variables setup correctly
- [ ] HTTPS enabled
- [ ] Custom domain configured (optional)

## 📄 License

MIT License

## 👨‍💻 Tác Giả

Dự án được phát triển với React, Firebase và Tailwind CSS.

## 🤝 Đóng Góp

Mọi đóng góp đều được chào đón! Hãy tạo Pull Request hoặc Issue.

---

**Happy Coding! 🎉**
