import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '../../layouts/StudentLayout';
import {
  getClassesByStudent
} from '../../services/class.service';
import {
  getExamsByClass,
  canStudentTakeClassExam
} from '../../services/exam.service';
import {
  getStudentExamAttempt,
  startExamAttempt
} from '../../services/examAttempt.service';
import {
  Clock,
  AlertCircle,
  CheckCircle,
  BookOpen,
  ChevronRight,
  PlayCircle
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { formatDistanceToNow, format, isAfter, isBefore } from 'date-fns';

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
      setError('Failed to load classes');
      setLoading(false);
      return;
    }

    const classIds = (classesResult.classes || []).map(c => c.id);
    const allExams = [];

    // Fetch exams for each class
    for (const classId of classIds) {
      const examsResult = await getExamsByClass(classId);
      if (examsResult.success && examsResult.data) {
        // Get student's attempt if exists
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
            attempt: attemptResult.success ? attemptResult.data : null
          });
        }
      }
    }

    // Remove duplicates (same exam from different classes)
    const uniqueExams = Array.from(
      new Map(allExams.map((exam) => [`${exam.classId}-${exam.id}`, exam])).values()
    );

    setExams(uniqueExams);
    setLoading(false);
  };

  const handleStartExam = async (exam) => {
    const access = canStudentTakeClassExam(exam, exam.classId);
    if (!access.allowed) {
      setError(access.message);
      return;
    }

    // Check if already has in-progress attempt
    const sourceExamId = exam.sourceExamId || exam.examId;
    const instanceId = exam.id;

    if (exam.attempt && exam.attempt.status === 'in-progress') {
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
    const startTime = exam.startTime?.toDate?.() || (exam.startTime ? new Date(exam.startTime) : null);
    const endTime = exam.endTime?.toDate?.() || (exam.endTime ? new Date(exam.endTime) : null);

    if (exam.attempt) {
      if (exam.attempt.status === 'in-progress') {
        return { status: 'in-progress', label: 'In Progress', color: 'text-blue-600' };
      }
      if (exam.attempt.status === 'submitted' || exam.attempt.status === 'graded') {
        return { status: 'completed', label: 'Completed', color: 'text-green-600' };
      }
    }

    if (startTime && isBefore(now, startTime)) {
      return { status: 'upcoming', label: 'Upcoming', color: 'text-gray-600' };
    }

    if (endTime && isBefore(now, endTime)) {
      return { status: 'active', label: 'Active', color: 'text-green-600' };
    }

    if (endTime && isAfter(now, endTime)) {
      return { status: 'closed', label: 'Closed', color: 'text-gray-600' };
    }

    return { status: 'active', label: 'Active', color: 'text-green-600' };
  };

  // Group exams by status
  const groupedExams = {
    upcoming: exams.filter(e => getExamStatus(e).status === 'upcoming'),
    active: exams.filter(e => getExamStatus(e).status === 'active'),
    inProgress: exams.filter(e => getExamStatus(e).status === 'in-progress'),
    completed: exams.filter(e => getExamStatus(e).status === 'completed'),
    closed: exams.filter(e => getExamStatus(e).status === 'closed')
  };

  const ExamCard = ({ exam }) => {
    const examStatus = getExamStatus(exam);
    const startTime = exam.startTime?.toDate?.() || (exam.startTime ? new Date(exam.startTime) : null);
    const endTime = exam.endTime?.toDate?.() || (exam.endTime ? new Date(exam.endTime) : null);
    const score = exam.attempt?.score;
    const totalScore = exam.attempt?.totalScore;
    const percentage = score && totalScore ? ((score / totalScore) * 100).toFixed(1) : null;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {exam.title}
              </h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${examStatus.color} bg-gray-100`}>
                {examStatus.label}
              </span>
            </div>

            {exam.description && (
              <p className="text-gray-600 text-sm mb-3">{exam.description}</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
              <div className="text-gray-600">
                <span className="font-medium">{exam.durationMinutes}</span> mins
              </div>
              <div className="text-gray-600">
                <span className="font-medium">{exam.totalQuestions}</span> questions
              </div>
              <div className="text-gray-600">
                <span className="font-medium">{exam.passingScore.toFixed(1)}</span> to pass
              </div>
              {percentage && (
                <div className="text-gray-600">
                  Score: <span className="font-medium">{percentage}%</span>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              {startTime && (
                <div>
                  Starts: {format(startTime, 'MMM dd, yyyy HH:mm')}
                </div>
              )}
              {endTime && (
                <div>
                  Ends: {format(endTime, 'MMM dd, yyyy HH:mm')}
                </div>
              )}
            </div>

            {exam.attempt?.status === 'graded' && score !== undefined && (
              <div className="mt-3 p-2 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  ✓ Submitted: {formatDistanceToNow(exam.attempt.submittedAt?.toDate?.() || new Date(), {
                    addSuffix: true
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {examStatus.status === 'active' && !exam.attempt?.status?.includes('submitted') && (
              <Button
                variant="primary"
                icon={<PlayCircle className="w-4 h-4" />}
                onClick={() => handleStartExam(exam)}
              >
                Start Exam
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
                Continue
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
                View Result
              </Button>
            )}

            {!exam.attempt && (
              <Button
                variant="outline"
                icon={<ChevronRight className="w-4 h-4" />}
                onClick={() =>
                  navigate(`/student/exams/${exam.sourceExamId || exam.examId}/take`, {
                    state: { classId: exam.classId, classExamInstanceId: exam.id }
                  })
                }
              >
                View Details
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <StudentLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Exams</h1>
            <p className="text-gray-600 mt-1">View and take your assigned exams</p>
          </div>
        </header>

        {/* Main Content */}
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
              <p className="text-gray-600 mb-2">No exams assigned yet</p>
              <p className="text-sm text-gray-500">
                Check back later or contact your instructor
              </p>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Active Exams */}
              {groupedExams.active.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-600 rounded-full" />
                    Active Now
                  </h2>
                  <div className="space-y-4">
                    {groupedExams.active.map(exam => (
                      <ExamCard key={exam.id} exam={exam} />
                    ))}
                  </div>
                </div>
              )}

              {/* In Progress */}
              {groupedExams.inProgress.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-600 rounded-full" />
                    In Progress
                  </h2>
                  <div className="space-y-4">
                    {groupedExams.inProgress.map(exam => (
                      <ExamCard key={exam.id} exam={exam} />
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Exams */}
              {groupedExams.upcoming.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-600" />
                    Upcoming
                  </h2>
                  <div className="space-y-4">
                    {groupedExams.upcoming.map(exam => (
                      <ExamCard key={exam.id} exam={exam} />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Exams */}
              {groupedExams.completed.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Completed
                  </h2>
                  <div className="space-y-4">
                    {groupedExams.completed.map(exam => (
                      <ExamCard key={exam.id} exam={exam} />
                    ))}
                  </div>
                </div>
              )}

              {/* Closed Exams */}
              {groupedExams.closed.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Closed
                  </h2>
                  <div className="space-y-4">
                    {groupedExams.closed.map(exam => (
                      <ExamCard key={exam.id} exam={exam} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </StudentLayout>
  );
};

export default StudentExams;
