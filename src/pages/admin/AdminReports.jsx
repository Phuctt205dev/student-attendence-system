import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Users, GraduationCap, BarChart } from 'lucide-react';
import { getAllClasses } from '../../services/class.service';
import { getAllUsers } from '../../services/auth.service';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const AdminReports = () => {
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const classesResult = await getAllClasses();
      const usersResult = await getAllUsers();

      if (classesResult.success) {
        setClasses(classesResult.classes);
      }

      if (usersResult.success) {
        setUsers(usersResult.users);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalClasses: classes.length,
    totalStudents: users.filter(u => u.role === 'student').length,
    totalTeachers: users.filter(u => u.role === 'teacher').length,
    totalStudentsInClasses: classes.reduce((sum, cls) => sum + (cls.studentCount || 0), 0)
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
            onClick={() => navigate('/admin')}
            icon={<ArrowLeft className="w-5 h-5" />}
          >
            Quay lại
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Báo cáo thống kê</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Tổng lớp học</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalClasses}</p>
              </div>
              <div className="bg-blue-500 p-3 rounded-lg">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Giảng viên</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalTeachers}</p>
              </div>
              <div className="bg-green-500 p-3 rounded-lg">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Sinh viên</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalStudents}</p>
              </div>
              <div className="bg-purple-500 p-3 rounded-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Số đăng ký lớp</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalStudentsInClasses}</p>
              </div>
              <div className="bg-orange-500 p-3 rounded-lg">
                <BarChart className="w-8 h-8 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Class List */}
        <Card title="Danh sách lớp học">
          <div className="divide-y divide-gray-100">
            {classes.map((cls) => (
              <div key={cls.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{cls.className}</h3>
                    {cls.teacher && (
                      <p className="text-sm text-gray-600">
                        Giảng viên: {cls.teacher.fullName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">{cls.studentCount} sinh viên</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default AdminReports;
