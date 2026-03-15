import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, UserPlus, IdCard, Building } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { registerUser } from '../../services/auth.service';
import { isValidEmail, isValidPassword, isValidStudentId } from '../../utils/validators';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    studentId: '',
    department: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setGeneralError('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Họ tên là bắt buộc';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (!isValidPassword(formData.password)) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (formData.role === 'student' && formData.studentId && !isValidStudentId(formData.studentId)) {
      newErrors.studentId = 'Mã sinh viên phải có 7 chữ số';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const additionalData = {};
      if (formData.role === 'student') {
        additionalData.studentId = formData.studentId;
        additionalData.department = formData.department;
      } else if (formData.role === 'teacher') {
        additionalData.department = formData.department;
      }

      const result = await registerUser(
        formData.email,
        formData.password,
        formData.fullName,
        formData.role,
        additionalData
      );

      if (result.success) {
        // Redirect to login page
        navigate('/login', {
          state: { message: 'Đăng ký thành công! Vui lòng đăng nhập.' }
        });
      } else {
        setGeneralError(result.error || 'Đăng ký thất bại');
      }
    } catch (error) {
      setGeneralError('Có lỗi xảy ra. Vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl" padding="lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Đăng ký tài khoản
          </h1>
          <p className="text-gray-600">
            Tạo tài khoản mới để sử dụng hệ thống
          </p>
        </div>

        {generalError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{generalError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vai trò <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'student', label: 'Sinh viên' },
                { value: 'teacher', label: 'Giảng viên' },
                { value: 'admin', label: 'Admin' }
              ].map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: role.value }))}
                  className={`
                    px-4 py-3 rounded-lg border-2 transition-all duration-200
                    ${formData.role === role.value
                      ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    }
                  `}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Họ và tên"
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
              icon={<User className="w-5 h-5" />}
              error={errors.fullName}
              required
            />

            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
              icon={<Mail className="w-5 h-5" />}
              error={errors.email}
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Mật khẩu"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              icon={<Lock className="w-5 h-5" />}
              error={errors.password}
              helperText="Tối thiểu 6 ký tự"
              required
            />

            <Input
              label="Xác nhận mật khẩu"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              icon={<Lock className="w-5 h-5" />}
              error={errors.confirmPassword}
              required
            />
          </div>

          {formData.role === 'student' && (
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Mã sinh viên"
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="2024001"
                icon={<IdCard className="w-5 h-5" />}
                error={errors.studentId}
                helperText="7 chữ số"
              />

              <Input
                label="Khoa"
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Công nghệ thông tin"
                icon={<Building className="w-5 h-5" />}
              />
            </div>
          )}

          {(formData.role === 'teacher' || formData.role === 'admin') && (
            <Input
              label="Khoa"
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="Công nghệ thông tin"
              icon={<Building className="w-5 h-5" />}
            />
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={loading}
          >
            Đăng ký
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Đã có tài khoản?{' '}
            <Link
              to="/login"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Register;
