import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import StudentLayout from '../../layouts/StudentLayout';
import { getClassesByStudent } from '../../services/class.service';
import { getStudentAttendanceHistory, getStudentAttendanceStats } from '../../services/attendance.service';
import {
  BookOpen,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  TrendingUp,
  Calendar
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const StudentClasses = () => {
  const { userProfile } = useAuth();

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showClassDetailModal, setShowClassDetailModal] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState(null);
  const [classAttendances, setClassAttendances] = useState({});

  useEffect(() => {
    loadClasses();
  }, [userProfile?.uid]);

  const loadClasses = async () => {
    if (!userProfile?.uid) return;

    setLoading(true);
    const result = await getClassesByStudent(userProfile.uid);
    if (result.success) {
      setClasses(result.classes);
    }
    setLoading(false);
  };

  const handleToggleClass = async (classItem) => {
    if (expandedClassId === classItem.id) {
      setExpandedClassId(null);
    } else {
      setExpandedClassId(classItem.id);

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

    if (userProfile?.uid) {
      setLoadingAttendance(true);

      // Load attendance history
      const historyResult = await getStudentAttendanceHistory(userProfile.uid, classItem.id);
      if (historyResult.success) {
        setAttendanceHistory(historyResult.attendances);
      }

      // Load attendance stats
      const statsResult = await getStudentAttendanceStats(userProfile.uid, classItem.id);
      if (statsResult.success) {
        setAttendanceStats(statsResult.stats);
      }

      setLoadingAttendance(false);
    }
  };

  return (
    <StudentLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Lớp học của tôi</h1>
            <p className="text-gray-600 mt-1">Danh sách các lớp bạn đang tham gia</p>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : classes.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Chưa có lớp học nào
                </h3>
                <p className="text-gray-600">
                  Bạn chưa được thêm vào lớp nào. Liên hệ giảng viên để được thêm vào lớp.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {classes.map((classItem) => {
                const isExpanded = expandedClassId === classItem.id;
                const attendances = classAttendances[classItem.id] || [];

                return (
                  <Card key={classItem.id} className="overflow-hidden">
                    {/* Class Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleToggleClass(classItem)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="bg-primary-100 p-3 rounded-lg">
                          <BookOpen className="w-6 h-6 text-primary-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900">
                            {classItem.classCode}
                          </h3>
                          <p className="text-gray-600">{classItem.className}</p>
                          {classItem.schedule && (
                            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {classItem.schedule}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Eye className="w-4 h-4" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenClassDetail(classItem);
                          }}
                        >
                          Chi tiết
                        </Button>
                        <div
                          className={`transform transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          <svg
                            className="w-5 h-5 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Attendance History - Expandable */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
                        <h4 className="font-semibold text-gray-900 mt-4 mb-3">
                          Lịch sử điểm danh
                        </h4>
                        {attendances.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">
                            Chưa có buổi điểm danh nào
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                                    {attendance.date &&
                                      new Date(
                                        attendance.date.seconds * 1000
                                      ).toLocaleDateString('vi-VN', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                  </p>
                                  {attendance.timestamp && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      {new Date(
                                        attendance.timestamp.seconds * 1000
                                      ).toLocaleTimeString('vi-VN', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  )}
                                  {attendance.method && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {attendance.method === 'face'
                                        ? '📸 Nhận diện khuôn mặt'
                                        : attendance.method === 'qr'
                                        ? '📱 QR Code'
                                        : '✍️ Thủ công'}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Class Detail Modal */}
      <Modal
        isOpen={showClassDetailModal}
        onClose={() => setShowClassDetailModal(false)}
        title="Chi tiết lớp học"
        size="lg"
      >
        {selectedClass && (
          <div className="space-y-4">
            {/* Class Info */}
            <div className="border-b pb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedClass.classCode}
              </h3>
              <p className="text-gray-600 mt-1">{selectedClass.className}</p>
            </div>

            {/* Class Details */}
            <div className="grid grid-cols-2 gap-4">
              {selectedClass.schedule && (
                <div>
                  <p className="text-sm text-gray-600">Lịch học</p>
                  <p className="font-medium text-gray-900">{selectedClass.schedule}</p>
                </div>
              )}
              {selectedClass.description && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Mô tả</p>
                  <p className="text-gray-900">{selectedClass.description}</p>
                </div>
              )}
            </div>

            {/* Attendance Stats */}
            {loadingAttendance ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
              </div>
            ) : attendanceStats ? (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Thống kê điểm danh
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Tổng buổi</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {attendanceStats.total}
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Có mặt</p>
                    <p className="text-2xl font-bold text-green-600">
                      {attendanceStats.present}
                    </p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Vắng</p>
                    <p className="text-2xl font-bold text-red-600">
                      {attendanceStats.absent}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Tỷ lệ</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {attendanceStats.attendanceRate}%
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Attendance History */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Lịch sử điểm danh</h4>
              {loadingAttendance ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                </div>
              ) : attendanceHistory.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Chưa có buổi điểm danh nào
                </p>
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
                          {attendance.date &&
                            new Date(attendance.date.seconds * 1000).toLocaleDateString(
                              'vi-VN'
                            )}
                        </p>
                        {attendance.method && (
                          <p className="text-xs text-gray-500 mt-1">
                            {attendance.method === 'face'
                              ? '📸 Nhận diện khuôn mặt'
                              : attendance.method === 'qr'
                              ? '📱 QR Code'
                              : '✍️ Thủ công'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </StudentLayout>
  );
};

export default StudentClasses;
