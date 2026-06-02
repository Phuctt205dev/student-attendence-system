import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Trash2, User, Mail, GraduationCap, Award } from 'lucide-react';
import { getAllUsers, searchUsers, deleteUserProfile } from '../../services/auth.service';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsersHandler();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await getAllUsers();
      if (result.success) {
        setUsers(result.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsersHandler = async () => {
    try {
      const result = await searchUsers(searchTerm);
      if (result.success) {
        setUsers(result.users);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      return;
    }

    try {
      setDeleting(userId);
      const result = await deleteUserProfile(userId);
      if (result.success) {
        setUsers(users.filter(user => user.uid !== userId));
      } else {
        alert('Lỗi xóa người dùng: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Lỗi xóa người dùng');
    } finally {
      setDeleting(null);
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { color: 'bg-red-100 text-red-700', label: 'Admin' },
      teacher: { color: 'bg-blue-100 text-blue-700', label: 'Giảng viên' },
      student: { color: 'bg-green-100 text-green-700', label: 'Sinh viên' }
    };

    const config = roleConfig[role] || { color: 'bg-gray-100 text-gray-700', label: role };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Award className="w-5 h-5 text-red-500" />;
      case 'teacher':
        return <GraduationCap className="w-5 h-5 text-blue-500" />;
      case 'student':
        return <User className="w-5 h-5 text-green-500" />;
      default:
        return <User className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/admin')}
              icon={<ArrowLeft className="w-5 h-5" />}
            >
              Quay lại
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
              <p className="text-gray-600">Tất cả tài khoản trong hệ thống</p>
            </div>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Input
          placeholder="Tìm kiếm theo tên, email, hoặc mã sinh viên..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<Search className="w-5 h-5 text-gray-400" />}
          fullWidth
        />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <Card
                key={user.uid}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  if (user.role === 'student') {
                    navigate(`/admin/users/${user.uid}`);
                  }
                }}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        {getRoleIcon(user.role)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {user.fullName}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteUser(user.uid);
                      }}
                      icon={<Trash2 className="w-4 h-4 text-red-500" />}
                      loading={deleting === user.uid}
                    />
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      {getRoleBadge(user.role)}
                      {user.role === 'student' && user.studentId && (
                        <span className="text-sm text-gray-600">
                          Mã SV: {user.studentId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Không tìm thấy người dùng nào</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminUsers;
