import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '../../layouts/StudentLayout';
import { getClassesByStudent } from '../../services/class.service';
import { getExamsByClass, canStudentTakeClassExam } from '../../services/exam.service';
import { getStudentExamAttempt, startExamAttempt } from '../../services/examAttempt.service';
import {
  Clock,
  AlertCircle,
  CheckCircle,
  BookOpen,
  ChevronRight,
  PlayCircle,
  GraduationCap
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { formatDistanceToNow, format, isAfter, isBefore } from 'date-fns';

const examListKey = (exam) => `${exam.classId}-${exam.id}`;

const StudentExams = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadExams();
  }, [userProfile?.uid]);

  const loadExams = async () => {
    if (!userProfile?.uid) return;

    setLoading(true);
    const classesResult = await getClassesByStudent(userProfile.uid);

    if (!classesResult.success) {
      setError('Không thể tải danh sách lớp');
      setLoading(false);
      return;
    }

    const classList = classesResult.classes || [];
    const classNameById = Object.fromEntries(
      classList.map((c) => [c.id, c.className || c.name || 'Lớp học'])
    );

    const allExams = [];

    for (const { id: classId } of classList) {
      const examsResult = await getExamsByClass(classId);
      if (examsResult.success && examsResult.data) {
        for (const exam of examsResult.data) {
          const attemptResult = await getStudentExamAttempt(
            userProfile.uid,
            exam.id,
            classId,
            exam.sourceExamId || exam.examId
          );
          allExams.push({
            ...exam,
            classId,
            className: classNameById[classId] || 'Lớp học',
            attempt: attemptResult.success ? attemptResult.data : null
          });
        }
      }
    }

    setExams(allExams);
    setLoading(false);
  };

  const handleStartExam = async (exam) => {
    const access = canStudentTakeClassExam(exam, exam.classId);
    if (!access.allowed) {
      setError(access.message);
      return;
    }

    const sourceExamId = exam.sourceExamId || exam.examId;
    const instanceId = exam.id;

    if (exam.attempt?.status === 'in-progress') {
      navigate(`/student/exams/${sourceExamId}/take`, {
        state: { classId: exam.classId, classExamInstanceId: instanceId }
      });
      return;
    }

    const result = await startExamAttempt(
      userProfile.uid,
      sourceExamId,
      exam.classId,
      instanceId
    );

    if (result.success) {
      navigate(`/student/exams/${sourceExamId}/take`, {
        state: { classId: exam.classId, classExamInstanceId: instanceId }
      });
    } else {
      setError(result.error);
    }
  };

  const getExamStatus = (exam) => {
    const now = new Date();
    const startTime =
      exam.startTime?.toDate?.() || (exam.startTime ? new Date(exam.startTime) : null);
    const endTime =
      exam.endTime?.toDate?.() || (exam.endTime ? new Date(exam.endTime) : null);

    if (exam.attempt) {
      if (exam.attempt.status === 'in-progress') {
        return { status: 'in-progress', label: 'Đang làm', color: 'text-blue-600' };
      }
      if (exam.attempt.status === 'submitted' || exam.attempt.status === 'graded') {
        return { status: 'completed', label: 'Đã nộp', color: 'text-green-600' };
      }
    }

    if (startTime && isBefore(now, startTime)) {
      return { status: 'upcoming', label: 'Sắp diễn ra', color: 'text-gray-600' };
    }

    if (endTime && isBefore(now, endTime)) {
      return { status: 'active', label: 'Đang mở', color: 'text-green-600' };
    }

    if (endTime && isAfter(now, endTime)) {
      return { status: 'closed', label: 'Đã kết thúc', color: 'text-gray-600' };
    }

    return { status: 'active', label: 'Đang mở', color: 'text-green-600' };
  };

  const groupedExams = {
    upcoming: exams.filter((e) => getExamStatus(e).status === 'upcoming'),
    active: exams.filter((e) => getExamStatus(e).status === 'active'),
    inProgress: exams.filter((e) => getExamStatus(e).status === 'in-progress'),
    completed: exams.filter((e) => getExamStatus(e).status === 'completed'),
    closed: exams.filter((e) => getExamStatus(e).status === 'closed')
  };

  const ExamCard = ({ exam }) => {
    const examStatus = getExamStatus(exam);
    const startTime =
      exam.startTime?.toDate?.() || (exam.startTime ? new Date(exam.startTime) : null);
    const endTime =
      exam.endTime?.toDate?.() || (exam.endTime ? new Date(exam.endTime) : null);
    const score = exam.attempt?.score;
    const totalScore = exam.attempt?.totalScore;
    const percentage =
      score != null && totalScore ? ((score / totalScore) * 100).toFixed(1) : null;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-800 border border-primary-100">
                <GraduationCap className="w-3.5 h-3.5" />
                {exam.className}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${examStatus.color} bg-gray-100`}
              >
                {examStatus.label}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>

            {exam.description && (
              <p className="text-gray-600 text-sm mb-3 mt-1">{exam.description}</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
              <div className="text-gray-600">
                <span className="font-medium">{exam.durationMinutes}</span> phút
              </div>
              <div className="text-gray-600">
                <span className="font-medium">{exam.totalQuestions}</span> câu
              </div>
              <div className="text-gray-600">
                Đạt: <span className="font-medium">{exam.passingScore?.toFixed?.(1) ?? exam.passingScore}</span>
              </div>
              {percentage && (
                <div className="text-gray-600">
                  Điểm: <span className="font-medium">{percentage}%</span>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              {startTime && <div>Bắt đầu: {format(startTime, 'dd/MM/yyyy HH:mm')}</div>}
              {endTime && <div>Kết thúc: {format(endTime, 'dd/MM/yyyy HH:mm')}</div>}
            </div>

            {exam.attempt?.status === 'graded' && score !== undefined && (
              <div className="mt-3 p-2 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  Đã nộp{' '}
                  {formatDistanceToNow(
                    exam.attempt.submittedAt?.toDate?.() || new Date(),
                    { addSuffix: true }
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {examStatus.status === 'active' && !exam.attempt?.status?.includes('submitted') && (
              <Button
                variant="primary"
                icon={<PlayCircle className="w-4 h-4" />}
                onClick={() => handleStartExam(exam)}
              >
                Làm bài
              </Button>
            )}

            {exam.attempt?.status === 'in-progress' && (
              <Button
                variant="primary"
                icon={<PlayCircle className="w-4 h-4" />}
                onClick={() =>
                  navigate(`/student/exams/${exam.sourceExamId || exam.examId}/take`, {
                    state: { classId: exam.classId, classExamInstanceId: exam.id }
                  })
                }
              >
                Tiếp tục
              </Button>
            )}

            {exam.attempt?.status?.includes('submitted') && (
              <Button
                variant="outline"
                icon={<ChevronRight className="w-4 h-4" />}
                onClick={() =>
                  navigate(`/student/exams/${exam.sourceExamId || exam.examId}/result`, {
                    state: { classId: exam.classId, classExamInstanceId: exam.id }
                  })
                }
              >
                Xem kết quả
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const renderSection = (title, icon, items) => {
    if (items.length === 0) return null;
    return (
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">{icon}{title}</h2>
        <div className="space-y-4">
          {items.map((exam) => (
            <ExamCard key={examListKey(exam)} exam={exam} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <StudentLayout>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Bài thi</h1>
            <p className="text-gray-600 mt-1">
              Mỗi bài thi gắn với một lớp — làm và chấm điểm riêng theo từng lớp
            </p>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : exams.length === 0 ? (
            <Card className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600 mb-2">Chưa có bài thi nào được mở</p>
              <p className="text-sm text-gray-500">Vui lòng quay lại sau hoặc liên hệ giảng viên</p>
            </Card>
          ) : (
            <div className="space-y-8">
              {renderSection(
                'Đang mở',
                <span className="w-3 h-3 bg-green-600 rounded-full" />,
                groupedExams.active
              )}
              {renderSection(
                'Đang làm',
                <span className="w-3 h-3 bg-blue-600 rounded-full" />,
                groupedExams.inProgress
              )}
              {renderSection(
                'Sắp diễn ra',
                <Clock className="w-5 h-5 text-gray-600" />,
                groupedExams.upcoming
              )}
              {renderSection(
                'Đã nộp',
                <CheckCircle className="w-5 h-5 text-green-600" />,
                groupedExams.completed
              )}
              {renderSection('Đã kết thúc', null, groupedExams.closed)}
            </div>
          )}
        </main>
      </div>
    </StudentLayout>
  );
};

export default StudentExams;
