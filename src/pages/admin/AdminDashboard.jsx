import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../services/auth.service';
import { getAllClasses } from '../../services/class.service';
import { getAllUsers } from '../../services/auth.service';
import { LogOut, Users, BookOpen, BarChart } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const AdminDashboard = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalStudentsInClasses: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const classesResult = await getAllClasses();
      const usersResult = await getAllUsers();

      if (classesResult.success && usersResult.success) {
        const students = usersResult.users.filter(u => u.role === 'student');
        const teachers = usersResult.users.filter(u => u.role === 'teacher');
        const totalStudentsInClasses = classesResult.classes.reduce((sum, cls) => sum + (cls.studentCount || 0), 0);

        setStats({
          totalClasses: classesResult.classes.length,
          totalTeachers: teachers.length,
          totalStudents: students.length,
          totalStudentsInClasses
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const statsCards = [
    { title: 'Tổng lớp học', value: stats.totalClasses, icon: BookOpen, color: 'bg-blue-500' },
    { title: 'Giảng viên', value: stats.totalTeachers, icon: Users, color: 'bg-green-500' },
    { title: 'Sinh viên', value: stats.totalStudents, icon: Users, color: 'bg-purple-500' },
    { title: 'Số đăng ký lớp', value: stats.totalStudentsInClasses, icon: BarChart, color: 'bg-orange-500' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Chào mừng, {userProfile?.fullName}</p>
          </div>
          <Button variant="outline" icon={<LogOut className="w-5 h-5" />} onClick={handleLogout}>
            Đăng xuất
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {loading ? '...' : stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-8 h-8 text-white" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card title="Quản lý hệ thống" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="primary" fullWidth onClick={() => navigate('/admin/classes')}>
              Quản lý lớp học
            </Button>
            <Button variant="secondary" fullWidth onClick={() => navigate('/admin/users')}>
              Quản lý người dùng
            </Button>
            <Button variant="secondary" fullWidth onClick={() => navigate('/admin/reports')}>
              Báo cáo thống kê
            </Button>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card title="Hoạt động gần đây">
          <p className="text-gray-600">Chức năng đang được phát triển...</p>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
