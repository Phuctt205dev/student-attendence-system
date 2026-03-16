import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { resetPassword } from '../../services/auth.service';
import { isValidEmail } from '../../utils/validators';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (error) {
      setError('');
    }
  };

  const validateForm = () => {
    if (!email.trim()) {
      setError('Email là bắt buộc');
      return false;
    }
    if (!isValidEmail(email)) {
      setError('Email không hợp lệ');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      console.log('Sending password reset email to:', email);
      const result = await resetPassword(email);
      console.log('Reset password result:', result);

      if (result.success) {
        setSuccess(true);
      } else {
        // Handle specific Firebase errors
        let errorMessage = 'Không thể gửi email đặt lại mật khẩu';

        if (result.error?.includes('user-not-found')) {
          errorMessage = 'Email này chưa được đăng ký trong hệ thống';
        } else if (result.error?.includes('invalid-email')) {
          errorMessage = 'Email không hợp lệ';
        } else if (result.error?.includes('too-many-requests')) {
          errorMessage = 'Quá nhiều yêu cầu. Vui lòng thử lại sau';
        } else if (result.error) {
          errorMessage = result.error;
        }

        setError(errorMessage);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Có lỗi xảy ra: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md" padding="lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <KeyRound className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quên mật khẩu?
          </h1>
          <p className="text-gray-600">
            Nhập email của bạn để nhận liên kết đặt lại mật khẩu
          </p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium mb-2">
                ✅ Email đã được gửi thành công!
              </p>
              <p className="text-sm text-green-700 mb-2">
                Vui lòng kiểm tra hộp thư của bạn và làm theo hướng dẫn để đặt lại mật khẩu.
              </p>
              <p className="text-xs text-green-600">
                💡 Lưu ý: Nếu không thấy email, vui lòng kiểm tra thư mục <strong>Spam/Junk</strong>
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                name="email"
                value={email}
                onChange={handleChange}
                placeholder="email@example.com"
                icon={<Mail className="w-5 h-5" />}
                error={error}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={loading}
              >
                Gửi email đặt lại mật khẩu
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại đăng nhập
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default ForgotPassword;
