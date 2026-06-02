import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Users, BookOpen } from 'lucide-react';
import { getAllClasses, deleteClass } from '../../services/class.service';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const AdminClasses = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const result = await getAllClasses();
      if (result.success) {
        setClasses(result.classes);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa lớp này?')) {
      return;
    }

    try {
      setDeleting(classId);
      const result = await deleteClass(classId);
      if (result.success) {
        setClasses(classes.filter(cls => cls.id !== classId));
      } else {
        alert('Lỗi xóa lớp: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Lỗi xóa lớp');
    } finally {
      setDeleting(null);
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Quản lý lớp học</h1>
            <p className="text-gray-600">Tất cả các lớp học trong hệ thống</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <Card
                key={cls.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/admin/classes/${cls.id}`)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {cls.className || 'Lớp không tên'}
                      </h3>
                      {cls.classCode && (
                        <p className="text-sm text-gray-500 mt-1">
                          Mã lớp: {cls.classCode}
                        </p>
                      )}
                      {cls.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {cls.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClass(cls.id);
                      }}
                      icon={<Trash2 className="w-4 h-4 text-red-500" />}
                      loading={deleting === cls.id}
                    />
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {cls.teacher && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Users className="w-4 h-4" />
                        <span>Giảng viên: {cls.teacher.fullName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <BookOpen className="w-4 h-4" />
                      <span>{cls.studentCount} sinh viên</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!loading && classes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Chưa có lớp học nào</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminClasses;
