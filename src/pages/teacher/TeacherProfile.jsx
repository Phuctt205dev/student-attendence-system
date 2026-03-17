import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import TeacherLayout from '../../layouts/TeacherLayout';
import { Card, Button } from '../../components/common';
import ChangeEmailModal from '../../components/teacher/ChangeEmailModal';
import {
  User,
  Mail,
  Building,
  Award,
  Calendar,
  Shield
} from 'lucide-react';

const TeacherProfile = () => {
  const { userProfile } = useAuth();
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const profileFields = [
    {
      icon: User,
      label: 'Họ và tên',
      value: userProfile?.fullName || 'N/A',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: Mail,
      label: 'Email',
      value: userProfile?.email || 'N/A',
      color: 'bg-green-100 text-green-600',
      editable: true
    },
    {
      icon: Building,
      label: 'Khoa',
      value: userProfile?.department || 'Chưa cập nhật',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: Award,
      label: 'Chức danh',
      value: userProfile?.title || 'Chưa cập nhật',
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      icon: Shield,
      label: 'Vai trò',
      value: userProfile?.role === 'teacher' ? 'Giảng viên' : userProfile?.role || 'N/A',
      color: 'bg-red-100 text-red-600'
    },
    {
      icon: Calendar,
      label: 'Ngày tạo tài khoản',
      value: formatDate(userProfile?.createdAt),
      color: 'bg-gray-100 text-gray-600'
    }
  ];

  return (
    <TeacherLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
            <p className="text-gray-600 mt-1">Quản lý thông tin tài khoản của bạn</p>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Avatar Card */}
            <Card className="lg:col-span-1">
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                  <User className="w-16 h-16 text-primary-600" />
                </div>

                {/* Name & Role */}
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {userProfile?.fullName}
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  {userProfile?.title || 'Giảng viên'}
                </p>

                {/* Department Badge */}
                {userProfile?.department && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    <Building className="w-4 h-4" />
                    {userProfile.department}
                  </div>
                )}
              </div>
            </Card>

            {/* Profile Information Card */}
            <Card className="lg:col-span-2">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Thông tin tài khoản
                </h3>
                <p className="text-sm text-gray-600">
                  Quản lý thông tin cá nhân và cài đặt bảo mật
                </p>
              </div>

              {/* Profile Fields */}
              <div className="space-y-4">
                {profileFields.map((field, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-3 rounded-lg ${field.color}`}>
                        <field.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 mb-1">
                          {field.label}
                        </p>
                        <p className="text-base font-semibold text-gray-900">
                          {field.value}
                        </p>
                      </div>
                    </div>

                    {/* Edit button for email field */}
                    {field.editable && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEmailModal(true)}
                      >
                        Thay đổi
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Last Updated */}
              {userProfile?.updatedAt && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Cập nhật lần cuối: {formatDate(userProfile.updatedAt)}
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Security Settings Card */}
          <Card className="mt-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Cài đặt bảo mật
            </h3>

            <div className="space-y-4">
              {/* Email Management */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Mail className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Email đăng nhập</h4>
                    <p className="text-sm text-gray-600">
                      Thay đổi địa chỉ email dùng để đăng nhập
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowEmailModal(true)}
                  icon={<Mail className="w-4 h-4" />}
                >
                  Thay đổi Email
                </Button>
              </div>

              {/* Password Note */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Lưu ý:</strong> Để thay đổi mật khẩu, vui lòng sử dụng chức năng "Quên mật khẩu" tại trang đăng nhập.
                </p>
              </div>
            </div>
          </Card>
        </main>
      </div>

      {/* Change Email Modal */}
      <ChangeEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        currentEmail={userProfile?.email || ''}
      />
    </TeacherLayout>
  );
};

export default TeacherProfile;
