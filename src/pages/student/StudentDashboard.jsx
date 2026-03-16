import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getClassesByStudent } from '../../services/class.service';
import { getStudentAttendanceHistory, markAttendance } from '../../services/attendance.service';
import StudentLayout from '../../layouts/StudentLayout';
import {
  BookOpen,
  ClipboardList,
  QrCode,
  TrendingUp,
  Calendar,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import QRScanner from '../../components/common/QRScanner';

const StudentDashboard = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalClasses: 0,
    totalAttendance: 0,
    attendanceRate: 0,
    recentClasses: []
  });
  const [loading, setLoading] = useState(true);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      if (!userProfile?.uid) return;

      setLoading(true);

      // Load classes
      const classesResult = await getClassesByStudent(userProfile.uid);

      if (classesResult.success) {
        const classes = classesResult.classes;

        // Load all attendance history
        const historyResult = await getStudentAttendanceHistory(userProfile.uid);
        let totalAttendance = 0;
        let presentCount = 0;

        if (historyResult.success) {
          totalAttendance = historyResult.attendances.length;
          presentCount = historyResult.attendances.filter(
            (a) => a.status === 'present' || a.status === 'PRESENT'
          ).length;
        }

        setStats({
          totalClasses: classes.length,
          totalAttendance,
          attendanceRate:
            totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0,
          recentClasses: classes.slice(0, 3)
        });
      }

      setLoading(false);
    };

    loadStats();
  }, [userProfile?.uid]);

  const handleOpenQRScanner = () => {
    setScanError('');
    setScanSuccess('');
    setShowQRScanner(true);
  };

  const handleQRScanSuccess = async ({ attendanceId, studentId, studentName }) => {
    try {
      const result = await markAttendance(attendanceId, {
        studentId,
        studentName,
        studentCode: userProfile?.studentId || '',
        status: 'PRESENT',
        method: 'qr'
      });

      if (result.success) {
        setScanSuccess('✅ Điểm danh thành công!');
        setScanError('');

        // Reload stats
        const classesResult = await getClassesByStudent(userProfile.uid);
        if (classesResult.success) {
          const historyResult = await getStudentAttendanceHistory(userProfile.uid);
          if (historyResult.success) {
            const totalAttendance = historyResult.attendances.length;
            const presentCount = historyResult.attendances.filter(
              (a) => a.status === 'present' || a.status === 'PRESENT'
            ).length;

            setStats((prev) => ({
              ...prev,
              totalAttendance,
              attendanceRate:
                totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0
            }));
          }
        }

        // Auto close after 2 seconds
        setTimeout(() => {
          setShowQRScanner(false);
          setScanSuccess('');
        }, 2000);
      } else {
        setScanError(result.error || 'Không thể điểm danh');
        setScanSuccess('');
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      setScanError(error.message || 'Có lỗi xảy ra khi điểm danh');
      setScanSuccess('');
      throw error;
    }
  };

  const statsCards = [
    {
      title: 'Lớp học',
      value: stats.totalClasses.toString(),
      icon: BookOpen,
      color: 'bg-blue-500',
      description: 'lớp đang tham gia'
    },
    {
      title: 'Buổi điểm danh',
      value: stats.totalAttendance.toString(),
      icon: ClipboardList,
      color: 'bg-green-500',
      description: 'buổi đã diễn ra'
    },
    {
      title: 'Tỷ lệ tham dự',
      value: `${stats.attendanceRate}%`,
      icon: TrendingUp,
      color: 'bg-purple-500',
      description: 'tỷ lệ có mặt'
    }
  ];

  const quickActions = [
    {
      title: 'Quét QR Điểm danh',
      description: 'Sử dụng QR code để điểm danh nhanh chóng',
      icon: QrCode,
      color: 'bg-primary-500',
      onClick: handleOpenQRScanner
    },
    {
      title: 'Xem Lớp học',
      description: 'Xem danh sách lớp và lịch sử điểm danh',
      icon: BookOpen,
      color: 'bg-blue-500',
      onClick: () => navigate('/student/classes')
    },
    {
      title: 'Lịch học',
      description: 'Xem lịch học và thời khóa biểu',
      icon: Calendar,
      color: 'bg-green-500',
      onClick: () => alert('Tính năng đang phát triển')
    }
  ];

  return (
    <StudentLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Chào mừng, {userProfile?.fullName} - MSSV: {userProfile?.studentId || 'N/A'}
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {statsCards.map((stat, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm mb-1">{stat.title}</p>
                        <p className="text-4xl font-bold text-gray-900 mb-1">{stat.value}</p>
                        <p className="text-sm text-gray-500">{stat.description}</p>
                      </div>
                      <div className={`${stat.color} p-4 rounded-lg`}>
                        <stat.icon className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

            {/* Quick Actions */}
              <Card title="Thao tác nhanh" className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.onClick}
                      className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all group"
                    >
                      <div
                        className={`${action.color} w-12 h-12 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                      >
                        <action.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </button>
                  ))}
                </div>

                {/* Scan Result Messages */}
                {scanSuccess && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      {scanSuccess}
                    </p>
                  </div>
                )}
                {scanError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{scanError}</p>
                  </div>
                )}
              </Card>

              {/* Recent Classes */}
              <Card title="Lớp học của tôi" className="mb-8">
                {stats.recentClasses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>Chưa có lớp học nào</p>
                    <p className="text-sm mt-2">Liên hệ giảng viên để được thêm vào lớp</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {stats.recentClasses.map((classItem) => (
                        <div
                          key={classItem.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="bg-primary-100 p-3 rounded-lg">
                              <BookOpen className="w-6 h-6 text-primary-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {classItem.classCode}
                              </h4>
                              <p className="text-sm text-gray-600">{classItem.className}</p>
                              {classItem.schedule && (
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {classItem.schedule}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<ArrowRight className="w-4 h-4" />}
                            onClick={() => navigate('/student/classes')}
                          >
                            Xem
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 text-center">
                      <Button
                        variant="outline"
                        onClick={() => navigate('/student/classes')}
                        icon={<ArrowRight className="w-4 h-4" />}
                      >
                        Xem tất cả lớp học
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            </>
          )}
        </main>
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showQRScanner}
        onClose={() => {
          setShowQRScanner(false);
          setScanError('');
          setScanSuccess('');
        }}
        onScanSuccess={handleQRScanSuccess}
        studentId={userProfile?.uid}
        studentName={userProfile?.fullName}
      />
    </StudentLayout>
  );
};

export default StudentDashboard;
