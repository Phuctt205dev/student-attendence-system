import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getClassesByTeacher } from '../../services/class.service';
import { getAttendancesByClass } from '../../services/attendance.service';
import TeacherLayout from '../../layouts/TeacherLayout';
import {
  BookOpen,
  Users,
  ClipboardCheck,
  ArrowRight,
  Calendar,
  TrendingUp
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const TeacherDashboard = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalSessions: 0,
    recentClasses: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!userProfile?.uid) return;

      setLoading(true);
      const classesResult = await getClassesByTeacher(userProfile.uid);

      if (classesResult.success) {
        const classes = classesResult.classes;
        const totalStudents = classes.reduce((sum, cls) => sum + (cls.studentCount || 0), 0);

        // Lấy tổng số buổi điểm danh từ tất cả các lớp
        let totalSessions = 0;
        for (const cls of classes) {
          const sessionsResult = await getAttendancesByClass(cls.id);
          if (sessionsResult.success) {
            totalSessions += sessionsResult.attendances.length;
          }
        }

        setStats({
          totalClasses: classes.length,
          totalStudents,
          totalSessions,
          recentClasses: classes.slice(0, 3) // 3 lớp gần nhất
        });
      }

      setLoading(false);
    };

    loadStats();
  }, [userProfile?.uid]);

  const statsCards = [
    {
      title: 'Lớp phụ trách',
      value: stats.totalClasses.toString(),
      icon: BookOpen,
      color: 'bg-blue-500',
      description: 'lớp học đang giảng dạy'
    },
    {
      title: 'Tổng sinh viên',
      value: stats.totalStudents.toString(),
      icon: Users,
      color: 'bg-green-500',
      description: 'sinh viên trong các lớp'
    },
    {
      title: 'Buổi điểm danh',
      value: stats.totalSessions.toString(),
      icon: ClipboardCheck,
      color: 'bg-purple-500',
      description: 'buổi đã tạo'
    }
  ];

  const quickActions = [
    {
      title: 'Quản lý Lớp học',
      description: 'Xem và quản lý tất cả các lớp học của bạn',
      icon: BookOpen,
      color: 'bg-blue-500',
      onClick: () => navigate('/teacher/classes')
    },
    {
      title: 'Điểm danh',
      description: 'Tạo buổi điểm danh và quét mặt sinh viên',
      icon: ClipboardCheck,
      color: 'bg-purple-500',
      onClick: () => navigate('/teacher/classes')
    },
    {
      title: 'Thống kê',
      description: 'Xem báo cáo và thống kê chi tiết',
      icon: TrendingUp,
      color: 'bg-orange-500',
      onClick: () => alert('Tính năng đang phát triển')
    }
  ];

  return (
    <TeacherLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Tổng quan hoạt động giảng dạy của bạn</p>
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
                    <div className={`${action.color} w-12 h-12 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </button>
                ))}
              </div>
            </Card>

            {/* Recent Classes */}
            <Card title="Lớp học gần đây" className="mb-8">
              {stats.recentClasses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Chưa có lớp học nào</p>
                  <Button
                    variant="primary"
                    onClick={() => navigate('/teacher/classes')}
                    className="mt-4"
                  >
                    Tạo lớp đầu tiên
                  </Button>
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
                          <div className="bg-blue-100 p-3 rounded-lg">
                            <BookOpen className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{classItem.classCode}</h4>
                            <p className="text-sm text-gray-600">{classItem.className}</p>
                            {classItem.schedule && (
                              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {classItem.schedule}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{classItem.studentCount || 0} sinh viên</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<ArrowRight className="w-4 h-4" />}
                            onClick={() => navigate('/teacher/classes')}
                          >
                            Xem
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/teacher/classes')}
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
    </TeacherLayout>
  );
};

export default TeacherDashboard;
