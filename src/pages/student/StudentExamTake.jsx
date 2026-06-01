import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StudentLayout from '../../layouts/StudentLayout';
import {
  getExamWithQuestions,
  mergeExamForClass,
  canStudentTakeClassExam
} from '../../services/exam.service';
import {
  getStudentExamAttempt,
  startExamAttempt,
  updateAnswer,
  submitExamAttempt
} from '../../services/examAttempt.service';
import { AlertCircle, Clock, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { format, isAfter, isBefore } from 'date-fns';

const StudentExamTake = () => {
  const { userProfile } = useAuth();
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  const classId = location.state?.classId || null;
  const classExamInstanceId = location.state?.classExamInstanceId || null;

  const startTime = exam?.startTime?.toDate?.() || (exam?.startTime ? new Date(exam.startTime) : null);
  const endTime = exam?.endTime?.toDate?.() || (exam?.endTime ? new Date(exam.endTime) : null);

  const examStatus = useMemo(() => {
    const now = new Date();
    if (startTime && isBefore(now, startTime)) {
      return { status: 'upcoming', message: 'Bài thi chưa bắt đầu.' };
    }
    if (endTime && isAfter(now, endTime)) {
      return { status: 'closed', message: 'Bài thi đã kết thúc.' };
    }
    return { status: 'active', message: '' };
  }, [startTime, endTime]);

  useEffect(() => {
    const loadExam = async () => {
      if (!userProfile?.uid || !examId) return;

      setLoading(true);
      setError('');

      const resolvedClassId = classId || null;
      const resolvedInstanceId = classExamInstanceId || null;

      if (!resolvedClassId || !resolvedInstanceId) {
        setError('Thiếu thông tin lớp học. Vui lòng vào bài thi từ trang lớp học.');
        setLoading(false);
        return;
      }

      const examResult = await getExamWithQuestions(
        examId,
        resolvedClassId,
        resolvedInstanceId
      );
      if (!examResult.success) {
        setError(examResult.error || 'Không tải được bài thi');
        setLoading(false);
        return;
      }

      const examData = mergeExamForClass(examResult.data, resolvedClassId);
      const access = canStudentTakeClassExam(examData, resolvedClassId);

      setExam(examData);
      setQuestions(examData.questions || []);

      const attemptResult = await getStudentExamAttempt(
        userProfile.uid,
        resolvedInstanceId
      );
      if (attemptResult.success) {
        setAttempt(attemptResult.data);
        setAnswers(attemptResult.data.answers || {});
      } else if (access.allowed) {
        const startResult = await startExamAttempt(
          userProfile.uid,
          examId,
          resolvedClassId,
          resolvedInstanceId
        );
        if (startResult.success) {
          setAttempt(startResult.data);
        } else {
          setError(startResult.error || 'Không thể bắt đầu bài thi');
        }
      } else if (!access.allowed) {
        setError(access.message);
      }

      setLoading(false);
    };

    loadExam();
  }, [userProfile?.uid, examId, classId, classExamInstanceId]);

  const handleSelectAnswer = async (questionId, selected) => {
    if (!attempt?.id) return;

    const nextAnswers = {
      ...answers,
      [questionId]: { selected }
    };

    setAnswers(nextAnswers);
    await updateAnswer(attempt.id, questionId, selected);
  };

  const handleSubmit = async () => {
    if (!attempt?.id) return;

    setSubmitting(true);
    const result = await submitExamAttempt(attempt.id);
    setSubmitting(false);

    if (result.success) {
      navigate(`/student/exams/${examId}/result`, {
        state: { classId, classExamInstanceId }
      });
    } else {
      setError(result.error || 'Không thể nộp bài');
    }
  };

  const currentQuestion = questions[currentIndex];

  return (
    <StudentLayout>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{exam?.title || 'Bài thi'}</h1>
              {exam?.description && (
                <p className="text-gray-600 mt-1">{exam.description}</p>
              )}
            </div>
            <Button variant="outline" onClick={() => navigate('/student/exams')}>
              Quay lại
            </Button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
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
          ) : attempt?.status?.includes('submitted') || attempt?.status === 'graded' ? (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-900 font-semibold">Bạn đã nộp bài.</p>
                  <p className="text-sm text-gray-600">Xem lại kết quả của bạn.</p>
                </div>
                <Button
                  variant="primary"
                  onClick={() =>
                    navigate(`/student/exams/${examId}/result`, {
                      state: { classId, classExamInstanceId }
                    })
                  }
                >
                  Xem kết quả
                </Button>
              </div>
            </Card>
          ) : examStatus.status !== 'active' ? (
            <Card className="p-6">
              <div className="flex items-center gap-3 text-gray-700">
                <Clock className="w-5 h-5" />
                <p>{examStatus.message}</p>
              </div>
            </Card>
          ) : !currentQuestion ? (
            <Card className="p-6">
              <p className="text-gray-600">Không có câu hỏi trong bài thi này.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-500">Câu hỏi {currentIndex + 1} / {questions.length}</p>
                    {endTime && (
                      <p className="text-sm text-gray-500">Kết thúc: {format(endTime, 'MMM dd, yyyy HH:mm')}</p>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">{currentQuestion.questionText}</h2>

                  <div className="space-y-3">
                    {['A', 'B', 'C', 'D']
                      .filter((key) => currentQuestion.options?.[key] !== undefined)
                      .map((key) => (
                        <label
                          key={key}
                          className={`flex items-center gap-4 p-3 border rounded-lg cursor-pointer transition-colors ${answers[currentQuestion.id]?.selected === key ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
                        >
                          <input
                            type="radio"
                            name={currentQuestion.id}
                            value={key}
                            checked={answers[currentQuestion.id]?.selected === key}
                            onChange={() => handleSelectAnswer(currentQuestion.id, key)}
                            className="mt-0.5"
                          />
                          <span className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-sm font-semibold text-gray-700">
                            {key}
                          </span>
                          <span className="text-gray-900">{currentQuestion.options?.[key]}</span>
                        </label>
                      ))}
                  </div>
                </Card>

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    disabled={currentIndex === 0}
                    icon={<ChevronLeft className="w-4 h-4" />}
                    onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                  >
                    Trước
                  </Button>
                  {currentIndex === questions.length - 1 ? (
                    <Button
                      variant="primary"
                      icon={<CheckCircle className="w-4 h-4" />}
                      onClick={handleSubmit}
                      disabled={submitting}
                    >
                      {submitting ? 'Đang nộp...' : 'Nộp bài'}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      icon={<ChevronRight className="w-4 h-4" />}
                      onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1))}
                    >
                      Tiếp
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Tóm tắt</h3>
                  <div className="text-sm text-gray-600 space-y-2">
                    <div>Số câu hỏi: <span className="font-medium text-gray-900">{questions.length}</span></div>
                    <div>Thời lượng: <span className="font-medium text-gray-900">{exam?.durationMinutes} phút</span></div>
                    {startTime && (
                      <div>Bắt đầu: <span className="font-medium text-gray-900">{format(startTime, 'MMM dd, yyyy HH:mm')}</span></div>
                    )}
                    {endTime && (
                      <div>Kết thúc: <span className="font-medium text-gray-900">{format(endTime, 'MMM dd, yyyy HH:mm')}</span></div>
                    )}
                  </div>
                </Card>

                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Câu hỏi</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((question, index) => {
                      const answered = answers[question.id]?.selected;
                      return (
                        <button
                          key={question.id}
                          onClick={() => setCurrentIndex(index)}
                          className={`h-9 rounded-lg text-sm font-medium border ${index === currentIndex ? 'border-primary-500 text-primary-600' : answered ? 'border-green-500 text-green-600' : 'border-gray-200 text-gray-600'}`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </StudentLayout>
  );
};

export default StudentExamTake;
