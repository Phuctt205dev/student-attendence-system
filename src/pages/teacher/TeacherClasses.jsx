import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import TeacherLayout from '../../layouts/TeacherLayout';
import {
  createClass,
  getClassesByTeacher,
  enrollStudentByEmail,
  getClassStudents,
  removeStudent,
  searchStudents,
  enrollStudent,
  batchEnrollStudents
} from '../../services/class.service';
import { createStudentAccount, batchCreateStudents } from '../../services/auth.service';
import * as XLSX from 'xlsx-js-style';
import {
  createAttendanceSession,
  getAttendancesByClass,
  deleteAttendanceSession,
  generateQRCode,
  getAttendanceDetails,
  batchUpdateManualAttendance,
  subscribeToAttendanceRecords
} from '../../services/attendance.service';
import {
  BookOpen,
  Users,
  ClipboardCheck,
  Plus,
  UserPlus,
  Trash2,
  Eye,
  QrCode,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import QRCode from 'qrcode';

const TeacherClasses = () => {
  const { userProfile } = useAuth();

  // ── Classes state ──────────────────────────────────────────────
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Modal visibility ───────────────────────────────────────────
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showClassDetailModal, setShowClassDetailModal] = useState(false);
  const [showCreateAttendanceModal, setShowCreateAttendanceModal] = useState(false);
  const [showManualAttendanceModal, setShowManualAttendanceModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [showSessionDetailModal, setShowSessionDetailModal] = useState(false);

  // ── Selected items ─────────────────────────────────────────────
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetailStudents, setSessionDetailStudents] = useState({ present: [], absent: [] });
  const [classStudents, setClassStudents] = useState([]);
  const [attendanceSessions, setAttendanceSessions] = useState([]);

  // ── Create class form ──────────────────────────────────────────
  const [newClass, setNewClass] = useState({
    classCode: '',
    className: '',
    description: '',
    schedule: ''
  });

  // ── Add student form ───────────────────────────────────────────
  const [studentEmail, setStudentEmail] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [addStudentMode, setAddStudentMode] = useState('existing'); // 'existing', 'new', or 'excel'
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [newStudentData, setNewStudentData] = useState({
    studentId: '',
    fullName: ''
  });

  // ── Excel upload state ─────────────────────────────────────────
  const [excelFile, setExcelFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [isDragOverExcel, setIsDragOverExcel] = useState(false);
  const [processingExcel, setProcessingExcel] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, currentStudent: '' });
  const [uploadResults, setUploadResults] = useState(null);

  // ── Create attendance session form ─────────────────────────────
  const [sessionName, setSessionName] = useState('');
  const [creatingAttendance, setCreatingAttendance] = useState(false);

  // ── Manual attendance state ────────────────────────────────────
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [savingManual, setSavingManual] = useState(false);
  const [realtimeRecords, setRealtimeRecords] = useState([]);

  // ── QR state ──────────────────────────────────────────────────
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [qrExpiryTime, setQrExpiryTime] = useState(null);
  const [qrCountdown, setQrCountdown] = useState(0);
  const [generatingQR, setGeneratingQR] = useState(false);

  // ── Overview state ────────────────────────────────────────────
  const [overviewData, setOverviewData] = useState({ students: [], sessions: [], records: {} });
  const [loadingOverview, setLoadingOverview] = useState(false);

  // ── Load classes ───────────────────────────────────────────────
  const loadClasses = async () => {
    if (!userProfile?.uid) return;
    setLoading(true);
    const result = await getClassesByTeacher(userProfile.uid);
    if (result.success) {
      setClasses(result.classes);
    } else {
      setError('Không thể tải danh sách lớp');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadClasses();
  }, [userProfile?.uid]);

  // ── QR countdown timer ─────────────────────────────────────────
  useEffect(() => {
    if (!qrExpiryTime) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((qrExpiryTime - Date.now()) / 1000));
      setQrCountdown(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [qrExpiryTime]);

  // ── Real-time attendance listener ──────────────────────────────
  useEffect(() => {
    if (!selectedSession?.id) return;

    const unsubscribe = subscribeToAttendanceRecords(selectedSession.id, (records) => {
      setRealtimeRecords(records);

      setAttendanceRecords(prev => {
        const updated = { ...prev };
        records.forEach(record => {
          updated[record.studentId] = {
            status: record.status === 'PRESENT' ? 'present' : 'absent',
            note: record.note || '',
            method: record.method,
            timestamp: record.timestamp
          };
        });
        return updated;
      });
    });

    return () => unsubscribe();
  }, [selectedSession?.id]);

  // ── Helpers ────────────────────────────────────────────────────
  const loadAttendanceSessions = async (classId) => {
    const result = await getAttendancesByClass(classId);
    if (result.success) setAttendanceSessions(result.attendances);
  };

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const sortStudentsByStudentId = (students) => {
    return [...students].sort((a, b) => {
      const idA = a.studentId || '';
      const idB = b.studentId || '';
      return idA.localeCompare(idB, 'vi', { numeric: true });
    });
  };

  // ── Handlers: class ────────────────────────────────────────────
  const handleCreateClass = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!newClass.classCode || !newClass.className) {
      setError('Vui lòng điền đầy đủ mã lớp và tên lớp');
      return;
    }
    const result = await createClass({
      ...newClass,
      teacherId: userProfile.uid,
      teacherName: userProfile.fullName
    });
    if (result.success) {
      setSuccess('Tạo lớp thành công!');
      setShowCreateClassModal(false);
      setNewClass({ classCode: '', className: '', description: '', schedule: '' });
      loadClasses();
    } else {
      setError(result.error || 'Không thể tạo lớp');
    }
  };

  const handleOpenClassDetail = async (classItem) => {
    setSelectedClass(classItem);
    setShowClassDetailModal(true);
    const studentsResult = await getClassStudents(classItem.id);
    if (studentsResult.success) setClassStudents(sortStudentsByStudentId(studentsResult.students));
    await loadAttendanceSessions(classItem.id);
  };

  // ── Handlers: students ─────────────────────────────────────────
  const handleOpenAddStudent = (classItem) => {
    setSelectedClass(classItem);
    setShowAddStudentModal(true);
    setStudentEmail('');
    setAddStudentMode('existing');
    setStudentSearchTerm('');
    setSearchResults([]);
    setSelectedStudent(null);
    setNewStudentData({ studentId: '', fullName: '' });
    // Reset Excel state
    setExcelFile(null);
    setExcelData([]);
    setIsDragOverExcel(false);
    setUploadResults(null);
    setUploadProgress({ current: 0, total: 0, currentStudent: '' });
    setError('');
  };

  const handleStudentSearch = async (searchTerm) => {
    setStudentSearchTerm(searchTerm);
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const result = await searchStudents(searchTerm);
    if (result.success) {
      // Filter out students already in the class
      const filteredStudents = result.students.filter(
        student => !classStudents.some(cs => cs.uid === student.uid)
      );
      setSearchResults(filteredStudents);
    }
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setStudentSearchTerm(`${student.studentId || ''} - ${student.fullName}`);
    setSearchResults([]);
  };

  const processExcelFile = (file) => {
    if (!file) return;

    // Validate file type
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(fileExtension)) {
      setError('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
      return;
    }

    setExcelFile(file);
    setError('');

    // Read and parse Excel file
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        // Parse data (assuming columns: B = studentId, C = fullName)
        // Skip first row if it's a header
        const students = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const studentId = row[1]?.toString().trim(); // Column B (index 1)
          const fullName = row[2]?.toString().trim();  // Column C (index 2)

          // Skip header row or invalid data
          if (studentId && fullName &&
              studentId !== 'MSSV' &&
              fullName !== 'Họ và Tên' &&
              fullName !== 'Họ và tên') {
            students.push({ studentId, fullName });
          }
        }

        if (students.length === 0) {
          setError('Không tìm thấy dữ liệu sinh viên trong file Excel. Vui lòng kiểm tra lại định dạng (cột B: MSSV, cột C: Họ tên)');
          setExcelData([]);
        } else {
          setExcelData(students);
          setError('');
        }
      } catch (error) {
        console.error('Error parsing Excel:', error);
        setError('Không thể đọc file Excel. Vui lòng kiểm tra lại file');
        setExcelData([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleExcelFileChange = (e) => {
    const file = e.target.files[0];
    processExcelFile(file);
  };

  const handleExcelDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOverExcel) setIsDragOverExcel(true);
  };

  const handleExcelDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverExcel(false);
  };

  const handleExcelDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverExcel(false);

    const file = e.dataTransfer?.files?.[0];
    processExcelFile(file);
  };

  const handleProcessExcel = async () => {
    if (excelData.length === 0) {
      setError('Không có dữ liệu để xử lý');
      return;
    }

    setProcessingExcel(true);
    setAddingStudent(true);
    setError('');
    setUploadResults(null);

    try {
      // Step 1: Batch create student accounts
      const createResults = await batchCreateStudents(excelData, (progress) => {
        setUploadProgress(progress);
      });

      // Step 2: Collect all students (both newly created and already existing)
      const allStudents = [
        ...createResults.success.map(item => item.student),
        ...createResults.alreadyExists.map(item => item.student)
      ];

      // Step 3: Batch enroll students to class
      const enrollResults = await batchEnrollStudents(selectedClass.id, allStudents);

      // Combine results
      const finalResults = {
        totalProcessed: excelData.length,
        accountsCreated: createResults.success.length,
        accountsExisted: createResults.alreadyExists.length,
        enrolled: enrollResults.success.length,
        failed: [
          ...createResults.failed,
          ...enrollResults.failed.map(item => ({
            studentId: item.student.studentId,
            fullName: item.student.fullName,
            error: 'Không thể thêm vào lớp: ' + item.error
          }))
        ]
      };

      setUploadResults(finalResults);

      // Reload class data
      loadClasses();
      if (showClassDetailModal) {
        const studentsResult = await getClassStudents(selectedClass.id);
        if (studentsResult.success) setClassStudents(sortStudentsByStudentId(studentsResult.students));
      }

      if (finalResults.failed.length === 0) {
        setSuccess(`Thêm ${finalResults.enrolled} sinh viên thành công!`);
      } else {
        setError(`Đã thêm ${finalResults.enrolled} sinh viên. ${finalResults.failed.length} sinh viên thất bại.`);
      }
    } catch (error) {
      console.error('Error processing Excel:', error);
      setError('Có lỗi xảy ra khi xử lý file Excel: ' + error.message);
    } finally {
      setProcessingExcel(false);
      setAddingStudent(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setAddingStudent(true);

    try {
      if (addStudentMode === 'existing') {
        // Add existing student
        if (!selectedStudent) {
          setError('Vui lòng chọn sinh viên từ danh sách');
          setAddingStudent(false);
          return;
        }

        const result = await enrollStudent(selectedClass.id, selectedStudent);
        if (result.success) {
          setSuccess('Thêm sinh viên thành công!');
          setShowAddStudentModal(false);
          loadClasses();
          if (showClassDetailModal) {
            const studentsResult = await getClassStudents(selectedClass.id);
            if (studentsResult.success) setClassStudents(sortStudentsByStudentId(studentsResult.students));
          }
        } else {
          setError(result.error || 'Không thể thêm sinh viên');
        }
      } else {
        // Create new student account
        if (!newStudentData.studentId.trim() || !newStudentData.fullName.trim()) {
          setError('Vui lòng nhập đầy đủ mã sinh viên và họ tên');
          setAddingStudent(false);
          return;
        }

        // Create student account
        const createResult = await createStudentAccount(
          newStudentData.studentId,
          newStudentData.fullName
        );

        if (createResult.success) {
          // Add student to class
          const enrollResult = await enrollStudent(selectedClass.id, createResult.student);
          if (enrollResult.success) {
            setSuccess(`Tạo tài khoản và thêm sinh viên ${newStudentData.fullName} thành công!`);
            setShowAddStudentModal(false);
            loadClasses();
            if (showClassDetailModal) {
              const studentsResult = await getClassStudents(selectedClass.id);
              if (studentsResult.success) setClassStudents(sortStudentsByStudentId(studentsResult.students));
            }
          } else {
            setError('Tạo tài khoản thành công nhưng không thể thêm vào lớp: ' + enrollResult.error);
          }
        } else {
          if (createResult.error.includes('email-already-in-use')) {
            setError(`Sinh viên có MSSV ${newStudentData.studentId} đã có tài khoản. Vui lòng sử dụng chế độ "Thêm sinh viên đã có tài khoản"`);
          } else {
            setError(createResult.error || 'Không thể tạo tài khoản sinh viên');
          }
        }
      }
    } catch (err) {
      console.error('Error adding student:', err);
      setError('Có lỗi xảy ra: ' + err.message);
    } finally {
      setAddingStudent(false);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!confirm('Bạn có chắc muốn xóa sinh viên này khỏi lớp?')) return;
    const result = await removeStudent(selectedClass.id, studentId);
    if (result.success) {
      setSuccess('Xóa sinh viên thành công!');
      const studentsResult = await getClassStudents(selectedClass.id);
      if (studentsResult.success) setClassStudents(sortStudentsByStudentId(studentsResult.students));
      loadClasses();
    } else {
      setError(result.error || 'Không thể xóa sinh viên');
    }
  };

  // ── Handlers: attendance ───────────────────────────────────────
  const handleOpenCreateAttendance = () => {
    setSessionName('');
    setError('');
    setShowCreateAttendanceModal(true);
  };

  const handleCreateAttendance = async (e) => {
    e.preventDefault();
    setError('');
    setCreatingAttendance(true);
    if (!sessionName.trim()) {
      setError('Vui lòng nhập tên buổi điểm danh');
      setCreatingAttendance(false);
      return;
    }
    const result = await createAttendanceSession(selectedClass.id, {
      sessionNumber: sessionName,
      createdBy: userProfile.uid
    });
    if (result.success) {
      setSuccess(`Tạo buổi "${sessionName}" thành công!`);
      setShowCreateAttendanceModal(false);
      setSessionName('');
      await loadAttendanceSessions(selectedClass.id);
    } else {
      setError(result.error || 'Không thể tạo buổi điểm danh');
    }
    setCreatingAttendance(false);
  };

  const handleOpenManualAttendance = async (session) => {
    setSelectedSession(session);
    setError('');

    const result = await getAttendanceDetails(session.id, selectedClass.id);
    const initialRecords = {};

    if (result.success) {
      result.students.forEach(student => {
        initialRecords[student.uid] = {
          status: student.status || 'absent',
          note: student.note || ''
        };
      });
    } else {
      classStudents.forEach(student => {
        const existing = session.records?.find(r => r.studentId === student.uid);
        initialRecords[student.uid] = {
          status: existing?.status || 'absent',
          note: existing?.note || ''
        };
      });
    }

    setAttendanceRecords(initialRecords);
    setShowManualAttendanceModal(true);
  };

  const handleToggleAttendance = (studentId, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const handleSaveManualAttendance = async () => {
    setSavingManual(true);
    setError('');
    try {
      const studentRecords = classStudents.map((student) => ({
        studentId: student.uid,
        studentName: student.fullName,
        studentCode: student.studentId || '',
        status: attendanceRecords[student.uid]?.status || 'absent',
        note: attendanceRecords[student.uid]?.note || ''
      }));

      const result = await batchUpdateManualAttendance(selectedSession.id, studentRecords);

      if (result.success) {
        setSuccess('Lưu điểm danh thành công!');
        setShowManualAttendanceModal(false);
        await loadAttendanceSessions(selectedClass.id);
      } else {
        setError(result.error || 'Không thể lưu điểm danh');
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi lưu điểm danh');
      console.error(err);
    }
    setSavingManual(false);
  };

  // ── Handlers: QR ───────────────────────────────────────────────
  const handleOpenQR = async (session) => {
    setSelectedSession(session);
    setQrImageUrl('');
    setQrExpiryTime(null);
    setQrCountdown(0);
    setGeneratingQR(true);
    setShowQRModal(true);

    const result = await generateQRCode(session.id, 10);
    if (result.success) {
      const url = await QRCode.toDataURL(result.qrData, { width: 300, margin: 2 });
      setQrImageUrl(url);
      setQrExpiryTime(result.expiryTime.getTime());
    } else {
      setError('Không thể tạo QR code');
      setShowQRModal(false);
    }
    setGeneratingQR(false);
  };

  const handleRegenerateQR = async () => {
    if (!selectedSession) return;
    setGeneratingQR(true);
    setQrImageUrl('');
    const result = await generateQRCode(selectedSession.id, 10);
    if (result.success) {
      const url = await QRCode.toDataURL(result.qrData, { width: 300, margin: 2 });
      setQrImageUrl(url);
      setQrExpiryTime(result.expiryTime.getTime());
    } else {
      setError('Không thể tạo QR code');
    }
    setGeneratingQR(false);
  };

  const handleDeleteAttendance = async (attendanceId, name) => {
    if (!confirm(`Bạn có chắc muốn xóa buổi điểm danh "${name}"?`)) return;
    const result = await deleteAttendanceSession(attendanceId);
    if (result.success) {
      setSuccess('Xóa buổi điểm danh thành công!');
      await loadAttendanceSessions(selectedClass.id);
    } else {
      setError(result.error || 'Không thể xóa buổi điểm danh');
    }
  };

  // ── Handlers: Session Detail ──────────────────────────────────
  const handleOpenSessionDetail = async (session) => {
    setSelectedSession(session);
    setShowSessionDetailModal(true);
    setError('');

    try {
      const result = await getAttendanceDetails(session.id, selectedClass.id);

      if (result.success) {
        const presentStudents = result.students.filter(s => s.status === 'present');
        const absentStudents = result.students.filter(s => s.status === 'absent');

        setSessionDetailStudents({
          present: sortStudentsByStudentId(presentStudents),
          absent: sortStudentsByStudentId(absentStudents)
        });
      }
    } catch (error) {
      console.error('Error loading session details:', error);
      setError('Không thể tải chi tiết buổi điểm danh');
    }
  };

  // ── Handlers: Overview ─────────────────────────────────────────
  const handleOpenOverview = async () => {
    if (!selectedClass || attendanceSessions.length === 0) return;

    setLoadingOverview(true);
    setShowOverviewModal(true);
    setError('');

    try {
      // Prepare data structure
      const records = {};

      // Load attendance details for all sessions
      for (const session of attendanceSessions) {
        const result = await getAttendanceDetails(session.id, selectedClass.id);

        if (result.success) {
          result.students.forEach(student => {
            if (!records[student.uid]) {
              records[student.uid] = {};
            }
            records[student.uid][session.id] = student.status || 'absent';
          });
        }
      }

      // Ensure all students have entries for all sessions
      classStudents.forEach(student => {
        if (!records[student.uid]) {
          records[student.uid] = {};
        }
        attendanceSessions.forEach(session => {
          if (!records[student.uid][session.id]) {
            records[student.uid][session.id] = 'absent';
          }
        });
      });

      // Sort sessions by date (oldest first)
      const sortedSessions = [...attendanceSessions].sort((a, b) => {
        const dateA = a.date?.seconds || 0;
        const dateB = b.date?.seconds || 0;
        return dateA - dateB; // Ascending order (oldest first)
      });

      setOverviewData({
        students: sortStudentsByStudentId(classStudents),
        sessions: sortedSessions,
        records: records
      });
    } catch (error) {
      console.error('Error loading overview:', error);
      setError('Không thể tải dữ liệu tổng quan');
    } finally {
      setLoadingOverview(false);
    }
  };

  const handleExportOverview = () => {
    if (!overviewData.students.length || !overviewData.sessions.length) {
      setError('Không có dữ liệu để xuất');
      return;
    }

    try {
      // Prepare data for Excel
      const excelData = [];

      // Header row 1: Class info
      excelData.push([
        `Lớp: ${selectedClass.classCode} - ${selectedClass.className}`,
        '',
        '',
        '',
        ...Array(overviewData.sessions.length).fill(''),
        ''
      ]);

      // Header row 2: Column headers
      const headerRow = [
        'STT',
        'MSSV',
        'Họ và tên',
        'Khuôn mặt',
        ...overviewData.sessions.map((session) => session.sessionNumber),
        'Tổng có mặt'
      ];
      excelData.push(headerRow);

      // Data rows
      overviewData.students.forEach((student, index) => {
        const presentCount = overviewData.sessions.filter(
          session => overviewData.records[student.uid]?.[session.id] === 'present'
        ).length;

        const row = [
          index + 1,
          student.studentId || 'N/A',
          student.fullName,
          student.faceEmbedding && student.faceEmbedding.length > 0 ? 1 : 0,
          ...overviewData.sessions.map(session => {
            const status = overviewData.records[student.uid]?.[session.id];
            return status === 'present' ? 1 : 0;
          }),
          `${presentCount}/${overviewData.sessions.length}`
        ];
        excelData.push(row);
      });

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      // Set column widths
      const colWidths = [
        { wch: 5 },  // STT
        { wch: 12 }, // MSSV
        { wch: 25 }, // Họ và tên
        { wch: 10 }, // Khuôn mặt
        ...overviewData.sessions.map(() => ({ wch: 8 })), // Buổi 1, 2, 3...
        { wch: 12 }  // Tổng
      ];
      ws['!cols'] = colWidths;

      // Apply styling to cells
      const range = XLSX.utils.decode_range(ws['!ref']);
      const numStudentDataRows = overviewData.students.length;
      const numSessionCols = overviewData.sessions.length;

      // Define border style
      const borderStyle = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      };

      // Define styles
      const centerStyle = {
        alignment: { horizontal: 'center', vertical: 'center' },
        font: { name: 'Times New Roman', sz: 11 },
        border: borderStyle
      };

      const leftStyle = {
        alignment: { horizontal: 'left', vertical: 'center' },
        font: { name: 'Times New Roman', sz: 11 },
        border: borderStyle
      };

      const greenStyle = {
        alignment: { horizontal: 'center', vertical: 'center' },
        font: { name: 'Times New Roman', sz: 11 },
        fill: { fgColor: { rgb: 'C6EFCE' } },
        border: borderStyle
      };

      const redStyle = {
        alignment: { horizontal: 'center', vertical: 'center' },
        font: { name: 'Times New Roman', sz: 11 },
        fill: { fgColor: { rgb: 'FFC7CE' } },
        border: borderStyle
      };

      const headerStyle = {
        alignment: { horizontal: 'center', vertical: 'center' },
        font: { name: 'Times New Roman', sz: 11, bold: true },
        fill: { fgColor: { rgb: 'D9D9D9' } },
        border: borderStyle
      };

      // Apply styles to all cells
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) continue;

          // Row 0: Class info (merged header)
          if (R === 0) {
            ws[cellAddress].s = centerStyle;
          }
          // Row 1: Column headers
          else if (R === 1) {
            ws[cellAddress].s = headerStyle;
          }
          // Student data rows (rows 2 to 2 + numStudentDataRows - 1)
          else if (R >= 2 && R < 2 + numStudentDataRows) {
            // Column C (index 2): Student names - left align
            if (C === 2) {
              ws[cellAddress].s = leftStyle;
            }
            // Column D (index 3): Face data - green/red style
            else if (C === 3) {
              const cellValue = ws[cellAddress].v;
              if (cellValue === 1) {
                ws[cellAddress].s = greenStyle;
              } else if (cellValue === 0) {
                ws[cellAddress].s = redStyle;
              } else {
                ws[cellAddress].s = centerStyle;
              }
            }
            // Attendance columns (starting from column E, index 4)
            else if (C >= 4 && C < 4 + numSessionCols) {
              const cellValue = ws[cellAddress].v;
              if (cellValue === 1) {
                ws[cellAddress].s = greenStyle;
              } else if (cellValue === 0) {
                ws[cellAddress].s = redStyle;
              } else {
                ws[cellAddress].s = centerStyle;
              }
            }
            // Other columns (STT, MSSV, Total) - center align
            else {
              ws[cellAddress].s = centerStyle;
            }
          }
        }
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tổng quan điểm danh');

      // Generate filename
      const date = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
      const filename = `TongQuan_${selectedClass.classCode}_${date}.xlsx`;

      // Download file with cell styles
      XLSX.writeFile(wb, filename, { cellStyles: true });

      setSuccess('Xuất file Excel thành công!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setError('Không thể xuất file Excel: ' + error.message);
    }
  };

  // ══════════════════════════════════════════════════════════════
  return (
    <TeacherLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quản lý Lớp học</h1>
                <p className="text-gray-600">Danh sách các lớp bạn đang phụ trách</p>
              </div>
              <Button
                variant="primary"
                icon={<Plus className="w-5 h-5" />}
                onClick={() => setShowCreateClassModal(true)}
              >
                Tạo lớp mới
              </Button>
            </div>
          </div>
        </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {/* Classes Grid */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          </div>
        ) : classes.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có lớp học nào</h3>
              <p className="text-gray-600 mb-6">Tạo lớp đầu tiên để bắt đầu quản lý sinh viên và điểm danh</p>
              <Button
                variant="primary"
                icon={<Plus className="w-5 h-5" />}
                onClick={() => setShowCreateClassModal(true)}
              >
                Tạo lớp mới
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classItem) => (
              <Card key={classItem.id} className="hover:shadow-lg transition-shadow flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-xl text-gray-900 mb-1">{classItem.classCode}</h3>
                      <p className="text-gray-700 font-medium">{classItem.className}</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                      {classItem.studentCount || 0} SV
                    </span>
                  </div>

                  {classItem.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{classItem.description}</p>
                  )}

                  {classItem.schedule && (
                    <div className="mb-4 p-2 bg-gray-50 rounded text-sm text-gray-700">
                      📅 {classItem.schedule}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Eye className="w-4 h-4" />}
                    onClick={() => handleOpenClassDetail(classItem)}
                    fullWidth
                  >
                    Chi tiết
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<UserPlus className="w-4 h-4" />}
                    onClick={() => handleOpenAddStudent(classItem)}
                    fullWidth
                  >
                    Thêm SV
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* ── Modal: Tạo lớp ────────────────────────────────────── */}
      <Modal isOpen={showCreateClassModal} onClose={() => setShowCreateClassModal(false)} title="Tạo lớp mới" size="md">
        <form onSubmit={handleCreateClass} className="space-y-4">
          <Input
            label="Mã lớp"
            type="text"
            placeholder="Ví dụ: IT001"
            value={newClass.classCode}
            onChange={(e) => setNewClass({ ...newClass, classCode: e.target.value })}
            required
          />
          <Input
            label="Tên lớp"
            type="text"
            placeholder="Ví dụ: Nhập môn Công nghệ thông tin"
            value={newClass.className}
            onChange={(e) => setNewClass({ ...newClass, className: e.target.value })}
            required
          />
          <Input
            label="Mô tả"
            type="text"
            placeholder="Mô tả về lớp học (tùy chọn)"
            value={newClass.description}
            onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
          />
          <Input
            label="Lịch học"
            type="text"
            placeholder="Ví dụ: Thứ 2, 7h30-9h30 (tùy chọn)"
            value={newClass.schedule}
            onChange={(e) => setNewClass({ ...newClass, schedule: e.target.value })}
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowCreateClassModal(false)} fullWidth>Hủy</Button>
            <Button type="submit" variant="primary" fullWidth>Tạo lớp</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Thêm sinh viên ──────────────────────────────── */}
      <Modal isOpen={showAddStudentModal} onClose={() => setShowAddStudentModal(false)} title="Thêm sinh viên vào lớp" size="md">
        <div className="mb-4">
          <p className="text-sm text-gray-600">Lớp: <span className="font-semibold">{selectedClass?.classCode} - {selectedClass?.className}</span></p>
        </div>

        {/* Mode selector with 3 tabs */}
        <div className="mb-6 flex gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => setAddStudentMode('existing')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              addStudentMode === 'existing'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Đã có TK
          </button>
          <button
            type="button"
            onClick={() => setAddStudentMode('new')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              addStudentMode === 'new'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tạo mới
          </button>
          <button
            type="button"
            onClick={() => setAddStudentMode('excel')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              addStudentMode === 'excel'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 inline mr-1" />
            Excel
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>}

        {addStudentMode === 'excel' ? (
          // Excel Upload Mode
          <div className="space-y-4">
            {!processingExcel && !uploadResults ? (
              <>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragOverExcel
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300'
                  }`}
                  onDragOver={handleExcelDragOver}
                  onDragEnter={handleExcelDragOver}
                  onDragLeave={handleExcelDragLeave}
                  onDrop={handleExcelDrop}
                >
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <label htmlFor="excel-upload" className="cursor-pointer">
                    <span className="text-primary-600 hover:text-primary-700 font-medium">
                      Chọn file Excel
                    </span>
                    <input
                      id="excel-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Kéo thả file vào đây hoặc bấm để chọn file (.xlsx, .xls)
                  </p>
                </div>

                {excelFile && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900 font-medium mb-1">
                      📄 {excelFile.name}
                    </p>
                    <p className="text-xs text-blue-700">
                      {excelData.length} sinh viên được tìm thấy
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddStudentModal(false)}
                    fullWidth
                  >
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleProcessExcel}
                    fullWidth
                    disabled={excelData.length === 0}
                    icon={<Upload className="w-4 h-4" />}
                  >
                    Xử lý ({excelData.length} SV)
                  </Button>
                </div>
              </>
            ) : processingExcel ? (
              // Processing view
              <div className="py-8">
                <div className="text-center mb-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
                  <p className="text-sm font-medium text-gray-900">
                    Đang xử lý... {uploadProgress.current}/{uploadProgress.total}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {uploadProgress.currentStudent}
                  </p>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : uploadResults ? (
              // Results view
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-700">Tài khoản mới</p>
                    <p className="text-2xl font-bold text-green-900">{uploadResults.accountsCreated}</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700">Đã có tài khoản</p>
                    <p className="text-2xl font-bold text-blue-900">{uploadResults.accountsExisted}</p>
                  </div>
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-xs text-purple-700">Đã thêm vào lớp</p>
                    <p className="text-2xl font-bold text-purple-900">{uploadResults.enrolled}</p>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700">Thất bại</p>
                    <p className="text-2xl font-bold text-red-900">{uploadResults.failed.length}</p>
                  </div>
                </div>

                {uploadResults.failed.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg max-h-40 overflow-y-auto">
                    <p className="text-sm font-medium text-red-900 mb-2">Danh sách lỗi:</p>
                    {uploadResults.failed.map((item, index) => (
                      <div key={index} className="text-xs text-red-800 mb-1">
                        • {item.studentId} - {item.fullName}: {item.error}
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setShowAddStudentModal(false)}
                  fullWidth
                >
                  Đóng
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          // Existing form modes (existing/new)
          <form onSubmit={handleAddStudent} className="space-y-4">
            {addStudentMode === 'existing' ? (
              <>
                {/* Search existing student */}
                <div className="relative">
                  <Input
                    label="Tìm kiếm sinh viên"
                    type="text"
                    placeholder="Nhập mã sinh viên, họ tên hoặc email..."
                    value={studentSearchTerm}
                    onChange={(e) => handleStudentSearch(e.target.value)}
                    autoComplete="off"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((student) => (
                        <button
                          key={student.uid}
                          type="button"
                          onClick={() => handleSelectStudent(student)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <p className="font-medium text-gray-900">{student.fullName}</p>
                          <p className="text-sm text-gray-600">{student.email}</p>
                          {student.studentId && (
                            <p className="text-xs text-gray-500">MSSV: {student.studentId}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedStudent && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium mb-1">✓ Đã chọn sinh viên:</p>
                    <p className="font-medium text-gray-900">{selectedStudent.fullName}</p>
                    <p className="text-sm text-gray-600">{selectedStudent.email}</p>
                    {selectedStudent.studentId && (
                      <p className="text-xs text-gray-500">MSSV: {selectedStudent.studentId}</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Create new student */}
                <Input
                  label="Mã số sinh viên"
                  type="text"
                  placeholder="Ví dụ: 22520001"
                  value={newStudentData.studentId}
                  onChange={(e) => setNewStudentData({ ...newStudentData, studentId: e.target.value })}
                  required
                />

                <Input
                  label="Họ và tên"
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={newStudentData.fullName}
                  onChange={(e) => setNewStudentData({ ...newStudentData, fullName: e.target.value })}
                  required
                />
              </>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddStudentModal(false)} fullWidth disabled={addingStudent}>Hủy</Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={addingStudent}
                disabled={addingStudent || (addStudentMode === 'existing' && !selectedStudent)}
              >
                {addStudentMode === 'existing' ? 'Thêm sinh viên' : 'Tạo tài khoản và thêm'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Modal: Chi tiết lớp ────────────────────────────────── */}
      <Modal isOpen={showClassDetailModal} onClose={() => setShowClassDetailModal(false)} title="Chi tiết lớp học" size="lg">
        {selectedClass && (
          <div className="space-y-4">
            {/* Class info */}
            <div className="border-b pb-4">
              <h3 className="text-xl font-semibold text-gray-900">{selectedClass.classCode} - {selectedClass.className}</h3>
              {selectedClass.description && <p className="text-gray-600 mt-2">{selectedClass.description}</p>}
              {selectedClass.schedule && <p className="text-sm text-gray-500 mt-1">Lịch học: {selectedClass.schedule}</p>}
            </div>

            {/* Attendance sessions */}
            <div className="border-b pb-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-900">Buổi điểm danh ({attendanceSessions.length})</h4>
                <div className="flex gap-2">
                  {attendanceSessions.length > 0 && (
                    <Button
                      variant="success"
                      size="sm"
                      icon={<FileSpreadsheet className="w-4 h-4" />}
                      onClick={handleOpenOverview}
                    >
                      Tổng quan
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<ClipboardCheck className="w-4 h-4" />}
                    onClick={handleOpenCreateAttendance}
                  >
                    Tạo buổi mới
                  </Button>
                </div>
              </div>

              {attendanceSessions.length === 0 ? (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Chưa có buổi điểm danh nào</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {attendanceSessions.map((session) => {
                    const presentCount = session.presentCount || 0;
                    const absentCount = Math.max(0, classStudents.length - presentCount);
                    return (
                      <div key={session.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                          <div className="flex-1 cursor-pointer" onClick={() => handleOpenSessionDetail(session)}>
                            <p className="font-medium text-gray-900 hover:text-primary-600 transition-colors">{session.sessionNumber}</p>
                            <p className="text-xs text-gray-500">
                              {session.date && new Date(session.date.seconds * 1000).toLocaleDateString('vi-VN', {
                                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                            <div className="flex gap-3 mt-1 text-xs">
                              <span className="text-green-600"><strong>{presentCount}</strong> có mặt</span>
                              <span className="text-red-600"><strong>{absentCount}</strong> vắng</span>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap sm:flex-nowrap sm:items-center sm:justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<ClipboardCheck className="w-4 h-4" />}
                              onClick={() => handleOpenManualAttendance(session)}
                            >
                              <span className="hidden sm:inline">Thủ công</span>
                              <span className="sm:hidden">TC</span>
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<QrCode className="w-4 h-4" />}
                              onClick={() => handleOpenQR(session)}
                            >
                              <span className="hidden sm:inline">QR</span>
                              <span className="sm:hidden">QR</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<Trash2 className="w-4 h-4" />}
                              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleDeleteAttendance(session.id, session.sessionNumber)}
                              title="Xóa buổi điểm danh"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Students list */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-900">Danh sách sinh viên ({classStudents.length})</h4>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<UserPlus className="w-4 h-4" />}
                  onClick={() => { setShowClassDetailModal(false); handleOpenAddStudent(selectedClass); }}
                >
                  Thêm SV
                </Button>
              </div>
              {classStudents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Chưa có sinh viên nào trong lớp</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {classStudents.map((student) => (
                    <div key={student.uid} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{student.fullName}</p>
                          {student.faceEmbedding && student.faceEmbedding.length > 0 && (
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" title="Đã có dữ liệu khuôn mặt" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{student.email}</p>
                        {student.studentId && <p className="text-xs text-gray-500">MSSV: {student.studentId}</p>}
                      </div>
                      <Button variant="outline" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => handleRemoveStudent(student.uid)}>Xóa</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Tạo buổi điểm danh ──────────────────────────── */}
      <Modal isOpen={showCreateAttendanceModal} onClose={() => setShowCreateAttendanceModal(false)} title="Tạo buổi điểm danh mới" size="md">
        <form onSubmit={handleCreateAttendance} className="space-y-4">
          <p className="text-sm text-gray-600">
            Lớp: <span className="font-semibold">{selectedClass?.classCode} - {selectedClass?.className}</span>
          </p>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>}
          <Input
            label="Tên buổi điểm danh"
            type="text"
            placeholder="Ví dụ: Buổi 1, Tuần 1, Ngày 15/03/2026..."
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            required
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowCreateAttendanceModal(false)} fullWidth disabled={creatingAttendance}>Hủy</Button>
            <Button type="submit" variant="primary" fullWidth loading={creatingAttendance} disabled={creatingAttendance}>Tạo buổi</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Điểm danh thủ công ─────────────────────────── */}
      <Modal isOpen={showManualAttendanceModal} onClose={() => setShowManualAttendanceModal(false)} title="Điểm danh thủ công" size="lg">
        {selectedSession && (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <p className="font-semibold text-gray-900">{selectedSession.sessionNumber}</p>
              <p className="text-sm text-gray-500">Lớp: {selectedClass?.classCode} - {selectedClass?.className}</p>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>}

            {classStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Chưa có sinh viên nào trong lớp</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-3">
                  {classStudents.map((student) => {
                    const isPresent = attendanceRecords[student.uid]?.status === 'present';
                    const method = attendanceRecords[student.uid]?.method;
                    const isFaceRecognition = method === 'face';

                    return (
                      <div
                        key={student.uid}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                          isPresent ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
                        }`}
                        onClick={() => handleToggleAttendance(student.uid, isPresent ? 'absent' : 'present')}
                      >
                        <input
                          type="checkbox"
                          checked={isPresent}
                          onChange={() => {}}
                          className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 pointer-events-none"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{student.fullName}</p>
                            {isFaceRecognition && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                                📸 Quét mặt
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{student.email}</p>
                          {student.studentId && <p className="text-xs text-gray-500">MSSV: {student.studentId}</p>}
                        </div>
                        <span className={`text-sm font-semibold px-3 py-1 rounded ${isPresent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {isPresent ? 'Có mặt' : 'Vắng'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">Có mặt: <strong>{Object.values(attendanceRecords).filter(r => r.status === 'present').length}</strong></span>
                  <span className="text-red-600">Vắng: <strong>{Object.values(attendanceRecords).filter(r => r.status === 'absent').length}</strong></span>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowManualAttendanceModal(false)} fullWidth disabled={savingManual}>Hủy</Button>
              <Button type="button" variant="primary" fullWidth loading={savingManual} disabled={savingManual || classStudents.length === 0} onClick={handleSaveManualAttendance}>
                Lưu điểm danh
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: QR Code ─────────────────────────────────────── */}
      <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)} title="Điểm danh bằng QR Code" size="md">
        {selectedSession && (
          <div className="space-y-4 text-center">
            <div className="border-b pb-3">
              <p className="font-semibold text-gray-900">{selectedSession.sessionNumber}</p>
              <p className="text-sm text-gray-500">Lớp: {selectedClass?.classCode} - {selectedClass?.className}</p>
            </div>

            {generatingQR ? (
              <div className="py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Đang tạo QR Code...</p>
              </div>
            ) : qrImageUrl ? (
              <>
                <div className="flex justify-center">
                  <img src={qrImageUrl} alt="QR Code điểm danh" className="w-64 h-64 rounded-lg border-4 border-gray-200" />
                </div>

                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                  qrCountdown > 60 ? 'bg-green-100 text-green-800' :
                  qrCountdown > 0  ? 'bg-yellow-100 text-yellow-800' :
                                     'bg-red-100 text-red-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    qrCountdown > 60 ? 'bg-green-500' :
                    qrCountdown > 0  ? 'bg-yellow-500 animate-pulse' :
                                       'bg-red-500'
                  }`} />
                  {qrCountdown > 0 ? `Còn ${formatCountdown(qrCountdown)} để quét` : 'QR Code đã hết hạn'}
                </div>

                <p className="text-xs text-gray-500">
                  Hiển thị mã này cho sinh viên quét bằng ứng dụng để điểm danh tự động
                </p>

                <Button variant="primary" icon={<QrCode className="w-4 h-4" />} onClick={handleRegenerateQR} fullWidth>
                  Tạo lại QR mới (10 phút)
                </Button>
              </>
            ) : null}

            <Button type="button" variant="outline" onClick={() => setShowQRModal(false)} fullWidth>Đóng</Button>
          </div>
        )}
      </Modal>

      {/* ── Modal: Chi tiết buổi điểm danh ─────────────────────── */}
      <Modal
        isOpen={showSessionDetailModal}
        onClose={() => setShowSessionDetailModal(false)}
        title="Chi tiết buổi điểm danh"
        size="lg"
      >
        {selectedSession && (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <p className="font-semibold text-gray-900 text-lg">{selectedSession.sessionNumber}</p>
              <p className="text-sm text-gray-500">
                Lớp: {selectedClass?.classCode} - {selectedClass?.className}
              </p>
              <p className="text-xs text-gray-500">
                {selectedSession.date && new Date(selectedSession.date.seconds * 1000).toLocaleDateString('vi-VN', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg text-center">
                <p className="text-3xl font-bold text-green-700">{sessionDetailStudents.present.length}</p>
                <p className="text-sm text-green-600 font-medium">Có mặt</p>
              </div>
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg text-center">
                <p className="text-3xl font-bold text-red-700">{sessionDetailStudents.absent.length}</p>
                <p className="text-sm text-red-600 font-medium">Vắng</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Present students */}
              <div className="border-2 border-green-200 rounded-lg p-3 bg-green-50">
                <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  Sinh viên có mặt ({sessionDetailStudents.present.length})
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {sessionDetailStudents.present.length === 0 ? (
                    <p className="text-sm text-green-700 text-center py-4">Chưa có sinh viên nào</p>
                  ) : (
                    sessionDetailStudents.present.map((student) => (
                      <div key={student.uid} className="p-2 bg-white rounded border border-green-200">
                        <p className="font-medium text-gray-900 text-sm">{student.fullName}</p>
                        <p className="text-xs text-gray-600">{student.studentId || 'N/A'}</p>
                        {student.method && (
                          <p className="text-xs text-gray-500 mt-1">
                            {student.method === 'face' ? '📸 Nhận diện khuôn mặt' :
                             student.method === 'qr' ? '📱 QR Code' :
                             student.method === 'manual' ? '✍️ Thủ công' : ''}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Absent students */}
              <div className="border-2 border-red-200 rounded-lg p-3 bg-red-50">
                <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  Sinh viên vắng ({sessionDetailStudents.absent.length})
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {sessionDetailStudents.absent.length === 0 ? (
                    <p className="text-sm text-red-700 text-center py-4">Không có sinh viên nào vắng</p>
                  ) : (
                    sessionDetailStudents.absent.map((student) => (
                      <div key={student.uid} className="p-2 bg-white rounded border border-red-200">
                        <p className="font-medium text-gray-900 text-sm">{student.fullName}</p>
                        <p className="text-xs text-gray-600">{student.studentId || 'N/A'}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                type="button"
                variant="primary"
                onClick={() => setShowSessionDetailModal(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Tổng quan điểm danh ─────────────────────────── */}
      <Modal
        isOpen={showOverviewModal}
        onClose={() => setShowOverviewModal(false)}
        title="Tổng quan điểm danh"
        size="xl"
      >
        {selectedClass && (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <p className="font-semibold text-gray-900">
                {selectedClass.classCode} - {selectedClass.className}
              </p>
              <p className="text-sm text-gray-500">
                Tổng cộng: {overviewData.students.length} sinh viên, {overviewData.sessions.length} buổi
              </p>
            </div>

            {loadingOverview ? (
              <div className="py-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Đang tải dữ liệu...</p>
              </div>
            ) : overviewData.students.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Chưa có dữ liệu điểm danh</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-center sticky left-0 bg-gray-100 z-20 font-semibold text-gray-900 min-w-[60px]">
                        STT
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left sticky left-[60px] bg-gray-100 z-20 font-semibold text-gray-900 min-w-[100px]">
                        MSSV
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left sticky left-[160px] bg-gray-100 z-20 min-w-[200px] font-semibold text-gray-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        Họ và tên
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-center bg-gray-100 font-semibold text-gray-900 min-w-[100px]">
                        Khuôn mặt
                      </th>
                      {overviewData.sessions.map((session) => (
                        <th
                          key={session.id}
                          className="border border-gray-300 px-3 py-2 text-center min-w-[80px] font-semibold text-gray-900"
                          title={session.date && new Date(session.date.seconds * 1000).toLocaleDateString('vi-VN', {
                            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        >
                          {session.sessionNumber}
                        </th>
                      ))}
                      <th className="border border-gray-300 px-3 py-2 text-center bg-blue-100 text-blue-900 font-bold min-w-[80px]">
                        Tổng
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewData.students.map((student, index) => {
                      const presentCount = overviewData.sessions.filter(
                        session => overviewData.records[student.uid]?.[session.id] === 'present'
                      ).length;

                      return (
                        <tr key={student.uid} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 text-center sticky left-0 bg-white text-gray-900 z-10 font-medium min-w-[60px]">
                            {index + 1}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 sticky left-[60px] bg-white text-gray-900 z-10 font-medium min-w-[100px]">
                            {student.studentId || 'N/A'}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 sticky left-[160px] bg-white text-gray-900 z-10 min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            {student.fullName}
                          </td>
                          <td className={`border border-gray-300 px-3 py-2 text-center font-semibold ${
                            student.faceEmbedding && student.faceEmbedding.length > 0
                              ? 'bg-green-100 text-green-900'
                              : 'bg-red-100 text-red-900'
                          }`}>
                            {student.faceEmbedding && student.faceEmbedding.length > 0 ? '1' : '0'}
                          </td>
                          {overviewData.sessions.map(session => {
                            const status = overviewData.records[student.uid]?.[session.id];
                            const isPresent = status === 'present';
                            return (
                              <td
                                key={session.id}
                                className={`border border-gray-300 px-3 py-2 text-center font-semibold ${
                                  isPresent ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'
                                }`}
                              >
                                {isPresent ? '1' : '0'}
                              </td>
                            );
                          })}
                          <td className="border border-gray-300 px-3 py-2 text-center font-bold bg-blue-100 text-blue-900">
                            {presentCount}/{overviewData.sessions.length}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-xs text-gray-600">
                <p className="mb-1"><strong>Chú thích:</strong></p>
                <p>• <span className="font-semibold bg-green-100 text-green-900 px-2 py-0.5 rounded">1</span> = Có mặt</p>
                <p>• <span className="font-semibold bg-red-100 text-red-900 px-2 py-0.5 rounded">0</span> = Vắng</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportOverview}
                  disabled={!overviewData.students.length || !overviewData.sessions.length}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Xuất Excel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setShowOverviewModal(false)}
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
    </TeacherLayout>
  );
};

export default TeacherClasses;
