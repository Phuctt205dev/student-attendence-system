import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User, Mail, BookOpen, CheckCircle, Clock, XCircle } from 'lucide-react';
import { getCurrentUserProfile } from '../../services/auth.service';
import { getStudentOverallAttendanceStats } from '../../services/attendance.service';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const AdminUserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const userResult = await getCurrentUserProfile(userId);
      if (userResult.success) {
        setUser(userResult.user);
      }

      if (userResult.user?.role === 'student') {
        const statsResult = await getStudentOverallAttendanceStats(userId);
        if (statsResult.success) {
          setAttendanceStats(statsResult);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/users')}
            icon={<ArrowLeft className="w-5 h-5" />}
          >
            Quay lại
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Thông tin người dùng</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* User Info Card */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="w-12 h-12 text-gray-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{user?.fullName}</h2>
                <p className="text-gray-600 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user?.email}
                </p>
                {user?.studentId && (
                  <p className="text-gray-600 mt-1">Mã sinh viên: {user.studentId}</p>
                )}
                <span className="inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                  {user?.role === 'student' ? 'Sinh viên' : user?.role === 'teacher' ? 'Giảng viên' : 'Admin'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Attendance Stats */}
        {attendanceStats && (
          <>
            {/* Overall Stats */}
            <Card title="Tỷ lệ điểm danh tổng">
              <div className="p-6">
                <div className="flex items-center justify-center mb-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-gray-900">
                      {attendanceStats.overall.attendanceRate}%
                    </div>
                    <p className="text-gray-600 mt-2">Tỷ lệ điểm danh</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {attendanceStats.overall.totalSessions}
                    </div>
                    <p className="text-sm text-gray-600">Tổng buổi học</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {attendanceStats.overall.totalPresentOrLate}
                    </div>
                    <p className="text-sm text-gray-600">Có mặt/Trễ</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {attendanceStats.overall.totalSessions - attendanceStats.overall.totalPresentOrLate}
                    </div>
                    <p className="text-sm text-gray-600">Vắng mặt</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Per Class Stats */}
            {attendanceStats.classStats.length > 0 && (
              <Card title="Điểm danh theo lớp">
                <div className="divide-y divide-gray-100">
                  {attendanceStats.classStats.map((cls, index) => (
                    <div key={index} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{cls.name}</h3>
                          <p className="text-sm text-gray-600">
                            {cls.stats.totalSessions} buổi học
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          parseFloat(cls.stats.attendanceRate) >= 80 ? 'text-green-600' :
                          parseFloat(cls.stats.attendanceRate) >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {cls.stats.attendanceRate}%
                        </div>
                        <div className="flex items-center gap-3 justify-end text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            {cls.stats.present + cls.stats.late}
                          </span>
                          <span className="flex items-center gap-1">
                            <XCircle className="w-4 h-4 text-red-500" />
                            {cls.stats.absent}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AdminUserDetail;
