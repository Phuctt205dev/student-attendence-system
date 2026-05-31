import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../layouts/TeacherLayout';
import { createClass, getClassesByTeacher } from '../../services/class.service';
import { BookOpen, Plus, Eye, UserPlus } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';

const TeacherClasses = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newClass, setNewClass] = useState({
    classCode: '',
    className: '',
    description: '',
    schedule: ''
  });

  const loadClasses = useCallback(async () => {
    if (!userProfile?.uid) return;
    setLoading(true);
    const result = await getClassesByTeacher(userProfile.uid);
    if (result.success) {
      setClasses(result.classes);
    } else {
      setError('Không thể tải danh sách lớp');
    }
    setLoading(false);
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const timeoutId = setTimeout(() => {
      loadClasses();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [userProfile, loadClasses]);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!newClass.classCode || !newClass.className) {
      setError('Vui lòng điền đầy đủ mã lớp và tên lớp');
      return;
    }
    const result = await createClass({
      ...newClass,
      teacherId: userProfile.uid,
      teacherName: userProfile.fullName
    });
    if (result.success) {
      setSuccess('Tạo lớp thành công!');
      setShowCreateClassModal(false);
      setNewClass({ classCode: '', className: '', description: '', schedule: '' });
      loadClasses();
    } else {
      setError(result.error || 'Không thể tạo lớp');
    }
  };

  return (
    <TeacherLayout>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quản lý Lớp học</h1>
                <p className="text-gray-600">Danh sách các lớp bạn đang phụ trách</p>
              </div>
              <Button
                variant="primary"
                icon={<Plus className="w-5 h-5" />}
                onClick={() => setShowCreateClassModal(true)}
              >
                Tạo lớp mới
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : classes.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có lớp học nào</h3>
                <p className="text-gray-600 mb-6">Tạo lớp đầu tiên để bắt đầu quản lý sinh viên và điểm danh</p>
                <Button
                  variant="primary"
                  icon={<Plus className="w-5 h-5" />}
                  onClick={() => setShowCreateClassModal(true)}
                >
                  Tạo lớp mới
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((classItem) => (
                <Card key={classItem.id} className="hover:shadow-lg transition-shadow flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-xl text-gray-900 mb-1">{classItem.classCode}</h3>
                        <p className="text-gray-700 font-medium">{classItem.className}</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                        {classItem.studentCount || 0} SV
                      </span>
                    </div>

                    {classItem.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{classItem.description}</p>
                    )}

                    {classItem.schedule && (
                      <div className="mb-4 p-2 bg-gray-50 rounded text-sm text-gray-700">
                        📅 {classItem.schedule}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Eye className="w-4 h-4" />}
                      onClick={() => navigate(`/teacher/classes/${classItem.id}`)}
                      fullWidth
                    >
                      Chi tiết
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<UserPlus className="w-4 h-4" />}
                      onClick={() => navigate(`/teacher/classes/${classItem.id}`, { state: { openAddStudent: true } })}
                      fullWidth
                    >
                      Thêm SV
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>

        <Modal isOpen={showCreateClassModal} onClose={() => setShowCreateClassModal(false)} title="Tạo lớp mới" size="md">
          <form onSubmit={handleCreateClass} className="space-y-4">
            <Input
              label="Mã lớp"
              type="text"
              placeholder="Ví dụ: IT001"
              value={newClass.classCode}
              onChange={(e) => setNewClass({ ...newClass, classCode: e.target.value })}
              required
            />
            <Input
              label="Tên lớp"
              type="text"
              placeholder="Ví dụ: Nhập môn Công nghệ thông tin"
              value={newClass.className}
              onChange={(e) => setNewClass({ ...newClass, className: e.target.value })}
              required
            />
            <Input
              label="Mô tả"
              type="text"
              placeholder="Mô tả về lớp học (tùy chọn)"
              value={newClass.description}
              onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
            />
            <Input
              label="Lịch học"
              type="text"
              placeholder="Ví dụ: Thứ 2, 7h30-9h30 (tùy chọn)"
              value={newClass.schedule}
              onChange={(e) => setNewClass({ ...newClass, schedule: e.target.value })}
            />
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateClassModal(false)} fullWidth>Hủy</Button>
              <Button type="submit" variant="primary" fullWidth>Tạo lớp</Button>
            </div>
          </form>
        </Modal>
      </div>
    </TeacherLayout>
  );
};

export default TeacherClasses;
