import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../services/auth.service';
import { LogOut, BookOpen, Users, ClipboardCheck } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const TeacherDashboard = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const stats = [
    { title: 'Lớp phụ trách', value: '4', icon: BookOpen, color: 'bg-blue-500' },
    { title: 'Tổng sinh viên', value: '120', icon: Users, color: 'bg-green-500' },
    { title: 'Buổi điểm danh', value: '15', icon: ClipboardCheck, color: 'bg-purple-500' }
  ];

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
        {/* Stats Grid */}
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

        {/* Quick Actions */}
        <Card title="Lớp học của tôi" className="mb-8">
          <p className="text-gray-600 mb-4">Các lớp học bạn đang phụ trách</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="primary" fullWidth>
              IT001 - Nhập môn CNTT
            </Button>
            <Button variant="primary" fullWidth>
              NT208 - Mạng máy tính
            </Button>
          </div>
        </Card>

        {/* Recent Attendance */}
        <Card title="Điểm danh gần đây">
          <p className="text-gray-600">Chức năng đang được phát triển...</p>
        </Card>
      </main>
    </div>
  );
};

export default TeacherDashboard;
