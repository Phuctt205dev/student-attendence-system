// Email validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation (min 6 characters)
export const isValidPassword = (password) => {
  return password && password.length >= 6;
};

// Strong password validation (min 8 chars, with number and special char)
export const isStrongPassword = (password) => {
  const strongPasswordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
  return strongPasswordRegex.test(password);
};

// Student ID validation (e.g., 2024001, 23521225 - 7 to 10 digit number)
export const isValidStudentId = (studentId) => {
  const studentIdRegex = /^\d{7,10}$/;
  return studentIdRegex.test(studentId);
};

// Class code validation (e.g., IT001, NT208 - 2-3 letters followed by 3 digits)
export const isValidClassCode = (classCode) => {
  const classCodeRegex = /^[A-Z]{2,3}\d{3}$/i;
  return classCodeRegex.test(classCode);
};

// Phone number validation (Vietnamese format)
export const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Name validation (no numbers or special characters)
export const isValidName = (name) => {
  const nameRegex = /^[a-zA-ZÀ-ỹ\s]+$/;
  return nameRegex.test(name);
};

// Required field validation
export const isRequired = (value) => {
  return value !== null && value !== undefined && value.toString().trim() !== '';
};

// Time format validation (HH:MM)
export const isValidTimeFormat = (time) => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
};

// Role validation
export const isValidRole = (role) => {
  const validRoles = ['student', 'teacher', 'admin'];
  return validRoles.includes(role);
};

// Attendance status validation
export const isValidAttendanceStatus = (status) => {
  const validStatuses = ['present', 'absent', 'late'];
  return validStatuses.includes(status);
};

// URL validation
export const isValidURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Get validation error messages
export const getValidationError = (field, value, rules = {}) => {
  if (rules.required && !isRequired(value)) {
    return `${field} là bắt buộc`;
  }

  if (rules.email && !isValidEmail(value)) {
    return 'Email không hợp lệ';
  }

  if (rules.password && !isValidPassword(value)) {
    return 'Mật khẩu phải có ít nhất 6 ký tự';
  }

  if (rules.strongPassword && !isStrongPassword(value)) {
    return 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm số và ký tự đặc biệt';
  }

  if (rules.studentId && !isValidStudentId(value)) {
    return 'Mã sinh viên phải có từ 7-10 chữ số';
  }

  if (rules.classCode && !isValidClassCode(value)) {
    return 'Mã lớp không hợp lệ (ví dụ: IT001, NT208)';
  }

  if (rules.phone && !isValidPhoneNumber(value)) {
    return 'Số điện thoại không hợp lệ';
  }

  if (rules.name && !isValidName(value)) {
    return 'Tên không được chứa số hoặc ký tự đặc biệt';
  }

  if (rules.minLength && value.length < rules.minLength) {
    return `${field} phải có ít nhất ${rules.minLength} ký tự`;
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    return `${field} không được vượt quá ${rules.maxLength} ký tự`;
  }

  return null;
};

// Validate form data
export const validateForm = (formData, validationRules) => {
  const errors = {};

  Object.keys(validationRules).forEach(field => {
    const error = getValidationError(field, formData[field], validationRules[field]);
    if (error) {
      errors[field] = error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
