import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import StudentLayout from '../../layouts/StudentLayout';
import { getClassById } from '../../services/class.service';
import { getStudentClassAttendance } from '../../services/attendance.service';
import { getExamsByClass, canStudentTakeClassExam } from '../../services/exam.service';
import { getStudentExamAttempt, startExamAttempt } from '../../services/examAttempt.service';
import { getStudentTagsWithDetails, getTagColor, formatPoints } from '../../services/tag.service';
import {
  ChevronLeft,
  ClipboardCheck,
  BookOpen,
  Tag,
  CheckCircle,
  XCircle,
  Clock,
  PlayCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import StudentExamDetailModal from '../../components/student/StudentExamDetailModal';
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns';

const STATUS_LABELS = {
  present: { label: 'Có mặt', className: 'bg-green-100 text-green-800', icon: CheckCircle, color: 'text-green-600' },
  late: { label: 'Trễ', className: 'bg-yellow-100 text-yellow-800', icon: Clock, color: 'text-yellow-600' },
  absent: { label: 'Vắng', className: 'bg-red-100 text-red-800', icon: XCircle, color: 'text-red-600' }
};

const StudentClassDetail = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { classId } = useParams();

  const [classInfo, setClassInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('attendance');

  const [sessions, setSessions] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);

  const [tags, setTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [detailExam, setDetailExam] = useState(null);

  const loadClass = useCallback(async () => {
    const result = await getClassById(classId);
    if (result.success) {
      setClassInfo(result.class);
      setError('');
    } else {
      setError(result.error || 'Không tìm thấy lớp học');
    }
  }, [classId]);

  const loadAttendance = useCallback(async () => {
    if (!userProfile?.uid || !classId) return;
    setAttendanceLoading(true);
    const result = await getStudentClassAttendance(userProfile.uid, classId);
    if (result.success) {
      setSessions(result.sessions || []);
      setAttendanceStats(result.stats || null);
    } else {
      setError(result.error || 'Không thể tải điểm danh');
    }
    setAttendanceLoading(false);
  }, [classId, userProfile?.uid]);

  const loadExams = useCallback(async () => {
    if (!userProfile?.uid || !classId) return;
    setExamsLoading(true);
    const result = await getExamsByClass(classId);
    if (result.success) {
      const withAttempts = await Promise.all(
        (result.data || []).map(async (exam) => {
          const attemptResult = await getStudentExamAttempt(
            userProfile.uid,
            exam.id,
            classId,
            exam.sourceExamId || exam.examId
          );
          return {
            ...exam,
            classId,
            attempt: attemptResult.success ? attemptResult.data : null
          };
        })
      );
      setExams(withAttempts);
    }
    setExamsLoading(false);
  }, [classId, userProfile?.uid]);

  const loadTags = useCallback(async () => {
    if (!userProfile?.uid || !classId) return;
    setTagsLoading(true);
    const result = await getStudentTagsWithDetails(classId, userProfile.uid);
    if (result.success) {
      setTags(result.tags || []);
    }
    setTagsLoading(false);
  }, [classId, userProfile?.uid]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadClass();
      setLoading(false);
    };
    if (classId) init();
  }, [classId, loadClass]);

  useEffect(() => {
    if (classId && userProfile?.uid) {
      loadAttendance();
      loadExams();
      loadTags();
    }
  }, [classId, userProfile?.uid, loadAttendance, loadExams, loadTags]);

  const getExamStatus = (exam) => {
    const now = new Date();
    const startTime = exam.startTime?.toDate?.() || (exam.startTime ? new Date(exam.startTime) : null);
    const endTime = exam.endTime?.toDate?.() || (exam.endTime ? new Date(exam.endTime) : null);

    if (exam.attempt?.status === 'in-progress') {
      return { status: 'in-progress', label: 'Đang làm', color: 'text-blue-600' };
    }
    if (exam.attempt?.status === 'submitted' || exam.attempt?.status === 'graded') {
      return { status: 'completed', label: 'Đã nộp', color: 'text-green-600' };
    }
    if (startTime && isBefore(now, startTime)) {
      return { status: 'upcoming', label: 'Sắp diễn ra', color: 'text-gray-600' };
    }
    if (endTime && isAfter(now, endTime)) {
      return { status: 'closed', label: 'Đã kết thúc', color: 'text-gray-600' };
    }
    return { status: 'active', label: 'Đang mở', color: 'text-green-600' };
  };

  const handleStartExam = async (exam) => {
    const access = canStudentTakeClassExam(exam, classId);
    if (!access.allowed) {
      setError(access.message);
      setTimeout(() => setError(''), 4000);
      return;
    }

    const sourceExamId = exam.sourceExamId || exam.examId;
    const instanceId = exam.id;

    if (exam.attempt?.status === 'in-progress') {
      navigate(`/student/exams/${sourceExamId}/take`, {
        state: { classId, classExamInstanceId: instanceId }
      });
      return;
    }

    const result = await startExamAttempt(
      userProfile.uid,
      sourceExamId,
      classId,
      instanceId
    );
    if (result.success) {
      navigate(`/student/exams/${sourceExamId}/take`, {
        state: { classId, classExamInstanceId: instanceId }
      });
    } else {
      setError(result.error || 'Không thể bắt đầu bài thi');
    }
  };

  const formatSessionDate = (dateValue) => {
    if (!dateValue) return '';
    const date = dateValue?.toDate?.() || new Date(dateValue);
    return format(date, 'dd/MM/yyyy HH:mm');
  };

  const renderAttendanceTab = () => {
    if (attendanceLoading) {
      return (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {attendanceStats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Tổng buổi</p>
              <p className="text-xl font-bold text-blue-600">{attendanceStats.total}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Có mặt</p>
              <p className="text-xl font-bold text-green-600">{attendanceStats.present}</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Trễ</p>
              <p className="text-xl font-bold text-yellow-600">{attendanceStats.late}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Vắng</p>
              <p className="text-xl font-bold text-red-600">{attendanceStats.absent}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg col-span-2 md:col-span-1">
              <p className="text-xs text-gray-600">Tỷ lệ</p>
              <p className="text-xl font-bold text-purple-600">{attendanceStats.attendanceRate}%</p>
            </div>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Chưa có buổi điểm danh nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => {
              const meta = STATUS_LABELS[session.status] || STATUS_LABELS.absent;
              const StatusIcon = meta.icon;

              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <StatusIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${meta.color}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{session.sessionNumber}</p>
                      <p className="text-sm text-gray-500">{formatSessionDate(session.date)}</p>
                      {session.method && (
                        <p className="text-xs text-gray-500 mt-1">
                          {session.method === 'face'
                            ? 'Nhận diện khuôn mặt'
                            : session.method === 'qr'
                              ? 'QR Code'
                              : 'Thủ công'}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded flex-shrink-0 ${meta.className}`}>
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderExamsTab = () => {
    if (examsLoading) {
      return (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
        </div>
      );
    }

    if (exams.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>Chưa có bài thi nào được mở cho lớp này</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {exams.map((exam) => {
          const examStatus = getExamStatus(exam);
          const startTime = exam.startTime?.toDate?.() || (exam.startTime ? new Date(exam.startTime) : null);
          const endTime = exam.endTime?.toDate?.() || (exam.endTime ? new Date(exam.endTime) : null);
          const canStart =
            (examStatus.status === 'active' || examStatus.status === 'in-progress') &&
            !['submitted', 'graded'].includes(exam.attempt?.status);

          return (
            <div key={exam.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{exam.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-100 ${examStatus.color}`}>
                      {examStatus.label}
                    </span>
                  </div>
                  {exam.description && (
                    <p className="text-sm text-gray-600 mb-2">{exam.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <span>{exam.durationMinutes} phút</span>
                    <span>{exam.totalQuestions} câu</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                    {startTime && <div>Bắt đầu: {format(startTime, 'dd/MM/yyyy HH:mm')}</div>}
                    {endTime && <div>Kết thúc: {format(endTime, 'dd/MM/yyyy HH:mm')}</div>}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Eye className="w-4 h-4" />}
                    onClick={() => setDetailExam(exam)}
                  >
                    Chi tiết
                  </Button>
                  {canStart && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<PlayCircle className="w-4 h-4" />}
                      onClick={() => handleStartExam(exam)}
                    >
                      {exam.attempt?.status === 'in-progress' ? 'Tiếp tục' : 'Làm bài'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTagsTab = () => {
    if (tagsLoading) {
      return (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
        </div>
      );
    }

    if (tags.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">
          <Tag className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>Bạn chưa được gắn thẻ nào trong lớp này</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {tags.map((tag) => {
          const colors = getTagColor(tag.points, tag.color);
          return (
            <div
              key={tag.assignmentId || tag.id}
              className={`p-4 rounded-lg border ${colors.border} ${colors.bg}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-3 h-3 rounded-full ${colors.dot}`} />
                <p className={`font-semibold ${colors.text}`}>{tag.name}</p>
                {tag.points !== 0 && (
                  <span className="text-sm text-gray-600">({formatPoints(tag.points)})</span>
                )}
              </div>
              {tag.note && <p className="text-sm text-gray-600 mt-1">{tag.note}</p>}
              {tag.assignedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Gắn{' '}
                  {formatDistanceToNow(tag.assignedAt?.toDate?.() || new Date(), {
                    addSuffix: true
                  })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <StudentLayout>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/student/classes')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {loading
                    ? 'Đang tải...'
                    : classInfo
                      ? `${classInfo.classCode} - ${classInfo.className || classInfo.name || ''}`
                      : 'Chi tiết lớp'}
                </h1>
                <p className="text-gray-600 text-sm">Chi tiết lớp học</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : !classInfo ? (
            <Card>
              <p className="text-center py-8 text-gray-500">Không tìm thấy lớp học</p>
            </Card>
          ) : (
            <div className="bg-white shadow-sm rounded-lg p-6">
              {classInfo.description && (
                <p className="text-gray-600 mb-4">{classInfo.description}</p>
              )}
              {classInfo.schedule && (
                <p className="text-sm text-gray-500 mb-4">Lịch học: {classInfo.schedule}</p>
              )}

              <div className="flex border-b mb-6">
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'attendance'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('attendance')}
                >
                  <ClipboardCheck className="w-4 h-4 inline mr-2" />
                  Điểm danh
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'exams'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('exams')}
                >
                  <BookOpen className="w-4 h-4 inline mr-2" />
                  Bài thi ({exams.length})
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'tags'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('tags')}
                >
                  <Tag className="w-4 h-4 inline mr-2" />
                  Thẻ được gắn ({tags.length})
                </button>
              </div>

              {activeTab === 'attendance' && renderAttendanceTab()}
              {activeTab === 'exams' && renderExamsTab()}
              {activeTab === 'tags' && renderTagsTab()}
            </div>
          )}
        </main>

        <StudentExamDetailModal
          exam={detailExam}
          classId={classId}
          studentId={userProfile?.uid}
          isOpen={!!detailExam}
          onClose={() => setDetailExam(null)}
        />
      </div>
    </StudentLayout>
  );
};

export default StudentClassDetail;
