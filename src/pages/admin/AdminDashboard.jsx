import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../services/auth.service';
import { LogOut, Users, BookOpen, BarChart } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const AdminDashboard = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const stats = [
    { title: 'Tổng lớp học', value: '15', icon: BookOpen, color: 'bg-blue-500' },
    { title: 'Giảng viên', value: '8', icon: Users, color: 'bg-green-500' },
    { title: 'Sinh viên', value: '250', icon: Users, color: 'bg-purple-500' },
    { title: 'Tỷ lệ điểm danh', value: '85%', icon: BarChart, color: 'bg-orange-500' }
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

        {/* Quick Actions */}
        <Card title="Quản lý hệ thống" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="primary" fullWidth onClick={() => navigate('/admin/classes')}>
              Quản lý lớp học
            </Button>
            <Button variant="secondary" fullWidth onClick={() => navigate('/admin/users')}>
              Quản lý người dùng
            </Button>
            <Button variant="secondary" fullWidth>
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
