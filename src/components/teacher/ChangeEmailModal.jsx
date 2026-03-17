import { useState } from 'react';
import { Modal, Button, Input } from '../common';
import { Mail, Lock, AlertCircle, Send, CheckCircle } from 'lucide-react';
import { sendEmailChangeVerification } from '../../services/auth.service';

const ChangeEmailModal = ({ isOpen, onClose, currentEmail }) => {
  const [formData, setFormData] = useState({
    newEmail: '',
    confirmEmail: '',
    currentPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Reset form when modal closes
  const handleClose = () => {
    setFormData({ newEmail: '', confirmEmail: '', currentPassword: '' });
    setErrors({});
    setSuccess(false);
    setPendingEmail('');
    setErrorMessage('');
    onClose();
  };

  // Validate email format
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.newEmail.trim()) {
      newErrors.newEmail = 'Vui lòng nhập email mới';
    } else if (!validateEmail(formData.newEmail)) {
      newErrors.newEmail = 'Định dạng email không hợp lệ';
    } else if (formData.newEmail === currentEmail) {
      newErrors.newEmail = 'Email mới phải khác email hiện tại';
    }

    if (!formData.confirmEmail.trim()) {
      newErrors.confirmEmail = 'Vui lòng xác nhận email';
    } else if (formData.newEmail !== formData.confirmEmail) {
      newErrors.confirmEmail = 'Email xác nhận không khớp';
    }

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    } else if (formData.currentPassword.length < 6) {
      newErrors.currentPassword = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      // Send email verification (does NOT update email immediately)
      const result = await sendEmailChangeVerification(formData.newEmail, formData.currentPassword);

      if (result.success) {
        setSuccess(true);
        setPendingEmail(result.pendingEmail);
        // Do NOT auto-close - let user read the instructions
      } else {
        setErrorMessage(result.error);
      }
    } catch (error) {
      setErrorMessage('Đã xảy ra lỗi không mong muốn');
    } finally {
      setLoading(false);
    }
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setErrorMessage('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Thay đổi Email"
      size="md"
      closeOnOverlayClick={!loading}
    >
      {success ? (
        // SUCCESS STATE: Email verification sent
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Send className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Email xác thực đã được gửi!
          </h3>
          <p className="text-gray-600 mb-4">
            Chúng tôi đã gửi email xác thực đến:
          </p>
          <p className="text-lg font-semibold text-blue-600 mb-6">
            {pendingEmail}
          </p>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left mb-6">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Các bước tiếp theo:
            </h4>
            <ol className="text-sm text-blue-800 space-y-2 ml-7 list-decimal">
              <li>Mở hộp thư đến của email mới ({pendingEmail})</li>
              <li>Tìm email từ Firebase Authentication</li>
              <li>Click vào link xác thực trong email</li>
              <li>Email của bạn sẽ được cập nhật tự động</li>
              <li>Sử dụng email mới để đăng nhập lần sau</li>
            </ol>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Lưu ý:</strong> Link xác thực sẽ hết hạn sau 3 ngày. Nếu không nhận được email,
              hãy kiểm tra thư mục spam hoặc thử lại.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={handleClose}
            className="w-full"
          >
            Đã hiểu
          </Button>
        </div>
      ) : (
        // FORM STATE
        <form onSubmit={handleSubmit}>
          {/* Current Email Display */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email hiện tại
            </label>
            <p className="text-gray-900 font-medium">{currentEmail}</p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          )}

          {/* New Email Input */}
          <Input
            label="Email mới"
            type="email"
            name="newEmail"
            placeholder="newteacher@example.com"
            value={formData.newEmail}
            onChange={handleChange}
            error={errors.newEmail}
            disabled={loading}
            required
            icon={<Mail className="w-5 h-5" />}
            containerClassName="mb-4"
          />

          {/* Confirm Email Input */}
          <Input
            label="Xác nhận email mới"
            type="email"
            name="confirmEmail"
            placeholder="Nhập lại email mới"
            value={formData.confirmEmail}
            onChange={handleChange}
            error={errors.confirmEmail}
            disabled={loading}
            required
            icon={<Mail className="w-5 h-5" />}
            containerClassName="mb-4"
          />

          {/* Current Password Input */}
          <Input
            label="Mật khẩu hiện tại"
            type="password"
            name="currentPassword"
            placeholder="Nhập mật khẩu để xác thực"
            value={formData.currentPassword}
            onChange={handleChange}
            error={errors.currentPassword}
            disabled={loading}
            required
            icon={<Lock className="w-5 h-5" />}
            helperText="Vui lòng nhập mật khẩu hiện tại để xác minh danh tính"
            containerClassName="mb-6"
          />

          {/* Security Notice */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Quy trình xác thực:</strong> Chúng tôi sẽ gửi email xác thực đến địa chỉ email mới.
              Email của bạn sẽ được cập nhật sau khi bạn click vào link xác thực.
            </p>
          </div>

          {/* Modal Footer with Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading}
              icon={<Send className="w-4 h-4" />}
            >
              {loading ? 'Đang gửi...' : 'Gửi email xác thực'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ChangeEmailModal;
