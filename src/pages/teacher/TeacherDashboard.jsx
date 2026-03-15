import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../services/auth.service';
import {
  createClass,
  getClassesByTeacher,
  enrollStudentByEmail,
  getClassStudents,
  removeStudent
} from '../../services/class.service';
import {
  LogOut,
  BookOpen,
  Users,
  ClipboardCheck,
  Plus,
  UserPlus,
  Trash2,
  Eye
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';

const TeacherDashboard = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  // State
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showClassDetailModal, setShowClassDetailModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create class form
  const [newClass, setNewClass] = useState({
    classCode: '',
    className: '',
    description: '',
    schedule: ''
  });

  // Add student form
  const [studentEmail, setStudentEmail] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);

  // Load classes on mount
  useEffect(() => {
    loadClasses();
  }, [userProfile]);

  const loadClasses = async () => {
    if (!userProfile?.uid) return;

    setLoading(true);
    const result = await getClassesByTeacher(userProfile.uid);

    if (result.success) {
      setClasses(result.classes);
    } else {
      setError('Không thể tải danh sách lớp');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newClass.classCode || !newClass.className) {
      setError('Vui lòng điền đầy đủ mã lớp và tên lớp');
      return;
    }

    const classData = {
      ...newClass,
      teacherId: userProfile.uid,
      teacherName: userProfile.fullName
    };

    const result = await createClass(classData);

    if (result.success) {
      setSuccess('Tạo lớp thành công!');
      setShowCreateModal(false);
      setNewClass({
        classCode: '',
        className: '',
        description: '',
        schedule: ''
      });
      loadClasses();
    } else {
      setError(result.error || 'Không thể tạo lớp');
    }
  };

  const handleOpenClassDetail = async (classItem) => {
    setSelectedClass(classItem);
    setShowClassDetailModal(true);

    // Load students
    const result = await getClassStudents(classItem.id);
    if (result.success) {
      setClassStudents(result.students);
    }
  };

  const handleOpenAddStudent = (classItem) => {
    setSelectedClass(classItem);
    setShowAddStudentModal(true);
    setStudentEmail('');
    setError('');
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setAddingStudent(true);

    if (!studentEmail.trim()) {
      setError('Vui lòng nhập email sinh viên');
      setAddingStudent(false);
      return;
    }

    const result = await enrollStudentByEmail(selectedClass.id, studentEmail);

    if (result.success) {
      setSuccess('Thêm sinh viên thành công!');
      setStudentEmail('');
      setShowAddStudentModal(false);
      loadClasses();

      // Reload students if detail modal is open
      if (showClassDetailModal) {
        const studentsResult = await getClassStudents(selectedClass.id);
        if (studentsResult.success) {
          setClassStudents(studentsResult.students);
        }
      }
    } else {
      setError(result.error || 'Không thể thêm sinh viên');
    }
    setAddingStudent(false);
  };

  const handleRemoveStudent = async (studentId) => {
    if (!confirm('Bạn có chắc muốn xóa sinh viên này khỏi lớp?')) {
      return;
    }

    const result = await removeStudent(selectedClass.id, studentId);

    if (result.success) {
      setSuccess('Xóa sinh viên thành công!');

      // Reload students
      const studentsResult = await getClassStudents(selectedClass.id);
      if (studentsResult.success) {
        setClassStudents(studentsResult.students);
      }
      loadClasses();
    } else {
      setError(result.error || 'Không thể xóa sinh viên');
    }
  };

  const totalStudents = classes.reduce((sum, cls) => sum + (cls.students?.length || 0), 0);

  const stats = [
    { title: 'Lớp phụ trách', value: classes.length.toString(), icon: BookOpen, color: 'bg-blue-500' },
    { title: 'Tổng sinh viên', value: totalStudents.toString(), icon: Users, color: 'bg-green-500' },
    { title: 'Buổi điểm danh', value: '0', icon: ClipboardCheck, color: 'bg-purple-500' }
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
        {/* Notifications */}
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

        {/* Classes Section */}
        <Card title="Lớp học của tôi" className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-600">Các lớp học bạn đang phụ trách</p>
            <Button
              variant="primary"
              icon={<Plus className="w-5 h-5" />}
              onClick={() => setShowCreateModal(true)}
            >
              Tạo lớp mới
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Chưa có lớp nào. Tạo lớp đầu tiên của bạn!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map((classItem) => (
                <div
                  key={classItem.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {classItem.classCode}
                      </h3>
                      <p className="text-gray-600">{classItem.className}</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {classItem.students?.length || 0} SV
                    </span>
                  </div>

                  {classItem.description && (
                    <p className="text-sm text-gray-500 mb-3">{classItem.description}</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Eye className="w-4 h-4" />}
                      onClick={() => handleOpenClassDetail(classItem)}
                      fullWidth
                    >
                      Chi tiết
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<UserPlus className="w-4 h-4" />}
                      onClick={() => handleOpenAddStudent(classItem)}
                      fullWidth
                    >
                      Thêm SV
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>

      {/* Create Class Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Tạo lớp mới"
        size="md"
      >
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              fullWidth
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" fullWidth>
              Tạo lớp
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Student Modal */}
      <Modal
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        title="Thêm sinh viên vào lớp"
        size="md"
      >
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Lớp: <span className="font-semibold">{selectedClass?.classCode} - {selectedClass?.className}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleAddStudent} className="space-y-4">
          <Input
            label="Email sinh viên"
            type="email"
            placeholder="student@example.com"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            required
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddStudentModal(false)}
              fullWidth
              disabled={addingStudent}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={addingStudent}
              disabled={addingStudent}
            >
              Thêm sinh viên
            </Button>
          </div>
        </form>
      </Modal>

      {/* Class Detail Modal */}
      <Modal
        isOpen={showClassDetailModal}
        onClose={() => setShowClassDetailModal(false)}
        title="Chi tiết lớp học"
        size="lg"
      >
        {selectedClass && (
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedClass.classCode} - {selectedClass.className}
              </h3>
              {selectedClass.description && (
                <p className="text-gray-600 mt-2">{selectedClass.description}</p>
              )}
              {selectedClass.schedule && (
                <p className="text-sm text-gray-500 mt-1">Lịch học: {selectedClass.schedule}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-900">
                  Danh sách sinh viên ({classStudents.length})
                </h4>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<UserPlus className="w-4 h-4" />}
                  onClick={() => {
                    setShowClassDetailModal(false);
                    handleOpenAddStudent(selectedClass);
                  }}
                >
                  Thêm SV
                </Button>
              </div>

              {classStudents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Chưa có sinh viên nào trong lớp</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {classStudents.map((student) => (
                    <div
                      key={student.uid}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{student.fullName}</p>
                        <p className="text-sm text-gray-600">{student.email}</p>
                        {student.studentId && (
                          <p className="text-xs text-gray-500">MSSV: {student.studentId}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Trash2 className="w-4 h-4" />}
                        onClick={() => handleRemoveStudent(student.uid)}
                      >
                        Xóa
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TeacherDashboard;
