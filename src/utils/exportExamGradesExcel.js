import * as XLSX from 'xlsx-js-style';
import {
  formatScale10,
  getAttemptExamCodeLabel,
  getAttemptScoreBreakdown,
  getPassingScale10
} from './examScoring';

const borderStyle = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } }
};

const baseFont = { name: 'Times New Roman', sz: 11 };

const styles = {
  title: {
    alignment: { horizontal: 'left', vertical: 'center' },
    font: { ...baseFont, bold: true, sz: 12 },
    border: borderStyle
  },
  header: {
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    font: { ...baseFont, bold: true },
    fill: { fgColor: { rgb: 'D9D9D9' } },
    border: borderStyle
  },
  center: {
    alignment: { horizontal: 'center', vertical: 'center' },
    font: baseFont,
    border: borderStyle
  },
  left: {
    alignment: { horizontal: 'left', vertical: 'center' },
    font: baseFont,
    border: borderStyle
  }
};

const sanitizeFilename = (value) =>
  String(value || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80);

export const sortStudentsByStudentId = (students) => {
  return [...students].sort((a, b) => {
    const idA = String(a.studentId || '').trim();
    const idB = String(b.studentId || '').trim();
    const numA = parseInt(idA, 10);
    const numB = parseInt(idB, 10);
    if (!Number.isNaN(numA) && !Number.isNaN(numB) && idA === String(numA) && idB === String(numB)) {
      return numA - numB;
    }
    return idA.localeCompare(idB, 'vi', { numeric: true, sensitivity: 'base' });
  });
};

const getStatusText = (attempt, breakdown) => {
  if (!attempt) return 'Chưa làm';
  if (attempt.status === 'in-progress') return 'Đang làm';
  if (breakdown.essayPending) return 'Đã nộp — chờ chấm tự luận';
  if (breakdown.isSubmitted) return 'Đã nộp';
  return 'Chưa làm';
};

const buildGradeCells = (attempt, exam) => {
  const breakdown = getAttemptScoreBreakdown(attempt, exam);

  if (!breakdown.isSubmitted) {
    return {
      status: getStatusText(attempt, breakdown),
      mcq: '—',
      essay: '—',
      total: '—',
      scale10: '—',
      examCode: getAttemptExamCodeLabel(attempt),
      note: ''
    };
  }

  const mcq =
    breakdown.mcqTotal > 0 ? `${breakdown.mcqScore}/${breakdown.mcqTotal}` : '—';

  let essay = '—';
  if (breakdown.essayTotal > 0) {
    essay = breakdown.essayPending
      ? 'Chờ chấm'
      : `${breakdown.essayScore ?? 0}/${breakdown.essayTotal}`;
  }

  let scale10 = '—';
  let note = '';
  if (breakdown.essayPending && breakdown.essayTotal > 0) {
    const partial = formatScale10(breakdown.mcqScore, breakdown.totalRaw);
    scale10 = partial !== '—' ? `${partial}/10` : '—';
    note = 'Tạm thời (chưa tính tự luận)';
  } else if (breakdown.scale10 !== null) {
    scale10 = breakdown.scale10.toFixed(1);
  }

  const total =
    breakdown.totalRaw > 0 ? `${breakdown.earned}/${breakdown.totalRaw}` : '—';

  return {
    status: getStatusText(attempt, breakdown),
    mcq,
    essay,
    total,
    scale10,
    examCode: getAttemptExamCodeLabel(attempt),
    note
  };
};

const applySheetStyles = (ws, headerRowIndex, dataRowCount) => {
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; R += 1) {
    for (let C = range.s.c; C <= range.e.c; C += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) continue;

      if (R < headerRowIndex) {
        ws[cellAddress].s = styles.title;
      } else if (R === headerRowIndex) {
        ws[cellAddress].s = styles.header;
      } else if (R <= headerRowIndex + dataRowCount) {
        ws[cellAddress].s = C === 2 ? styles.left : styles.center;
      }
    }
  }
};

/**
 * Xuất bảng điểm bài thi ra file .xlsx
 */
export const exportExamGradesToExcel = ({
  exam,
  classInfo,
  students,
  attemptMap
}) => {
  if (!exam) {
    return { success: false, error: 'Không có dữ liệu bài thi' };
  }

  const sorted = sortStudentsByStudentId(students || []);
  if (sorted.length === 0) {
    return { success: false, error: 'Lớp chưa có sinh viên' };
  }

  const passingScale10 = getPassingScale10(exam);
  const classLabel = classInfo
    ? `${classInfo.classCode || ''} - ${classInfo.className || ''}`.trim()
    : '—';

  const rows = [];
  rows.push([`Lớp: ${classLabel}`, '', '', '', '', '', '', '']);
  rows.push([`Bài thi: ${exam.title}`, '', '', '', '', '', '', '']);
  rows.push([
    `Số câu: ${exam.totalQuestions ?? '—'} | Thời lượng: ${exam.durationMinutes ?? '—'} phút | Điểm đạt: ${passingScale10 !== null ? `${passingScale10.toFixed(1)}/10` : '—'} | Tổng điểm: ${exam.totalPoints ?? '—'}`,
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ]);
  rows.push([]);

  const headerRowIndex = rows.length;
  rows.push([
    'STT',
    'MSSV',
    'Họ và tên',
    'Trạng thái',
    'Điểm trắc nghiệm',
    'Điểm tự luận',
    'Tổng điểm',
    'Điểm (thang 10)',
    'Mã đề',
    'Ghi chú'
  ]);

  sorted.forEach((student, index) => {
    const attempt = attemptMap?.[student.uid];
    const cells = buildGradeCells(attempt, exam);
    rows.push([
      index + 1,
      student.studentId || '',
      student.fullName || '',
      cells.status,
      cells.mcq,
      cells.essay,
      cells.total,
      cells.scale10,
      cells.examCode,
      cells.note
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 28 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 22 }
  ];

  applySheetStyles(ws, headerRowIndex, sorted.length);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bảng điểm');

  const className = sanitizeFilename(
    classInfo?.className || classInfo?.classCode || 'Lop'
  );
  const examTitle = sanitizeFilename(exam.title || 'BaiThi');
  const filename = `${className}_${examTitle}.xlsx`;

  XLSX.writeFile(wb, filename, { cellStyles: true });

  return { success: true, filename };
};
