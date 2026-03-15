import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../services/auth.service';
import { getClassesByStudent } from '../../services/class.service';
import { getStudentAttendanceHistory } from '../../services/attendance.service';
import { LogOut, BookOpen, FileText, QrCode, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const StudentDashboard = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showClassDetailModal, setShowClassDetailModal] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState(null);
  const [classAttendances, setClassAttendances] = useState({});

  useEffect(() => {
    const loadClasses = async () => {
      if (userProfile?.uid) {
        const result = await getClassesByStudent(userProfile.uid);
        if (result.success) {
          setClasses(result.classes);
        }
        setLoading(false);
      }
    };

    loadClasses();
  }, [userProfile]);

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const handleToggleClass = async (classItem) => {
    if (expandedClassId === classItem.id) {
      // Collapse
      setExpandedClassId(null);
    } else {
      // Expand and load attendance
      setExpandedClassId(classItem.id);

      // Load attendance for this class if not already loaded
      if (!classAttendances[classItem.id] && userProfile?.uid) {
        const result = await getStudentAttendanceHistory(userProfile.uid, classItem.id);
        if (result.success) {
          setClassAttendances(prev => ({
            ...prev,
            [classItem.id]: result.attendances
          }));
        }
      }
    }
  };

  const handleOpenClassDetail = async (classItem) => {
    setSelectedClass(classItem);
    setShowClassDetailModal(true);

    // Load attendance for this class
    if (userProfile?.uid) {
      setLoadingAttendance(true);
      const result = await getStudentAttendanceHistory(userProfile.uid, classItem.id);
      if (result.success) {
        setAttendanceHistory(result.attendances);
      }
      setLoadingAttendance(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {userProfile?.fullName || 'Sinh viên'}
            </h1>
            <p className="text-gray-600">MSSV: {userProfile?.studentId || 'N/A'}</p>
          </div>
          <Button variant="outline" icon={<LogOut className="w-5 h-5" />} onClick={handleLogout}>
            Đăng xuất
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Tổng lớp học</p>
                <p className="text-4xl font-bold text-primary-600">
                  {classes.length}
                </p>
                <p className="text-sm text-gray-500 mt-2">lớp học</p>
              </div>
              <div className="bg-primary-100 p-4 rounded-lg">
                <BookOpen className="w-10 h-10 text-primary-600" />
              </div>
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Bài thi sắp đến</p>
                <p className="text-4xl font-bold text-orange-600">0</p>
                <p className="text-sm text-gray-500 mt-2">bài thi</p>
              </div>
              <div className="bg-orange-100 p-4 rounded-lg">
                <FileText className="w-10 h-10 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Classes List */}
        <Card title="Lớp học của tôi" className="mb-8">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Bạn chưa được thêm vào lớp nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {classes.map((classItem) => {
                const isExpanded = expandedClassId === classItem.id;
                const attendances = classAttendances[classItem.id] || [];

                return (
                  <div
                    key={classItem.id}
                    className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
                  >
                    {/* Class Header */}
                    <div
                      className="flex items-center justify-between p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => handleToggleClass(classItem)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="bg-primary-100 p-2 rounded-lg">
                          <BookOpen className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{classItem.classCode}</p>
                          <p className="text-sm text-gray-600">{classItem.className}</p>
                          {classItem.teacherName && (
                            <p className="text-xs text-gray-500">GV: {classItem.teacherName}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Eye className="w-4 h-4" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenClassDetail(classItem);
                          }}
                        >
                          Chi tiết
                        </Button>
                        <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Attendance List - Expandable */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-900 mt-3 mb-3">Lịch sử điểm danh</h4>
                        {attendances.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">Chưa có buổi điểm danh nào</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {attendances.map((attendance) => {
                              const isPresent = attendance.status === 'present';
                              const isLate = attendance.status === 'late';

                              return (
                                <div
                                  key={attendance.id}
                                  className={`p-3 rounded-lg border-2 transition-all ${
                                    isPresent
                                      ? 'bg-green-50 border-green-300'
                                      : isLate
                                      ? 'bg-yellow-50 border-yellow-300'
                                      : 'bg-red-50 border-red-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      {isPresent ? (
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                      ) : isLate ? (
                                        <Clock className="w-5 h-5 text-yellow-600" />
                                      ) : (
                                        <XCircle className="w-5 h-5 text-red-600" />
                                      )}
                                      <span className="text-sm font-semibold text-gray-900">
                                        {attendance.sessionNumber}
                                      </span>
                                    </div>
                                    <span
                                      className={`text-xs font-semibold px-2 py-1 rounded ${
                                        isPresent
                                          ? 'bg-green-100 text-green-800'
                                          : isLate
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-red-100 text-red-800'
                                      }`}
                                    >
                                      {isPresent ? 'Có mặt' : isLate ? 'Muộn' : 'Vắng'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {attendance.date && new Date(attendance.date.seconds * 1000).toLocaleDateString('vi-VN', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                  {attendance.checkInTime && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      Thời gian: {new Date(attendance.checkInTime.seconds * 1000).toLocaleTimeString('vi-VN', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Điểm danh nhanh" className="cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="bg-primary-100 p-6 rounded-full mb-4">
                <QrCode className="w-12 h-12 text-primary-600" />
              </div>
              <Button variant="primary">
                Quét mã QR điểm danh
              </Button>
            </div>
          </Card>

          <Card title="Thông tin khác">
            <div className="space-y-3">
              <Button variant="outline" fullWidth onClick={() => navigate('/student/attendance')}>
                Lịch sử điểm danh
              </Button>
              <Button variant="outline" fullWidth>
                Lịch học
              </Button>
              <Button variant="outline" fullWidth>
                Thông báo
              </Button>
            </div>
          </Card>
        </div>
      </main>

      {/* Class Detail Modal */}
      <Modal
        isOpen={showClassDetailModal}
        onClose={() => setShowClassDetailModal(false)}
        title="Chi tiết lớp học"
        size="md"
      >
        {selectedClass && (
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedClass.classCode}
              </h3>
              <p className="text-gray-600 mt-1">{selectedClass.className}</p>
            </div>

            <div className="space-y-3">
              {selectedClass.teacherName && (
                <div>
                  <p className="text-sm text-gray-600">Giảng viên</p>
                  <p className="font-medium text-gray-900">{selectedClass.teacherName}</p>
                </div>
              )}

              {selectedClass.description && (
                <div>
                  <p className="text-sm text-gray-600">Mô tả</p>
                  <p className="text-gray-900">{selectedClass.description}</p>
                </div>
              )}

              {selectedClass.schedule && (
                <div>
                  <p className="text-sm text-gray-600">Lịch học</p>
                  <p className="text-gray-900">{selectedClass.schedule}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600">Sĩ số</p>
                <p className="text-gray-900">{selectedClass.students?.length || 0} sinh viên</p>
              </div>
            </div>

            {/* Attendance for selected class */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Điểm danh lớp này</h4>
              {loadingAttendance ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : attendanceHistory.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Chưa có buổi điểm danh nào</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {attendanceHistory.map((attendance) => {
                    const isPresent = attendance.status === 'present';
                    const isLate = attendance.status === 'late';

                    return (
                      <div
                        key={attendance.id}
                        className={`p-3 rounded-lg border ${
                          isPresent
                            ? 'bg-green-50 border-green-200'
                            : isLate
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isPresent ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : isLate ? (
                              <Clock className="w-4 h-4 text-yellow-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-sm font-medium text-gray-900">
                              {attendance.sessionNumber}
                            </span>
                          </div>
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded ${
                              isPresent
                                ? 'bg-green-100 text-green-800'
                                : isLate
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isPresent ? 'Có mặt' : isLate ? 'Muộn' : 'Vắng'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {attendance.date && new Date(attendance.date.seconds * 1000).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentDashboard;
