import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../services/auth.service';
import {
  createClass,
  getClassesByTeacher,
  enrollStudentByEmail,
  getClassStudents,
  removeStudent
} from '../../services/class.service';
import {
  createAttendanceSession,
  markAttendance,
  getAttendancesByClass,
  deleteAttendanceSession,
  generateQRCode,
  getAttendanceDetails,
  updateAttendanceStatus
} from '../../services/attendance.service';
import {
  LogOut,
  BookOpen,
  Users,
  ClipboardCheck,
  Plus,
  UserPlus,
  Trash2,
  Eye,
  QrCode
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import QRCode from 'qrcode';

const TeacherDashboard = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  // ── Classes state ──────────────────────────────────────────────
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Modal visibility ───────────────────────────────────────────
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showClassDetailModal, setShowClassDetailModal] = useState(false);
  const [showCreateAttendanceModal, setShowCreateAttendanceModal] = useState(false);
  const [showManualAttendanceModal, setShowManualAttendanceModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // ── Selected items ─────────────────────────────────────────────
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [attendanceSessions, setAttendanceSessions] = useState([]);

  // ── Create class form ──────────────────────────────────────────
  const [newClass, setNewClass] = useState({
    classCode: '',
    className: '',
    description: '',
    schedule: ''
  });

  // ── Add student form ───────────────────────────────────────────
  const [studentEmail, setStudentEmail] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);

  // ── Create attendance session form ─────────────────────────────
  const [sessionName, setSessionName] = useState('');
  const [creatingAttendance, setCreatingAttendance] = useState(false);

  // ── Manual attendance state ────────────────────────────────────
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [savingManual, setSavingManual] = useState(false);

  // ── QR state ──────────────────────────────────────────────────
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [qrExpiryTime, setQrExpiryTime] = useState(null);
  const [qrCountdown, setQrCountdown] = useState(0);
  const [generatingQR, setGeneratingQR] = useState(false);

  // ── Load classes on uid change ─────────────────────────────────
  const loadClasses = async () => {
    if (!userProfile?.uid) return;
    setLoading(true);
    const result = await getClassesByTeacher(userProfile.uid);
    if (result.success) {
      setClasses(result.classes);
    } else {
      setError('Không thể tải danh sách lớp');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!userProfile?.uid) return;
    const fetchClasses = async () => {
      setLoading(true);
      const result = await getClassesByTeacher(userProfile.uid);
      if (result.success) {
        setClasses(result.classes);
      } else {
        setError('Không thể tải danh sách lớp');
      }
      setLoading(false);
    };
    fetchClasses();
  }, [userProfile?.uid]);

  // ── QR countdown timer ─────────────────────────────────────────
  useEffect(() => {
    if (!qrExpiryTime) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((qrExpiryTime - Date.now()) / 1000));
      setQrCountdown(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [qrExpiryTime]);

  // ── Helpers ────────────────────────────────────────────────────
  const loadAttendanceSessions = async (classId) => {
    const result = await getAttendancesByClass(classId);
    if (result.success) setAttendanceSessions(result.attendances);
  };

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Handlers: logout / class ───────────────────────────────────
  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!newClass.classCode || !newClass.className) {
      setError('Vui lòng điền đầy đủ mã lớp và tên lớp');
      return;
    }
    const result = await createClass({
      ...newClass,
      teacherId: userProfile.uid,
      teacherName: userProfile.fullName
    });
    if (result.success) {
      setSuccess('Tạo lớp thành công!');
      setShowCreateClassModal(false);
      setNewClass({ classCode: '', className: '', description: '', schedule: '' });
      loadClasses();
    } else {
      setError(result.error || 'Không thể tạo lớp');
    }
  };

  const handleOpenClassDetail = async (classItem) => {
    setSelectedClass(classItem);
    setShowClassDetailModal(true);
    const studentsResult = await getClassStudents(classItem.id);
    if (studentsResult.success) setClassStudents(studentsResult.students);
    await loadAttendanceSessions(classItem.id);
  };

  // ── Handlers: students ─────────────────────────────────────────
  const handleOpenAddStudent = (classItem) => {
    setSelectedClass(classItem);
    setShowAddStudentModal(true);
    setStudentEmail('');
    setError('');
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setAddingStudent(true);
    if (!studentEmail.trim()) {
      setError('Vui lòng nhập email sinh viên');
      setAddingStudent(false);
      return;
    }
    const result = await enrollStudentByEmail(selectedClass.id, studentEmail);
    if (result.success) {
      setSuccess('Thêm sinh viên thành công!');
      setStudentEmail('');
      setShowAddStudentModal(false);
      loadClasses();
      if (showClassDetailModal) {
        const studentsResult = await getClassStudents(selectedClass.id);
        if (studentsResult.success) setClassStudents(studentsResult.students);
      }
    } else {
      setError(result.error || 'Không thể thêm sinh viên');
    }
    setAddingStudent(false);
  };

  const handleRemoveStudent = async (studentId) => {
    if (!confirm('Bạn có chắc muốn xóa sinh viên này khỏi lớp?')) return;
    const result = await removeStudent(selectedClass.id, studentId);
    if (result.success) {
      setSuccess('Xóa sinh viên thành công!');
      const studentsResult = await getClassStudents(selectedClass.id);
      if (studentsResult.success) setClassStudents(studentsResult.students);
      loadClasses();
    } else {
      setError(result.error || 'Không thể xóa sinh viên');
    }
  };

  // ── Handlers: create attendance session (chỉ đặt tên) ──────────
  const handleOpenCreateAttendance = () => {
    setSessionName('');
    setError('');
    setShowCreateAttendanceModal(true);
  };

  const handleCreateAttendance = async (e) => {
    e.preventDefault();
    setError('');
    setCreatingAttendance(true);
    if (!sessionName.trim()) {
      setError('Vui lòng nhập tên buổi điểm danh');
      setCreatingAttendance(false);
      return;
    }
    const result = await createAttendanceSession(selectedClass.id, {
      sessionNumber: sessionName,
      createdBy: userProfile.uid
    });
    if (result.success) {
      setSuccess(`Tạo buổi "${sessionName}" thành công!`);
      setShowCreateAttendanceModal(false);
      setSessionName('');
      await loadAttendanceSessions(selectedClass.id);
    } else {
      setError(result.error || 'Không thể tạo buổi điểm danh');
    }
    setCreatingAttendance(false);
  };

  // ── Handlers: manual attendance ────────────────────────────────
  const handleOpenManualAttendance = async (session) => {
    setSelectedSession(session);
    setError('');

    // Lấy trạng thái điểm danh hiện tại của buổi
    const result = await getAttendanceDetails(session.id, selectedClass.id);
    const initialRecords = {};

    if (result.success) {
      result.students.forEach(student => {
        initialRecords[student.uid] = {
          status: student.status || 'absent',
          note: student.note || ''
        };
      });
    } else {
      // Fallback: dùng classStudents
      classStudents.forEach(student => {
        const existing = session.records?.find(r => r.studentId === student.uid);
        initialRecords[student.uid] = {
          status: existing?.status || 'absent',
          note: existing?.note || ''
        };
      });
    }

    setAttendanceRecords(initialRecords);
    setShowManualAttendanceModal(true);
  };

  const handleToggleAttendance = (studentId, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const handleSaveManualAttendance = async () => {
    setSavingManual(true);
    setError('');
    console.log('💾 Starting to save manual attendance...');
    console.log('📋 Attendance records state:', attendanceRecords);
    console.log('👥 Class students:', classStudents);
    console.log('📄 Selected session:', selectedSession);

    try {
      const promises = classStudents.map(async (student) => {
        const record = attendanceRecords[student.uid];
        const status = record?.status || 'absent';
        const existingRecord = selectedSession.records?.find(r => r.studentId === student.uid);

        console.log(`Processing ${student.fullName}:`, { status, hasExistingRecord: !!existingRecord });

        if (existingRecord) {
          // Cập nhật nếu đã có record
          return updateAttendanceStatus(selectedSession.id, student.uid, status, record?.note || '');
        } else if (status === 'present') {
          // Tạo mới chỉ khi có mặt
          return markAttendance(selectedSession.id, {
            studentId: student.uid,
            studentName: student.fullName,
            status,
            method: 'manual',
            note: record?.note || ''
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      console.log('✅ All attendance saved successfully!');
      setSuccess('Lưu điểm danh thành công!');
      setShowManualAttendanceModal(false);
      await loadAttendanceSessions(selectedClass.id);
    } catch (err) {
      console.error('❌ Error saving attendance:', err);
      setError('Có lỗi xảy ra khi lưu điểm danh');
      console.error(err);
    }
    setSavingManual(false);
  };

  // ── Handlers: QR attendance ────────────────────────────────────
  const handleOpenQR = async (session) => {
    setSelectedSession(session);
    setQrImageUrl('');
    setQrExpiryTime(null);
    setQrCountdown(0);
    setGeneratingQR(true);
    setShowQRModal(true);

    const result = await generateQRCode(session.id, 10); // hết hạn sau 10 phút
    if (result.success) {
      const url = await QRCode.toDataURL(result.qrData, { width: 300, margin: 2 });
      setQrImageUrl(url);
      setQrExpiryTime(result.expiryTime.getTime());
    } else {
      setError('Không thể tạo QR code');
      setShowQRModal(false);
    }
    setGeneratingQR(false);
  };

  const handleRegenerateQR = async () => {
    if (!selectedSession) return;
    setGeneratingQR(true);
    setQrImageUrl('');
    const result = await generateQRCode(selectedSession.id, 10);
    if (result.success) {
      const url = await QRCode.toDataURL(result.qrData, { width: 300, margin: 2 });
      setQrImageUrl(url);
      setQrExpiryTime(result.expiryTime.getTime());
    } else {
      setError('Không thể tạo QR code');
    }
    setGeneratingQR(false);
  };

  // ── Handlers: delete session ───────────────────────────────────
  const handleDeleteAttendance = async (attendanceId, name) => {
    if (!confirm(`Bạn có chắc muốn xóa buổi điểm danh "${name}"?`)) return;
    const result = await deleteAttendanceSession(attendanceId);
    if (result.success) {
      setSuccess('Xóa buổi điểm danh thành công!');
      await loadAttendanceSessions(selectedClass.id);
    } else {
      setError(result.error || 'Không thể xóa buổi điểm danh');
    }
  };

  // ── Derived stats ──────────────────────────────────────────────
  const totalStudents = classes.reduce((sum, cls) => sum + (cls.students?.length || 0), 0);
  const stats = [
    { title: 'Lớp phụ trách', value: classes.length.toString(), icon: BookOpen, color: 'bg-blue-500' },
    { title: 'Tổng sinh viên', value: totalStudents.toString(), icon: Users, color: 'bg-green-500' },
    { title: 'Buổi điểm danh', value: attendanceSessions.length.toString(), icon: ClipboardCheck, color: 'bg-purple-500' }
  ];

  // ══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Giảng viên Dashboard</h1>
            <p className="text-gray-600">Chào mừng, {userProfile?.fullName}</p>
          </div>
          <Button variant="outline" icon={<LogOut className="w-5 h-5" />} onClick={handleLogout}>
            Đăng xuất
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-8 h-8 text-white" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Classes */}
        <Card title="Lớp học của tôi" className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-600">Các lớp học bạn đang phụ trách</p>
            <Button variant="primary" icon={<Plus className="w-5 h-5" />} onClick={() => setShowCreateClassModal(true)}>
              Tạo lớp mới
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Chưa có lớp nào. Tạo lớp đầu tiên của bạn!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map((classItem) => (
                <div key={classItem.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{classItem.classCode}</h3>
                      <p className="text-gray-600">{classItem.className}</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {classItem.students?.length || 0} SV
                    </span>
                  </div>
                  {classItem.description && <p className="text-sm text-gray-500 mb-3">{classItem.description}</p>}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" icon={<Eye className="w-4 h-4" />} onClick={() => handleOpenClassDetail(classItem)} fullWidth>Chi tiết</Button>
                    <Button variant="primary" size="sm" icon={<UserPlus className="w-4 h-4" />} onClick={() => handleOpenAddStudent(classItem)} fullWidth>Thêm SV</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>

      {/* ── Modal: Tạo lớp ────────────────────────────────────── */}
      <Modal isOpen={showCreateClassModal} onClose={() => setShowCreateClassModal(false)} title="Tạo lớp mới" size="md">
        <form onSubmit={handleCreateClass} className="space-y-4">
          <Input label="Mã lớp" type="text" placeholder="Ví dụ: IT001" value={newClass.classCode} onChange={(e) => setNewClass({ ...newClass, classCode: e.target.value })} required />
          <Input label="Tên lớp" type="text" placeholder="Ví dụ: Nhập môn Công nghệ thông tin" value={newClass.className} onChange={(e) => setNewClass({ ...newClass, className: e.target.value })} required />
          <Input label="Mô tả" type="text" placeholder="Mô tả về lớp học (tùy chọn)" value={newClass.description} onChange={(e) => setNewClass({ ...newClass, description: e.target.value })} />
          <Input label="Lịch học" type="text" placeholder="Ví dụ: Thứ 2, 7h30-9h30 (tùy chọn)" value={newClass.schedule} onChange={(e) => setNewClass({ ...newClass, schedule: e.target.value })} />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowCreateClassModal(false)} fullWidth>Hủy</Button>
            <Button type="submit" variant="primary" fullWidth>Tạo lớp</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Thêm sinh viên ──────────────────────────────── */}
      <Modal isOpen={showAddStudentModal} onClose={() => setShowAddStudentModal(false)} title="Thêm sinh viên vào lớp" size="md">
        <div className="mb-4">
          <p className="text-sm text-gray-600">Lớp: <span className="font-semibold">{selectedClass?.classCode} - {selectedClass?.className}</span></p>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>}
        <form onSubmit={handleAddStudent} className="space-y-4">
          <Input label="Email sinh viên" type="email" placeholder="student@example.com" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} required />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowAddStudentModal(false)} fullWidth disabled={addingStudent}>Hủy</Button>
            <Button type="submit" variant="primary" fullWidth loading={addingStudent} disabled={addingStudent}>Thêm sinh viên</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Chi tiết lớp ────────────────────────────────── */}
      <Modal isOpen={showClassDetailModal} onClose={() => setShowClassDetailModal(false)} title="Chi tiết lớp học" size="lg">
        {selectedClass && (
          <div className="space-y-4">
            {/* Class info */}
            <div className="border-b pb-4">
              <h3 className="text-xl font-semibold text-gray-900">{selectedClass.classCode} - {selectedClass.className}</h3>
              {selectedClass.description && <p className="text-gray-600 mt-2">{selectedClass.description}</p>}
              {selectedClass.schedule && <p className="text-sm text-gray-500 mt-1">Lịch học: {selectedClass.schedule}</p>}
            </div>

            {/* Attendance sessions */}
            <div className="border-b pb-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-900">Buổi điểm danh ({attendanceSessions.length})</h4>
                <Button variant="primary" size="sm" icon={<ClipboardCheck className="w-4 h-4" />} onClick={handleOpenCreateAttendance}>
                  Tạo buổi mới
                </Button>
              </div>

              {attendanceSessions.length === 0 ? (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Chưa có buổi điểm danh nào</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {attendanceSessions.map((session) => {
                    const presentCount = session.records?.filter(r => r.status === 'present').length || 0;
                    const lateCount = session.records?.filter(r => r.status === 'late').length || 0;
                    const absentCount = Math.max(0, classStudents.length - presentCount - lateCount);
                    return (
                      <div key={session.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900">{session.sessionNumber}</p>
                            <p className="text-xs text-gray-500">
                              {session.date && new Date(session.date.seconds * 1000).toLocaleDateString('vi-VN', {
                                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                            <div className="flex gap-3 mt-1 text-xs">
                              <span className="text-green-600"><strong>{presentCount}</strong> có mặt</span>
                              {lateCount > 0 && <span className="text-yellow-600"><strong>{lateCount}</strong> muộn</span>}
                              <span className="text-red-600"><strong>{absentCount}</strong> vắng</span>
                            </div>
                          </div>
                          {/* Action buttons */}
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<ClipboardCheck className="w-4 h-4" />}
                              onClick={() => handleOpenManualAttendance(session)}
                            >
                              Thủ công
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<QrCode className="w-4 h-4" />}
                              onClick={() => handleOpenQR(session)}
                            >
                              QR
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<Trash2 className="w-4 h-4" />}
                              onClick={() => handleDeleteAttendance(session.id, session.sessionNumber)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Students list */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-900">Danh sách sinh viên ({classStudents.length})</h4>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<UserPlus className="w-4 h-4" />}
                  onClick={() => { setShowClassDetailModal(false); handleOpenAddStudent(selectedClass); }}
                >
                  Thêm SV
                </Button>
              </div>
              {classStudents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Chưa có sinh viên nào trong lớp</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {classStudents.map((student) => (
                    <div key={student.uid} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{student.fullName}</p>
                        <p className="text-sm text-gray-600">{student.email}</p>
                        {student.studentId && <p className="text-xs text-gray-500">MSSV: {student.studentId}</p>}
                      </div>
                      <Button variant="outline" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => handleRemoveStudent(student.uid)}>Xóa</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Tạo buổi điểm danh (chỉ đặt tên) ──────────── */}
      <Modal isOpen={showCreateAttendanceModal} onClose={() => setShowCreateAttendanceModal(false)} title="Tạo buổi điểm danh mới" size="md">
        <form onSubmit={handleCreateAttendance} className="space-y-4">
          <p className="text-sm text-gray-600">
            Lớp: <span className="font-semibold">{selectedClass?.classCode} - {selectedClass?.className}</span>
          </p>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>}
          <Input
            label="Tên buổi điểm danh"
            type="text"
            placeholder="Ví dụ: Buổi 1, Tuần 1, Ngày 15/03/2026..."
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500">
            Sau khi tạo, bạn có thể chọn <strong>điểm danh thủ công</strong> hoặc <strong>tạo mã QR</strong> cho sinh viên quét.
          </p>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowCreateAttendanceModal(false)} fullWidth disabled={creatingAttendance}>Hủy</Button>
            <Button type="submit" variant="primary" fullWidth loading={creatingAttendance} disabled={creatingAttendance}>Tạo buổi</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Điểm danh thủ công ─────────────────────────── */}
      <Modal isOpen={showManualAttendanceModal} onClose={() => setShowManualAttendanceModal(false)} title="Điểm danh thủ công" size="lg">
        {selectedSession && (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <p className="font-semibold text-gray-900">{selectedSession.sessionNumber}</p>
              <p className="text-sm text-gray-500">Lớp: {selectedClass?.classCode} - {selectedClass?.className}</p>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>}

            {classStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Chưa có sinh viên nào trong lớp</p>
              </div>
            ) : (
              <>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  Tích vào ô để đánh dấu <strong>có mặt</strong>. Bỏ tích để đánh dấu <strong>vắng</strong>.
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-3">
                  {classStudents.map((student) => {
                    const isPresent = attendanceRecords[student.uid]?.status === 'present';
                    return (
                      <div
                        key={student.uid}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                          isPresent ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
                        }`}
                        onClick={() => handleToggleAttendance(student.uid, isPresent ? 'absent' : 'present')}
                      >
                        <input
                          type="checkbox"
                          checked={isPresent}
                          onChange={() => {}}
                          className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 pointer-events-none"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{student.fullName}</p>
                          <p className="text-sm text-gray-600">{student.email}</p>
                          {student.studentId && <p className="text-xs text-gray-500">MSSV: {student.studentId}</p>}
                        </div>
                        <span className={`text-sm font-semibold px-3 py-1 rounded ${isPresent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {isPresent ? 'Có mặt' : 'Vắng'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">Có mặt: <strong>{Object.values(attendanceRecords).filter(r => r.status === 'present').length}</strong></span>
                  <span className="text-red-600">Vắng: <strong>{Object.values(attendanceRecords).filter(r => r.status === 'absent').length}</strong></span>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowManualAttendanceModal(false)} fullWidth disabled={savingManual}>Hủy</Button>
              <Button type="button" variant="primary" fullWidth loading={savingManual} disabled={savingManual || classStudents.length === 0} onClick={handleSaveManualAttendance}>
                Lưu điểm danh
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: QR Code ─────────────────────────────────────── */}
      <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)} title="Điểm danh bằng QR Code" size="md">
        {selectedSession && (
          <div className="space-y-4 text-center">
            <div className="border-b pb-3">
              <p className="font-semibold text-gray-900">{selectedSession.sessionNumber}</p>
              <p className="text-sm text-gray-500">Lớp: {selectedClass?.classCode} - {selectedClass?.className}</p>
            </div>

            {generatingQR ? (
              <div className="py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Đang tạo QR Code...</p>
              </div>
            ) : qrImageUrl ? (
              <>
                <div className="flex justify-center">
                  <img src={qrImageUrl} alt="QR Code điểm danh" className="w-64 h-64 rounded-lg border-4 border-gray-200" />
                </div>

                {/* Countdown badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                  qrCountdown > 60 ? 'bg-green-100 text-green-800' :
                  qrCountdown > 0  ? 'bg-yellow-100 text-yellow-800' :
                                     'bg-red-100 text-red-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    qrCountdown > 60 ? 'bg-green-500' :
                    qrCountdown > 0  ? 'bg-yellow-500 animate-pulse' :
                                       'bg-red-500'
                  }`} />
                  {qrCountdown > 0 ? `Còn ${formatCountdown(qrCountdown)} để quét` : 'QR Code đã hết hạn'}
                </div>

                <p className="text-xs text-gray-500">
                  Hiển thị mã này cho sinh viên quét bằng ứng dụng để điểm danh tự động
                </p>

                <Button variant="primary" icon={<QrCode className="w-4 h-4" />} onClick={handleRegenerateQR} fullWidth>
                  Tạo lại QR mới (10 phút)
                </Button>
              </>
            ) : null}

            <Button type="button" variant="outline" onClick={() => setShowQRModal(false)} fullWidth>Đóng</Button>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default TeacherDashboard;