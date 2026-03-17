import { useState } from 'react';
import { Modal, Button, Input } from '../common';
import { Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { changeEmailDirectly } from '../../services/auth.service';

const ChangeEmailModal = ({ isOpen, onClose, currentEmail }) => {
  const [formData, setFormData] = useState({
    newEmail: '',
    confirmEmail: '',
    currentPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [updatedEmail, setUpdatedEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleClose = () => {
    setFormData({ newEmail: '', confirmEmail: '', currentPassword: '' });
    setErrors({});
    setSuccess(false);
    setUpdatedEmail('');
    setErrorMessage('');
    onClose();
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrorMessage('');

    try {
      const result = await changeEmailDirectly(formData.newEmail, formData.currentPassword);

      if (result.success) {
        setUpdatedEmail(result.newEmail);
        setSuccess(true);
      } else {
        setErrorMessage(result.error);
      }
    } catch {
      setErrorMessage('Đã xảy ra lỗi không mong muốn');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
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
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Email đã được cập nhật!
          </h3>
          <p className="text-gray-600 mb-2">Email mới của bạn là:</p>
          <p className="text-lg font-semibold text-green-600 mb-6">{updatedEmail}</p>
          <p className="text-sm text-gray-500 mb-6">
            Vui lòng sử dụng email mới này để đăng nhập lần sau.
          </p>
          <Button variant="primary" onClick={handleClose} className="w-full">
            Đóng
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email hiện tại
            </label>
            <p className="text-gray-900 font-medium">{currentEmail}</p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          )}

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

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={loading} disabled={loading}>
              {loading ? 'Đang cập nhật...' : 'Cập nhật Email'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ChangeEmailModal;
