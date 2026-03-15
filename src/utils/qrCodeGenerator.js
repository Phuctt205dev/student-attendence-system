import { Timestamp } from 'firebase/firestore';

// Generate QR code data for attendance
export const generateQRCodeData = (attendanceId, classId, expiryMinutes = 10) => {
  const timestamp = Date.now();
  const expiry = timestamp + expiryMinutes * 60 * 1000;

  const qrData = {
    attendanceId,
    classId,
    timestamp,
    expiry,
    signature: generateSignature(attendanceId, timestamp)
  };

  return JSON.stringify(qrData);
};

// Generate simple signature (in production, use proper cryptographic signing)
const generateSignature = (attendanceId, timestamp) => {
  // Simple hash - in production, you should use HMAC or JWT
  const data = `${attendanceId}-${timestamp}-${import.meta.env.VITE_FIREBASE_PROJECT_ID}`;
  return btoa(data);
};

// Validate QR code signature
export const validateQRCodeSignature = (qrData) => {
  try {
    const data = JSON.parse(qrData);
    const expectedSignature = generateSignature(data.attendanceId, data.timestamp);

    return expectedSignature === data.signature;
  } catch (error) {
    console.error('Error validating signature:', error);
    return false;
  }
};

// Check if QR code is expired
export const isQRCodeExpired = (qrData) => {
  try {
    const data = JSON.parse(qrData);
    const now = Date.now();

    return now > data.expiry;
  } catch (error) {
    console.error('Error checking QR expiry:', error);
    return true;
  }
};

// Get QR code expiry time
export const getQRCodeExpiryTime = (qrData) => {
  try {
    const data = JSON.parse(qrData);
    return new Date(data.expiry);
  } catch (error) {
    console.error('Error getting QR expiry time:', error);
    return null;
  }
};

// Get time remaining for QR code (in seconds)
export const getQRCodeTimeRemaining = (qrData) => {
  try {
    const data = JSON.parse(qrData);
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((data.expiry - now) / 1000));

    return {
      seconds: remaining % 60,
      minutes: Math.floor(remaining / 60)
    };
  } catch (error) {
    console.error('Error getting time remaining:', error);
    return { minutes: 0, seconds: 0 };
  }
};

// Format time remaining as string
export const formatTimeRemaining = (qrData) => {
  const { minutes, seconds } = getQRCodeTimeRemaining(qrData);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Parse QR code data
export const parseQRCodeData = (qrDataString) => {
  try {
    const data = JSON.parse(qrDataString);

    if (!data.attendanceId || !data.classId || !data.timestamp || !data.expiry) {
      throw new Error('Invalid QR code format');
    }

    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error parsing QR code:', error);
    return {
      success: false,
      error: 'Invalid QR code'
    };
  }
};
