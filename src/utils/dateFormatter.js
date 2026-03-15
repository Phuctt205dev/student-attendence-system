import { format, formatDistance, formatRelative, isToday, isYesterday, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

// Format date to Vietnamese format
export const formatDate = (date, formatString = 'dd/MM/yyyy') => {
  if (!date) return '';

  try {
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return format(dateObj, formatString, { locale: vi });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

// Format date and time
export const formatDateTime = (date) => {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
};

// Format time only
export const formatTime = (date) => {
  return formatDate(date, 'HH:mm');
};

// Format relative time (e.g., "2 giờ trước")
export const formatRelativeTime = (date) => {
  if (!date) return '';

  try {
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return formatDistance(dateObj, new Date(), {
      addSuffix: true,
      locale: vi
    });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '';
  }
};

// Format date with context (e.g., "Hôm nay lúc 14:30", "Hôm qua lúc 09:00")
export const formatContextualDate = (date) => {
  if (!date) return '';

  try {
    const dateObj = date.toDate ? date.toDate() : new Date(date);

    if (isToday(dateObj)) {
      return `Hôm nay lúc ${format(dateObj, 'HH:mm')}`;
    } else if (isYesterday(dateObj)) {
      return `Hôm qua lúc ${format(dateObj, 'HH:mm')}`;
    } else {
      return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: vi });
    }
  } catch (error) {
    console.error('Error formatting contextual date:', error);
    return '';
  }
};

// Get day of week in Vietnamese
export const getDayOfWeek = (date) => {
  if (!date) return '';

  try {
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return format(dateObj, 'EEEE', { locale: vi });
  } catch (error) {
    console.error('Error getting day of week:', error);
    return '';
  }
};

// Convert day number to Vietnamese day name
export const dayNumberToVietnamese = (dayNumber) => {
  const days = {
    1: 'Chủ nhật',
    2: 'Thứ hai',
    3: 'Thứ ba',
    4: 'Thứ tư',
    5: 'Thứ năm',
    6: 'Thứ sáu',
    7: 'Thứ bảy'
  };

  return days[dayNumber] || '';
};

// Check if date is in the past
export const isPastDate = (date) => {
  if (!date) return false;

  try {
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj < new Date();
  } catch (error) {
    return false;
  }
};

// Get current semester
export const getCurrentSemester = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // HK1: August to December
  // HK2: January to May
  // HK3/Summer: June to July

  if (month >= 8 && month <= 12) {
    return { semester: 'HK1', year: `${year}-${year + 1}` };
  } else if (month >= 1 && month <= 5) {
    return { semester: 'HK2', year: `${year - 1}-${year}` };
  } else {
    return { semester: 'HK3', year: `${year}-${year + 1}` };
  }
};
