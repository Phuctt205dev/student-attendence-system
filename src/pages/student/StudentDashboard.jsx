import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../services/auth.service';
import { getClassesByStudent } from '../../services/class.service';
import { LogOut, BookOpen, FileText, QrCode } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const StudentDashboard = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Mock data for display (matching screenshot)
  const recentClasses = [
    'IT003', 'MA005', 'IT002', 'MA003', 'IT001'
  ];

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
        {/* Stats Cards - matching screenshot */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Tổng lớp học</p>
                <p className="text-4xl font-bold text-primary-600">
                  {classes.length || 6}
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

        {/* Recent Classes - matching screenshot */}
        <Card title="Lớp học gần đây" className="mb-8">
          {loading ? (
            <p className="text-gray-600">Đang tải...</p>
          ) : (
            <div className="space-y-3">
              {recentClasses.map((classCode, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-100 p-2 rounded-lg">
                      <BookOpen className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{classCode}</p>
                      <p className="text-sm text-gray-600">Lớp học</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Chi tiết
                  </Button>
                </div>
              ))}
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
              <Button variant="outline" fullWidth onClick={() => navigate('/student/classes')}>
                Xem tất cả lớp học
              </Button>
              <Button variant="outline" fullWidth onClick={() => navigate('/student/attendance')}>
                Lịch sử điểm danh
              </Button>
              <Button variant="outline" fullWidth>
                Lịch học
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
