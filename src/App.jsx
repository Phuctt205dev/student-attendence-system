import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleBasedRoute from './routes/RoleBasedRoute';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminClasses from './pages/admin/AdminClasses';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminReports from './pages/admin/AdminReports';

// Dashboard pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherClasses from './pages/teacher/TeacherClasses';
import ClassDetail from './pages/teacher/ClassDetail';
import TeacherProfile from './pages/teacher/TeacherProfile';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentClasses from './pages/student/StudentClasses';
import StudentClassDetail from './pages/student/StudentClassDetail';

// Question Bank & Exam pages
import TeacherQuestionBank from './pages/teacher/TeacherQuestionBank';
import TeacherSubjects from './pages/teacher/TeacherSubjects';
import SubjectDetail from './pages/teacher/SubjectDetail';
import SubjectExams from './pages/teacher/SubjectExams';
import TopicDetail from './pages/teacher/TopicDetail';
import StudentExams from './pages/student/StudentExams';
import StudentExamTake from './pages/student/StudentExamTake';
import StudentExamResult from './pages/student/StudentExamResult';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected routes - Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/classes"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['admin']}>
                  <AdminClasses />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/classes/:classId"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['admin']}>
                  <ClassDetail />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['admin']}>
                  <AdminUsers />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users/:userId"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['admin']}>
                  <AdminUserDetail />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['admin']}>
                  <AdminReports />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />

          {/* Protected routes - Teacher */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['teacher']}>
                  <TeacherDashboard />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/classes"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['teacher']}>
                  <TeacherClasses />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/classes/:classId"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['teacher']}>
                  <ClassDetail />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/profile"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['teacher']}>
                  <TeacherProfile />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/subjects"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['teacher', 'admin']}>
                  <TeacherSubjects />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/subjects/:subjectId"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['teacher', 'admin']}>
                  <SubjectDetail />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/subjects/:subjectId/exams"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['teacher', 'admin']}>
                  <SubjectExams />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/subjects/:subjectId/topics/:topicId"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['teacher', 'admin']}>
                  <TopicDetail />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/question-bank"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['teacher', 'admin']}>
                  <TeacherQuestionBank />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          {/* Protected routes - Student */}
          <Route
            path="/student"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/classes"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['student']}>
                  <StudentClasses />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/classes/:classId"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['student']}>
                  <StudentClassDetail />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/exams"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['student']}>
                  <StudentExams />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/exams/:examId/take"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['student']}>
                  <StudentExamTake />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/exams/:examId/result"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['student']}>
                  <StudentExamResult />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
